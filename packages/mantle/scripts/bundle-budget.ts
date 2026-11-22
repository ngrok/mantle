#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
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

/**
 * Builds one entry the way a consumer's Vite production build does, with React
 * external, and returns the gzip size of the JavaScript it ships.
 */
const measure = async (name: string, entry: string): Promise<number> => {
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
				output: { codeSplitting: false },
			},
		},
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
	const code = results
		.flatMap((result) => ("output" in result ? result.output : []))
		.map((chunk) => (chunk.type === "chunk" ? chunk.code : ""))
		.join("\n");
	return gzipSync(code, { level: 9 }).length;
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
		const gzipBytes = await measure(name, scenario.entry);
		if (update) {
			scenario.maxGzipBytes = gzipBytes + UPDATE_HEADROOM;
		}
		const verdict = judge({ gzipBytes, maxGzipBytes: scenario.maxGzipBytes });
		const line = `${name.padEnd(24)} ${formatBytes(gzipBytes).padStart(9)} / ${formatBytes(scenario.maxGzipBytes)}`;
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
	await main();
}

export {
	//,
	judge,
};
export type { Verdict };
