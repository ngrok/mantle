import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import twThemeCss from "tailwindcss/theme.css?raw";
import darkHighContrastCss from "../../mantle-dark-high-contrast.css?raw";
import darkCss from "../../mantle-dark.css?raw";
import lightHighContrastCss from "../../mantle-light-high-contrast.css?raw";
import lightCss from "../../mantle.css?raw";
import { contrastRatio, hexFromOklch, layer, resolveProperty } from "../chart/palette-gates.js";
import type { ThemeName } from "../chart/palette-gates.js";
import { Steps } from "./steps.js";

/**
 * The rail, the marker blob, and the number on it come from two design tokens,
 * and this file measures both in every theme a consumer can be in.
 *
 * The pair carries three constraints at once, and no verification command sees
 * any of them. The fill must be **opaque**, because the marker's stubs overlay
 * the item's rail in the same color and a translucent fill composites twice
 * there and shows a seam. The number must stay readable **on** that fill. And
 * the rail must read against the page, which is what the app-local copy this
 * component replaces got wrong: it painted `gray-200` and then patched every
 * use site with `high-contrast:` overrides, because a stop that quiet is
 * invisible against a high-contrast surface.
 *
 * When this fails, re-step a token. Never widen a floor.
 */

/** WCAG AA for normal-size text. The number renders at 18px, under the 14pt-bold large-text threshold. */
const CONTRAST_FLOOR = 4.5;

/**
 * A rail this close to the surface paints no line at all. The standard themes
 * keep it deliberately quiet — this is the line between quiet and absent.
 */
const VISIBILITY_FLOOR = 1.4;

/** WCAG 1.4.11 for non-text contrast. The high-contrast themes owe a line, not a hint. */
const HIGH_CONTRAST_FLOOR = 3;

/** The value and the declaring file, per theme. A re-alias or a dropped override moves one of them. */
const PROVENANCE: Record<ThemeName, { rail: string; number: string; source: string }> = {
	light: {
		rail: "--color-neutral-300",
		number: "--color-neutral-950",
		source: "mantle.css",
	},
	dark: {
		rail: "--color-neutral-300",
		number: "--color-neutral-950",
		source: "mantle-dark.css",
	},
	"light-high-contrast": {
		rail: "--color-black",
		number: "--color-white",
		source: "mantle-light-high-contrast.css",
	},
	"dark-high-contrast": {
		rail: "--color-black",
		number: "--color-white",
		source: "mantle-dark-high-contrast.css",
	},
};

type Theme = {
	name: ThemeName;
	/** Every custom property this theme resolves, in cascade order. */
	chain: ReturnType<typeof layer>[];
};

const themeOf = (name: ThemeName, themeCss: string, themeFile: string): Theme => ({
	name,
	chain:
		themeFile === "mantle.css"
			? [layer("mantle.css", lightCss), layer("tailwindcss/theme.css", twThemeCss)]
			: [
					layer(themeFile, themeCss),
					layer("mantle.css", lightCss),
					layer("tailwindcss/theme.css", twThemeCss),
				],
});

const THEMES: Theme[] = [
	themeOf("light", lightCss, "mantle.css"),
	themeOf("dark", darkCss, "mantle-dark.css"),
	themeOf("light-high-contrast", lightHighContrastCss, "mantle-light-high-contrast.css"),
	themeOf("dark-high-contrast", darkHighContrastCss, "mantle-dark-high-contrast.css"),
];

const cases = THEMES.map((theme) => [theme.name, theme] as const);

const hexOf = (theme: Theme, property: string) =>
	hexFromOklch(resolveProperty(theme.chain, property).literal);

describe("Steps design tokens", () => {
	test.each(cases)(
		"%s: each token resolves to the recorded stop in the recorded file",
		(name, theme) => {
			const rail = resolveProperty(theme.chain, "--color-steps-rail");
			const number = resolveProperty(theme.chain, "--color-steps-number");
			expect({ rail: rail.name, number: number.name, source: rail.source }).toEqual(
				PROVENANCE[name],
			);
			expect(number.source).toBe(PROVENANCE[name].source);
		},
	);

	test.each(cases)("%s: both tokens are opaque, so the stubs leave no seam", (_name, theme) => {
		// The stubs overlay the item's rail in the rail's own color. An alpha
		// there paints the overlap twice and draws the joint the fillets exist to
		// hide. It would also invalidate every ratio measured below, each of which
		// reads the token as the color a browser rasterizes.
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
		const floor = theme.name.includes("high-contrast") ? HIGH_CONTRAST_FLOOR : VISIBILITY_FLOOR;
		expect(contrastRatio(rail, hexOf(theme, "--background-color-base"))).toBeGreaterThanOrEqual(
			floor,
		);
		expect(contrastRatio(rail, hexOf(theme, "--background-color-card"))).toBeGreaterThanOrEqual(
			floor,
		);
	});

	test("every element that paints names the token its theme declares", () => {
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

		// A cross-file pin, per element rather than per token name. Tailwind turns
		// each utility's `steps-*` tail into a `--color-*` lookup, so renaming one
		// side alone leaves the utility resolving to nothing — an unpainted rail
		// or a default-black blob, with lint, typecheck, build, and every other
		// test green. Three separate use sites, so three separate assertions.
		expect(item.className).toContain("border-s-steps-rail");
		expect(svg?.getAttribute("class")).toContain("fill-steps-rail");
		expect(marker?.getAttribute("class")).toContain("after:text-steps-number");

		for (const theme of THEMES) {
			for (const token of ["--color-steps-rail", "--color-steps-number"]) {
				expect(resolveProperty(theme.chain, token).literal).toMatch(/^oklch\(/);
			}
		}
	});

	test("the ratios the docs page publishes are the ratios the tokens resolve to", () => {
		// The docs page prints six numbers per theme under Theming. The floors
		// above cannot see a re-step that still clears them, so the table would go
		// stale silently — these are the exact values, rounded the way it prints.
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
			"light-high-contrast": { numberOnRail: 21, railOnPage: 20.12, railOnCard: 21 },
			"dark-high-contrast": { numberOnRail: 21, railOnPage: 21, railOnCard: 18.73 },
		});
	});
});
