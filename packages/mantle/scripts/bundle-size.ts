import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { Window } from "happy-dom";
import { build } from "vite";

/** Each scenario: the module source of a page entry that reads the parts it renders. */
type Scenarios = Record<string, string>;

/** The gzip bytes of each scenario's eager mantle JavaScript, by name. */
type Sizes = Record<string, number>;

const PACKAGE_ROOT = path.resolve(import.meta.dirname, "..");
const SCENARIO_FILE = path.join(PACKAGE_ROOT, "bundle-size.json");
/** Where each scenario's build lands, so Node can import it and resolve React from the package. */
const OUT_DIR = path.join(PACKAGE_ROOT, "node_modules", ".cache", "bundle-size");

/** Reads the value after a flag, such as `--dist ../base/dist`. */
const flag = (name: string): string | undefined => {
	const index = process.argv.indexOf(name);
	return index === -1 ? undefined : process.argv[index + 1];
};

const DIST = path.resolve(flag("--dist") ?? path.join(PACKAGE_ROOT, "dist"));

const formatBytes = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;

/**
 * Formats a Markdown table that compares each scenario's size on the base
 * branch with its size on the pull request. Pure, so the format is testable.
 * A scenario with no base size, such as a new one, shows a dash.
 *
 * @example
 * ```ts
 * formatReport({ base: { button: 1000 }, head: { button: 1100 } });
 * // | `button` | 1000 B | 1100 B | +100 B (+10.0%) |
 * ```
 */
const formatReport = ({ base, head }: { base: Sizes; head: Sizes }): string => {
	const rows = Object.entries(head).map(([name, bytes]) => {
		const before = base[name];
		if (before == null) {
			return `| \`${name}\` | — | ${bytes} B | new |`;
		}
		const delta = bytes - before;
		const sign = delta > 0 ? "+" : "";
		const change =
			delta === 0 ? "0 B" : `${sign}${delta} B (${sign}${((delta / before) * 100).toFixed(1)}%)`;
		return `| \`${name}\` | ${before} B | ${bytes} B | ${change} |`;
	});
	const total = Object.values(head).reduce((sum, bytes) => sum + bytes, 0);
	const totalBase = Object.entries(head).reduce((sum, [name]) => sum + (base[name] ?? 0), 0);
	return [
		"## Bundle size",
		"",
		"Gzip bytes of the mantle JavaScript that each scenario loads before render, built the way a consumer's Vite production build does. This report does not block a merge.",
		"",
		"| Scenario | Base | This PR | Change |",
		"| --- | --- | --- | --- |",
		...rows,
		"",
		`Sum of all scenarios: ${formatBytes(totalBase)} → ${formatBytes(total)}.`,
		"",
	].join("\n");
};

/** A chunk of a build: its code and the chunks it imports. */
type BuiltChunk = { fileName: string; code: string; isEntry: boolean; imports: readonly string[] };

/**
 * Splits the chunks of a build, by file name, into eager code, which the entry and its static
 * imports load before the page runs, and lazy code: dynamic imports and
 * workers. Pure, so the split is testable.
 *
 * @example
 * ```ts
 * splitChunks([
 *   { fileName: "entry.js", code: "a", isEntry: true, imports: ["shared.js"] },
 *   { fileName: "shared.js", code: "b", isEntry: false, imports: [] },
 *   { fileName: "grammar.js", code: "c", isEntry: false, imports: ["shared.js"] },
 * ]); // { eager: ["entry.js", "shared.js"], lazy: ["grammar.js"] }
 * ```
 */
const splitChunks = (chunks: readonly BuiltChunk[]): { eager: string[]; lazy: string[] } => {
	const byName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));
	const eager = new Set<string>();
	const visit = (fileName: string) => {
		const chunk = byName.get(fileName);
		if (chunk == null || eager.has(fileName)) {
			return;
		}
		eager.add(fileName);
		for (const imported of chunk.imports) {
			visit(imported);
		}
	};
	for (const chunk of chunks) {
		if (chunk.isEntry) {
			visit(chunk.fileName);
		}
	}
	return {
		eager: chunks.filter((chunk) => eager.has(chunk.fileName)).map((chunk) => chunk.fileName),
		lazy: chunks.filter((chunk) => !eager.has(chunk.fileName)).map((chunk) => chunk.fileName),
	};
};

/** The gzip size of each file, summed. Why each apart: a browser fetches each chunk as its own file. */
const gzipBytesOf = (code: readonly string[]): number =>
	code.reduce((total, file) => total + gzipSync(file, { level: 9 }).length, 0);

