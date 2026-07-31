import { describe, expect, test } from "vitest";
import twThemeCss from "tailwindcss/theme.css?raw";
import darkHighContrastCss from "../../mantle-dark-high-contrast.css?raw";
import darkCss from "../../mantle-dark.css?raw";
import lightHighContrastCss from "../../mantle-light-high-contrast.css?raw";
import lightCss from "../../mantle.css?raw";
import {
	CHROMA_FLOOR,
	CONTRAST_MIN,
	CVD_FLOOR,
	CVD_TARGET,
	LIGHTNESS_BAND,
	NORMAL_VISION_FLOOR,
	aliasOf,
	hexFromOklch,
	layer,
	lowChromaSlots,
	lowContrastSlots,
	offBandSlots,
	oklchOf,
	resolveProperty,
	worstCvdPair,
	worstNormalPair,
} from "./palette-gates.js";
import type { PaletteMode, WorstPair } from "./palette-gates.js";

/**
 * The validated chart palette, measured rather than pinned by name.
 *
 * This test resolves every `--color-chart-*` slot in every theme down to the
 * 8-bit color a browser rasterizes, then runs the measured accessibility gates
 * on the result: lightness band, chroma floor, CVD-simulated separation,
 * normal-vision separation, and contrast against that theme's card surface.
 * `palette-gates.test.ts` pins the math itself against externally sourced
 * answers.
 *
 * It replaced a test that compared alias NAMES, which could not see any of the
 * regressions that matter — a ramp step edited by one digit, a surface change, or
 * a deleted override that drops a slot through to Tailwind's own ramp. Every
 * light slot resolves inside `mantle.css` today, so mantle owns all four
 * palettes; the resolver still reaches Tailwind, and the recorded source below is
 * what would catch a slot falling back to it.
 *
 * **When this test fails, re-step a slot. Never widen a threshold and never
 * update an expectation to match.** The thresholds are the contract; the palette
 * is what moves. The margins are thin on purpose — light and dark clear the
 * normal-vision floor by 0.8 ΔE, and one high-contrast slot clears the chroma
 * floor by 0.0005 — so a change that looks cosmetic can land here.
 *
 * @see decisions/2026-07-18-canvas-chart-family.md — the recorded baseline
 */

/** A theme's chart palette: eight categorical slots, the overflow, the surface. */
type ThemePalette = {
	name: string;
	mode: PaletteMode;
	/** Slots 1-8, in order. */
	slots: string[];
	/** The neutral overflow slot every ninth-and-later series wears. */
	overflow: string;
	/** The card surface the marks are measured against. */
	surface: string;
	/** Per slot, the ramp step it aliases and the file the value came from. */
	provenance: Array<{ slot: string; alias: string; source: string }>;
};

const CHART_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/**
 * Resolve one theme's palette through the cascade a browser applies: the theme
 * file outranks `mantle.css`, which outranks Tailwind's own theme.
 */
const resolvePalette = (
	name: string,
	mode: PaletteMode,
	themeCss: string,
	themeFile: string,
): ThemePalette => {
	const chain =
		themeFile === "mantle.css"
			? [layer("mantle.css", lightCss), layer("tailwindcss/theme.css", twThemeCss)]
			: [
					layer(themeFile, themeCss),
					layer("mantle.css", lightCss),
					layer("tailwindcss/theme.css", twThemeCss),
				];

	const hexOf = (property: string) => hexFromOklch(resolveProperty(chain, property).literal);
	return {
		name,
		mode,
		slots: CHART_SLOTS.map((slot) => hexOf(`--color-chart-${slot}`)),
		overflow: hexOf("--color-chart-other"),
		surface: hexOf("--background-color-card"),
		provenance: [...CHART_SLOTS, "other"].map((slot) => {
			const property = `--color-chart-${slot}`;
			return {
				slot: `chart-${slot}`,
				alias: aliasOf(chain, property).alias,
				source: resolveProperty(chain, property).source,
			};
		}),
	};
};

