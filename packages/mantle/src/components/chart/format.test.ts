import { describe, expect, test } from "vitest";
import { formatNumber, formatXValue } from "./format.js";

describe("formatNumber", () => {
	test("thousands-separates values", () => {
		expect(formatNumber(1284)).toBe("1,284");
		expect(formatNumber(0)).toBe("0");
	});

	test("keeps fractional values readable", () => {
		expect(formatNumber(12.5)).toBe("12.5");
	});
});

describe("formatXValue", () => {
	test("category labels pass through", () => {
		expect(formatXValue("January")).toBe("January");
	});

	test("numbers are thousands-separated", () => {
		expect(formatXValue(10000)).toBe("10,000");
	});

	test("dates with a time component render as compact local date-times", () => {
		// TZ=UTC in the test runner.
		const formatted = formatXValue(new Date(Date.UTC(2026, 6, 18, 14, 30)));
		expect(formatted).toContain("Jul");
		expect(formatted).toContain("18");
	});

	test("local-midnight dates (daily data) render date-only with the year", () => {
		const formatted = formatXValue(new Date(2026, 6, 18));
		expect(formatted).toContain("Jul");
		expect(formatted).toContain("18");
		expect(formatted).toContain("2026");
		expect(formatted).not.toMatch(/\d:\d\d/);
	});

	test("invalid dates render as an em dash instead of throwing", () => {
		expect(formatXValue(new Date(Number.NaN))).toBe("—");
	});
});
