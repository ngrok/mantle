import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import twThemeCss from "tailwindcss/theme.css?raw";
import { BarChart } from "../bar-chart/index.js";
import darkHighContrastCss from "../../mantle-dark-high-contrast.css?raw";
import darkCss from "../../mantle-dark.css?raw";
import lightHighContrastCss from "../../mantle-light-high-contrast.css?raw";
import lightCss from "../../mantle.css?raw";
import { CHART_DECORATIVE_COLOR } from "./colors.js";
import {
	CHROMA_FLOOR,
	contrastRatio,
	hexFromOklch,
	layer,
	oklchOf,
	resolveProperty,
} from "./palette-gates.js";
import type { ThemeName } from "./palette-gates.js";

/**
 * A message over a decorative chart must stay readable, in every theme, with no
 * help from the call site.
 *
 * A `decorative` chart is the backdrop behind that message, so the message's
 * background is a chart mark rather than the card surface. The chart therefore
 * drops the categorical palette and paints every series with one neutral fill,
 * `--color-chart-decorative`. This test resolves that fill and each theme's text
 * ramp down to the 8-bit colors a browser rasterizes, composites the text the
 * way a browser does, and measures it against the mark that actually sits
 * behind it.
 *
 * **The fill is the whole contrast mechanism.** No scrim behind the copy, no
 * dimming, and no blur: a blur leaves the color under the middle of a mark where
 * it was, and dimming far enough to rescue `text-muted` from a categorical slot
 * erases the chart. The token is instead the darkest neutral step that keeps
 * `text-muted` — the weakest text mantle ships, and what `Empty.Description`
 * wears — over the AA floor unaided. The next step down, `neutral-300`, drops
 * light to 4.24:1, which is why this is the step.
 *
 * When this fails, re-step `--color-chart-decorative`. Never widen
 * `CONTRAST_FLOOR`.
 *
 * @see decisions/2026-07-18-canvas-chart-family.md
 */

/** WCAG AA for normal-size text. `Empty.Description` renders at 14px. */
const CONTRAST_FLOOR = 4.5;

/**
 * A mark this close to the surface paints no chart at all. The decorative fill
 * is deliberately quiet, and this is the line between quiet and absent.
 */
const VISIBILITY_FLOOR = 1.1;

const rgbOf = (hex: string) =>
	[1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));

const hexOfRgb = (channels: readonly number[]) =>
	`#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;

/** Composite `src` over `dst` at `alpha`, the way a browser blends sRGB. */
const over = (src: string, dst: string, alpha: number) => {
	const source = rgbOf(src);
	const destination = rgbOf(dst);
	return hexOfRgb(
		source.map((channel, index) => alpha * channel + (1 - alpha) * (destination[index] ?? 0)),
	);
};

/** A text token: its base color, and the alpha it composites at. */
type TextColor = { color: string; alpha: number };

type Theme = {
	name: ThemeName;
	surface: string;
	/** The fill a decorative chart paints, in place of every categorical slot. */
	decorative: string;
	strong: TextColor;
	muted: TextColor;
};

/**
 * The custom property the chart paints a decorative series with, read off the
 * shipped constant so this file cannot drift from `colors.ts`. The engine hands
 * that string to canvas through a `var()` probe, so the property name is what
 * the theme files have to declare.
 */
const shippedDecorativeProperty = (): string => {
	const match = CHART_DECORATIVE_COLOR.match(/^var\((--[a-z-]+)\)$/);
	if (match?.[1] == null) {
		throw new Error(
			`the decorative fill is no longer a single custom property: ${CHART_DECORATIVE_COLOR}`,
		);
	}
	return match[1];
};

const resolveTheme = (name: ThemeName, themeCss: string, themeFile: string): Theme => {
	const chain =
		themeFile === "mantle.css"
			? [layer("mantle.css", lightCss), layer("tailwindcss/theme.css", twThemeCss)]
			: [
					layer(themeFile, themeCss),
					layer("mantle.css", lightCss),
					layer("tailwindcss/theme.css", twThemeCss),
				];

	const hexOf = (property: string) => hexFromOklch(resolveProperty(chain, property).literal);

	/**
	 * The text ramp authors `--alpha(<color> / <a>)`, which `resolveProperty`
	 * refuses as neither an alias nor a literal, so read the raw declaration and
	 * unwrap the alpha here.
	 */
	const textColorOf = (property: string): TextColor => {
		const declaration = chain.find((sheet) => sheet.declarations.has(property));
		const raw = declaration?.declarations.get(property);
		if (raw == null) {
			throw new Error(`${name}: no declaration for ${property}`);
		}
		const alphaMatch = raw.match(/^--alpha\((.+) \/ ([\d.]+)\)$/);
		const literal = alphaMatch?.[1] ?? raw;
		const alpha = Number(alphaMatch?.[2] ?? 1);
		if (literal.startsWith("#")) {
			const expanded =
				literal.length === 4
					? `#${literal[1]}${literal[1]}${literal[2]}${literal[2]}${literal[3]}${literal[3]}`
					: literal;
			return { color: expanded, alpha };
		}
		const inner = literal.startsWith("var(") ? literal.slice(4, -1).trim() : literal;
		return { color: hexOf(inner), alpha };
	};

	return {
		name,
		surface: hexOf("--background-color-card"),
		decorative: hexOf(shippedDecorativeProperty()),
		strong: textColorOf("--text-color-strong"),
		muted: textColorOf("--text-color-muted"),
	};
};

