import fs from "node:fs";
import { defineConfig } from "tsdown";

// Why a relative path: `@ngrok/mantle-vite-plugins` depends on `@ngrok/mantle`, so a package
// dependency here would make a build cycle.
import { mantlePhosphorPrunePlugin } from "../mantle-vite-plugins/src/mantle-phosphor-prune-plugin.ts";
import { compileReact } from "./react-compiler.config.ts";
import { compoundNamespaces, distName } from "./scripts/compound-namespaces.ts";
import { foldCxPlugin } from "./scripts/fold-cx.ts";
import { preserveUseClient } from "./scripts/preserve-use-client.ts";

const MANTLE_CSS_SRC = new URL("./src/mantle.css", import.meta.url);
const SOURCE_ALL_CSS_SRC = new URL("./src/source-all.css", import.meta.url);

/**
 * A set of package names that should not be published to npm.
 * `chart` is the internal shared engine behind
 * bar-chart/line-chart/area-chart/scatter-plot (the dialog/list `primitive`
 * pattern, one directory up). It is bundled into its consumers, never a subpath.
 */
const doNotPublish = new Set<string>(["portal", "chart"]);

/**
 * A set of package names that shouldn't be released yet
 */
const unreleasedPackages = new Set<string>([]);

const componentPath = (name: string) => `./src/components/${name}/index.ts` as const;
const utilPath = (name: string) => `./src/utils/${name}/index.ts` as const;

const allComponents = fs
	.readdirSync("src/components", { withFileTypes: true })
	.filter((dirent) => dirent.isDirectory())
	.map((dirent) => dirent.name);

// Why the index check: a util directory with no `index.ts`, such as `float`,
// is internal and builds into the components that import it.
const allUtils = fs
	.readdirSync("src/utils", { withFileTypes: true })
	.filter((dirent) => dirent.isDirectory() && fs.existsSync(utilPath(dirent.name)))
	.map((dirent) => dirent.name);

const componentPackages = allComponents
	// filter only the publishable component packages then map them to the build entry object
	.filter((packageName) => !doNotPublish.has(packageName) && !unreleasedPackages.has(packageName))
	.reduce<Record<string, string>>((acc, name) => {
		acc[name] = componentPath(name);
		return acc;
	}, {});

/**
 * Util directories that are consolidated into the `./utils` export and
 * should not be built as individual entry points.
 */
const consolidatedIntoUtils = new Set<string>(["compose-refs", "sorting"]);

/**
 * The subpath directories one level inside a published component, such as
 * `dialog/native` for `@ngrok/mantle/dialog/native`. Each one builds as a flat
 * dist entry (`dialog-native.js`).
 */
const subpathDirs = Object.keys(componentPackages).flatMap((name) =>
	fs
		.readdirSync(`src/components/${name}`, { withFileTypes: true })
		.filter(
			(dirent) =>
				dirent.isDirectory() && fs.existsSync(`src/components/${name}/${dirent.name}/index.ts`),
		)
		.map((dirent) => `${name}/${dirent.name}`),
);

const subpathPackages = Object.fromEntries(
	subpathDirs.map((dir) => [distName(dir), `./src/components/${dir}/index.ts`]),
);

/** Each compound component's parts entry and the plugin that keeps its namespace shakeable. */
const compoundParts = compoundNamespaces({
	componentsDir: "./src/components",
	dirs: [...Object.keys(componentPackages), ...subpathDirs],
});

const utilPackages = allUtils
	.filter((name) => !consolidatedIntoUtils.has(name))
	.reduce<Record<string, string>>((acc, name) => {
		acc[name] = utilPath(name);
		return acc;
	}, {});

/** Matches the mantle source modules the React Compiler pass transforms. */
const REACT_COMPILER_SOURCE_RE = /[\\/]src[\\/].+\.tsx?$/;

/**
 * Matches the declaration modules the dts build derives from each source
 * module. `rolldown-plugin-dts` renames `foo.ts` to `foo.d.ts` and runs the
 * declaration text through the same `transform` hooks. Why the exclude: oxc
 * reads a `.d.ts` filename as declaration-only input and emits `export {}`,
 * which empties every published `.d.ts`.
 */
const DECLARATION_MODULE_RE = /\.d\.[cm]?ts$/;

/**
 * Compiles components and hooks with the React Compiler, so the published
 * dist ships memoized output. App-level compilation never reaches
 * `node_modules`, so this pass is the only way consumers get compiled
 * mantle components. The vitest config runs the same compiler over `src`,
 * which keeps the tested code equal to the shipped code. React 19 carries
 * `react/compiler-runtime`, so the emitted import resolves for every
 * consumer the peer range allows.
 *
 * Why `oxc-transform-react`: the Rust port of the compiler runs far faster
 * than the Babel plugin and strips TypeScript in the same pass. JSX stays in
 * the output (`jsx: "preserve"`), so rolldown's own JSX transform still runs
 * with the tsconfig settings. `compileReact` holds the strict settings and
 * the memo-free rule that all three compiler passes share.
 */
const reactCompiler = () => ({
	name: "react-compiler",
	transform: {
		filter: { id: { include: REACT_COMPILER_SOURCE_RE, exclude: DECLARATION_MODULE_RE } },
		handler: async (code: string, id: string) => {
			return compileReact(id, code);
		},
	},
});

/** An import from a Phosphor icon module of its shared runtime, such as `../lib/IconBase.es.js`. */
const PHOSPHOR_ICON_MODULE_RE = /[\\/]@phosphor-icons[\\/]react[\\/]dist[\\/](?:csr|ssr)[\\/]/;
const PHOSPHOR_RUNTIME_IMPORT_RE = /^\.\.\/lib\/(\w+)\.es\.js$/;

