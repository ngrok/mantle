import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import MagicString from "magic-string";
import type { Plugin } from "vite";

/**
 * Options for {@link mantleSourcesPlugin}.
 */
type MantleSourcesPluginOptions = {
	/**
	 * What the build does when the client bundle holds a mantle or `include` file the CSS does
	 * not list. `"error"` fails the build and names the files. `"warn"` logs them and ships the
	 * CSS as is.
	 * @default "error"
	 */
	onMiss?: "error" | "warn";
	/**
	 * Extra package names whose reached modules the plugin lists next to mantle's.
	 * Pass a component package that sets Tailwind classes on mantle parts, because Tailwind
	 * skips `node_modules` on its own.
	 * @default []
	 */
	include?: string[];
	/**
	 * Print every listed file, one path per line, relative to the CSS file.
	 * @default false
	 */
	verbose?: boolean;
	/**
	 * How many milliseconds the CSS transform waits with no module event before it stops
	 * waiting and writes the files parsed so far. The bundle check still catches a file that
	 * loads later. When one module, such as a `?worker` sub-build, takes longer, raise it.
	 * `Infinity` waits for events only.
	 * @default 15000
	 */
	idleTimeoutMs?: number;
};

/**
 * The package the plugin computes `@source` directives for. Every other package in `include`
 * follows the same rules.
 */
const MANTLE_PACKAGE_NAME = "@ngrok/mantle";

/**
 * The stylesheet whose import the plugin replaces.
 */
const SOURCE_ALL_FILENAME = "source-all.css";

/**
 * How long the CSS transform waits with no module event before it stops waiting.
 * Without a limit, a module that fails to parse holds the build forever: the bundler waits
 * for the CSS transform, and the transform waits for that module.
 */
const DEFAULT_IDLE_TIMEOUT_MS = 15_000;

/**
 * The longest delay `setTimeout` accepts. A longer one fires after 1 ms.
 */
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * Matches one `@import` statement whose specifier ends with `source-all.css`.
 */
