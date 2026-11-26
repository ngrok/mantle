import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import twThemeCss from "tailwindcss/theme.css?raw";
import mantleCss from "../../mantle.css?raw";
import { splitDarkThemeRule } from "../../test-utils/parse-theme-css.js";
import { contrastRatio, hexFromOklch, layer, resolveProperty } from "../chart/palette-gates.js";
import type { ThemeName } from "../chart/palette-gates.js";
import * as Steps from "./steps-parts.js";

const { light: lightCss, dark: darkCss } = splitDarkThemeRule(mantleCss);

/**
 * The rail, the marker blob, and the number on it come from two design tokens,
 * and this file measures both in each theme.
 *
 * The pair carries three constraints, and no verification command sees any of
 * them:
 * - The fill is opaque. The marker's stubs overlay the rail in the same color,
 *   and a translucent fill paints the overlap twice and shows a seam.
 * - The number stays readable on that fill.
 * - The rail reads against the page and against a card.
 *
 * When this fails, re-step a token. Never lower a floor.
 */

/** WCAG AA for normal-size text. The number renders at 18px, under the large-text size. */
const CONTRAST_FLOOR = 4.5;

/**
 * A rail this close to the surface paints no line at all. The rail is quiet on
 * purpose, and this is the line between quiet and absent.
 */
const VISIBILITY_FLOOR = 1.4;

type Theme = {
	name: ThemeName;
	/** Every custom property this theme resolves, in cascade order. */
	chain: ReturnType<typeof layer>[];
};

const THEMES: Theme[] = [
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
];

const cases = THEMES.map((theme) => [theme.name, theme] as const);

const hexOf = (theme: Theme, property: string) =>
	hexFromOklch(resolveProperty(theme.chain, property).literal);

describe("Steps design tokens", () => {
	test.each(cases)("%s: each token resolves to the recorded neutral stop", (_name, theme) => {
		// Both themes alias the same stops, and dark inverts the neutral ramp, so
		// one pair of aliases keeps the rail quiet and the number readable in each.
		expect({
			rail: resolveProperty(theme.chain, "--color-steps-rail").name,
			number: resolveProperty(theme.chain, "--color-steps-number").name,
		}).toEqual({ rail: "--color-neutral-300", number: "--color-neutral-950" });
	});

	test.each(cases)("%s: both tokens are opaque, so the stubs leave no seam", (_name, theme) => {
		// An alpha would also make each ratio below wrong, because each one reads
		// the token as the color that a browser paints.
		for (const property of ["--color-steps-rail", "--color-steps-number"]) {
			expect(resolveProperty(theme.chain, property).literal).not.toContain("/");
		}
	});

	test.each(cases)("%s: the number clears AA on the blob it sits in", (_name, theme) => {
		const ratio = contrastRatio(
			hexOf(theme, "--color-steps-number"),
			hexOf(theme, "--color-steps-rail"),
		);
		expect(ratio).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
	});

	test.each(cases)("%s: the rail reads against the page and against a card", (_name, theme) => {
		const rail = hexOf(theme, "--color-steps-rail");
		expect(contrastRatio(rail, hexOf(theme, "--background-color-base"))).toBeGreaterThanOrEqual(
			VISIBILITY_FLOOR,
		);
		expect(contrastRatio(rail, hexOf(theme, "--background-color-card"))).toBeGreaterThanOrEqual(
			VISIBILITY_FLOOR,
		);
	});

	test("each element that paints names the token that the theme declares", () => {
		render(
			<Steps.Root>
				<Steps.Item data-testid="step">
					<Steps.Title>Install the ngrok agent</Steps.Title>
				</Steps.Item>
			</Steps.Root>,
		);
		const item = screen.getByTestId("step");
		const marker = item.querySelector('[data-slot="steps-marker"]');
		const svg = item.querySelector("svg");

		// A cross-file spelling pin, one for each element. Tailwind turns each
		// utility's `steps-*` tail into a `--color-*` lookup, so a rename on one
		// side leaves an unpainted rail or a black blob, and every check stays green.
		expect(item.className).toContain("border-s-steps-rail");
		expect(svg?.getAttribute("class")).toContain("fill-steps-rail");
		expect(marker?.getAttribute("class")).toContain("after:text-steps-number");

		for (const theme of THEMES) {
			for (const token of ["--color-steps-rail", "--color-steps-number"]) {
				expect(resolveProperty(theme.chain, token).literal).toMatch(/^oklch\(/);
			}
		}
	});

	test("the ratios that the docs page publishes are the ratios the tokens resolve to", () => {
		// The docs page prints three numbers for each theme under Theming. The
		// floors above do not see a re-step that still clears them, so these are
		// the exact values, rounded as the page prints them.
		const measured = Object.fromEntries(
			THEMES.map((theme) => {
				const rail = hexOf(theme, "--color-steps-rail");
				const round = (ratio: number) => Number(ratio.toFixed(2));
				return [
					theme.name,
					{
						numberOnRail: round(contrastRatio(hexOf(theme, "--color-steps-number"), rail)),
						railOnPage: round(contrastRatio(rail, hexOf(theme, "--background-color-base"))),
						railOnCard: round(contrastRatio(rail, hexOf(theme, "--background-color-card"))),
					},
				];
			}),
		);
		expect(measured).toEqual({
			light: { numberOnRail: 12.64, railOnPage: 1.42, railOnCard: 1.48 },
			dark: { numberOnRail: 9.93, railOnPage: 1.81, railOnCard: 1.73 },
		});
	});
});
