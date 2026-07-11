import { describe, expect, test } from "vitest";
import { joinDataSlot } from "./data-slot.js";

describe("joinDataSlot", () => {
	test("joins values in the given (DOM) order with single spaces", () => {
		expect(joinDataSlot("centered-layout-body", "main")).toBe("centered-layout-body main");
		expect(joinDataSlot("card", "centered-layout", "main")).toBe("card centered-layout main");
	});

	test("skips nullish and empty values", () => {
		expect(joinDataSlot(undefined, "main")).toBe("main");
		expect(joinDataSlot("main", undefined)).toBe("main");
		expect(joinDataSlot("", "main", "")).toBe("main");
	});

	test("returns undefined when every value is empty so no empty attribute renders", () => {
		expect(joinDataSlot()).toBeUndefined();
		expect(joinDataSlot(undefined, undefined)).toBeUndefined();
		expect(joinDataSlot("", "")).toBeUndefined();
	});

	test("preserves already-joined chains as single values", () => {
		expect(joinDataSlot("breadcrumb breadcrumb-list", "my-list")).toBe(
			"breadcrumb breadcrumb-list my-list",
		);
	});
});
