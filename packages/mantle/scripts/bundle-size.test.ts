import { describe, expect, it } from "vitest";
import { gzipSync } from "node:zlib";
import { formatReport, gzipBytesOf, splitChunks } from "./bundle-size.ts";

describe("formatReport", () => {
	it("lists changed bundles first, largest change first, and folds unchanged ones", () => {
		const report = formatReport({
			base: { button: 1000, slot: 800, switch: 500 },
			head: { button: 1010, slot: 700, switch: 500, dictate: 50 },
		});
		expect(report).toContain("**3 of 4 bundles changed: -40 B in total.** Largest: `slot` -100 B.");
		const slot = report.indexOf("| ▼ `slot` | 800 B | 700 B | -100 B (-12.5%) |");
		const dictate = report.indexOf("| ✚ `dictate` | — | 50 B | new |");
		const button = report.indexOf("| ▲ `button` | 1000 B | 1010 B | +10 B (+1.0%) |");
		const folded = report.indexOf("<summary>1 unchanged</summary>");
		expect([slot, dictate, button, folded].every((index) => index > -1)).toBe(true);
		expect(slot < dictate && dictate < button && button < folded).toBe(true);
		expect(report.indexOf("| `switch` | 500 B | 500 B | 0 B |")).toBeGreaterThan(folded);
	});
});

describe("splitChunks", () => {
	it("counts the entry and its static imports as eager, and a dynamic import's chunks as lazy", () => {
		const chunk = (fileName: string, imports: string[] = [], isEntry = false) => ({
			fileName,
			code: fileName,
			isEntry,
			imports,
		});
		expect(
			splitChunks([
				chunk("entry.js", ["shared.js"], true),
				chunk("shared.js", ["deep.js"]),
				chunk("deep.js"),
				// A lazy chunk that imports an eager chunk does not make the eager chunk lazy.
				chunk("grammar.js", ["shared.js", "grammar-dep.js"]),
				chunk("grammar-dep.js"),
			]),
		).toEqual({
			eager: ["entry.js", "shared.js", "deep.js"],
			lazy: ["grammar.js", "grammar-dep.js"],
		});
	});
});

describe("gzipBytesOf", () => {
	it("sums the gzip size of each file, so files with shared text cost what a browser fetches", () => {
		const file =
			"export const grammar = " + JSON.stringify("x".repeat(64) + "keyword ".repeat(200)) + ";";
		const one = gzipSync(file, { level: 9 }).length;
		expect(gzipBytesOf([file, file])).toBe(2 * one);
	});
});
