import { describe, expect, test } from "vitest";
import { countryCodes, isCountryCode } from "./country-code.js";

describe("isCountryCode", () => {
	test("accepts a numeric code and a subdivision code", () => {
		expect(isCountryCode("016")).toBe(true);
		expect(isCountryCode("GB-ENG")).toBe(true);
	});

	test("accepts every exported code", () => {
		expect(countryCodes.filter((code) => !isCountryCode(code))).toEqual([]);
	});

	test("rejects a lowercase code", () => {
		expect(isCountryCode("us")).toBe(false);
	});

	test("rejects a value that is not a string", () => {
		expect(isCountryCode(16)).toBe(false);
		expect(isCountryCode(["016"])).toBe(false);
		expect(isCountryCode(null)).toBe(false);
		expect(isCountryCode(undefined)).toBe(false);
	});
});
