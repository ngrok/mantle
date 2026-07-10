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
		const code = ["{", '  "key": "value with [ and ] and { and }"', "}"].join("\n");
		expect(computeJsonFoldRanges(code)).toEqual([{ id: "1", startLine: 1, endLine: 3 }]);
	});

	test("handles escaped quotes in strings", () => {
		const code = ["{", '  "key": "she said \\"hi\\" with [brackets]"', "}"].join("\n");
		expect(computeJsonFoldRanges(code)).toEqual([{ id: "1", startLine: 1, endLine: 3 }]);
	});

	test("handles escaped backslashes correctly", () => {
		const code = [
			"{",
			'  "windows": "C:\\\\path\\\\to\\\\file",',
			'  "list": [',
			"    1",
			"  ]",
			"}",
		].join("\n");
		expect(computeJsonFoldRanges(code)).toEqual([
			{ id: "1", startLine: 1, endLine: 6 },
			{ id: "3", startLine: 3, endLine: 5 },
		]);
	});

	test("only keeps one fold per start line when several open together", () => {
		const code = ['{"a":[', "  1,", "  2", "]}"].join("\n");
		const ranges = computeJsonFoldRanges(code);
		expect(ranges).toEqual([{ id: "1", startLine: 1, endLine: 4 }]);
	});

	test("emits separate ranges when openers are on different lines", () => {
		const code = ["{", '  "a": [', "    1,", "    2", "  ]", "}"].join("\n");
		expect(computeJsonFoldRanges(code)).toEqual([
			{ id: "1", startLine: 1, endLine: 6 },
			{ id: "2", startLine: 2, endLine: 5 },
		]);
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

	test("computes ranges for a deeply nested structure efficiently", () => {
		const lines: string[] = [];
		for (let i = 0; i < 500; i += 1) {
			lines.push("[");
		}
		lines.push("0");
		for (let i = 0; i < 500; i += 1) {
			lines.push("]");
		}
		const code = lines.join("\n");
		const ranges = computeJsonFoldRanges(code);
		expect(ranges).toHaveLength(500);
		expect(ranges[0]).toEqual({ id: "1", startLine: 1, endLine: 1001 });
		expect(ranges[ranges.length - 1]).toEqual({
			id: "500",
			startLine: 500,
			endLine: 502,
		});
	});

	test("computes ranges for 1000+ line JSON", () => {
		const items: string[] = ["{"];
		items.push('  "items": [');
		for (let i = 0; i < 1000; i += 1) {
			items.push(`    { "id": ${i}, "label": "item-${i}" }${i === 999 ? "" : ","}`);
		}
		items.push("  ]");
		items.push("}");
		const code = items.join("\n");

		const ranges = computeJsonFoldRanges(code);

		expect(ranges).toEqual([
			{ id: "1", startLine: 1, endLine: items.length },
			{ id: "2", startLine: 2, endLine: items.length - 1 },
		]);
	});
});
