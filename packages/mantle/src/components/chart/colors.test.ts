import { describe, expect, test } from "vitest";
import {
	chartTokenVariable,
	isChartColorToken,
	needsComputedResolution,
	resolveSeriesColor,
	themeSignature,
} from "./colors.js";

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

describe("resolveSeriesColor", () => {
	/** A host carrying the chart token ramp, so a token resolution has something to read. */
	const makeHost = (): HTMLElement => {
		const host = document.createElement("div");
		host.style.setProperty("--color-chart-2", "rgb(1, 2, 3)");
		host.style.setProperty("--color-success-600", "rgb(4, 5, 6)");
		document.body.appendChild(host);
		return host;
	};

	test("a token resolves through its --color-chart-N custom property", () => {
		const host = makeHost();
		expect(resolveSeriesColor(host, "chart-2")).toBe("rgb(1, 2, 3)");
		// The probe is transient: it must never outlive the read.
		expect(host.childElementCount).toBe(0);
	});

	test("the documented custom-color escape hatch resolves var() references", () => {
		// Regression guard for the needsComputedResolution branch: canvas cannot
		// substitute var(), so an unresolved value reaches fillStyle, is silently
		// ignored, and the series paints in the previous fill's color.
		const host = makeHost();
		expect(resolveSeriesColor(host, "var(--color-success-600)")).toBe("rgb(4, 5, 6)");
		// An uppercase `VAR(` takes the same branch (see needsComputedResolution
		// above); only its resolved value is unassertable here, because happy-dom's
		// CSS parser is case-sensitive where a real engine is not.
		expect(resolveSeriesColor(host, "VAR(--color-success-600)")).not.toBe(
			"VAR(--color-success-600)",
		);
	});

	test("canvas-paintable colors pass through byte-for-byte", () => {
		// A probe pass would normalize these to `rgb(...)`, so identity proves the
		// raw passthrough was taken.
		const host = makeHost();
		expect(resolveSeriesColor(host, "#e40014")).toBe("#e40014");
		expect(resolveSeriesColor(host, "oklch(0.6 0.19 260)")).toBe("oklch(0.6 0.19 260)");
	});
});

describe("themeSignature", () => {
	test("changes when any one theme channel changes", () => {
		const element = document.createElement("html");
		const base = themeSignature(element);
		element.className = "dark";
		const classChanged = themeSignature(element);
		element.className = "";
		element.setAttribute("data-applied-theme", "dark");
		const appliedChanged = themeSignature(element);
		element.removeAttribute("data-applied-theme");
		element.setAttribute("data-theme", "dark-high-contrast");
		const themeChanged = themeSignature(element);
		// Each channel alone must invalidate the color cache: a class-based theme
		// switch that keeps the same signature leaves charts painted in stale hues.
		expect(new Set([base, classChanged, appliedChanged, themeChanged]).size).toBe(4);
	});

	test("is stable for an unchanged element", () => {
		const element = document.createElement("html");
		element.className = "dark";
		element.setAttribute("data-applied-theme", "dark");
		expect(themeSignature(element)).toBe(themeSignature(element));
	});
});
