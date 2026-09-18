import { describe, expect, test } from "vitest";
import { countryCodes, isCountryCode } from "./country-code.js";

describe("isCountryCode", () => {
	test("accepts every exported code", () => {
		expect(countryCodes.filter((code) => !isCountryCode(code))).toEqual([]);
	});

	test("rejects a lowercase code", () => {
		expect(isCountryCode("us")).toBe(false);
	});

	test("rejects a non-string that coerces to a code", () => {
		expect(isCountryCode(["016"])).toBe(false);
	});
});