/** The module URLs that Node loaded since the script started. */
const loadedUrls = new Set<string>();
/** The workers that started since the script started. */
let workerStarts = 0;

/**
 * Makes Node look like a browser page that renders nothing yet: a `window`
 * and a `document`, so a `canUseDOM()` guard takes its browser branch, and a
 * `Worker` stub that counts starts. Why for the whole run: a timer that an
 * import starts can load a chunk or start a worker after the import ends.
 */
const stubBrowser = (): void => {
	// Why happy-dom: modules read browser globals such as `HTMLElement` when they load.
	const page = new Window({ url: "https://localhost/" });
	for (const name of Object.getOwnPropertyNames(page)) {
		if (!(name in globalThis)) {
			Object.defineProperty(globalThis, name, {
				configurable: true,
				writable: true,
				value: Reflect.get(page, name),
			});
		}
	}
	Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: page });
	Object.defineProperty(globalThis, "document", {
		configurable: true,
		writable: true,
		value: page.document,
	});
	Object.defineProperty(globalThis, "Worker", {
		configurable: true,
		writable: true,
		value: class {
			constructor() {
				workerStarts += 1;
			}
			addEventListener() {}
			postMessage() {}
			terminate() {}
		},
	});
};

/** The lazy chunks of a scenario that Node loaded. */
const loadedLazy = (dir: string, lazy: readonly string[]): string[] =>
	lazy.filter((fileName) => loadedUrls.has(pathToFileURL(path.join(dir, fileName)).href));

/**
 * Imports a scenario's built entry, as a page that renders nothing yet, and
 * returns the lazy chunks that the import loaded and the count of workers it
 * started. Why: a size split reads only the import graph, and a dynamic import
 * or a worker that runs at module scope is eager in fact.
 */
const loadOnImport = async ({
	dir,
	entry,
	lazy,
}: {
	dir: string;
	entry: string;
	lazy: readonly string[];
}): Promise<{ lazyLoaded: string[]; workers: number }> => {
	const startsBefore = workerStarts;
	await import(pathToFileURL(path.join(dir, entry)).href);
	// Why a wait: a dynamic import at module scope starts during the import and loads after it.
	await new Promise((resolve) => {
		setTimeout(resolve, 100);
	});
	return { lazyLoaded: loadedLazy(dir, lazy), workers: workerStarts - startsBefore };
};

/**
 * Builds one entry the way a consumer's Vite production build does, with React
 * external, and returns the gzip size of its eager JavaScript and of its lazy
 * chunks. Why apart: a dynamic import or a worker, such as a grammar of the
 * code highlighter, costs a page nothing until it runs. It also returns the
 * lazy chunks and workers that an import of the entry loads at once.
 */
const measure = async ({
	name,
	entry,
	checkImports,
}: {
	name: string;
	entry: string;
	checkImports: boolean;
}): Promise<{
	gzipBytes: number;
	lazyGzipBytes: number;
	lazyLoaded: string[];
	workers: number;
	dir: string;
	lazy: string[];
}> => {
	const virtualId = `\0bundle-size:${name}`;
	const output = await build({
		configFile: false,
		logLevel: "silent",
		build: {
			write: false,
			minify: true,
			modulePreload: false,
			rolldownOptions: {
				input: virtualId,
				external: [/^react($|\/)/, /^react-dom($|\/)/],
				preserveEntrySignatures: "strict",
			},
		},
		// Why a worker build like the page's: a worker is lazy code, and its own chunks stay out of the entry.
		worker: { format: "es" },
		resolve: {
			// Why dist: the report measures what consumers install, after the React
			// Compiler pass and the namespace rewrite.
			alias: [{ find: /^@ngrok\/mantle\/(.+)$/, replacement: `${DIST}/$1.js` }],
		},
		plugins: [
			{
				name: "bundle-size-entry",
				resolveId: (id) => (id === virtualId ? id : undefined),
				load: (id) => (id === virtualId ? entry : undefined),
			},
		],
	});
	const results = Array.isArray(output) ? output : [output];
	const files = results.flatMap((result) => ("output" in result ? result.output : []));
	const chunks: BuiltChunk[] = files.flatMap((file) =>
		file.type === "chunk"
			? [{ fileName: file.fileName, code: file.code, isEntry: file.isEntry, imports: file.imports }]
			: [],
	);
	// Why the assets: Vite emits a worker's bundle as an asset, and it is lazy code.
	const workers = files.flatMap((file) =>
		file.type === "asset" && file.fileName.endsWith(".js") ? [String(file.source)] : [],
	);
	const { eager, lazy } = splitChunks(chunks);
	const codeOf = new Map(chunks.map((chunk) => [chunk.fileName, chunk.code]));
	const dir = path.join(OUT_DIR, name);
	fs.rmSync(dir, { recursive: true, force: true });
	for (const file of files) {
		const target = path.join(dir, file.fileName);
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(target, file.type === "chunk" ? file.code : file.source);
	}
	const entryChunk = chunks.find((chunk) => chunk.isEntry);
	const onImport =
		entryChunk == null || !checkImports
			? { lazyLoaded: [], workers: 0 }
			: await loadOnImport({ dir, entry: entryChunk.fileName, lazy });
	return {
		gzipBytes: gzipBytesOf(eager.map((fileName) => codeOf.get(fileName) ?? "")),
		lazyGzipBytes: gzipBytesOf([...lazy.map((fileName) => codeOf.get(fileName) ?? ""), ...workers]),
		...onImport,
		dir,
		lazy,
	};
};

