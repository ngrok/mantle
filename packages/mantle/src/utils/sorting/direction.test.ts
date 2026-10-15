import { describe, expect, test } from "vitest";
import {
	$alphanumericSortingDirection,
	$sortingDirection,
	$sortingMode,
	$timeSortingDirection,
	isAlphanumericSortingDirection,
	isSortingDirection,
	isSortingMode,
	isTimeSortingDirection,
} from "./direction.js";

/**
 * Values that are not strings at all — every guard must reject them before it
 * reaches `Array.prototype.includes`. Kept as `{ label, value }` records so an
 * array or object case is passed as one argument instead of being spread.
 */
const nonStringValues: { label: string; value: unknown }[] = [
	{ label: "null", value: null },
	{ label: "undefined", value: undefined },
	{ label: "0", value: 0 },
	{ label: "1", value: 1 },
	{ label: "true", value: true },
	{ label: "an empty object", value: {} },
	{ label: "an empty array", value: [] },
	{ label: "a Date", value: new Date("2020-10-01") },
];

describe("isSortingMode", () => {
	test.each(["alphanumeric", "time"])("accepts %s", (value) => {
		expect(isSortingMode(value)).toBe(true);
	});

	test.each(["asc", "desc", "newest-to-oldest", "unsorted", "", "Alphanumeric"])(
		"rejects %o",
		(value) => {
			expect(isSortingMode(value)).toBe(false);
		},
	);

	test.each(nonStringValues)("rejects the non-string $label", ({ value }) => {
		expect(isSortingMode(value)).toBe(false);
	});
});

describe("isSortingDirection", () => {
	test.each(["asc", "desc"])("accepts %s", (value) => {
		expect(isSortingDirection(value)).toBe(true);
	});

	// "unsorted" is a DataTable-level concept, not a sorting direction, and the
	// time family lives in its own vocabulary.
	test.each(["unsorted", "newest-to-oldest", "oldest-to-newest", "ASC", ""])(
		"rejects %o",
		(value) => {
			expect(isSortingDirection(value)).toBe(false);
		},
	);

	test.each(nonStringValues)("rejects the non-string $label", ({ value }) => {
		expect(isSortingDirection(value)).toBe(false);
	});
});

describe("isAlphanumericSortingDirection", () => {
	test.each(["asc", "desc"])("accepts %s", (value) => {
		expect(isAlphanumericSortingDirection(value)).toBe(true);
	});

	test.each(["unsorted", "newest-to-oldest", "oldest-to-newest", ""])("rejects %o", (value) => {
		expect(isAlphanumericSortingDirection(value)).toBe(false);
	});

	test.each(nonStringValues)("rejects the non-string $label", ({ value }) => {
		expect(isAlphanumericSortingDirection(value)).toBe(false);
	});
});

describe("isTimeSortingDirection", () => {
	test.each(["newest-to-oldest", "oldest-to-newest"])("accepts %s", (value) => {
		expect(isTimeSortingDirection(value)).toBe(true);
	});

	// Cross-family values must not pass: `asc`/`desc` are sorting directions.
	test.each(["asc", "desc", "unsorted", "newest", ""])("rejects %o", (value) => {
		expect(isTimeSortingDirection(value)).toBe(false);
	});

	test.each(nonStringValues)("rejects the non-string $label", ({ value }) => {
		expect(isTimeSortingDirection(value)).toBe(false);
	});
});

describe("$timeSortingDirection", () => {
	test.each([
		{ input: "asc", expected: "oldest-to-newest" },
		{ input: "desc", expected: "newest-to-oldest" },
	] as const)("converts $input to $expected", ({ input, expected }) => {
		expect($timeSortingDirection(input)).toBe(expected);
	});

	test.each(["newest-to-oldest", "oldest-to-newest"] as const)(
		"passes %s through unchanged",
		(value) => {
			expect($timeSortingDirection(value)).toBe(value);
		},
	);

	test("throws on a value from neither family", () => {
		expect(() =>
			// @ts-expect-error -- deliberately outside the accepted union; the runtime guard is the contract under test.
			$timeSortingDirection("nope"),
		).toThrow('Invalid time sorting direction given: "nope"');
	});
});

describe("runtime type-to-value helpers", () => {
	test("return their input unchanged", () => {
		expect($sortingMode("time")).toBe("time");
		expect($sortingDirection("desc")).toBe("desc");
		expect($alphanumericSortingDirection("asc")).toBe("asc");
	});
});
