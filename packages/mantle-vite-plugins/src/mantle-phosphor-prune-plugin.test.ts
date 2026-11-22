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

// Each icon here has a probe without a `weight`, so a test can read every weight under its own
// `IconContext`. No module sets a weight for every icon, so each icon keeps only what it renders.
const APP = `import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { CheckIcon } from "@phosphor-icons/react/Check";
import { CopyIcon } from "@phosphor-icons/react/Copy";
import { EyeIcon } from "@phosphor-icons/react/Eye";
import { EyeClosedIcon } from "@phosphor-icons/react/EyeClosed";
import { GearIcon } from "@phosphor-icons/react/Gear";
import { GlobeIcon } from "@phosphor-icons/react/Globe";
import { HeartIcon } from "@phosphor-icons/react/Heart";
import { StarIcon } from "@phosphor-icons/react/Star";
import { XIcon } from "@phosphor-icons/react/X";
import { filledInfo, renderInfo } from "./vendor.js";
import { warning } from "./minified.js";

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
export const CustomStar = StarIcon;
export const BoldStar = () => <StarIcon weight="bold" />;
const createElement = (Icon) => Icon;
export const made = createElement(HeartIcon, { weight: "bold" });
export { filledInfo };
export const probes = {
	CaretDown: () => <CaretDownIcon />,
	Check: () => <CheckIcon />,
	Copy: () => <CopyIcon />,
	Eye: () => <EyeIcon />,
	Gear: () => <GearIcon />,
	Globe: () => <GlobeIcon />,
	Heart: () => <HeartIcon />,
	Info: renderInfo,
	Star: () => <StarIcon />,
	Warning: warning,
	X: () => <XIcon />,
};
`;

// Minified code that reuses the names of its React imports for local functions and parameters.
const MINIFIED = `import { cloneElement as l } from "react";
import { jsx as e } from "react/jsx-runtime";
import { WarningIcon } from "@phosphor-icons/react/Warning";

export const clone = (child) => l(child, {});
export const local = (l) => {
	const e = (Icon) => Icon;
	return e(WarningIcon, { weight: "bold" });
};
export const warning = () => e(WarningIcon, {});
`;

// A dependency that ships compiled JSX, and imports Phosphor's runtime as a prebuilt mantle does.
const VENDOR = `import { jsx as _jsx } from "react/jsx-runtime";
import IconBase from "@phosphor-icons/react/dist/lib/IconBase";
import { InfoIcon } from "@phosphor-icons/react/Info";

export const renderInfo = () => _jsx(InfoIcon, {});
export const filledInfo = () => _jsx(InfoIcon, { weight: "fill" });
export const base = IconBase;
`;

// Weights that reach icons the module does not name: two `IconContext` values and a clone.
const OVERRIDES = `import { CheckIcon } from "@phosphor-icons/react/Check";
import { IconContext } from "@phosphor-icons/react";
import { jsx as _jsx } from "react/jsx-runtime";
import { boldClone } from "./clone.js";

export const Bold = () => <CheckIcon weight="bold" />;
export const Themed = ({ children }) => (
	<IconContext.Provider value={{ weight: "duotone" }}>{children}</IconContext.Provider>
);
export const Compiled = ({ children }) => _jsx(IconContext.Provider, { "value": { weight: "thin" }, children });
export { boldClone };
export const probes = { Check: () => <CheckIcon /> };
`;

// A wrapper that never imports Phosphor, but sets a weight on whatever icon it gets.
const CLONE = `import { cloneElement } from "react";

export const boldClone = (icon) => cloneElement(icon, { weight: "fill" });
`;

// References the analysis cannot read: an import by file path, a dynamic import that the bundler
// resolves, an alias of an alias or of a shadowed import, and a factory that is not React.
const REACH = `import { BellIcon } from "@phosphor-icons/react/Bell";
import { CheckIcon } from "@phosphor-icons/react/Check";
import { LightningIcon } from "@phosphor-icons/react/Lightning";
import { MoonIcon } from "@phosphor-icons/react/Moon";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { SunIcon } from "@phosphor-icons/react/Sun";
import { TrashIcon } from "@phosphor-icons/react/Trash";
import { pathBell } from "./path.js";

export const Bold = () => <BellIcon weight="bold" />;
export const BoldLightning = () => <LightningIcon weight="bold" />;
export const load = () => import("@phosphor-icons/react/" + "Lightning");
export const Early = () => {
	const Mark = MoonIcon;
	return <Mark />;
};
export const Late = () => {
	const Inner = () => {
		const Shown = Mark;
		return <Shown weight="bold" />;
	};
	const Mark = SunIcon;
	return <Inner />;
};
export const Shadow = () => {
	const Callback = () => {
		const Icon = CheckIcon;
		return <Icon weight="thin" />;
	};
	const CheckIcon = PlusIcon;
	return <Callback />;
};
export const BoldPlus = () => <PlusIcon weight="bold" />;
const factory = { createElement: (Icon) => Icon };
export const made = factory.createElement(TrashIcon, { weight: "bold" });
export { pathBell };
export const probes = {
	Bell: () => <BellIcon />,
	Check: () => <CheckIcon />,
	Lightning: () => <LightningIcon />,
	Plus: () => <PlusIcon />,
	Sun: () => <SunIcon />,
	Trash: () => <TrashIcon />,
};
`;

