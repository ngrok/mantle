import { describe, expect, test } from "vitest";
import { resolveLineNumbers } from "./line-numbers.js";

describe("resolveLineNumbers", () => {
	test("given an empty list, returns an empty set", () => {
		expect(resolveLineNumbers()).toEqual(new Set());
	});

	test("given a list of numbers, returns a set of those numbers", () => {
		expect(resolveLineNumbers(1, 2, 3)).toEqual(new Set([1, 2, 3]));
	});

	test("given a list of non-unique numbers, returns a set of unique numbers", () => {
		expect(resolveLineNumbers(1, 2, 2, 3, 3, 3)).toEqual(new Set([1, 2, 3]));
	});

	test("given a list of integers and floats, returns a set of integers", () => {
		expect(resolveLineNumbers(1, 2, 2.5, 3)).toEqual(new Set([1, 2, 3]));
	});

	test("given a range of numbers, returns a set of those numbers", () => {
		expect(resolveLineNumbers("1-3")).toEqual(new Set([1, 2, 3]));
	});

	test("given a range of numbers with a float, returns a set of integers", () => {
		expect(resolveLineNumbers("1-3.5")).toEqual(new Set([1, 2, 3]));
	});

	test("given a list of numbers and a range of numbers, returns a set of those numbers", () => {
		expect(resolveLineNumbers(1, 2, 3, "4-6")).toEqual(new Set([1, 2, 3, 4, 5, 6]));
	});

	test("given a list of numbers and a range of numbers with overlap, returns a set of unique numbers", () => {
		expect(resolveLineNumbers(1, 2, 3, "2-4", "1-6", "2-6.5", 6, 5, 6, 2)).toEqual(
			new Set([1, 2, 3, 4, 5, 6]),
		);
	});

	test("given an excessively large range, ignores it", () => {
		expect(resolveLineNumbers("1-1001")).toEqual(new Set());
		expect(resolveLineNumbers(7, "1-1001")).toEqual(new Set([7]));
	});

	test("given a range at the maximum expanded length, keeps every line in it", () => {
		const resolved = resolveLineNumbers("1-1000");
		expect(resolved.size).toBe(1_000);
		expect(resolved.has(1)).toBe(true);
		expect(resolved.has(1_000)).toBe(true);
	});

	test("given a backwards range, swaps the bounds and expands it", () => {
		expect(resolveLineNumbers("5-3")).toEqual(new Set([3, 4, 5]));
		expect(resolveLineNumbers(1, "4-2")).toEqual(new Set([1, 2, 3, 4]));
	});

	test("given a backwards range longer than the maximum expanded length, ignores it", () => {
		expect(resolveLineNumbers("1001-1")).toEqual(new Set());
	});

	test("given non-positive or non-finite numbers, ignores them", () => {
		expect(
			resolveLineNumbers(0, -3, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
		).toEqual(new Set());
		expect(resolveLineNumbers(0, 2)).toEqual(new Set([2]));
	});

	test("given a range with a non-positive or unparseable bound, ignores the range", () => {
		expect(resolveLineNumbers("0-2")).toEqual(new Set());
		expect(resolveLineNumbers("2-0")).toEqual(new Set());
		expect(resolveLineNumbers(9, "0-2")).toEqual(new Set([9]));
	});
});
