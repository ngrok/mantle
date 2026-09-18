import { describe, expect, test } from "vitest";
import { isValidMaxNumber, isValidValueNumber } from "./math.js";

describe("isValidValueNumber", () => {
	// Why max 10: a guard that hardcodes 100 in place of `max` accepts 11. Only a smaller `max` lets the one-past-max row catch that guard.
	test.each([
		{ label: "a value equal to max", value: 10, max: 10, expected: true },
		{ label: "a value one past max", value: 11, max: 10, expected: false },
		{ label: "zero", value: 0, max: 10, expected: true },
		{ label: "a negative value", value: -1, max: 10, expected: false },
		{ label: "NaN", value: Number.NaN, max: 10, expected: false },
		{ label: "a numeric string", value: "5", max: 10, expected: false },
	])("$label returns $expected", ({ value, max, expected }) => {
		expect(isValidValueNumber(value, max)).toBe(expected);
	});
});

describe("isValidMaxNumber", () => {
	test.each([
		{ label: "one", value: 1, expected: true },
		{ label: "zero", value: 0, expected: false },
		{ label: "NaN", value: Number.NaN, expected: false },
		{ label: "a numeric string", value: "100", expected: false },
	])("$label returns $expected", ({ value, expected }) => {
		expect(isValidMaxNumber(value)).toBe(expected);
	});
});
