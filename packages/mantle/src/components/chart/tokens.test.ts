import { describe, expect, test } from "vitest";
import darkHighContrastCss from "../../mantle-dark-high-contrast.css?raw";
import darkCss from "../../mantle-dark.css?raw";
import lightHighContrastCss from "../../mantle-light-high-contrast.css?raw";
import lightCss from "../../mantle.css?raw";

/**
 * Regression pin for the validated chart palette (see
 * decisions/2026-07-18-canvas-chart-family.md).
 *
 * Every slot below passed the six-check palette validation (lightness band,
 * chroma floor, CVD-simulated adjacency, normal-vision floor, surface
 * contrast) against its theme's card surface. The palette is only legal as
 * validated — if this test fails because a theme file changed, re-run the
 * validation for the new values before updating the expectation.
 */

const declaredChartTokens = (css: string): Record<string, string> => {
	const declarations: Record<string, string> = {};
	for (const match of css.matchAll(/--color-(chart-[a-z0-9-]+):\s*var\(--color-([a-z0-9-]+)\)/g)) {
		const slot = match[1];
		const token = match[2];
		if (slot != null && token != null) {
			declarations[slot] = token;
		}
	}
	return declarations;
};

describe("chart color tokens stay on the validated palette", () => {
	test("light theme (mantle.css)", () => {
		expect(declaredChartTokens(lightCss)).toEqual({
			"chart-1": "blue-500",
			"chart-2": "green-700",
			"chart-3": "pink-500",
			"chart-4": "red-600",
			"chart-5": "teal-600",
			"chart-6": "orange-600",
			"chart-7": "violet-500",
			"chart-8": "yellow-700",
			"chart-other": "neutral-500",
		});
	});

	test("dark theme (mantle-dark.css)", () => {
		expect(declaredChartTokens(darkCss)).toEqual({
			"chart-1": "blue-500",
			"chart-2": "green-300",
			"chart-3": "pink-500",
			"chart-4": "red-400",
			"chart-5": "teal-400",
			"chart-6": "orange-400",
			"chart-7": "violet-500",
			"chart-8": "yellow-300",
			"chart-other": "neutral-500",
		});
	});

	test("light high-contrast theme", () => {
		expect(declaredChartTokens(lightHighContrastCss)).toEqual({
			"chart-1": "blue-500",
			"chart-2": "green-700",
			"chart-3": "pink-300",
			"chart-4": "red-600",
			"chart-5": "teal-300",
			"chart-6": "orange-600",
			"chart-7": "violet-500",
			"chart-8": "yellow-700",
			"chart-other": "neutral-500",
		});
	});

	test("dark high-contrast theme", () => {
		expect(declaredChartTokens(darkHighContrastCss)).toEqual({
			"chart-1": "blue-300",
			"chart-2": "green-300",
			"chart-3": "pink-600",
			"chart-4": "red-300",
			"chart-5": "teal-300",
			"chart-6": "orange-300",
			"chart-7": "violet-300",
			"chart-8": "yellow-300",
			"chart-other": "neutral-500",
		});
	});
});