// Imports an icon by file path, as an app with a `resolve.alias` for Phosphor would.
const PATH = `import { jsx as _jsx } from "react/jsx-runtime";
import { BellIcon } from "../node_modules/@phosphor-icons/react/dist/csr/Bell.es.js";

export const pathBell = () => _jsx(BellIcon, { weight: "thin" });
`;

// An `IconContext` provider that imports the context by file path.
const CONTEXT = `import { CheckIcon } from "@phosphor-icons/react/Check";
import "./provider.js";

export const Bold = () => <CheckIcon weight="bold" />;
export const probes = { Check: () => <CheckIcon /> };
`;
const PROVIDER = `import { jsx as _jsx } from "react/jsx-runtime";
import { IconContext } from "../node_modules/@phosphor-icons/react/dist/lib/context.es.js";

export const Thin = ({ children }) => _jsx(IconContext.Provider, { value: { weight: "thin" }, children });
`;

// Phosphor exports `PulseIcon` also as `ActivityIcon`.
const RENAMED = `import { ActivityIcon, PulseIcon } from "@phosphor-icons/react";

export const Bold = () => <ActivityIcon weight="bold" />;
export const probes = { Pulse: () => <PulseIcon /> };
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
		const apps: Record<
			string,
			{ probes: Record<string, React.ComponentType>; warnings: string[] }
		> = {};

		/** Builds one fixture app and imports its output. */
		async function buildApp(files: Record<string, string>) {
			const root = await makeRoot(files, ["react", "react-dom", "@phosphor-icons/react"]);
			const output = await bundle(root);
			const app: { probes: Record<string, React.ComponentType> } = await import(
				pathToFileURL(output.file).href
			);
			return { probes: app.probes, warnings: output.warnings };
		}

		// Why the 60-second timeout: the renamed fixture imports the barrel, which loads every icon.
		beforeAll(async () => {
			apps.local = await buildApp({
				"src/app.jsx": APP,
				"src/vendor.js": VENDOR,
				"src/minified.js": MINIFIED,
			});
			apps.overrides = await buildApp({ "src/app.jsx": OVERRIDES, "src/clone.js": CLONE });
			apps.reach = await buildApp({ "src/app.jsx": REACH, "src/path.js": PATH });
			apps.renamed = await buildApp({ "src/app.jsx": RENAMED });
			apps.context = await buildApp({ "src/app.jsx": CONTEXT, "src/provider.js": PROVIDER });
		}, 60_000);

		/**
		 * The weights a probe still renders. A kept weight must render the markup Phosphor renders, and a
		 * removed weight must render no path.
		 */
		async function renderedWeights(app: string, icon: string) {
			const module: Record<string, React.ComponentType> = await import(
				`@phosphor-icons/react/${icon}`
			);
			const original = module[`${icon}Icon`];
			const probe = apps[app]?.probes[icon];
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

		test("keeps the weight of each literal, plus regular for an icon without one", async () => {
			expect(await renderedWeights("local", "Check")).toEqual(["bold", "regular"]);
		});

		test("keeps both weights of a conditional", async () => {
			expect(await renderedWeights("local", "X")).toEqual(["fill", "regular", "thin"]);
		});

		test("keeps every weight of an icon that gets spread props or is passed as a value", async () => {
			expect(await renderedWeights("local", "CaretDown")).toEqual([...WEIGHTS]);
			expect(await renderedWeights("local", "Copy")).toEqual([...WEIGHTS]);
		});

		test("keeps every weight of an icon that an exported alias or a local helper receives", async () => {
			expect(await renderedWeights("local", "Star")).toEqual([...WEIGHTS]);
			expect(await renderedWeights("local", "Heart")).toEqual([...WEIGHTS]);
		});

		test("follows a const alias to each icon it can name", async () => {
			expect(await renderedWeights("local", "Eye")).toEqual(["light", "regular"]);
		});

		test("keeps the icons of two aliases that share a name in different scopes", async () => {
			expect(await renderedWeights("local", "Gear")).toContain("fill");
			expect(await renderedWeights("local", "Globe")).toContain("light");
		});

		test("keeps every weight of an icon that a local function with a React import's name gets", async () => {
			expect(await renderedWeights("local", "Warning")).toEqual([...WEIGHTS]);
		});

		test("reads compiled jsx() calls in a dependency that imports Phosphor's runtime", async () => {
			expect(await renderedWeights("local", "Info")).toEqual(["fill", "regular"]);
			expect(apps.local?.warnings).toEqual([]);
		});

		test("keeps the weights that IconContext values and cloneElement() set", async () => {
			// `duotone` from JSX, `thin` from a compiled provider, and `fill` from a clone in a module
			// that does not import Phosphor.
			expect(await renderedWeights("overrides", "Check")).toEqual([
				"bold",
				"duotone",
				"fill",
				"regular",
				"thin",
			]);
		});

		test("keeps every weight of an icon that an unread module or a dynamic import reaches", async () => {
			expect(await renderedWeights("reach", "Bell")).toEqual([...WEIGHTS]);
			expect(await renderedWeights("reach", "Lightning")).toEqual([...WEIGHTS]);
		});

		test("keeps every weight of an icon that an alias of an alias or of a shadowed import can name", async () => {
			expect(await renderedWeights("reach", "Sun")).toEqual([...WEIGHTS]);
			expect(await renderedWeights("reach", "Plus")).toEqual([...WEIGHTS]);
		});

		test("keeps every weight of an icon that a factory other than React receives", async () => {
			expect(await renderedWeights("reach", "Trash")).toEqual([...WEIGHTS]);
		});

		test("keeps every IconContext weight when an unread module imports IconContext", async () => {
			expect(await renderedWeights("context", "Check")).toEqual([...WEIGHTS]);
		});

		test("keeps every weight when a module imports an icon by another name", async () => {
			expect(await renderedWeights("renamed", "Pulse")).toEqual([...WEIGHTS]);
		});
	});

	test("warns about an icon imported by another name", async () => {
		const root = await makeRoot({ "src/app.jsx": RENAMED }, [
			"react",
			"react-dom",
			"@phosphor-icons/react",
		]);
		const output = await bundlers.vite(root);

		expect(output.warnings).toContainEqual(
			expect.stringContaining("ActivityIcon is another name of a Phosphor icon"),
		);
	}, 30_000);

	test("keeps every weight and warns for an aliased import or cloneElement() in a read module", async () => {
		const root = await makeRoot(
			{
				"src/app.jsx": `export { Mixed } from "./mixed.jsx";\nexport { Cloned } from "./cloned.jsx";\n`,
				"src/mixed.jsx": `import { CheckIcon } from "@phosphor-icons/react/Check";\nimport { CheckIcon as Same } from "../node_modules/@phosphor-icons/react/dist/csr/Check.es.js";\n\nexport const Mixed = () => [<CheckIcon weight="bold" />, <Same weight="thin" />];\n`,
				"src/cloned.jsx": `import { cloneElement } from "react";\nimport { CheckIcon } from "@phosphor-icons/react/Check";\n\nconst duplicate = cloneElement;\nexport const Cloned = () => duplicate(<CheckIcon weight="bold" />, { weight: "fill" });\n`,
			},
			["react", "react-dom", "@phosphor-icons/react"],
		);
		const output = await bundlers.vite(root);

		for (const file of ["src/mixed.jsx", "src/cloned.jsx"]) {
			expect(output.warnings).toContainEqual(
				expect.stringContaining(`${file} uses Phosphor icons in a way this plugin cannot read`),
			);
		}
	});

	test("keeps the usage of each Vite environment apart", async () => {
		const plugin = mantlePhosphorPrunePlugin();
		const transform = plugin.transform;
		const renderChunk = plugin.renderChunk;
		if (typeof transform !== "object" || typeof renderChunk !== "function") {
			throw new TypeError("the plugin has no transform or renderChunk hook");
		}
		const weightModule = path.join(
			await realpath(path.join(packageRoot, "node_modules/@phosphor-icons/react")),
			"dist/defs/Check.es.js",
		);
		const app = path.join(packageRoot, "app.jsx");
		/** A hook context of one environment, with only the members the plugin reads. */
		const context = (name: string) =>
			({
				environment: { name },
				getModuleIds: () => [weightModule, app].values(),
				getModuleInfo: () => null,
				warn: () => {},
			}) as never;
		const source = (weight: string) =>
			`import { CheckIcon } from "@phosphor-icons/react/Check";\nexport const a = <CheckIcon weight="${weight}" />;\n`;
		const defs = await readFile(weightModule, "utf8");
		/** The code of a hook result. */
		const codeOf = (result: unknown) =>
			typeof result === "object" && result != null && "code" in result ? String(result.code) : "";
		let marked = "";
		// Why interleaved: Vite can build two environments at once with one plugin instance.
		for (const [name, weight] of [
			["client", "bold"],
			["ssr", "thin"],
		] as const) {
			const result = await transform.handler.call(context(name), defs, weightModule);
			marked = codeOf(result) || marked;
			await transform.handler.call(context(name), source(weight), app);
		}
		const kept = async (name: string) => {
			const result = await renderChunk.call(context(name), marked, {} as never, {} as never, {
				chunks: {},
			});
			return [...codeOf(result).matchAll(/\[\s*"(\w+)"/g)].map((match) => match[1]);
		};

		expect(await kept("client")).toEqual(["bold"]);
		expect(await kept("ssr")).toEqual(["thin"]);
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
