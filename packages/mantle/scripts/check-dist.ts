import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { parseSync } from "oxc-parser";

const PACKAGE_ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(PACKAGE_ROOT, "dist");

/**
 * Finds each import cycle in a graph of files, as the path from a file back to
 * itself. Each cycle shows once, from the first file of the cycle that the
 * walk reaches.
 *
 * Why: in Node's unbundled ESM, a chunk that reads a binding of a chunk that
 * imports it throws a `ReferenceError` when the module loads. Bundlers hide
 * the cycle, so only a check of the dist finds it.
 *
 * @example
 * findCycles(new Map([["a.js", ["b.js"]], ["b.js", ["a.js"]], ["c.js", ["a.js"]]]));
 * // => [["a.js", "b.js", "a.js"]]
 */
function findCycles(imports: ReadonlyMap<string, readonly string[]>): string[][] {
	const cycles: string[][] = [];
	const done = new Set<string>();
	const stack: string[] = [];
	const visit = (file: string) => {
		const index = stack.indexOf(file);
		if (index !== -1) {
			cycles.push([...stack.slice(index), file]);
			return;
		}
		if (done.has(file)) {
			return;
		}
		stack.push(file);
		for (const imported of imports.get(file) ?? []) {
			visit(imported);
		}
		stack.pop();
		done.add(file);
	};
	for (const file of imports.keys()) {
		visit(file);
	}
	return cycles;
}

/** Reads the static relative imports and re-exports of each dist chunk. */
function readChunkImports(dist: string): Map<string, string[]> {
	const imports = new Map<string, string[]>();
	for (const file of fs.readdirSync(dist).filter((name) => name.endsWith(".js"))) {
		const { module } = parseSync(file, fs.readFileSync(path.join(dist, file), "utf8"));
		const sources = [
			...module.staticImports.map((entry) => entry.moduleRequest.value),
			...module.staticExports.flatMap((entry) =>
				entry.entries.map((exported) => exported.moduleRequest?.value),
			),
		];
		imports.set(file, [
			...new Set(
				sources
					.filter((source) => source?.startsWith("./") === true)
					.map((source) => path.basename(source ?? "")),
			),
		]);
	}
	return imports;
}

/** Lists each public JavaScript subpath of the package, such as `@ngrok/mantle/field`. */
function publicSubpaths(): string[] {
	const manifest: { name: string; exports: Record<string, string | { import?: string }> } =
		JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8"));
	return Object.entries(manifest.exports)
		.filter(([, target]) => typeof target === "object" && target.import?.endsWith(".js") === true)
		.map(([subpath]) => `${manifest.name}${subpath.slice(1)}`);
}

/**
 * Fails when the dist has a chunk cycle, or when a public subpath does not load
 * in plain Node ESM, with no bundler. Server rendering that externalizes
 * `@ngrok/mantle` loads the dist this way.
 */
const main = async (): Promise<void> => {
	if (!fs.existsSync(DIST)) {
		throw new Error("No dist: run `pnpm -F @ngrok/mantle run build` first.");
	}
	let failed = false;
	const cycles = findCycles(readChunkImports(DIST));
	for (const cycle of cycles) {
		failed = true;
		console.log(`✗ chunk cycle: ${cycle.join(" -> ")}`);
	}
	const subpaths = publicSubpaths();
	for (const subpath of subpaths) {
		try {
			await import(subpath);
		} catch (error) {
			failed = true;
			console.log(`✗ ${subpath}: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
	if (failed) {
		console.log(
			"\nThe dist must load in Node with no bundler. A chunk cycle comes from a source import cycle or from the chunk groups in scripts/preserve-use-client.ts.",
		);
		process.exitCode = 1;
		return;
	}
	console.log(`✓ no chunk cycles, and ${subpaths.length} subpaths load in Node`);
};

if (import.meta.main) {
	await main();
}

export {
	//,
	findCycles,
};
