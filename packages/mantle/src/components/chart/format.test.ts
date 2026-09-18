import { describe, expect, test } from "vitest";
import { formatNumber, formatXValue, hasTimeOfDay, tickFractionDigits } from "./format.js";

// The formatters use the runtime's default locale. `vitest.config.ts` pins `TZ=UTC` and
// `LC_ALL=en_US.UTF-8` in `test.env`, so en-US output is deterministic here.

describe("formatNumber", () => {
	test("thousands-separates values", () => {
		expect(formatNumber(1284)).toBe("1,284");
		expect(formatNumber(0)).toBe("0");
	});

	test("keeps fractional values readable", () => {
		// Why 1284.5: the significant-digits formatter renders it "1,285", so this pins the default arm.
		expect(formatNumber(1284.5)).toBe("1,284.5");
	});

	test("small magnitudes keep significant digits instead of rounding to 0", () => {
		// Regression: the locale default's three fraction digits rendered
		// error-rate-scale values as indistinguishable "0"s.
		expect(formatNumber(0.0004)).toBe("0.0004");
		expect(formatNumber(-0.0004)).toBe("-0.0004");
	});

	test("an explicit maximumFractionDigits pins the precision", () => {
		expect(formatNumber(0.0001, { maximumFractionDigits: 4 })).toBe("0.0001");
		expect(formatNumber(0.00012, { maximumFractionDigits: 4 })).toBe("0.0001");
		expect(formatNumber(1284.5, { maximumFractionDigits: 0 })).toBe("1,285");
	});

	test("normalizes negative zero to 0", () => {
		// Regression: `value !== 0` is false for -0 (since -0 === 0 in JS), so -0
		// fell through to numberFormatter.format(-0), which renders "-0".
		expect(formatNumber(-0)).toBe("0");
		expect(formatNumber(-0, { maximumFractionDigits: 2 })).toBe("0");
	});
});

describe("tickFractionDigits", () => {
	test("derives the digits neighboring tick labels need from the step", () => {
		expect(tickFractionDigits(0.0001)).toBe(4);
		expect(tickFractionDigits(0.5)).toBe(1);
		// Why 1e-25: `Intl.NumberFormat` rejects more than 20 fraction digits, so the clamp caps it.
		expect(tickFractionDigits(1e-25)).toBe(20);
		expect(tickFractionDigits(1)).toBe(0);
		expect(tickFractionDigits(50)).toBe(0);
	});

	test("degenerate steps fall back to zero digits", () => {
		expect(tickFractionDigits(0)).toBe(0);
		expect(tickFractionDigits(Number.NaN)).toBe(0);
	});
});

describe("hasTimeOfDay", () => {
	test("detects any component past local midnight", () => {
		expect(hasTimeOfDay(new Date(2026, 6, 18, 14))).toBe(true);
		expect(hasTimeOfDay(new Date(2026, 6, 18, 0, 30))).toBe(true);
		expect(hasTimeOfDay(new Date(2026, 6, 18, 0, 0, 30))).toBe(true);
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
		// Why anchored: the whole string pins every option `dateTimeFormatter` sets and
		// the year it omits.
		expect(formatted).toMatch(/^Jul 18, 2:30\sPM$/);
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
		// Granularity belongs to the series: the option wins over the sample's own time of day.
		const midnight = new Date(2026, 6, 18);
		const afternoon = new Date(2026, 6, 18, 14, 30);
		expect(formatXValue(midnight, { datasetHasTimeOfDay: true })).toMatch(/12:00\sAM/);
		expect(formatXValue(afternoon, { datasetHasTimeOfDay: false })).toContain("2026");
		expect(formatXValue(afternoon, { datasetHasTimeOfDay: false })).not.toMatch(/\d:\d\d/);
		expect(formatXValue(afternoon, { datasetHasTimeOfDay: true })).toMatch(/2:30\sPM/);
	});
});
