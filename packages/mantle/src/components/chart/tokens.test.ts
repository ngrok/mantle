import { describe, expect, test } from "vitest";
import twThemeCss from "tailwindcss/theme.css?raw";
import mantleCss from "../../mantle.css?raw";
import { splitDarkThemeRule } from "../../test-utils/parse-theme-css.js";
import { colors } from "../../utils/color/index.js";
import {
	CHROMA_FLOOR,
	contrastRatio,
	hexFromOklch,
	layer,
	oklchOf,
	resolveProperty,
} from "./palette-gates.js";

const { light: lightCss, dark: darkCss } = splitDarkThemeRule(mantleCss);

/** WCAG 2.2 SC 1.4.11 Non-text Contrast: the floor for a graphical object against its surface. */
const WCAG_NON_TEXT_CONTRAST = 3;

/**
 * The chart color tokens, measured rather than pinned by name.
 *
 * A series names its color with a mantle color name, and each name paints
 * `--color-chart-<name>`. This test resolves every name in every theme down to
 * the 8-bit color a browser rasterizes and measures it against the card.
 *
 * WCAG 2.2 SC 1.4.11 asks a mark a reader needs to see for 3:1 against its
 * background. Mantle designs the color first and gets as close as it can, so
 * the names under 3:1 are a recorded list, not a failure. A name that drops
 * under the floor, or one that climbs over it, fails here until the list and
 * the "Color and accessibility" docs section change with it.
 */
const THEMES = [
	{
		name: "light",
		chain: [layer("mantle.css", lightCss), layer("tailwindcss/theme.css", twThemeCss)],
	},
	{
		name: "dark",
		chain: [
			layer("mantle.css (dark)", darkCss),
			layer("mantle.css", lightCss),
			layer("tailwindcss/theme.css", twThemeCss),
		],
	},
] as const;

/** The names each theme paints under 3:1 on its card, as the docs list them. */
const UNDER_FLOOR: Record<(typeof THEMES)[number]["name"], readonly string[]> = {
	light: ["yellow"],
	dark: [],
};

describe.each(THEMES)("chart color tokens — $name", ({ name, chain }) => {
	const surface = hexFromOklch(resolveProperty(chain, "--background-color-card").literal);
	const resolve = (color: string) => resolveProperty(chain, `--color-chart-${color}`);

	test("only the recorded names sit under the WCAG 3:1 floor on the card", () => {
		const under = colors.filter(
			(color) =>
				contrastRatio(hexFromOklch(resolve(color).literal), surface) < WCAG_NON_TEXT_CONTRAST,
		);
		expect(under).toStrictEqual(UNDER_FLOOR[name]);
	});

	test.each([...colors])(
		"%s resolves in a mantle theme block, not in Tailwind's theme",
		(color) => {
			// A Tailwind row would mean mantle ships a chart color it does not own, where
			// an upstream re-tune moves a shipped series.
			expect(resolve(color).source).not.toBe("tailwindcss/theme.css");
		},
	);

	test("neutral reads as gray, so an Other series does no identity work", () => {
		expect(oklchOf(hexFromOklch(resolve("neutral").literal)).chroma).toBeLessThan(CHROMA_FLOOR);
	});
});