/**
 * Keeps Phosphor's runtime (`IconBase` and `IconContext`) an import of the peer dependency, while
 * the build bundles the icon modules that `mantlePhosphorPrunePlugin` trims to the weights mantle
 * renders. Why: an app's `IconContext` and its own icons then share one runtime with mantle's icons.
 */
const phosphorRuntimeExternal = () => ({
	name: "phosphor-runtime-external",
	resolveId(source: string, importer: string | undefined) {
		const runtime = PHOSPHOR_RUNTIME_IMPORT_RE.exec(source);
		return importer != null && runtime != null && PHOSPHOR_ICON_MODULE_RE.test(importer)
			? { id: `@phosphor-icons/react/dist/lib/${runtime[1]}`, external: true }
			: null;
	},
});

/** Extracts the owning component directory from a module id. */
const COMPONENT_DIR_RE = /[\\/]src[\\/]components[\\/]([^\\/]+)[\\/]/;

/**
 * Returns the single component directory that owns every component module in
 * a code-split chunk, or `null` when the chunk contains no component modules
 * or mixes modules from multiple component directories.
 *
 * Why: per-component `@source "<name>-*.js"` globs (hand-written, or injected
 * by published 1.x versions of the retired `mantleTwSourcePlugin` in
 * `@ngrok/mantle-vite-plugins`) only match dist files named after a component.
 * Rolldown's default chunk naming picks an arbitrary module inside the chunk
 * (the shared chart engine became `primitive-<hash>.js`, and the list family's
 * shared primitive became `virtual-<hash>.js`). No per-component glob matched
 * those names, so Tailwind never scanned the classes inside and consumers got
 * unstyled components. Naming shared chunks after their owning component
 * directory keeps every class inside a glob-matchable file (chart's engine
 * chunk becomes `chart-<hash>.js`, like dialog's `dialog-<hash>.js`).
 */
function owningComponentDir(moduleIds: readonly string[]): string | null {
	let owner: string | null = null;
	for (const moduleId of moduleIds) {
		const match = COMPONENT_DIR_RE.exec(moduleId);
		if (!match) {
			continue;
		}
		const dir = match[1] ?? null;
		if (owner == null) {
			owner = dir;
		} else if (owner !== dir) {
			return null;
		}
	}
	return owner;
}

export default defineConfig((options) => [
	{
		dts: true,
		// if we set this to true, it will "race" between the two builds and wipe away type declarations
		// for one of the builds. rm -rf dist is run as a "prebuild" script to avoid this issue
		clean: false,
		minify: true,
		// Don't ship source maps: they were ~58% of the published package and
		// embed the full source via `sourcesContent`, despite `src/` not being
		// published. Consumers debug against the minified bundle; agents read the
		// typed `.d.ts` surface and the offline discovery artifacts the pack step
		// writes (dist/agent.json, dist/llms.txt), not decoded map JSON.
		sourcemap: false,
		target: "ES2025",
		tsconfig: "tsconfig.build.json",
		fixedExtension: false,
		format: "esm",
		deps: {
			// Why: the bundle holds each icon with only the weights mantle renders (see phosphorRuntimeExternal).
			alwaysBundle: [/^@phosphor-icons\/react\/(?!dist\/lib\/)/],
			onlyBundle: ["@phosphor-icons/react"],
			dts: { alwaysBundle: [] },
		},
		plugins: [
			phosphorRuntimeExternal(),
			mantlePhosphorPrunePlugin(),
			compoundParts.plugin,
			preserveUseClient({
				serverEntries: ["color.js", "cx.js", "types.js", "utils.js"],
				browserOnlyExports: [
					//,
					"getPrefersReducedMotion", // window.matchMedia
					"isDialogOverlayTarget", // HTMLElement
					"makeToast", // the sonner toast store
					"readThemeFromHtmlElement", // document
				],
			}),
			// Before the React Compiler: it must see the folded `cx` calls (see `scripts/fold-cx.ts`).
			foldCxPlugin(),
			reactCompiler(),
		],
		outputOptions: {
			// Name shared chunks after their owning component directory so
			// per-component `@source "<name>-*.js"` globs match them (see
			// owningComponentDir). Chunks without a single owning component keep
			// their name up to the first `~`: an `entriesAware` chunk group appends
			// `~<entry>` for each entry, which would repeat in every import of it.
			chunkFileNames: (chunk) => {
				const owner = owningComponentDir(chunk.moduleIds);
				if (owner != null) {
					return `${owner}-[hash].js`;
				}
				// The `[name]` pattern, not the name itself: rolldown-plugin-dts rewrites it for declaration chunks.
				return chunk.name.includes("~")
					? `${chunk.name.split("~")[0]}-[hash].js`
					: "[name]-[hash].js";
			},
		},
		entry: {
			...componentPackages,
			...subpathPackages,
			...compoundParts.entries,
			...utilPackages,
			"code-block_highlight-utils": "./src/components/code-block/highlight-utils.ts",
			hooks: "./src/hooks/index.ts",
			types: "./src/types/index.ts",
			utils: "./src/utils/index.ts",
		},
		onSuccess: async () => {
			try {
				await Promise.all([
					fs.promises.copyFile(MANTLE_CSS_SRC, "./dist/mantle.css"),
					fs.promises.copyFile(SOURCE_ALL_CSS_SRC, "./dist/source-all.css"),
				]);
			} catch (error) {
				console.error("Failed to populate dist:", error);
				throw error;
			}
		},
		...options,
	},
]);
