import { describe, expect, test } from "vitest";
import {
	parseCodeBlockHighlightLines,
	parseCodeBlockLineNumberStart,
	parseCodeBlockShowLineNumbers,
} from "./parse-line-options.js";

describe("parseCodeBlockShowLineNumbers", () => {
	test("parses boolean and boolean-like strings", () => {
		expect(parseCodeBlockShowLineNumbers(true)).toBe(true);
		expect(parseCodeBlockShowLineNumbers(false)).toBe(false);
		expect(parseCodeBlockShowLineNumbers("true")).toBe(true);
		expect(parseCodeBlockShowLineNumbers("false")).toBe(false);
	});

	test("returns undefined for unsupported values", () => {
		expect(parseCodeBlockShowLineNumbers("1")).toBeUndefined();
		expect(parseCodeBlockShowLineNumbers(1)).toBeUndefined();
		expect(parseCodeBlockShowLineNumbers(undefined)).toBeUndefined();
	});
});

describe("parseCodeBlockLineNumberStart", () => {
	test("parses positive numeric values", () => {
		expect(parseCodeBlockLineNumberStart(4)).toBe(4);
		expect(parseCodeBlockLineNumberStart("12")).toBe(12);
		expect(parseCodeBlockLineNumberStart(7.9)).toBe(7);
	});

	test("returns undefined for invalid values", () => {
		expect(parseCodeBlockLineNumberStart(0)).toBeUndefined();
		expect(parseCodeBlockLineNumberStart(-1)).toBeUndefined();
		expect(parseCodeBlockLineNumberStart("0")).toBeUndefined();
		expect(parseCodeBlockLineNumberStart("1.5")).toBeUndefined();
		expect(parseCodeBlockLineNumberStart("abc")).toBeUndefined();
	});

	test("returns undefined for non-finite numbers", () => {
		expect(parseCodeBlockLineNumberStart(Number.POSITIVE_INFINITY)).toBeUndefined();
		expect(parseCodeBlockLineNumberStart(Number.NaN)).toBeUndefined();
	});
});

describe("parseCodeBlockHighlightLines", () => {
	test("parses arrays and strings", () => {
		expect(parseCodeBlockHighlightLines([1, "3-5", "7"])).toEqual([1, "3-5", 7]);
		expect(parseCodeBlockHighlightLines("1,3-5,7")).toEqual([1, "3-5", 7]);
	});

	test("tolerates whitespace around entries", () => {
		// A metastring value is authored the natural way — `highlightLines="1, 3-5, 7"` —
		// so every segment after the first arrives with a leading space.
		expect(parseCodeBlockHighlightLines("1, 3-5, 7")).toEqual([1, "3-5", 7]);
		expect(parseCodeBlockHighlightLines([" 4 ", " 6-8 "])).toEqual([4, "6-8"]);
		expect(parseCodeBlockHighlightLines("\t2\t")).toEqual([2]);
	});

	test("filters non-finite numeric entries", () => {
		expect(parseCodeBlockHighlightLines([Number.NaN])).toBeUndefined();
		expect(parseCodeBlockHighlightLines([Number.POSITIVE_INFINITY, 2])).toEqual([2]);
	});

	test("filters invalid entries and returns undefined when empty", () => {
		expect(parseCodeBlockHighlightLines([0, -1, "a", "1-"])).toBeUndefined();
		expect(parseCodeBlockHighlightLines("")).toBeUndefined();
		expect(parseCodeBlockHighlightLines(undefined)).toBeUndefined();
	});

	test("filters string zeros and ranges with zero", () => {
		expect(parseCodeBlockHighlightLines(["0"])).toBeUndefined();
		expect(parseCodeBlockHighlightLines("0")).toBeUndefined();
		expect(parseCodeBlockHighlightLines("0-2")).toBeUndefined();
		expect(parseCodeBlockHighlightLines("0-0")).toBeUndefined();
		expect(parseCodeBlockHighlightLines(["0-5"])).toBeUndefined();
		expect(parseCodeBlockHighlightLines([1, "0", 3])).toEqual([1, 3]);
		expect(parseCodeBlockHighlightLines("1,0-2,5")).toEqual([1, 5]);
	});
});