const SOURCE_ALL_IMPORT_PATTERN =
	/@import\s+(?:url\(\s*)?(["'])[^"'\n]*source-all\.css\1\s*\)?[^;\n]*;/;

/**
 * The client environment's module graph, as the plugin observes it through hooks.
 */
type ClientGraph = {
	/** Every module id whose `load` hook started. */
	seen: Set<string>;
	/** Module ids between the start of `load` and `moduleParsed`. */
	loading: Set<string>;
	/** Dependency ids a parsed module names before their own `load` starts, keyed to the importer. */
	expected: Map<string, string>;
	/** Dependency ids the resolver reported as external. They never load. */
	external: Set<string>;
	/** Dependency ids already classified through the resolver, external or not. */
	classified: Set<string>;
	/** CSS module ids held inside this plugin's transform. They parse only after the wait ends. */
	waiting: Set<string>;
	/** Callbacks that run on every `load` and `moduleParsed` event. */
	listeners: Set<() => void>;
	/** The module ids written into each rewritten CSS module, keyed by the CSS module id. */
	listedBy: Map<string, Set<string>>;
	/** The modules that were still pending when the wait gave up, or null when it did not. */
	stalled: string[] | null;
};

/**
 * What the client build reached, kept for the server environment's cross-check.
 */
type ClientBundle = {
	/** The modules from a listed package that the client bundle holds. */
	moduleIds: Set<string>;
	/** The modules every rewritten CSS scans. A late chunk or a stall leaves a module in `moduleIds` and not here. */
	listed: Set<string>;
};

/**
 * The subset of the rolldown plugin context the wait needs.
 */
type ResolveContext = {
	resolve(
		source: string,
		importer?: string,
	): Promise<{ id: string; external: boolean | "absolute" | "relative" } | null>;
};

/**
 * The names of the entries directly inside a directory, split by kind.
 */
type DirectoryListing = {
	files: string[];
	directories: string[];
};

/**
 * One `@source` directory and the entry names under it the CSS excludes.
 */
type SourceGroup = {
	directory: string;
	excluded: string[];
};

/**
 * The name and directory of the `package.json` nearest to a file.
 */
type PackageInfo = {
	name: string;
	dir: string;
};

/**
 * Creates the empty graph state the client build fills through {@link recordLoad} and
 * {@link recordParsed}.
 *
 * @example
 * ```ts
 * const graph = createClientGraph();
 * pendingIds(graph); // []
 * ```
 */
function createClientGraph(): ClientGraph {
	return {
		seen: new Set(),
		loading: new Set(),
		expected: new Map(),
		external: new Set(),
		classified: new Set(),
		waiting: new Set(),
		listeners: new Set(),
		listedBy: new Map(),
		stalled: null,
	};
}

function notify(graph: ClientGraph): void {
	for (const listener of graph.listeners) {
		listener();
	}
}

/**
 * Records that the bundler started to load `id`.
 *
 * @example
 * ```ts
 * const graph = createClientGraph();
 * recordLoad(graph, "/app/src/main.ts");
 * pendingIds(graph); // ["/app/src/main.ts"]
 * ```
 */
function recordLoad(graph: ClientGraph, id: string): void {
	graph.seen.add(id);
	graph.loading.add(id);
	graph.expected.delete(id);
	notify(graph);
}

/**
 * Records that the bundler parsed a module and resolved its imports. A dependency whose
 * own `load` has yet to start becomes expected, so the wait holds for it.
 *
 * @example
 * ```ts
 * const graph = createClientGraph();
 * recordLoad(graph, "/app/src/main.ts");
 * recordParsed(graph, {
 *   id: "/app/src/main.ts",
 *   importedIds: ["/app/src/app.css"],
 *   dynamicallyImportedIds: ["/app/src/route.ts"],
 * });
 * pendingIds(graph); // ["/app/src/app.css", "/app/src/route.ts"]
 * ```
 */
function recordParsed(
	graph: ClientGraph,
	info: { id: string; importedIds: readonly string[]; dynamicallyImportedIds: readonly string[] },
): void {
	graph.seen.add(info.id);
	graph.loading.delete(info.id);
	graph.expected.delete(info.id);
	for (const id of [...info.importedIds, ...info.dynamicallyImportedIds]) {
		if (!graph.seen.has(id) && !graph.expected.has(id)) {
			graph.expected.set(id, info.id);
		}
	}
	notify(graph);
}

/**
 * Reads the `name` of the `package.json` in `directory`, or null when there is none.
 */
function readPackageInfo(directory: string): PackageInfo | null {
	const manifestPath = path.join(directory, "package.json");
	if (!existsSync(manifestPath)) {
		return null;
	}
	try {
		const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
		if (
			typeof manifest === "object" &&
			manifest != null &&
			"name" in manifest &&
			typeof manifest.name === "string"
		) {
			return { name: manifest.name, dir: directory };
		}
	} catch {
		// Why swallow: a malformed `package.json` is not this plugin's error to raise. The locator
		// treats the directory as no package and keeps walking to the parent.
	}
	return null;
}

/**
 * Looks up the package that owns a file by the nearest `package.json` above it.
 * The locator caches each directory's answer, so a build reads each `package.json` once.
 */
function createPackageLocator(): (file: string) => PackageInfo | null {
	const byDirectory = new Map<string, PackageInfo | null>();

	function locate(directory: string): PackageInfo | null {
		const cached = byDirectory.get(directory);
		if (cached !== undefined) {
			return cached;
		}
		const info = readPackageInfo(directory);
		if (info != null) {
			byDirectory.set(directory, info);
			return info;
		}
		const parent = path.dirname(directory);
		const result = parent === directory ? null : locate(parent);
		byDirectory.set(directory, result);
		return result;
	}

	return (file) => locate(path.dirname(file));
}

/**
 * Strips the query from a module id and returns the file path, or null for a virtual id.
 */
function fileOf(id: string): string | null {
	if (id.startsWith("\0")) {
		return null;
	}
	const [file = ""] = id.split("?");
	return path.isAbsolute(file) ? file : null;
}

/**
 * Module extensions that never carry a class name Tailwind should keep: stylesheets, data, and
 * text. `scriptFileOf` drops `.d.ts` on its own, because `path.extname` reports `.ts` for it.
 * Every other module counts, so an `include` package's `.mdx` or `.vue` file stays in the list.
 */
const INERT_EXTENSIONS = new Set([
	".css",
	".scss",
	".sass",
	".less",
	".styl",
	".pcss",
	".json",
	".json5",
	".yaml",
	".yml",
	".toml",
	".txt",
]);

/**
 * Returns the file path of a module that runs in the bundle, or null for a virtual id, an id
 * with a query (`?raw` embeds the text and renders nothing), and an inert file.
 */
function scriptFileOf(id: string): string | null {
	if (id.includes("?")) {
		return null;
	}
	const file = fileOf(id);
	if (file == null || file.endsWith(".d.ts") || INERT_EXTENSIONS.has(path.extname(file))) {
		return null;
	}
	return file;
}

/**
 * How many module ids a warning or error lists before it collapses the rest into a count.
 */
const ID_LIST_LIMIT = 20;

/**
 * Shows at most {@link ID_LIST_LIMIT} module ids as list lines, then the count of the rest.
 */
function formatIdList(root: string, ids: readonly string[]): string {
	const shown = ids.slice(0, ID_LIST_LIMIT).map((id) => `  - ${displayPath(root, id)}`);
	const rest = ids.length - shown.length;
	return rest > 0 ? `${shown.join("\n")}\n  … and ${rest} more` : shown.join("\n");
}

/**
 * Module ids that are in flight: loading and not parsed, or named as a dependency and
 * neither started nor external. A CSS module held in this plugin's own transform does not
 * count, or two such modules wait for each other.
 *
 * @example
 * ```ts
 * const graph = createClientGraph();
 * recordLoad(graph, "/app/src/app.css");
 * graph.waiting.add("/app/src/app.css");
 * pendingIds(graph); // []
 * ```
 */
function pendingIds(graph: ClientGraph): string[] {
	const pending: string[] = [];
	for (const id of graph.loading) {
		if (!graph.waiting.has(id)) {
			pending.push(id);
		}
	}
	for (const id of graph.expected.keys()) {
		if (!graph.external.has(id)) {
			pending.push(id);
		}
	}
	return pending;
}

/**
 * Asks the resolver about each expected dependency whose `load` did not start.
 * An external one never loads, so the wait must not hold for it. A bare specifier that
 * resolves to another id, or to nothing, never loads under that id either.
 */
async function classifyExpected(graph: ClientGraph, context: ResolveContext): Promise<void> {
	for (const [id, importer] of graph.expected) {
		if (graph.classified.has(id)) {
			continue;
		}
		graph.classified.add(id);
		const resolved = await context.resolve(id, importer);
		const bare = fileOf(id) == null && !id.startsWith("\0");
		if (resolved == null ? bare : resolved.external !== false || (bare && resolved.id !== id)) {
			graph.external.add(id);
		}
	}
}

/**
 * Resolves with `"event"` on the next `load` or `moduleParsed` event, or with `"idle"` when
 * none arrives within `idleTimeoutMs`.
 */
function nextGraphEvent(graph: ClientGraph, idleTimeoutMs: number): Promise<"event" | "idle"> {
	return new Promise((resolve) => {
		const listener = () => {
			clearTimeout(timer);
			graph.listeners.delete(listener);
			resolve("event");
		};
		// Why the guard: `setTimeout` fires after 1 ms for `Infinity` or a delay past its limit.
		const timer =
			idleTimeoutMs > MAX_TIMEOUT_MS
				? undefined
				: setTimeout(() => {
						graph.listeners.delete(listener);
						resolve("idle");
					}, idleTimeoutMs);
		graph.listeners.add(listener);
	});
}

/**
 * Waits until every module the bundler started or named is parsed or external.
 * The bundler keeps loading the JavaScript graph while this CSS transform waits, so the wait
 * ends once the module phase is complete. When no event arrives for `idleTimeoutMs`, the
 * wait gives up, records the pending modules in `graph.stalled`, and resolves. A module that
 * fails to parse then holds the build only until that limit.
 *
 * @example
 * ```ts
 * const graph = createClientGraph();
 * recordLoad(graph, "/app/src/main.ts");
 * const settled = waitForGraph({ graph, context, idleTimeoutMs: 15_000 });
 * recordParsed(graph, { id: "/app/src/main.ts", importedIds: [], dynamicallyImportedIds: [] });
 * await settled;
 * ```
 */
async function waitForGraph(input: {
	graph: ClientGraph;
	context: ResolveContext;
	idleTimeoutMs: number;
}): Promise<void> {
	const { graph, context, idleTimeoutMs } = input;
	while (true) {
		await classifyExpected(graph, context);
		const pending = pendingIds(graph);
		if (pending.length === 0) {
			return;
		}
		const outcome = await nextGraphEvent(graph, idleTimeoutMs);
		if (outcome === "idle") {
			graph.stalled = pending;
			return;
		}
	}
}

/**
 * Converts a file path into the path an `@source` directive in `cssFile` needs.
 */
function toSourcePath(cssFile: string, file: string): string {
	const relative = path.relative(path.dirname(cssFile), file).split(path.sep).join("/");
	return relative.startsWith(".") ? relative : `./${relative}`;
}

/**
 * Turns a path into forward-slash form. Vite ids already use it; `node:path` on Windows does not.
 */
function toPosix(file: string): string {
	return file.split(path.sep).join("/");
}

/**
 * Escapes `*`, `?`, `[`, and `]` in one path segment, so the scanner matches a file name as
 * text. Returns null for a name the scanner cannot take as text: it brace-expands `{` and `}`,
 * drops a backslash, and a quote ends the CSS string.
 */
function escapeGlob(name: string): string | null {
	if (/[{}\\"]/.test(name)) {
		return null;
	}
	return name.replace(/[*?[\]]/g, "\\$&");
}

/**
 * Lists the entries directly inside `directory`. A symlink counts as what it points to.
 *
 * @example
 * ```ts
 * readDirectoryListing("/app/node_modules/@ngrok/mantle/dist");
 * // { files: ["badge.js", "badge.d.ts", …], directories: [] }
 * ```
 */
function readDirectoryListing(directory: string): DirectoryListing {
	const listing: DirectoryListing = { files: [], directories: [] };
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		let isFile = entry.isFile();
		let isDirectory = entry.isDirectory();
		if (entry.isSymbolicLink()) {
			try {
				const stats = statSync(path.join(directory, entry.name));
				isFile = stats.isFile();
				isDirectory = stats.isDirectory();
			} catch {
				// Why skip: a dangling link is nothing Tailwind can scan, so it needs no exclusion.
				continue;
			}
		}
		if (isFile) {
			listing.files.push(entry.name);
		} else if (isDirectory) {
			listing.directories.push(entry.name);
		}
	}
	listing.files.sort();
	listing.directories.sort();
	return listing;
}

/**
 * Groups the kept files by directory and names every neighbor the CSS must exclude: each
 * other file in that directory, and each subdirectory that holds no kept file. A directory
 * between a group and a kept file deeper down gets a group too, so the CSS excludes its own
 * neighbors as well.
 *
 * Why negations: Tailwind's scanner adds a file `@source` under the project root as its own
 * walk root with only a whitelist rule. It then scans the whole directory. A directory
 * `@source` plus one `@source not` per neighbor narrows the scan in every layout.
 *
 * @example
 * ```ts
 * planSourceGroups(["/m/dist/badge.js"], () => ({ files: ["badge.js", "table.js"], directories: [] }));
 * // [{ directory: "/m/dist", excluded: ["table.js"] }]
 * ```
 */
function planSourceGroups(
	keptFiles: readonly string[],
	readDirectory: (directory: string) => DirectoryListing,
): SourceGroup[] {
	// Why posix: Vite ids use forward slashes on every platform, and `path.join` on Windows
	// would join with a backslash and match none of them.
	const kept = new Set(keptFiles.map(toPosix));
	const keptDirectories = [...new Set([...kept].map((file) => path.posix.dirname(file)))];
	const roots = keptDirectories.filter(
		(directory) => !keptDirectories.some((other) => directory.startsWith(`${other}/`)),
	);
	const directories = new Set(keptDirectories);
	for (const directory of keptDirectories) {
		let parent = path.posix.dirname(directory);
		while (roots.some((root) => parent.startsWith(`${root}/`))) {
			directories.add(parent);
			parent = path.posix.dirname(parent);
		}
	}
	const hasKeptDescendant = (directory: string) => {
		const prefix = `${directory}/`;
		return [...kept].some((file) => file.startsWith(prefix));
	};
	return [...directories].toSorted().map((directory) => {
		const listing = readDirectory(directory);
		const excluded = [
			...listing.files.filter((name) => !kept.has(path.posix.join(directory, name))),
			...listing.directories.filter((name) => !hasKeptDescendant(path.posix.join(directory, name))),
		].toSorted();
		return { directory, excluded };
	});
}

/**
 * Replaces every `source-all.css` import in `code` with the `@source` directives for `groups`.
 * Returns null when `code` holds no such import. When `groups` is empty, it writes a comment
 * that says the bundle holds no mantle module. A neighbor whose name the scanner cannot take
 * as text stays in the scan.
 *
 * @example
 * ```ts
 * const result = rewriteSourceAllImports({
 *   code: '@import "tailwindcss";\n@import "@ngrok/mantle/source-all.css";\n',
 *   cssFile: "/app/src/app.css",
 *   groups: [{ directory: "/app/node_modules/@ngrok/mantle/dist", excluded: ["table.js"] }],
 * });
 * // result.code ===
 * //   '@import "tailwindcss";\n' +
 * //   '@source "../node_modules/@ngrok/mantle/dist";\n' +
 * //   '@source not "../node_modules/@ngrok/mantle/dist/table.js";\n'
 * ```
 */
function rewriteSourceAllImports(input: {
	code: string;
	cssFile: string;
	groups: readonly SourceGroup[];
}): { code: string; map: ReturnType<MagicString["generateMap"]> } | null {
	const { code, cssFile, groups } = input;
	const matches = [...code.matchAll(new RegExp(SOURCE_ALL_IMPORT_PATTERN.source, "g"))];
	if (matches.length === 0) {
		return null;
	}
	const directives =
		groups.length === 0
			? `/* mantle sources: the client bundle holds no ${MANTLE_PACKAGE_NAME} module */`
			: groups
					.flatMap((group) => {
						const directory = toSourcePath(cssFile, group.directory);
						return [
							`@source "${directory}";`,
							...group.excluded.flatMap((name) => {
								const escaped = escapeGlob(name);
								return escaped == null ? [] : [`@source not "${directory}/${escaped}";`];
							}),
						];
					})
					.join("\n");
	const source = new MagicString(code);
	for (const match of matches) {
		const start = match.index;
		source.overwrite(start, start + match[0].length, directives);
	}
	return { code: source.toString(), map: source.generateMap({ hires: true }) };
}

/**
 * Counts the files `source-all.css` makes Tailwind scan: everything under `dist` except the
 * stylesheets, which the scanner skips on its own. Returns null when the read fails.
 */
function countSourceAllFiles(mantleDir: string): number | null {
	try {
		return readdirSync(path.join(mantleDir, "dist"), {
			recursive: true,
			withFileTypes: true,
		}).filter((entry) => entry.isFile() && path.extname(entry.name) !== ".css").length;
	} catch {
		return null;
	}
}

/**
 * Formats the one-line build summary, for example
 * `mantle sources: 6 @ngrok/mantle files listed for src/app.css (source-all.css scans 248)`.
 *
 * @example
 * ```ts
 * formatSummary({
 *   cssPath: "src/app.css",
 *   counts: new Map([["@ngrok/mantle", 18], ["@pkg/ui", 2]]),
 *   sourceAllCount: 248,
 * });
 * // "mantle sources: 18 @ngrok/mantle files and 2 @pkg/ui files listed for src/app.css (source-all.css scans 248)"
 * ```
 */
function formatSummary(input: {
	cssPath: string;
	counts: ReadonlyMap<string, number>;
	sourceAllCount: number | null;
}): string {
	const parts = [...input.counts].map(
		([name, count]) => `${count} ${name} ${count === 1 ? "file" : "files"}`,
	);
	const listed = parts.length === 0 ? `0 ${MANTLE_PACKAGE_NAME} files` : parts.join(" and ");
	const scans =
		input.sourceAllCount == null ? "" : ` (${SOURCE_ALL_FILENAME} scans ${input.sourceAllCount})`;
	return `mantle sources: ${listed} listed for ${input.cssPath}${scans}`;
}

/**
 * Shows a module id relative to the project root when it sits inside the root, else as is.
 * A linked package resolves outside the root, and a `../../..` chain names nothing.
 */
function displayPath(root: string, id: string): string {
	const relative = path.relative(root, id);
	return relative.startsWith("..") || path.isAbsolute(relative) ? id : relative;
}

/**
 * Returns the module ids in `bundleIds` that `listed` does not hold, sorted.
 *
 * @example
 * ```ts
 * findMissing({
 *   bundleIds: new Set(["/m/badge.js", "/m/tooltip.js"]),
 *   listed: new Set(["/m/badge.js"]),
 * });
 * // ["/m/tooltip.js"]
 * ```
 */
function findMissing(input: {
	bundleIds: ReadonlySet<string>;
	listed: ReadonlySet<string>;
}): string[] {
	return [...input.bundleIds].filter((id) => !input.listed.has(id)).toSorted();
}

/**
 * Vite plugin that narrows mantle's Tailwind scan to the files the client bundle contains.
 *
 * In `vite dev` the plugin is inactive: `source-all.css` scans every mantle file, so Tailwind
 * styles every component the app can reach. In `vite build`, in the client environment, the
 * plugin reads the bundler's module graph. It replaces the `@import "@ngrok/mantle/source-all.css"`
 * line with `@source` directives for the `@ngrok/mantle` files the graph holds: one per
 * directory, plus an `@source not` for every neighbor outside the graph. A component that
 * arrives through a workspace package or a dynamic `import()` is in the graph, so it is in the
 * list. So is a chunk another plugin emits before the CSS transform. After the bundle is final,
 * the plugin compares the list with every chunk's modules. If a mantle file is in the bundle
 * and not in the CSS, the build fails and names the file; `onMiss: "warn"` downgrades that to a
 * warning.
 *
 * The server environment gets no rewrite. When one `vite build --app` run also builds the
 * server and bundles mantle into it (`ssr.noExternal`), the plugin warns about a mantle file
 * that only the server graph reaches. Such a component has no classes in the client CSS.
 *
 * The plugin must run in the same `vite build` as `@tailwindcss/vite`. Its position in the
 * `plugins` array does not matter.
 *
 * @see https://mantle.ngrok.com/vite-plugins#mantlesourcesplugin
 * @example
 * ```ts
 * // vite.config.ts
 * import { mantleSourcesPlugin } from "@ngrok/mantle-vite-plugins";
 * import tailwindcss from "@tailwindcss/vite";
 * import { defineConfig } from "vite";
 *
 * export default defineConfig({
 *   plugins: [tailwindcss(), mantleSourcesPlugin()],
 * });
 * ```
 */
function mantleSourcesPlugin(options: MantleSourcesPluginOptions = {}): Plugin {
	const {
		onMiss = "error",
		include = [],
		verbose = false,
		idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
	} = options;
	const listedPackages = new Set([MANTLE_PACKAGE_NAME, ...include]);
	const packageOf = createPackageLocator();

	let graph = createClientGraph();
	let clientBundle: ClientBundle | null = null;
	/** Server bundles that finished before the client one, keyed by environment name. */
	const pendingServerBundles = new Map<string, Set<string>>();

	function isListedModule(id: string): boolean {
		const file = scriptFileOf(id);
		if (file == null) {
			return false;
		}
		const info = packageOf(file);
		return info != null && listedPackages.has(info.name);
	}

	function mantleDirOf(ids: Iterable<string>): string | null {
		for (const id of ids) {
			const file = scriptFileOf(id);
			const info = file == null ? null : packageOf(file);
			if (info?.name === MANTLE_PACKAGE_NAME) {
				return info.dir;
			}
		}
		return null;
	}

	return {
		name: "vite-plugin-mantle-sources",
		apply: "build",
		// Why shared: `vite build --app` re-creates the plugin per environment by default. The
		// server environment's cross-check needs the instance that saw the client bundle.
		sharedDuringBuild: true,

		buildStart() {
			if (this.environment.name === "client") {
				graph = createClientGraph();
				clientBundle = null;
			}
			pendingServerBundles.delete(this.environment.name);
		},

		load: {
			// Why pre: a load hook that returns content stops the chain, so this one must run first
			// to see every module id.
			order: "pre",
			handler(id) {
				if (this.environment.name === "client") {
					recordLoad(graph, id);
				}
				return null;
			},
		},

		moduleParsed(info) {
			if (this.environment.name !== "client") {
				return;
			}
			recordParsed(graph, info);
		},

		transform: {
			// Why pre: `@tailwindcss/vite` compiles the CSS in its own transform. The rewrite has to land
			// before that, whatever the plugin array order.
			order: "pre",
			filter: {
				id: /\.css(?:\?.*)?$/,
				code: /source-all\.css/,
			},
			async handler(code, id) {
				if (this.environment.name !== "client") {
					return null;
				}
				const cssFile = fileOf(id);
				if (cssFile == null || !SOURCE_ALL_IMPORT_PATTERN.test(code)) {
					return null;
				}

				graph.waiting.add(id);
				try {
					await waitForGraph({ graph, context: this, idleTimeoutMs });
				} finally {
					graph.waiting.delete(id);
				}

				const listed = new Set<string>();
				for (const moduleId of graph.seen) {
					if (isListedModule(moduleId)) {
						listed.add(moduleId);
					}
				}
				graph.listedBy.set(id, listed);

				const moduleFiles = [...listed]
					.map((moduleId) => scriptFileOf(moduleId))
					.filter((file): file is string => file != null)
					.toSorted();
				const groups = planSourceGroups(moduleFiles, readDirectoryListing);
				const result = rewriteSourceAllImports({ code, cssFile, groups });
				if (result == null) {
					return null;
				}

				if (verbose) {
					const lines = moduleFiles.map((file) => `  ${toSourcePath(cssFile, file)}`);
					this.environment.logger.info(
						`mantle sources: ${path.relative(this.environment.config.root, cssFile)} lists\n${lines.join("\n")}`,
					);
				}
				return result;
			},
		},

		generateBundle(_outputOptions, bundle) {
			const environmentName = this.environment.name;
			const root = this.environment.config.root;
			const inBundle = new Set<string>();
			for (const output of Object.values(bundle)) {
				if (output.type !== "chunk") {
					continue;
				}
				for (const moduleId of output.moduleIds) {
					if (isListedModule(moduleId)) {
						inBundle.add(moduleId);
					}
				}
			}

			const warnServerOnly = (
				serverName: string,
				serverBundle: Set<string>,
				client: ClientBundle,
			) => {
				const serverOnly = findMissing({
					bundleIds: serverBundle,
					listed: new Set([...client.listed, ...client.moduleIds]),
				});
				if (serverOnly.length > 0) {
					this.warn(
						`mantle sources: the ${serverName} bundle holds ${serverOnly.length} listed file(s) the client bundle does not reach:\n${formatIdList(root, serverOnly)}\nA component rendered only from server code has no classes in the client CSS. Render it from a module the client also imports.`,
					);
				}
			};

			if (environmentName !== "client") {
				if (clientBundle == null) {
					// Why buffer: a builder can run this environment first. The client build compares then.
					pendingServerBundles.set(environmentName, inBundle);
					return;
				}
				warnServerOnly(environmentName, inBundle, clientBundle);
				return;
			}

			clientBundle = {
				moduleIds: inBundle,
				listed: new Set([...graph.listedBy.values()].flatMap((listed) => [...listed])),
			};
			for (const [serverName, serverBundle] of pendingServerBundles) {
				warnServerOnly(serverName, serverBundle, clientBundle);
			}
			pendingServerBundles.clear();

			if (graph.listedBy.size === 0) {
				if (inBundle.size > 0) {
					this.warn(
						`mantle sources: no CSS module that Vite processes holds the \`@import "${MANTLE_PACKAGE_NAME}/${SOURCE_ALL_FILENAME}";\` line, so the plugin changed nothing. Put that line in the CSS entry itself, next to mantle.css, not in a file a nested @import pulls in.`,
					);
				}
				return;
			}

			const stall =
				graph.stalled == null
					? null
					: `The wait for the module graph ended after ${idleTimeoutMs / 1000}s with no progress while ${graph.stalled.length} module(s) were still pending:\n${formatIdList(root, graph.stalled)}`;
			if (stall != null) {
				this.warn(
					`mantle sources: the CSS lists the files parsed before the wait gave up.\n${stall}\nA slow module can be the cause. Pass \`idleTimeoutMs\` to wait longer.`,
				);
			}

			const mantleDir = mantleDirOf(inBundle.size > 0 ? inBundle : graph.seen);
			const sourceAllCount = mantleDir == null ? null : countSourceAllFiles(mantleDir);

			for (const [cssId, listed] of graph.listedBy) {
				const cssFile = fileOf(cssId) ?? cssId;
				const cssPath = path.relative(root, cssFile);
				const missing = findMissing({ bundleIds: inBundle, listed });
				if (missing.length > 0) {
					const cause =
						stall == null
							? 'A plugin added the module after the CSS transform ran. Move that plugin\'s emit earlier, or pass `onMiss: "warn"` to ship the CSS without those classes.'
							: `The wait for the module graph gave up before these modules parsed. Pass \`idleTimeoutMs\` to wait longer, or pass \`onMiss: "warn"\` to ship the CSS without those classes.`;
					const message = `mantle sources: the client bundle holds ${missing.length} listed file(s) that ${cssPath} does not list:\n${formatIdList(root, missing)}\n${cause}`;
					if (onMiss === "error") {
						this.error(message);
					} else {
						this.warn(message);
					}
				}

				// Why seeded: the summary names mantle first and then each `include` entry in the
				// order the consumer wrote, whatever order the bundler loaded the files in.
				const counts = new Map<string, number>([[MANTLE_PACKAGE_NAME, 0]]);
				for (const moduleId of listed) {
					const file = scriptFileOf(moduleId);
					const info = file == null ? null : packageOf(file);
					if (info != null) {
						counts.set(info.name, (counts.get(info.name) ?? 0) + 1);
					}
				}
				for (const name of include) {
					if (!counts.has(name)) {
						counts.set(name, 0);
					}
				}
				this.environment.logger.info(formatSummary({ cssPath, counts, sourceAllCount }));
			}
		},
	};
}

export {
	//,
	createClientGraph,
	findMissing,
	formatIdList,
	formatSummary,
	mantleSourcesPlugin,
	pendingIds,
	planSourceGroups,
	readDirectoryListing,
	recordLoad,
	recordParsed,
	rewriteSourceAllImports,
	waitForGraph,
};

export type {
	//,
	MantleSourcesPluginOptions,
};
