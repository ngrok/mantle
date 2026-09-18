import { describe, expect, test } from "vitest";
import { computeJsonFoldRanges } from "./compute-json-fold-ranges.js";

describe("computeJsonFoldRanges", () => {
	test("returns no ranges for empty input", () => {
		expect(computeJsonFoldRanges("")).toEqual([]);
	});

	test("returns no ranges for inline objects", () => {
		expect(computeJsonFoldRanges('{"a": 1}')).toEqual([]);
	});

	test("returns no ranges for inline arrays", () => {
		expect(computeJsonFoldRanges("[1, 2, 3]")).toEqual([]);
	});

	test("returns a single range for a simple multi-line object", () => {
		const code = ["{", '  "a": 1', "}"].join("\n");
		expect(computeJsonFoldRanges(code)).toEqual([{ id: "1", startLine: 1, endLine: 3 }]);
	});

	test("returns a single range for a simple multi-line array", () => {
		const code = ["[", "  1,", "  2", "]"].join("\n");
		expect(computeJsonFoldRanges(code)).toEqual([{ id: "1", startLine: 1, endLine: 4 }]);
	});

	test("returns nested ranges for nested structures", () => {
		const code = ["{", '  "a": {', '    "b": 1', "  }", "}"].join("\n");
		expect(computeJsonFoldRanges(code)).toEqual([
			{ id: "1", startLine: 1, endLine: 5 },
			{ id: "2", startLine: 2, endLine: 4 },
		]);
	});

	test("ignores brackets inside string literals", () => {
		// Why unbalanced: a balanced pair inside the string cancels out even when the parser reads it.
		const code = ["{", '  "key": "value with [ and {"', "}"].join("\n");
		expect(computeJsonFoldRanges(code)).toEqual([{ id: "1", startLine: 1, endLine: 3 }]);
	});

	test("handles escaped quotes in strings", () => {
		// Why: when the parser skips no escape, the quotes re-pair and the `[` falls outside a string.
		const code = ["{", '  "key": "she said \\"[hi\\" and ]"', "}"].join("\n");
		expect(computeJsonFoldRanges(code)).toEqual([{ id: "1", startLine: 1, endLine: 3 }]);
	});

	test("handles escaped backslashes correctly", () => {
		// Why: a parser that only looks behind the closing quote reads `\\"` as escaped and runs the string into the `[`.
		const code = ["{", '  "path": "C:\\\\", "list": [', "    1", "  ]", "}"].join("\n");
		expect(computeJsonFoldRanges(code)).toEqual([
			{ id: "1", startLine: 1, endLine: 5 },
			{ id: "2", startLine: 2, endLine: 4 },
		]);
	});

	test("only keeps one fold per start line when several open together", () => {
		const code = ['{"a":[', "  1,", "  2", "]}"].join("\n");
		const ranges = computeJsonFoldRanges(code);
		expect(ranges).toEqual([{ id: "1", startLine: 1, endLine: 4 }]);
	});

	test("does not emit a range for single-line objects nested in multi-line ones", () => {
		const code = ["{", '  "inline": { "x": 1 },', '  "block": [', "    1", "  ]", "}"].join("\n");
		expect(computeJsonFoldRanges(code)).toEqual([
			{ id: "1", startLine: 1, endLine: 6 },
			{ id: "3", startLine: 3, endLine: 5 },
		]);
	});

	test("normalizes \\r\\n line endings", () => {
		const code = ["[", "  1", "]"].join("\r\n");
		expect(computeJsonFoldRanges(code)).toEqual([{ id: "1", startLine: 1, endLine: 3 }]);
	});

	test("normalizes bare \\r line endings", () => {
		const code = ["[", "  1", "]"].join("\r");
		expect(computeJsonFoldRanges(code)).toEqual([{ id: "1", startLine: 1, endLine: 3 }]);
	});

	test("tolerates unbalanced brackets without throwing", () => {
		const code = ["{", '  "a": ['].join("\n");
		expect(computeJsonFoldRanges(code)).toEqual([]);
	});

	test("tolerates extra closing brackets without throwing", () => {
		const code = ["}", "]"].join("\n");
		expect(computeJsonFoldRanges(code)).toEqual([]);
	});

	test("does not pair mismatched brackets", () => {
		const code = ["{", '  "items": [', "  }", "]"].join("\n");
		expect(computeJsonFoldRanges(code)).toEqual([]);
	});

	test("invalidates a fold when an unmatched closer appears inside", () => {
		const code = ["{", "  ]", "}"].join("\n");
		expect(computeJsonFoldRanges(code)).toEqual([]);
	});

	test("does not emit an outer range after a crossed nested mismatch", () => {
		const code = ["{", '  "items": [', "  }", "}"].join("\n");
		expect(computeJsonFoldRanges(code)).toEqual([]);
	});
});
