import { describe, expect, test } from "vitest";
import { isCountryCode } from "./country-code.js";

describe("isCountryCode", () => {
	test("accepts a code from the table", () => {
		expect(isCountryCode("US")).toBe(true);
	});

	test("rejects a lowercase code", () => {
		expect(isCountryCode("us")).toBe(false);
	});

	test("rejects a non-string that coerces to a code", () => {
		expect(isCountryCode(["016"])).toBe(false);
	});
});
