import { describe, expect, test } from "vitest";
import { chartTokenVariable, isChartColorToken, needsComputedResolution } from "./colors.js";

describe("needsComputedResolution", () => {
	test("flags var() references", () => {
		expect(needsComputedResolution("var(--color-chart-1)")).toBe(true);
	});

	// Regression: CSS keywords and function names are case-insensitive, so a
	// case-sensitive substring check let `currentcolor`/`VAR(` slip past probe
	// resolution and reach canvas as an invalid, silently-ignored fillStyle.
	test("flags currentColor regardless of case", () => {
		expect(needsComputedResolution("currentColor")).toBe(true);
		expect(needsComputedResolution("currentcolor")).toBe(true);
		expect(needsComputedResolution("CURRENTCOLOR")).toBe(true);
		expect(needsComputedResolution("CurrentColor")).toBe(true);
	});

	test("flags var() regardless of case", () => {
		expect(needsComputedResolution("VAR(--color-chart-1)")).toBe(true);
		expect(needsComputedResolution("Var(--color-chart-1)")).toBe(true);
	});

	test("passes canvas-paintable colors through untouched", () => {
		expect(needsComputedResolution("#e40014")).toBe(false);
		expect(needsComputedResolution("oklch(0.6 0.19 260)")).toBe(false);
		expect(needsComputedResolution("color-mix(in oklab, red 70%, black)")).toBe(false);
		expect(needsComputedResolution("rgb(28, 61, 145)")).toBe(false);
	});
});

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

describe("chartTokenVariable", () => {
	test("maps a token to its CSS custom property", () => {
		expect(chartTokenVariable("chart-3")).toBe("--color-chart-3");
		expect(chartTokenVariable("chart-other")).toBe("--color-chart-other");
	});
});
