import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { __unstable__loadDesignSystem } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";
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

/**
 * Reads the static relative imports and re-exports of each dist chunk, keyed by
 * its path relative to `dist`, such as `field-parts.js`.
 */
function readChunkImports(dist: string): Map<string, string[]> {
	const imports = new Map<string, string[]>();
	const files = fs.readdirSync(dist, { recursive: true, encoding: "utf8" });
	for (const file of files.filter((name) => name.endsWith(".js"))) {
		const { module } = parseSync(file, fs.readFileSync(path.join(dist, file), "utf8"));
		const sources = [
			...module.staticImports.map((entry) => entry.moduleRequest.value),
			...module.staticExports.flatMap((entry) =>
				entry.entries.map((exported) => exported.moduleRequest?.value),
			),
		];
		const relativeSources = sources.filter((source) => source?.startsWith(".") === true);
		imports.set(file, [
			...new Set(relativeSources.map((source) => path.join(path.dirname(file), source ?? ""))),
		]);
	}
	return imports;
}

/**
 * Imports one subpath in a new Node process, and returns its error message, or
 * `undefined` when it loads. Why a new process: Node caches a module that
 * throws, so a shared process blames each later subpath that imports it.
 */
function loadError(subpath: string): string | undefined {
	const result = spawnSync(
		process.execPath,
		["--input-type=module", "--eval", `await import(${JSON.stringify(subpath)});`],
		{ cwd: PACKAGE_ROOT, encoding: "utf8" },
	);
	if (result.status === 0) {
		return undefined;
	}
	const errorLine = result.stderr.split("\n").find((line) => /^\w*Error\b/.test(line));
	return errorLine ?? result.stderr.trim();
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
 * The classes that the `cx` merge code must name: roots, value kinds, and class groups. Most
 * pages build them anyway.
 */
const CX_CLASSES = ["border", "font-family", "shadow", "text-wrap", "transform"];

/**
 * Lists the classes that Tailwind builds from the chunks behind `@ngrok/mantle/cx`, other than
 * {@link CX_CLASSES}.
 *
 * Why: Tailwind scans mantle's built JavaScript, and each mantle component imports `cx`. A class
 * that the merge tables name gets built on each page, used or not. The tables separate names with
 * commas, which the scanner does not split on.
 */
async function cxBuiltClasses(imports: ReadonlyMap<string, readonly string[]>): Promise<string[]> {
	const candidates = new Scanner({}).scanFiles(
		(imports.get("cx.js") ?? []).map((file) => ({
			content: fs.readFileSync(path.join(DIST, file), "utf8"),
			extension: "js",
		})),
	);
	const designSystem = await __unstable__loadDesignSystem(
		fs.readFileSync(path.join(PACKAGE_ROOT, "src/mantle.css"), "utf8"),
		{ base: path.join(PACKAGE_ROOT, "src") },
	);
	const css = designSystem.candidatesToCss(candidates);
	return candidates.filter(
		(candidate, index) => css[index] != null && !CX_CLASSES.includes(candidate),
	);
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
	const imports = readChunkImports(DIST);
	const cycles = findCycles(imports);
	for (const cycle of cycles) {
		failed = true;
		console.log(`✗ chunk cycle: ${cycle.join(" -> ")}`);
	}
	const cxClasses = await cxBuiltClasses(imports);
	if (cxClasses.length > 0) {
		failed = true;
		console.log(`✗ Tailwind builds classes from the cx chunks: ${cxClasses.join(" ")}`);
	}
	const subpaths = publicSubpaths();
	for (const subpath of subpaths) {
		const error = loadError(subpath);
		if (error != null) {
			failed = true;
			console.log(`✗ ${subpath}: ${error}`);
		}
	}
	if (failed) {
		console.log(
			"\nThe dist must load in Node with no bundler. A chunk cycle comes from a source import cycle or from the chunk groups in scripts/preserve-use-client.ts. A class in the cx chunks comes from a table in src/utils/cx/merge.ts that separates names with spaces.",
		);
		process.exitCode = 1;
		return;
	}
	console.log(
		`✓ no chunk cycles, no classes from the cx chunks, and ${subpaths.length} subpaths load in Node`,
	);
};

if (import.meta.main) {
	await main();
}

export {
	//,
	findCycles,
};
