import { describe, expect, test } from "vitest";
import { chartTokenVariable, cssSeriesColor, isChartColorToken } from "./colors.js";

describe("isChartColorToken", () => {
	test("accepts the chart token vocabulary", () => {
		expect(isChartColorToken("chart-1")).toBe(true);
		expect(isChartColorToken("chart-8")).toBe(true);
		expect(isChartColorToken("chart-other")).toBe(true);
	});

	test("rejects out-of-vocabulary strings", () => {
		expect(isChartColorToken("chart-9")).toBe(false);
		expect(isChartColorToken("#ff0000")).toBe(false);
		expect(isChartColorToken("chart-1 ")).toBe(false);
	});
});

test("chartTokenVariable maps a token to its CSS custom property", () => {
	expect(chartTokenVariable("chart-3")).toBe("--color-chart-3");
});

test("cssSeriesColor reads a token's custom property and keeps any other color as written", () => {
	expect(cssSeriesColor("chart-2")).toBe("var(--color-chart-2)");
	expect(cssSeriesColor("#e40014")).toBe("#e40014");
});