const THEMES: ThemePalette[] = [
	resolvePalette("light", "light", lightCss, "mantle.css"),
	resolvePalette("dark", "dark", darkCss, "mantle-dark.css"),
	resolvePalette(
		"light-high-contrast",
		"light",
		lightHighContrastCss,
		"mantle-light-high-contrast.css",
	),
	resolvePalette(
		"dark-high-contrast",
		"dark",
		darkHighContrastCss,
		"mantle-dark-high-contrast.css",
	),
];

/**
 * `dark-high-contrast` sits above the dark lightness band on purpose: its ramps
 * are bimodal, so no step set satisfies both the band and the contrast target,
 * and deliberately brighter marks are the recorded trade-off.
 *
 * This pins the fact, not a permission. All eight slots must sit above the
 * ceiling, none may fall below the floor, and none may drift past `0.9`. Re-step
 * a slot back into the band and this goes red — delete it from the waiver rather
 * than widening anything. Every other gate still runs on this theme unwaived,
 * which matters: its normal-vision worst pair clears a hard 15.0 by 0.15.
 *
 * @see decisions/2026-07-18-canvas-chart-family.md
 */
const DARK_HIGH_CONTRAST_BAND_WAIVER = { slots: [1, 2, 3, 4, 5, 6, 7, 8], driftCeiling: 0.9 };

/**
 * The ramp step each slot aliases, and the file the value is declared in.
 *
 * This is the recorded shape of the palette, and it is the only gate that sees a
 * deleted override — a slot that falls through to a different file keeps passing
 * every color measurement. Every row lands in a mantle theme file today, so no
 * chart color depends on a Tailwind ramp value. A row that flips to
 * `tailwindcss/theme.css` means an override went missing and an upstream re-tune
 * can now move a shipped series color.
 */
const PROVENANCE: Record<string, Array<{ slot: string; alias: string; source: string }>> = {
	light: [
		{ slot: "chart-1", alias: "--color-blue-500", source: "mantle.css" },
		{ slot: "chart-2", alias: "--color-green-700", source: "mantle.css" },
		{ slot: "chart-3", alias: "--color-pink-500", source: "mantle.css" },
		{ slot: "chart-4", alias: "--color-red-600", source: "mantle.css" },
		{ slot: "chart-5", alias: "--color-teal-600", source: "mantle.css" },
		{ slot: "chart-6", alias: "--color-orange-600", source: "mantle.css" },
		{ slot: "chart-7", alias: "--color-violet-500", source: "mantle.css" },
		{ slot: "chart-8", alias: "--color-yellow-700", source: "mantle.css" },
		{ slot: "chart-other", alias: "--color-neutral-500", source: "mantle.css" },
	],
	dark: [
		{ slot: "chart-1", alias: "--color-blue-500", source: "mantle-dark.css" },
		{ slot: "chart-2", alias: "--color-green-300", source: "mantle-dark.css" },
		{ slot: "chart-3", alias: "--color-pink-500", source: "mantle-dark.css" },
		{ slot: "chart-4", alias: "--color-red-400", source: "mantle-dark.css" },
		{ slot: "chart-5", alias: "--color-teal-400", source: "mantle-dark.css" },
		{ slot: "chart-6", alias: "--color-orange-400", source: "mantle-dark.css" },
		{ slot: "chart-7", alias: "--color-violet-500", source: "mantle-dark.css" },
		{ slot: "chart-8", alias: "--color-yellow-300", source: "mantle-dark.css" },
		{ slot: "chart-other", alias: "--color-neutral-500", source: "mantle-dark.css" },
	],
	"light-high-contrast": [
		{ slot: "chart-1", alias: "--color-blue-500", source: "mantle-light-high-contrast.css" },
		{ slot: "chart-2", alias: "--color-green-700", source: "mantle-light-high-contrast.css" },
		{ slot: "chart-3", alias: "--color-pink-300", source: "mantle-light-high-contrast.css" },
		{ slot: "chart-4", alias: "--color-red-600", source: "mantle-light-high-contrast.css" },
		{ slot: "chart-5", alias: "--color-teal-300", source: "mantle-light-high-contrast.css" },
		{ slot: "chart-6", alias: "--color-orange-600", source: "mantle-light-high-contrast.css" },
		{ slot: "chart-7", alias: "--color-violet-500", source: "mantle-light-high-contrast.css" },
		{ slot: "chart-8", alias: "--color-yellow-700", source: "mantle-light-high-contrast.css" },
		{ slot: "chart-other", alias: "--color-neutral-500", source: "mantle-light-high-contrast.css" },
	],
	"dark-high-contrast": [
		{ slot: "chart-1", alias: "--color-blue-300", source: "mantle-dark-high-contrast.css" },
		{ slot: "chart-2", alias: "--color-green-300", source: "mantle-dark-high-contrast.css" },
		{ slot: "chart-3", alias: "--color-pink-600", source: "mantle-dark-high-contrast.css" },
		{ slot: "chart-4", alias: "--color-red-300", source: "mantle-dark-high-contrast.css" },
		{ slot: "chart-5", alias: "--color-teal-300", source: "mantle-dark-high-contrast.css" },
		{ slot: "chart-6", alias: "--color-orange-300", source: "mantle-dark-high-contrast.css" },
		{ slot: "chart-7", alias: "--color-violet-300", source: "mantle-dark-high-contrast.css" },
		{ slot: "chart-8", alias: "--color-yellow-300", source: "mantle-dark-high-contrast.css" },
		{ slot: "chart-other", alias: "--color-neutral-500", source: "mantle-dark-high-contrast.css" },
	],
};