const THEMES: Theme[] = [
	resolveTheme("light", lightCss, "mantle.css"),
	resolveTheme("dark", darkCss, "mantle-dark.css"),
	resolveTheme("light-high-contrast", lightHighContrastCss, "mantle-light-high-contrast.css"),
	resolveTheme("dark-high-contrast", darkHighContrastCss, "mantle-dark-high-contrast.css"),
];

describe("empty-state text over a decorative chart", () => {
	test("the chart composites nothing over its marks, which is what these measurements assume", () => {
		// Every ratio below reads the fill as the color behind the text. A blur or an
		// opacity on the root would put some other color there — a blur pulls
		// neighboring marks under the copy, and this file cannot see either one.
		const { container } = render(
			<BarChart.Root data={[{ month: "January", desktop: 1 }]} xKey="month" decorative>
				<BarChart.Bar dataKey="desktop" />
			</BarChart.Root>,
		);
		const root = container.querySelector('[data-slot="bar-chart"]');
		expect(root).toHaveAttribute("aria-hidden", "true");
		expect(root?.className).not.toMatch(/(?:^|\s)(?:blur|opacity)-/);
	});

	test.each(THEMES.map((theme) => [theme.name, theme] as const))(
		"%s: the decorative fill reads as gray, so no mark carries series identity",
		(_name, theme) => {
			// The point of the token: a placeholder encodes nothing, and a hue on
			// values that are not information invites a reader to decode it. This is
			// the inverse of the chroma floor `tokens.test.ts` holds the eight
			// categorical slots above.
			expect(oklchOf(theme.decorative).chroma).toBeLessThan(CHROMA_FLOOR);
		},
	);

	test.each(THEMES.map((theme) => [theme.name, theme] as const))(
		"%s: text over the decorative fill clears AA",
		(_name, theme) => {
			const measure = (text: TextColor) =>
				contrastRatio(over(text.color, theme.decorative, text.alpha), theme.decorative);
			expect(
				measure(theme.muted),
				`${theme.name}: Empty.Description (text-muted) over a decorative mark`,
			).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
			expect(
				measure(theme.strong),
				`${theme.name}: Empty.Title (text-strong) over a decorative mark`,
			).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
		},
	);

	test.each(THEMES.map((theme) => [theme.name, theme] as const))(
		"%s: the decorative fill still paints a chart",
		(_name, theme) => {
			// The floor is one-sided in the tests above: a fill equal to the card
			// surface would clear AA by painting no marks at all.
			expect(
				contrastRatio(theme.decorative, theme.surface),
				`${theme.name}: the decorative fill against the card surface`,
			).toBeGreaterThan(VISIBILITY_FLOOR);
		},
	);
});
