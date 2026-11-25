import { describe, expect, it } from "vitest";
import { gzipSync } from "node:zlib";
import { formatReport, gzipBytesOf, splitChunks } from "./bundle-size.ts";

describe("formatReport", () => {
	it("shows each change against the base, and a dash for a scenario the base lacks", () => {
		const report = formatReport({
			base: { button: 1000, slot: 800 },
			head: { button: 1100, slot: 780, dictate: 500 },
		});
		expect(report).toContain("| `button` | 1000 B | 1100 B | +100 B (+10.0%) |");
		expect(report).toContain("| `slot` | 800 B | 780 B | -20 B (-2.5%) |");
		expect(report).toContain("| `dictate` | — | 500 B | new |");
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
