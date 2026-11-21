import {
	mkdir,
	mkdtemp,
	readdir,
	readFile,
	realpath,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
// oxlint-disable-next-line mantle/no-barrel-imports -- Why: the test renders through the runtime that the plugin keeps external.
import IconBase from "@phosphor-icons/react/dist/lib/IconBase";
// oxlint-disable-next-line mantle/no-barrel-imports -- Why: the test sets the context that the shipped icons read.
import { IconContext } from "@phosphor-icons/react/dist/lib/context";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build as tsdownBuild } from "tsdown";
import { build } from "vite";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
	markWeights,
	mantlePhosphorPrunePlugin,
	stripWeights,
} from "./mantle-phosphor-prune-plugin.js";

const packageRoot = path.resolve(import.meta.dirname, "..");
const WEIGHTS = ["bold", "duotone", "fill", "light", "regular", "thin"] as const;
type Weight = (typeof WEIGHTS)[number];

/** Runs a Phosphor weight module with the real React and returns its weight `Map`. */
function loadWeights(code: string): Map<Weight, React.ReactElement> {
	const namespace = /import \* as (\w+) from "react";/.exec(code)?.[1] ?? "React";
	const exported = /(\w+) as default/.exec(code)?.[1] ?? "";
	const body = code
		.replace(/import \* as \w+ from "react";/, "")
		.replace(/export \{[\s\S]*$/, `return ${exported};`);
	// oxlint-disable-next-line no-new-func -- Why: the test runs the module text it rewrote, as the bundle would.
	const weights: unknown = new Function(namespace, body)(React);
	if (!(weights instanceof Map)) {
		throw new TypeError("the weight module did not return a Map");
	}
	return weights;
}

const renderWeight = (weights: Map<Weight, React.ReactElement>, weight: Weight) => {
	// Why a variable: Phosphor's `IconBase` types import `./types` without an extension, which
	// drops `weight` from its props under this tsconfig.
	const props = { weights, weight };
	return renderToStaticMarkup(React.createElement(IconBase, props));
};

describe("markWeights and stripWeights", () => {
	// Why the 30-second timeout: the test parses and renders each of about 1,500 icons.
	test("keep one weight of every icon in the installed Phosphor, with the markup Phosphor renders", async () => {
		const directory = path.join(packageRoot, "node_modules/@phosphor-icons/react/dist/defs");
		const files = (await readdir(directory)).filter((file) => file.endsWith(".es.js"));
		const failures: string[] = [];
		for (const [index, file] of files.entries()) {
			const icon = file.replace(".es.js", "");
			const weight = WEIGHTS[index % WEIGHTS.length] ?? "regular";
			const code = await readFile(path.join(directory, file), "utf8");
			const marked = markWeights(code, icon);
			const stripped =
				marked == null ? null : stripWeights(marked.toString(), (_icon, kept) => kept === weight);
			if (stripped == null) {
				failures.push(`${icon}: unknown shape`);
				continue;
			}
			const trimmed = loadWeights(stripped.code);
			if (
				[...trimmed.keys()].join() !== weight ||
				renderWeight(trimmed, weight) !== renderWeight(loadWeights(code), weight)
			) {
				failures.push(`${icon}: ${weight}`);
			}
		}
		// Why the floor: an empty or moved defs directory must fail, not pass with no icons.
		expect(files.length).toBeGreaterThan(1000);
		expect(failures).toEqual([]);
	}, 30_000);

	test("refuse a chunk with a weight tag outside a weight list", () => {
		// Why the literal: it is the tag `markWeights` writes, which a minifier must not move.
		const chunk = `const tag = "@ngrok/mantle-vite-plugins:phosphor-weight:Check:bold";`;

		expect(() => stripWeights(chunk, () => true)).toThrow(
			"found a Phosphor weight tag outside a weight list",
		);
	});
});

const APP = `import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { CheckIcon } from "@phosphor-icons/react/Check";
import { CopyIcon } from "@phosphor-icons/react/Copy";
import { EyeIcon } from "@phosphor-icons/react/Eye";
import { EyeClosedIcon } from "@phosphor-icons/react/EyeClosed";
import { GearIcon } from "@phosphor-icons/react/Gear";
import { GlobeIcon } from "@phosphor-icons/react/Globe";
import { IconContext, InfoIcon } from "@phosphor-icons/react";
import { XIcon } from "@phosphor-icons/react/X";
import { filledInfo, renderInfo } from "./vendor.js";

export const Bold = () => <CheckIcon weight="bold" />;
export const Either = ({ open }) => <XIcon weight={open ? "fill" : "thin"} />;
export const Spread = (props) => <CaretDownIcon {...props} />;
export const icons = [CopyIcon];
export const Alias = ({ open }) => {
	const Eye = open ? EyeIcon : EyeClosedIcon;
	return <Eye weight="light" />;
};
export const First = () => {
	const Icon = GearIcon;
	return <Icon weight="fill" />;
};
export const Second = () => {
	const Icon = GlobeIcon;
	return <Icon weight="light" />;
};
export const Themed = () => (
	<IconContext.Provider value={{ weight: "duotone" }}>
		<InfoIcon />
	</IconContext.Provider>
);
export { filledInfo };
export const probes = {
	CaretDown: () => <CaretDownIcon />,
	Check: () => <CheckIcon />,
	Copy: () => <CopyIcon />,
	Eye: () => <EyeIcon />,
	Gear: () => <GearIcon />,
	Globe: () => <GlobeIcon />,
	Info: renderInfo,
	X: () => <XIcon />,
};
`;

// A dependency that ships compiled JSX, and imports Phosphor's runtime as a prebuilt mantle does.
const VENDOR = `import { jsx as _jsx } from "react/jsx-runtime";
import IconBase from "@phosphor-icons/react/dist/lib/IconBase";
import { InfoIcon } from "@phosphor-icons/react/Info";

export const renderInfo = () => _jsx(InfoIcon, {});
export const filledInfo = () => _jsx(InfoIcon, { weight: "fill" });
export const base = IconBase;
`;

/** Keeps Phosphor's runtime external, so the output and this test share one `IconContext`. */
const runtimeExternal = {
	name: "runtime-external",
	// Why: Vite's own resolver runs before a plugin without `pre`, and would bundle the runtime.
	enforce: "pre" as const,
	resolveId(source: string, importer: string | undefined) {
		const runtime = /^\.\.\/lib\/(\w+)\.es\.js$/.exec(source);
		return importer != null &&
			runtime != null &&
			/[\\/]@phosphor-icons[\\/]react[\\/]dist[\\/]csr[\\/]/.test(importer)
			? { id: `@phosphor-icons/react/dist/lib/${runtime[1]}`, external: true }
			: null;
	},
};
const EXTERNAL = [/^react(?:\/|$)/, /^react-dom(?:\/|$)/, /^@phosphor-icons\/react\/dist\/lib\//];

describe("mantlePhosphorPrunePlugin build", () => {
	const roots: string[] = [];

	afterAll(async () => {
		await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
	});

	/** Writes the files into a new root that links the real React and Phosphor. */
	async function makeRoot(files: Record<string, string>, links: string[]) {
		const root = await realpath(await mkdtemp(path.join(tmpdir(), "mantle-phosphor-prune-")));
		roots.push(root);
		await writeFile(path.join(root, "package.json"), JSON.stringify({ type: "module" }));
		for (const name of links) {
			const link = path.join(root, "node_modules", name);
			await mkdir(path.dirname(link), { recursive: true });
			await symlink(await realpath(path.join(packageRoot, "node_modules", name)), link, "dir");
		}
		for (const [name, content] of Object.entries(files)) {
			await mkdir(path.dirname(path.join(root, name)), { recursive: true });
			await writeFile(path.join(root, name), content);
		}
		return root;
	}

	const bundlers = {
		vite: async (root: string) => {
			const warnings: string[] = [];
			await build({
				root,
				configFile: false,
				logLevel: "silent",
				plugins: [runtimeExternal, mantlePhosphorPrunePlugin()],
				build: {
					outDir: "out",
					minify: true,
					lib: { entry: "src/app.jsx", formats: ["es"], fileName: "app" },
					rolldownOptions: {
						external: EXTERNAL,
						onLog: (level, log) => {
							if (level === "warn") {
								warnings.push(log.message);
							}
						},
					},
				},
			});
			return { file: path.join(root, "out/app.js"), warnings };
		},
		tsdown: async (root: string) => {
			await tsdownBuild({
				config: false,
				cwd: root,
				entry: { app: "src/app.jsx" },
				outDir: "out",
				format: "esm",
				fixedExtension: false,
				dts: false,
				minify: true,
				logLevel: "silent",
				deps: { neverBundle: EXTERNAL, onlyBundle: false },
				plugins: [runtimeExternal, mantlePhosphorPrunePlugin()],
			});
			return { file: path.join(root, "out/app.js"), warnings: [] };
		},
	};

	describe.each(Object.entries(bundlers))("with %s", (_name, bundle) => {
		let probes: Record<string, React.ComponentType>;
		let warnings: string[];

		beforeAll(async () => {
			const root = await makeRoot({ "src/app.jsx": APP, "src/vendor.js": VENDOR }, [
				"react",
				"react-dom",
				"@phosphor-icons/react",
			]);
			const output = await bundle(root);
			warnings = output.warnings;
			const app: { probes: Record<string, React.ComponentType> } = await import(
				pathToFileURL(output.file).href
			);
			probes = app.probes;
		});

		/**
		 * The weights a probe still renders. A kept weight must render the markup Phosphor renders, and a
		 * removed weight must render no path.
		 */
		async function renderedWeights(icon: string) {
			const module: Record<string, React.ComponentType> = await import(
				`@phosphor-icons/react/${icon}`
			);
			const original = module[`${icon}Icon`];
			const probe = probes[icon];
			if (original == null || probe == null) {
				throw new Error(`no probe for ${icon}`);
			}
			return WEIGHTS.filter((weight) => {
				const inContext = (element: React.ReactElement) =>
					renderToStaticMarkup(
						React.createElement(IconContext.Provider, { value: { weight } }, element),
					);
				const shipped = inContext(React.createElement(probe));
				if (shipped === inContext(React.createElement(original))) {
					return true;
				}
				expect(shipped, `${icon} ${weight}`).not.toContain("<path");
				return false;
			});
		}

		test("keeps the weight of each literal, plus the context weights for an icon without one", async () => {
			// `IconContext.Provider value={{ weight: "duotone" }}` adds duotone to `regular`.
			expect(await renderedWeights("Check")).toEqual(["bold", "duotone", "regular"]);
		});

		test("keeps both weights of a conditional", async () => {
			expect(await renderedWeights("X")).toEqual(["duotone", "fill", "regular", "thin"]);
		});

		test("keeps every weight of an icon that gets spread props or is passed as a value", async () => {
			expect(await renderedWeights("CaretDown")).toEqual([...WEIGHTS]);
			expect(await renderedWeights("Copy")).toEqual([...WEIGHTS]);
		});

		test("follows a const alias to each icon it can name", async () => {
			expect(await renderedWeights("Eye")).toEqual(["duotone", "light", "regular"]);
		});

		test("keeps the icons of two aliases that share a name in different scopes", async () => {
			expect(await renderedWeights("Gear")).toContain("fill");
			expect(await renderedWeights("Globe")).toContain("light");
		});

		test("reads compiled jsx() calls in a dependency that imports Phosphor's runtime", async () => {
			expect(await renderedWeights("Info")).toEqual(["duotone", "fill", "regular"]);
			expect(warnings).toEqual([]);
		});
	});

	test("warns and keeps every weight when a weight module has another shape", async () => {
		const root = await makeRoot(
			{
				"node_modules/@phosphor-icons/react/package.json": JSON.stringify({
					name: "@phosphor-icons/react",
					type: "module",
				}),
				"node_modules/@phosphor-icons/react/dist/defs/Odd.es.js": `const a = { "bold": 1, "duotone": 2, "fill": 3, "light": 4, "regular": 5, "thin": 6 };\nexport { a as default };\n`,
				"src/app.jsx": `import weights from "@phosphor-icons/react/dist/defs/Odd.es.js";\nexport const keys = Object.keys(weights);\n`,
			},
			[],
		);
		const output = await bundlers.vite(root);
		const app: { keys: string[] } = await import(pathToFileURL(output.file).href);

		expect(output.warnings).toContainEqual(
			expect.stringContaining(
				"Odd in @phosphor-icons/react does not have the weight module shape this plugin knows, so the build keeps all six of its weights.",
			),
		);
		expect(app.keys).toEqual([...WEIGHTS]);
	});
});
