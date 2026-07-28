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

/**
 * Every `--color-chart-*: var(--color-<ramp>)` declaration in a theme file, in
 * source order, skipping the `@theme` passthrough block's self-references
 * (`--color-chart-1: var(--color-chart-1)`) — those name no ramp step.
 *
 * Returned as an ordered list, not a map, deliberately: a second block
 * declaring the palette (a reordered stylesheet, or a selector-scoped theme
 * extension) then shows up as extra entries and fails loudly, instead of
 * silently letting whichever block the regex matched last decide the palette.
 */
const chartTokenDeclarations = (css: string): Array<[string, string]> =>
	[...css.matchAll(/--color-(chart-[a-z0-9-]+):\s*var\(--color-([a-z0-9-]+)\)/g)].flatMap(
		(match) => {
			const slot = match[1];
			const token = match[2];
			if (slot == null || token == null || slot === token) {
				return [];
			}
			return [[slot, token] satisfies [string, string]];
		},
	);

describe("chart color tokens stay on the validated palette", () => {
	test("light theme (mantle.css)", () => {
		expect(chartTokenDeclarations(lightCss)).toEqual([
			["chart-1", "blue-500"],
			["chart-2", "green-700"],
			["chart-3", "pink-500"],
			["chart-4", "red-600"],
			["chart-5", "teal-600"],
			["chart-6", "orange-600"],
			["chart-7", "violet-500"],
			["chart-8", "yellow-700"],
			["chart-other", "neutral-500"],
		]);
	});

	test("dark theme (mantle-dark.css)", () => {
		expect(chartTokenDeclarations(darkCss)).toEqual([
			["chart-1", "blue-500"],
			["chart-2", "green-300"],
			["chart-3", "pink-500"],
			["chart-4", "red-400"],
			["chart-5", "teal-400"],
			["chart-6", "orange-400"],
			["chart-7", "violet-500"],
			["chart-8", "yellow-300"],
			["chart-other", "neutral-500"],
		]);
	});

	test("light high-contrast theme", () => {
		expect(chartTokenDeclarations(lightHighContrastCss)).toEqual([
			["chart-1", "blue-500"],
			["chart-2", "green-700"],
			["chart-3", "pink-300"],
			["chart-4", "red-600"],
			["chart-5", "teal-300"],
			["chart-6", "orange-600"],
			["chart-7", "violet-500"],
			["chart-8", "yellow-700"],
			["chart-other", "neutral-500"],
		]);
	});

	test("dark high-contrast theme", () => {
		expect(chartTokenDeclarations(darkHighContrastCss)).toEqual([
			["chart-1", "blue-300"],
			["chart-2", "green-300"],
			["chart-3", "pink-600"],
			["chart-4", "red-300"],
			["chart-5", "teal-300"],
			["chart-6", "orange-300"],
			["chart-7", "violet-300"],
			["chart-8", "yellow-300"],
			["chart-other", "neutral-500"],
		]);
	});
});
