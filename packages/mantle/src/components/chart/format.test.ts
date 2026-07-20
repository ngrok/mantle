import { describe, expect, test } from "vitest";
import { formatNumber, formatXValue, hasTimeOfDay, tickFractionDigits } from "./format.js";

// The formatters use the runtime's default locale; the test scripts pin
// TZ=UTC and LC_ALL=en_US.UTF-8 so en-US output is deterministic here.

describe("formatNumber", () => {
	test("thousands-separates values", () => {
		expect(formatNumber(1284)).toBe("1,284");
		expect(formatNumber(0)).toBe("0");
	});

	test("keeps fractional values readable", () => {
		expect(formatNumber(12.5)).toBe("12.5");
	});

	test("small magnitudes keep significant digits instead of rounding to 0", () => {
		// Regression: the locale default's three fraction digits rendered
		// error-rate-scale values as indistinguishable "0"s.
		expect(formatNumber(0.0004)).toBe("0.0004");
		expect(formatNumber(-0.0004)).toBe("-0.0004");
		expect(formatNumber(0.5)).toBe("0.5");
		expect(formatNumber(0)).toBe("0");
	});

	test("an explicit maximumFractionDigits pins the precision", () => {
		expect(formatNumber(0.0001, { maximumFractionDigits: 4 })).toBe("0.0001");
		expect(formatNumber(0.00012, { maximumFractionDigits: 4 })).toBe("0.0001");
		expect(formatNumber(1284.5, { maximumFractionDigits: 0 })).toBe("1,285");
	});
});

describe("tickFractionDigits", () => {
	test("derives the digits neighboring tick labels need from the step", () => {
		expect(tickFractionDigits(0.0001)).toBe(4);
		expect(tickFractionDigits(0.5)).toBe(1);
		expect(tickFractionDigits(0.2)).toBe(1);
		expect(tickFractionDigits(1)).toBe(0);
		expect(tickFractionDigits(50)).toBe(0);
	});

	test("degenerate steps fall back to zero digits", () => {
		expect(tickFractionDigits(0)).toBe(0);
		expect(tickFractionDigits(Number.NaN)).toBe(0);
		expect(tickFractionDigits(Number.POSITIVE_INFINITY)).toBe(0);
	});
});

describe("hasTimeOfDay", () => {
	test("detects any component past local midnight", () => {
		expect(hasTimeOfDay(new Date(2026, 6, 18, 14, 30))).toBe(true);
		expect(hasTimeOfDay(new Date(2026, 6, 18, 0, 0, 0, 1))).toBe(true);
		expect(hasTimeOfDay(new Date(2026, 6, 18))).toBe(false);
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

	test("dataset granularity overrides the per-value midnight heuristic", () => {
		// The midnight sample inside an hourly series keeps its time of day;
		// all-midnight (daily) data stays date-only.
		const midnight = new Date(2026, 6, 18);
		expect(formatXValue(midnight, { datasetHasTimeOfDay: true })).toMatch(/12:00\sAM/);
		expect(formatXValue(midnight, { datasetHasTimeOfDay: false })).toContain("2026");
		const afternoon = new Date(2026, 6, 18, 14, 30);
		expect(formatXValue(afternoon, { datasetHasTimeOfDay: true })).toMatch(/2:30\sPM/);
	});
});