const readSizes = (file: string): Sizes => JSON.parse(fs.readFileSync(file, "utf8"));

const main = async (): Promise<void> => {
	const compare = flag("--compare");
	if (compare != null) {
		const head = flag("--head");
		if (head == null) {
			throw new Error("--compare <base.json> needs --head <head.json>.");
		}
		console.log(formatReport({ base: readSizes(compare), head: readSizes(head) }));
		return;
	}
	if (!fs.existsSync(DIST)) {
		throw new Error(`No dist at ${DIST}: build @ngrok/mantle first.`);
	}
	// Why only for the package's own dist: a base dist is for sizes, and its import checks ran on its own branch.
	const checkImports = flag("--dist") == null;
	const scenarios: Scenarios = JSON.parse(fs.readFileSync(SCENARIO_FILE, "utf8"));
	const sizes: Sizes = {};
	let loadsOnImport = false;
	const lazyByScenario: { name: string; dir: string; lazy: string[]; loaded: number }[] = [];
	for (const [name, entry] of Object.entries(scenarios)) {
		let result: Awaited<ReturnType<typeof measure>>;
		try {
			result = await measure({ name, entry, checkImports });
		} catch (error) {
			// Why: a base dist has no export for a part that the pull request adds.
			if (checkImports) {
				throw error;
			}
			console.log(`- ${name.padEnd(24)} not in this dist`);
			continue;
		}
		const { gzipBytes, lazyGzipBytes, lazyLoaded, workers, dir, lazy: lazyFiles } = result;
		sizes[name] = gzipBytes;
		lazyByScenario.push({ name, dir, lazy: lazyFiles, loaded: lazyLoaded.length });
		const lazy = lazyGzipBytes > 0 ? `  (+${formatBytes(lazyGzipBytes)} lazy)` : "";
		console.log(`  ${name.padEnd(24)} ${formatBytes(gzipBytes).padStart(9)}${lazy}`);
		if (lazyLoaded.length > 0 || workers > 0) {
			loadsOnImport = true;
			console.log(
				`✗ ${name}: an import with no render loads ${lazyLoaded.length} lazy chunks and starts ${workers} workers. Load them on first use.`,
			);
		}
	}
	const json = flag("--json");
	if (json != null) {
		fs.writeFileSync(json, `${JSON.stringify(sizes, null, 2)}\n`);
	}
	if (!checkImports) {
		return;
	}
	const workersBefore = workerStarts;
	// Why a last check: a timer that an import started can load a chunk or start a worker later.
	await new Promise((resolve) => {
		setTimeout(resolve, 1000);
	});
	for (const { name, dir, lazy: lazyFiles, loaded } of lazyByScenario) {
		const late = loadedLazy(dir, lazyFiles).length - loaded;
		if (late > 0) {
			loadsOnImport = true;
			console.log(`✗ ${name}: an import with no render loads ${late} lazy chunks after a delay.`);
		}
	}
	if (workerStarts > workersBefore) {
		loadsOnImport = true;
		console.log(`✗ ${workerStarts - workersBefore} workers start after a delay, with no render.`);
	}
	if (loadsOnImport) {
		console.log("\nAn import with no render loads lazy code. Load it on first use.");
		process.exitCode = 1;
	}
};

if (import.meta.main) {
	stubBrowser();
	registerHooks({
		load(url, context, nextLoad) {
			loadedUrls.add(url);
			return nextLoad(url, context);
		},
	});
	await main();
}

export {
	//,
	formatReport,
	gzipBytesOf,
	splitChunks,
};