/**
 * One gate violation, worded so the vitest array diff alone tells a maintainer
 * what broke and what to do. The remedy is part of the string on purpose: the
 * two-argument `expect(value, hint)` form is not available here.
 */
const violation = (theme: ThemePalette, detail: string) =>
	`${theme.name}: ${detail} — re-step a slot and re-validate. Never widen a threshold, and never update an expectation to match. Resolved: ${theme.slots.join(",")} on surface ${theme.surface}.`;

const describePair = (pair: WorstPair) =>
	`chart-${pair.first.slot} ${pair.first.hex} <-> chart-${pair.second.slot} ${pair.second.hex} (${pair.kind}) ΔE ${pair.deltaE.toFixed(2)}`;

/** The lightness-band slots each theme is recorded as sitting outside, by design. */
const BAND_WAIVERS: Record<string, typeof DARK_HIGH_CONTRAST_BAND_WAIVER> = {
	"dark-high-contrast": DARK_HIGH_CONTRAST_BAND_WAIVER,
};

describe.each(THEMES)("chart palette gates — $name", (theme) => {
	test("every slot resolves through the recorded ramp step and file", () => {
		// The one gate no color measurement can replace. Deleting mantle's own
		// `--color-blue-500` override drops light chart-1 through to Tailwind's
		// blue-500: surface contrast falls from 4.39:1 to 3.76:1, still clears 3:1,
		// and all five measured gates stay green. Only the recorded source sees it.
		//
		// The `source` column is also the answer to "why did CI go red when I
		// changed no CSS" — every `tailwindcss/theme.css` row is a color mantle
		// ships in the default theme without owning its value.
		expect(theme.slots).toHaveLength(8);
		expect(theme.provenance).toEqual(PROVENANCE[theme.name]);
	});

	test("the overflow slot reads as gray, so it does no identity work", () => {
		// The inverse of the chroma floor. `chart-other` is excluded from the
		// separation gates by construction, and it has to be: its lightness sits
		// outside both bands in the high-contrast themes.
		expect(oklchOf(theme.overflow).chroma).toBeLessThan(CHROMA_FLOOR);
	});

	test("every slot sits inside the mode's lightness band", () => {
		const waiver = BAND_WAIVERS[theme.name];
		const [, ceiling] = LIGHTNESS_BAND[theme.mode];
		const offBand = offBandSlots(theme.slots, theme.mode);
		const waived = waiver?.slots ?? [];
		const violations = [
			...offBand
				.filter(({ slot }) => !waived.includes(slot))
				.map(({ slot, lightness }) =>
					violation(theme, `chart-${slot} left the lightness band at L ${lightness.toFixed(3)}`),
				),
			// A waived slot coming back into band is also a failure: re-record the
			// fact by deleting it from the waiver rather than leaving a stale entry.
			...waived
				.filter((slot) => !offBand.some((entry) => entry.slot === slot))
				.map((slot) =>
					violation(theme, `chart-${slot} is inside the band now — delete it from the waiver`),
				),
			// And the waiver only permits drifting UP, and only so far.
			...offBand
				.filter(({ slot, lightness }) => waived.includes(slot) && lightness <= ceiling)
				.map(({ slot }) =>
					violation(theme, `waived chart-${slot} drifted below the band, not above`),
				),
			...offBand
				.filter(
					({ slot, lightness }) =>
						waived.includes(slot) && lightness >= (waiver?.driftCeiling ?? 1),
				)
				.map(({ slot, lightness }) =>
					violation(theme, `waived chart-${slot} drifted to L ${lightness.toFixed(3)}, too bright`),
				),
		];
		expect(violations).toEqual([]);
	});

	test("every slot clears the chroma floor", () => {
		const violations = lowChromaSlots(theme.slots).map(({ slot, chroma }) =>
			violation(
				theme,
				`chart-${slot} chroma ${chroma.toFixed(4)} is under the ${CHROMA_FLOOR} floor, so it reads as gray`,
			),
		);
		expect(violations).toEqual([]);
	});

	test("adjacent slots stay apart under simulated color vision deficiency", () => {
		// Adjacent scope is correct for bars, stacks, and lines: slot assignment
		// never skips a mounted series, so only neighbors touch.
		const worst = worstCvdPair(theme.slots, "adjacent");
		const violations = [
			worst.deltaE < CVD_FLOOR &&
				violation(
					theme,
					`CVD separation is under the ${CVD_FLOOR} hard floor. ${describePair(worst)}`,
				),
			worst.deltaE >= CVD_FLOOR &&
				worst.deltaE < CVD_TARGET &&
				violation(
					theme,
					`CVD separation is under the ${CVD_TARGET} target, which is legal only with a secondary encoding. ${describePair(worst)}`,
				),
		].filter((entry) => entry !== false);
		expect(violations).toEqual([]);
	});

	test("adjacent slots stay apart for full-color readers", () => {
		// The hard gate: a secondary encoding does not excuse this one.
		const worst = worstNormalPair(theme.slots, "adjacent");
		const violations =
			worst.deltaE < NORMAL_VISION_FLOOR
				? [
						violation(
							theme,
							`the normal-vision floor of ${NORMAL_VISION_FLOOR} was breached and this gate has no relief valve. ${describePair(worst)}`,
						),
					]
				: [];
		expect(violations).toEqual([]);
	});

	test("every slot clears the contrast minimum against the card surface", () => {
		const violations = lowContrastSlots([...theme.slots, theme.overflow], theme.surface).map(
			({ slot, hex, ratio }) =>
				violation(
					theme,
					`chart-${slot} ${hex} is ${ratio.toFixed(2)}:1 against the surface, under ${CONTRAST_MIN}:1`,
				),
		);
		expect(violations).toEqual([]);
	});

	test("the first three slots survive an all-pairs comparison", () => {
		// Scatter marks can neighbor any other mark, so a scatter palette must
		// clear every pair, not only neighbors. Three slots clear the target in
		// every theme.
		const worst = worstCvdPair(theme.slots.slice(0, 3), "all");
		const violations =
			worst.deltaE < CVD_TARGET
				? [
						violation(
							theme,
							`all-pairs CVD over the first three slots is under the ${CVD_TARGET} target. ${describePair(worst)}`,
						),
					]
				: [];
		expect(violations).toEqual([]);
	});
});

describe("scatter's four-series cap", () => {
	// scatter-plot.mdx documents the first four slots as all-pairs validated. It
	// holds in the two standard themes and NOT in light-high-contrast, where
	// chart-2 and chart-4 sit at ΔE 3.91 under deuteranopia — below the 6.0 hard
	// floor. That is a palette or a docs decision, not a test decision, so this
	// asserts the claim only where it is true and names the gap rather than
	// waiving it.
	test.each(["light", "dark"])("%s validates the first four slots for scatter", (name) => {
		const theme = THEMES.find((candidate) => candidate.name === name);
		if (theme == null) {
			throw new Error(`no resolved palette named ${name}`);
		}
		const worst = worstCvdPair(theme.slots.slice(0, 4), "all");
		expect(worst.deltaE, `Worst: ${describePair(worst)}`).toBeGreaterThanOrEqual(CVD_TARGET);
	});
});
