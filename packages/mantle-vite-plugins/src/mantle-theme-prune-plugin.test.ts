import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import postcss, { Rule } from "postcss";
import { build, type Plugin } from "vite";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { mantleThemePrunePlugin, pruneThemeCss } from "./mantle-theme-prune-plugin.js";

const packageRoot = path.resolve(import.meta.dirname, "..");
const dark =
	":root.dark,:root[data-theme=dark]:not([data-applied-theme]),:root[data-applied-theme=dark],:root:not(.dark,[data-theme=dark]:not([data-applied-theme]),[data-applied-theme=dark]) .invert-theme";
const supports = "@supports (color:color-mix(in lab, red, red))";

describe("pruneThemeCss", () => {
	test("drops a stop from the theme rules when the stylesheet does not read it", () => {
		const css = `@layer theme { :root { --color-pink-300: pink; } }
@container style(--color-lime-200: c) { .x { color: red; } }
${dark} { --color-pink-50: a; --color-pink-300: b; --color-lime-200: c; --background-color-card: var(--color-pink-950); --color-pink-950: d; }`;

		expect(pruneThemeCss(css).css).toBe(`@layer theme { :root { --color-pink-300: pink; } }
@container style(--color-lime-200: c) { .x { color: red; } }
${dark} { --color-pink-300: b; --color-lime-200: c; --background-color-card: var(--color-pink-950); --color-pink-950: d; }`);
	});

	test("leaves a rule of the app alone, even when it sets a stop on a theme selector", () => {
		const css = `:root[data-applied-theme="dark"] { --color-pink-300: deeppink; }
:root { --color-pink-50: a; }`;

		expect(pruneThemeCss(css).css).toBe(css);
	});

	test("joins the fragments of a theme rule around its color-mix fallbacks", () => {
		const css = `${dark}{--a:1;--b:red}${supports}{${dark}{--b:color-mix(in oklab, red 50%, transparent)}}${dark}{--c:2}${supports}{${dark}{--d:color-mix(in oklab, blue 50%, transparent)}}`;

		expect(pruneThemeCss(css).css).toBe(
			`${dark}{--a:1;--b:red;--c:2}${supports}{${dark}{--b:color-mix(in oklab, red 50%, transparent);--d:color-mix(in oklab, blue 50%, transparent)}}`,
		);
	});

	test.each([
		[
			"a later fragment sets a property that an earlier fallback sets",
			`${dark}{--b:red}${supports}{${dark}{--b:color-mix(in oklab, red 50%, transparent)}}${dark}{--b:blue}`,
		],
		[
			"two fallbacks have different conditions",
			`${dark}{--b:red}${supports}{${dark}{--c:1}}@supports not (display:grid){${dark}{--b:blue}}`,
		],
		[
			"a fragment sets a standard property, which a shorthand could overlap",
			`${dark}{margin:10px}${supports}{${dark}{margin-top:20px}}${dark}{margin:0}`,
		],
	])("does not join when %s", (_case, css) => {
		expect(pruneThemeCss(css).css).toBe(css);
	});
});

