import { describe, expect, test } from "vitest";
import { isAriaInvalid, parseValidation, resolveValidation } from "./validation.js";

describe("field validation helpers", () => {
	test("normalizes false validation to undefined", () => {
		expect(resolveValidation(false)).toBeUndefined();
		expect(parseValidation({ validation: false }).validation).toBeUndefined();
	});

	test("resolves function validation", () => {
		expect(resolveValidation(() => "warning")).toBe("warning");
		expect(parseValidation({ validation: () => "success" }).validation).toBe("success");
	});

	test("maps validation='error' to aria-invalid=true", () => {
		expect(parseValidation({ validation: "error" })).toEqual({
			ariaInvalid: true,
			isInvalid: true,
			validation: "error",
		});
	});

	test("treats any explicit non-false aria-invalid value as invalid", () => {
		expect(isAriaInvalid("true")).toBe(true);
		expect(isAriaInvalid("grammar")).toBe(true);
		expect(isAriaInvalid(true)).toBe(true);
	});

	test("treats explicit false aria-invalid values as valid", () => {
		expect(isAriaInvalid("false")).toBe(false);
		expect(isAriaInvalid(false)).toBe(false);
		expect(isAriaInvalid(undefined)).toBe(false);
	});

	test("lets aria-invalid force visual validation to error", () => {
		expect(parseValidation({ "aria-invalid": "true", validation: "success" })).toEqual({
			ariaInvalid: "true",
			isInvalid: true,
			validation: "error",
		});
	});

	test("can omit neutral aria-invalid for controls that should not render false", () => {
		expect(parseValidation({ defaultAriaInvalid: false, validation: "success" })).toEqual({
			ariaInvalid: undefined,
			isInvalid: false,
			validation: "success",
		});
	});
});
