import { describe, expect, it } from "vitest";
import { gzipSync } from "node:zlib";
import { gzipBytesOf, judge, splitChunks } from "./bundle-budget.ts";

describe("judge", () => {
	it("fails a size one byte over its budget", () => {
		expect(judge({ gzipBytes: 10_001, maxGzipBytes: 10_000 })).toEqual({ kind: "over", overBy: 1 });
	});

	it("passes a size at its budget and a size a little under it", () => {
		expect(judge({ gzipBytes: 10_000, maxGzipBytes: 10_000 })).toEqual({ kind: "within" });
		expect(judge({ gzipBytes: 9_700, maxGzipBytes: 10_000 })).toEqual({ kind: "within" });
	});

	it("asks for a lower budget once a size falls more than 3% under it", () => {
		expect(judge({ gzipBytes: 9_699, maxGzipBytes: 10_000 })).toEqual({
			kind: "stale",
			underBy: 301,
		});
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
