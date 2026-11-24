import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "vite";

/**
 * One page shape the budget pins: the module source of a page entry that reads
 * the parts it renders, and the most gzip bytes its mantle JavaScript may cost.
 */
type Scenario = {
	entry: string;
	maxGzipBytes: number;
};

type Budget = Record<string, Scenario>;

/** The result of one scenario against its budget. */
type Verdict =
	| { kind: "over"; overBy: number }
	| { kind: "stale"; underBy: number }
	| { kind: "within" };

/**
 * How far a scenario may fall under its budget before the check asks for a
 * lower budget. A win that is not written down can come back unnoticed.
 */
const STALE_RATIO = 0.03;

/** The headroom `--update` adds over the measured size, in bytes. */
const UPDATE_HEADROOM = 64;

const PACKAGE_ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(PACKAGE_ROOT, "dist");
const BUDGET_FILE = path.join(PACKAGE_ROOT, "bundle-budget.json");
/** Where each scenario's build lands, so Node can import it and resolve React from the package. */
const OUT_DIR = path.join(PACKAGE_ROOT, "node_modules", ".cache", "bundle-budget");

/**
 * Compares a measured size with its budget. Pure, so the thresholds are testable.
 *
 * @example
 * ```ts
 * judge({ gzipBytes: 15_400, maxGzipBytes: 15_000 }); // { kind: "over", overBy: 400 }
 * ```
 */
const judge = ({
	gzipBytes,
	maxGzipBytes,
}: {
	gzipBytes: number;
	maxGzipBytes: number;
}): Verdict => {
	if (gzipBytes > maxGzipBytes) {
		return { kind: "over", overBy: gzipBytes - maxGzipBytes };
	}
	const underBy = maxGzipBytes - gzipBytes;
	if (underBy > maxGzipBytes * STALE_RATIO) {
		return { kind: "stale", underBy };
	}
	return { kind: "within" };
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

const gzipBytesOf = (code: readonly string[]): number =>
	code.length === 0 ? 0 : gzipSync(code.join("\n"), { level: 9 }).length;

/** The module URLs that Node loaded since the script started. */
const loadedUrls = new Set<string>();

/**
 * Imports a scenario's built entry in Node, as a page that renders nothing
 * yet, and returns the lazy chunks that the import loaded and the count of
 * workers it started. Why: a size split reads only the import graph, and a
 * dynamic import or a worker that runs at module scope is eager in fact.
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
	let workers = 0;
	const previousWorker = Object.getOwnPropertyDescriptor(globalThis, "Worker");
	// Why a stub: Node has no web `Worker`, and the check only counts the starts.
	Object.defineProperty(globalThis, "Worker", {
		configurable: true,
		writable: true,
		value: class {
			constructor() {
				workers += 1;
			}
			addEventListener() {}
			postMessage() {}
			terminate() {}
		},
	});
	try {
		await import(pathToFileURL(path.join(dir, entry)).href);
		// Why a wait: a dynamic import at module scope starts during the import and loads after it.
		await new Promise((resolve) => {
			setTimeout(resolve, 100);
		});
	} finally {
		if (previousWorker == null) {
			Reflect.deleteProperty(globalThis, "Worker");
		} else {
			Object.defineProperty(globalThis, "Worker", previousWorker);
		}
	}
	const lazyLoaded = lazy.filter((fileName) =>
		loadedUrls.has(pathToFileURL(path.join(dir, fileName)).href),
	);
	return { lazyLoaded, workers };
};

/**
 * Builds one entry the way a consumer's Vite production build does, with React
 * external, and returns the gzip size of its eager JavaScript and of its lazy
 * chunks. Why apart: a dynamic import or a worker, such as a grammar of the
 * code highlighter, costs a page nothing until it runs. It also returns the
 * lazy chunks and workers that an import of the entry loads at once.
 */
const measure = async (
	name: string,
	entry: string,
): Promise<{ gzipBytes: number; lazyGzipBytes: number; lazyLoaded: string[]; workers: number }> => {
	const virtualId = `\0bundle-budget:${name}`;
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
			// Why dist: the budget measures what consumers install, after the React
			// Compiler pass and the namespace rewrite.
			alias: [{ find: /^@ngrok\/mantle\/(.+)$/, replacement: `${DIST}/$1.js` }],
		},
		plugins: [
			{
				name: "bundle-budget-entry",
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
		entryChunk == null
			? { lazyLoaded: [], workers: 0 }
			: await loadOnImport({ dir, entry: entryChunk.fileName, lazy });
	return {
		gzipBytes: gzipBytesOf(eager.map((fileName) => codeOf.get(fileName) ?? "")),
		lazyGzipBytes: gzipBytesOf([...lazy.map((fileName) => codeOf.get(fileName) ?? ""), ...workers]),
		...onImport,
	};
};

const formatBytes = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;

const main = async (): Promise<void> => {
	if (!fs.existsSync(DIST)) {
		throw new Error("No dist: run `pnpm -F @ngrok/mantle run build` first.");
	}
	const update = process.argv.includes("--update");
	const budget: Budget = JSON.parse(fs.readFileSync(BUDGET_FILE, "utf8"));
	let failed = false;
	for (const [name, scenario] of Object.entries(budget)) {
		const { gzipBytes, lazyGzipBytes, lazyLoaded, workers } = await measure(name, scenario.entry);
		if (update) {
			// Why the cap: a small scenario with the full headroom is at once more than 3% under its budget.
			scenario.maxGzipBytes =
				gzipBytes + Math.min(UPDATE_HEADROOM, Math.floor(gzipBytes * STALE_RATIO));
		}
		const verdict = judge({ gzipBytes, maxGzipBytes: scenario.maxGzipBytes });
		const lazy = lazyGzipBytes > 0 ? `  (+${formatBytes(lazyGzipBytes)} lazy)` : "";
		const line = `${name.padEnd(24)} ${formatBytes(gzipBytes).padStart(9)} / ${formatBytes(scenario.maxGzipBytes)}${lazy}`;
		switch (verdict.kind) {
			case "over": {
				failed = true;
				console.log(`✗ ${line}  over by ${verdict.overBy} B`);
				break;
			}
			case "stale": {
				failed = true;
				console.log(`✗ ${line}  under by ${verdict.underBy} B: lower the budget`);
				break;
			}
			case "within": {
				console.log(`✓ ${line}`);
				break;
			}
			default: {
				throw new Error("Unknown verdict.");
			}
		}
		if (lazyLoaded.length > 0 || workers > 0) {
			failed = true;
			console.log(
				`✗ ${name}: an import with no render loads ${lazyLoaded.length} lazy chunks and starts ${workers} workers. Load them on first use.`,
			);
		}
	}
	if (update) {
		fs.writeFileSync(BUDGET_FILE, `${JSON.stringify(budget, null, 2)}\n`);
		console.log(`Wrote ${path.relative(process.cwd(), BUDGET_FILE)}.`);
		return;
	}
	if (failed) {
		console.log(
			"\nA scenario is off its budget. If the change is intended, run `pnpm -F @ngrok/mantle run check:bundle-budget --update` and commit bundle-budget.json.",
		);
		process.exitCode = 1;
	}
};

if (import.meta.main) {
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
	judge,
	splitChunks,
};
export type { Verdict };