describe("mantleThemePrunePlugin build", () => {
	const roots: string[] = [];
	let full: string;
	let pruned: string;
	const fullNames: string[] = [];
	const prunedNames: string[] = [];
	const warnings: string[] = [];

	afterAll(async () => {
		await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
	});

	/** Builds an app that uses a few palette stops, and returns its CSS. */
	async function buildApp(plugins: Plugin[], cssNames: string[]) {
		const root = await realpath(await mkdtemp(path.join(tmpdir(), "mantle-theme-prune-")));
		roots.push(root);
		for (const name of ["@ngrok/mantle", "@tailwindcss/vite", "tailwindcss"]) {
			const link = path.join(root, "node_modules", name);
			await mkdir(path.dirname(link), { recursive: true });
			await symlink(await realpath(path.join(packageRoot, "node_modules", name)), link, "dir");
		}
		await mkdir(path.join(root, "src"));
		await writeFile(
			path.join(root, "index.html"),
			'<div class="bg-pink-300"></div><script type="module" src="/src/main.ts"></script>',
		);
		await writeFile(
			path.join(root, "src/app.css"),
			'@import "tailwindcss";\n@import "@ngrok/mantle/mantle.css";\n',
		);
		// A CSS module, a scanned script, and a dependency that Tailwind does not scan read stops
		// that no class names.
		const widget = path.join(root, "node_modules/widget");
		await mkdir(widget, { recursive: true });
		await writeFile(path.join(widget, "package.json"), '{"name":"widget","main":"index.js"}');
		await writeFile(
			path.join(widget, "index.js"),
			'export const color = "var(--color-lime-900, green)";\n',
		);
		await writeFile(
			path.join(root, "src/box.module.css"),
			'@reference "./app.css";\n.box { @apply bg-lime-200; }\n',
		);
		await writeFile(
			path.join(root, "src/main.ts"),
			'import "./app.css";\nimport styles from "./box.module.css";\nimport { color } from "widget";\ndocument.body.className = styles.box;\ndocument.body.style.color = "var(--color-lime-700)";\ndocument.body.style.borderColor = color;\nvoid import("./lazy.ts");\n',
		);
		// A lazy stylesheet that Tailwind does not scan reads a stop on a theme selector, but
		// declares none.
		await writeFile(path.join(root, "src/lazy.ts"), 'import "widget/widget.css";\n');
		await writeFile(
			path.join(widget, "widget.css"),
			':root[data-applied-theme="dark"] .widget { background: var(--color-lime-800, pink); }\n',
		);
		const result = await build({
			root,
			configFile: false,
			envDir: false,
			logLevel: "silent",
			build: {
				write: false,
				rolldownOptions: {
					onLog: (level, log) => {
						if (level === "warn") {
							warnings.push(log.message);
						}
					},
				},
			},
			plugins: [tailwindcss(), ...plugins],
		});
		if (Array.isArray(result) || !("output" in result)) {
			throw new Error("expected one build output");
		}
		const sheets = result.output.filter(
			(output) => output.type === "asset" && output.fileName.endsWith(".css"),
		);
		cssNames.push(...sheets.map((output) => output.fileName));
		return sheets
			.map((output) => (output.type === "asset" ? String(output.source) : ""))
			.join("\n");
	}

	/** Every `property: value` the theme rules set, by selector, in each theme and fallback. */
	function themeDeclarations(css: string, keep: (property: string) => boolean) {
		const found = new Set<string>();
		postcss.parse(css).walkDecls((declaration) => {
			const rule = declaration.parent;
			if (
				rule instanceof Rule &&
				rule.selector.includes("data-applied-theme") &&
				keep(declaration.prop)
			) {
				const scope = rule.parent?.type === "atrule" ? "fallback" : "rule";
				found.add(`${scope} ${rule.selector} ${declaration.prop}: ${declaration.value}`);
			}
		});
		return found;
	}

	beforeAll(async () => {
		[full, pruned] = await Promise.all([
			buildApp([], fullNames),
			buildApp([mantleThemePrunePlugin()], prunedNames),
		]);
	});

	test("keeps the dark value of a stop the app uses, and drops the stops it does not", () => {
		const darkRule = (css: string) =>
			[...themeDeclarations(css, (property) => property.startsWith("--color-pink-"))].join("\n");

		expect(darkRule(full)).toContain("--color-pink-50:");
		expect(darkRule(pruned)).toContain("--color-pink-300:");
		expect(darkRule(pruned)).not.toContain("--color-pink-50:");
	});

	test("keeps the dark value of a stop that only a CSS module or a scanned script reads", () => {
		const darkRule = (css: string) =>
			[...themeDeclarations(css, (property) => property.startsWith("--color-lime-"))].join("\n");

		expect(darkRule(pruned)).toContain("--color-lime-200:");
		expect(darkRule(pruned)).toContain("--color-lime-700:");
		expect(darkRule(pruned)).not.toContain("--color-lime-50:");
	});

	test("warns about a stop that only a file outside the stylesheet reads", () => {
		expect(warnings.filter((warning) => warning.includes("--color-lime-900"))).toHaveLength(1);
		expect(warnings.filter((warning) => warning.includes("--color-lime-800"))).toHaveLength(1);
		expect(warnings.join("\n")).not.toContain("--color-lime-700");
	});

	test("keeps every other theme declaration, with the same value, and ships less CSS", () => {
		const notAStop = (property: string) => !/^--color-[a-z]+-\d+$/.test(property);

		expect(themeDeclarations(pruned, notAStop)).toEqual(themeDeclarations(full, notAStop));
		expect(pruned.length).toBeLessThan(full.length * 0.85);
		expect(pruned).not.toContain("mantle-theme-prune");
	});

	test("gives the pruned stylesheet a different hashed name", () => {
		// the app stylesheet and the lazy widget stylesheet
		expect(fullNames).toHaveLength(2);
		expect(prunedNames).toHaveLength(2);
		expect(prunedNames.filter((name) => fullNames.includes(name))).toEqual([]);
	});
});
