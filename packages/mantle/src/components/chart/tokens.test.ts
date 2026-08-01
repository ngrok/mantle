import { describe, expect, test } from "vitest";
import twThemeCss from "tailwindcss/theme.css?raw";
import darkHighContrastCss from "../../mantle-dark-high-contrast.css?raw";
import darkCss from "../../mantle-dark.css?raw";
import lightHighContrastCss from "../../mantle-light-high-contrast.css?raw";
import lightCss from "../../mantle.css?raw";
import {
	CHROMA_FLOOR,
	CONTRAST_FLOOR_BY_THEME,
	CVD_FLOOR,
	CVD_TARGET,
	LIGHTNESS_BAND,
	NORMAL_VISION_FLOOR,
	contrastRatio,
	deltaE,
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
import type { PaletteMode, ThemeName, WorstPair } from "./palette-gates.js";

/**
 * The validated chart palette, measured rather than pinned by name.
 *
 * This test resolves every `--color-chart-*` slot in every theme down to the
 * 8-bit color a browser rasterizes, then runs the measured accessibility gates
 * on the result: lightness band, chroma floor, separation under simulated color
 * vision deficiency (CVD), normal-vision separation, and contrast against that
 * theme's card surface. Separation runs twice, over adjacent pairs and over all
 * 28 pairs. The overflow gray sits outside those pairlists, so it gets its own
 * contrast gate and its own recorded distance from the eight.
 * `palette-gates.test.ts` pins the math itself against externally sourced
 * answers.
 *
 * It replaced a test that compared alias NAMES, which could not see any of the
 * regressions that matter — a color edited by one digit, a surface change, or a
 * deleted override that drops a slot through to another file. Each theme now
 * authors its eight slots as `oklch()` literals, so the recorded value below is
 * the color that ships and the recorded source is the file that declares it.
 *
 * **When this test fails, re-step a slot. Never widen a threshold and never
 * update an expectation to match.** The thresholds are the contract; the palette
 * is what moves. The all-pairs margins are the thin ones: over the normal-vision
 * floor of 15, light clears by 0.475, light-high-contrast by 0.145, dark by
 * 0.072, and dark-high-contrast by 0.054. Two other gates run as close — one
 * dark-high-contrast slot clears the chroma floor by 0.0007, and dark's
 * brightest slot sits 0.0005 under its band ceiling. Re-measure every gate in
 * every theme after any re-step, because a change that looks cosmetic lands
 * here.
 *
 * @see decisions/2026-07-18-canvas-chart-family.md — the recorded baseline
 */

/** A theme's chart palette: eight categorical slots, the overflow, the surface. */
type ThemePalette = {
	name: ThemeName;
	mode: PaletteMode;
	/** Slots 1-8, in order. */
	slots: string[];
	/** The neutral overflow slot every ninth-and-later series wears. */
	overflow: string;
	/** The card surface the marks are measured against. */
	surface: string;
	/** Per slot, the literal it resolves to and the file that declares it. */
	provenance: Array<{ slot: string; value: string; source: string }>;
};

const CHART_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/**
 * Resolve one theme's palette through the cascade a browser applies: the theme
 * file outranks `mantle.css`, which outranks Tailwind's own theme.
 */
const resolvePalette = (
	name: ThemeName,
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
			const resolved = resolveProperty(chain, `--color-chart-${slot}`);
			return { slot: `chart-${slot}`, value: resolved.literal, source: resolved.source };
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
 * `dark-high-contrast` sits above the dark lightness band on purpose. At the
 * band ceiling of L 0.67, only a narrow green window — hue 141 to 151 — reaches
 * the 6.76:1 this theme holds on its `#121212` surface. All eight hues below
 * fall outside that window, so each one caps under the floor at the ceiling, the
 * magenta lowest at 6.27:1. Deliberately brighter marks are the recorded
 * trade-off.
 *
 * This pins the fact, not a permission. All eight slots must sit above the
 * ceiling, none may fall below the floor, and none may drift past `0.9`. Re-step
 * a slot back into the band and this goes red — delete it from the waiver rather
 * than widening anything. Every other gate still runs on this theme unwaived,
 * which matters: its worst pair over all 28 clears a hard 15.0 by 0.054.
 *
 * @see decisions/2026-07-18-canvas-chart-family.md
 */
const DARK_HIGH_CONTRAST_BAND_WAIVER = { slots: [1, 2, 3, 4, 5, 6, 7, 8], driftCeiling: 0.9 };

/**
 * The literal each slot resolves to, and the file that declares it.
 *
 * This is the recorded shape of the palette, and it is the gate no color
 * measurement can replace. The value column pins the shipped color, so a slot
 * re-tuned by one digit fails here even when it still clears every threshold.
 * The source column pins the owner: a deleted theme override can keep passing
 * every color measurement while it drops that slot through to light's value, or
 * past mantle entirely to `tailwindcss/theme.css`.
 *
 * Each theme declares its own eight `oklch()` literals. Only `chart-other` is
 * still an alias, and it resolves to that theme's `--color-neutral-500`.
 */
const PROVENANCE: Record<ThemeName, Array<{ slot: string; value: string; source: string }>> = {
	light: [
		{ slot: "chart-1", value: "oklch(0.622 0.203 259)", source: "mantle.css" },
		{ slot: "chart-2", value: "oklch(0.478 0.106 159.7)", source: "mantle.css" },
		{ slot: "chart-3", value: "oklch(0.644 0.258 1.2)", source: "mantle.css" },
		{ slot: "chart-4", value: "oklch(0.519 0.192 31.8)", source: "mantle.css" },
		{ slot: "chart-5", value: "oklch(0.611 0.103 204.6)", source: "mantle.css" },
		{ slot: "chart-6", value: "oklch(0.501 0.208 334.3)", source: "mantle.css" },
		{ slot: "chart-7", value: "oklch(0.473 0.227 290.6)", source: "mantle.css" },
		{ slot: "chart-8", value: "oklch(0.621 0.125 80.1)", source: "mantle.css" },
		{ slot: "chart-other", value: "oklch(55.6% 0 none)", source: "mantle.css" },
	],
	dark: [
		{ slot: "chart-1", value: "oklch(0.668 0.168 260.3)", source: "mantle-dark.css" },
		{ slot: "chart-2", value: "oklch(0.537 0.121 160.1)", source: "mantle-dark.css" },
		{ slot: "chart-3", value: "oklch(0.627 0.242 6.7)", source: "mantle-dark.css" },
		{ slot: "chart-4", value: "oklch(0.565 0.169 41.2)", source: "mantle-dark.css" },
		{ slot: "chart-5", value: "oklch(0.668 0.112 198.8)", source: "mantle-dark.css" },
		{ slot: "chart-6", value: "oklch(0.584 0.261 332.9)", source: "mantle-dark.css" },
		{ slot: "chart-7", value: "oklch(0.573 0.244 285.4)", source: "mantle-dark.css" },
		{ slot: "chart-8", value: "oklch(0.668 0.137 83.5)", source: "mantle-dark.css" },
		{ slot: "chart-other", value: "oklch(55.6% 0 0)", source: "mantle-dark.css" },
	],
	"light-high-contrast": [
		{
			slot: "chart-1",
			value: "oklch(0.464 0.174 259.5)",
			source: "mantle-light-high-contrast.css",
		},
		{
			slot: "chart-2",
			value: "oklch(0.468 0.102 160.5)",
			source: "mantle-light-high-contrast.css",
		},
		{ slot: "chart-3", value: "oklch(0.649 0.252 1.6)", source: "mantle-light-high-contrast.css" },
		{
			slot: "chart-4",
			value: "oklch(0.512 0.196 31.5)",
			source: "mantle-light-high-contrast.css",
		},
		{
			slot: "chart-5",
			value: "oklch(0.598 0.101 203.3)",
			source: "mantle-light-high-contrast.css",
		},
		{
			slot: "chart-6",
			value: "oklch(0.468 0.208 333.4)",
			source: "mantle-light-high-contrast.css",
		},
		{
			slot: "chart-7",
			value: "oklch(0.633 0.193 288.5)",
			source: "mantle-light-high-contrast.css",
		},
		{ slot: "chart-8", value: "oklch(0.621 0.128 78)", source: "mantle-light-high-contrast.css" },
		{ slot: "chart-other", value: "oklch(38.18% 0 0)", source: "mantle-light-high-contrast.css" },
	],
	"dark-high-contrast": [
		{ slot: "chart-1", value: "oklch(0.689 0.171 248.8)", source: "mantle-dark-high-contrast.css" },
		{ slot: "chart-2", value: "oklch(0.673 0.163 155.7)", source: "mantle-dark-high-contrast.css" },
		{ slot: "chart-3", value: "oklch(0.813 0.107 12.6)", source: "mantle-dark-high-contrast.css" },
		{ slot: "chart-4", value: "oklch(0.71 0.19 42.7)", source: "mantle-dark-high-contrast.css" },
		{ slot: "chart-5", value: "oklch(0.898 0.107 195.2)", source: "mantle-dark-high-contrast.css" },
		{ slot: "chart-6", value: "oklch(0.717 0.198 344.4)", source: "mantle-dark-high-contrast.css" },
		{ slot: "chart-7", value: "oklch(0.803 0.1 279.4)", source: "mantle-dark-high-contrast.css" },
		{ slot: "chart-8", value: "oklch(0.835 0.133 88.5)", source: "mantle-dark-high-contrast.css" },
		{ slot: "chart-other", value: "oklch(79.79% 0 0)", source: "mantle-dark-high-contrast.css" },
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
const BAND_WAIVERS: Partial<Record<ThemeName, typeof DARK_HIGH_CONTRAST_BAND_WAIVER>> = {
	"dark-high-contrast": DARK_HIGH_CONTRAST_BAND_WAIVER,
};

/**
 * The closest a categorical slot may come to the overflow gray under simulated
 * protanopia or deuteranopia, per theme, rounded down to two places.
 *
 * A ratchet, not a threshold: `dark` and `dark-high-contrast` sit under
 * `CVD_FLOOR`, and no palette lifts them. `chart-other` has to be achromatic so
 * it reads as "not a category", the dichromacy simulations strip chroma, and a
 * gray therefore lands near any mark of its own lightness. The separation gates
 * exclude the overflow for that reason; this records what the exclusion costs.
 */
const OVERFLOW_SEPARATION_FLOOR: Record<ThemeName, number> = {
	light: 6.23,
	dark: 3.8,
	"light-high-contrast": 8.72,
	"dark-high-contrast": 3.12,
};

/** The categorical slot nearest the overflow gray, under either dichromacy. */
const closestOverflowPair = (theme: ThemePalette) => {
	const pairs = theme.slots.flatMap((hex, index) =>
		(["protan", "deutan"] as const).map((kind) => ({
			slot: index + 1,
			hex,
			kind,
			deltaE: deltaE(hex, theme.overflow, kind),
		})),
	);
	const [worst] = pairs.toSorted((first, second) => first.deltaE - second.deltaE);
	if (worst == null) {
		throw new Error("closestOverflowPair needs at least one slot");
	}
	return worst;
};

describe.each(THEMES)("chart palette gates — $name", (theme) => {
	test("every slot resolves to the recorded literal in the recorded file", () => {
		// The one gate no color measurement can replace. A slot re-tuned by a digit
		// still clears every threshold, and the value column is what sees it. The
		// source column names the file that owns each color, so a deleted theme
		// override reads as the wrong owner instead of as a silent fallback.
		//
		// A `tailwindcss/theme.css` row would mean mantle ships a chart color it
		// does not own, where an upstream re-tune moves a shipped series.
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
		// Adjacent scope is what bars, stacks, and lines hand out: slot assignment
		// never skips a mounted series, so neighbors touch first. The all-pairs gate
		// below subsumes this one. Both stay, because this message names the pair a
		// stack really paints side by side.
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

	test("every pair of slots stays apart under simulated color vision deficiency", () => {
		// All-pairs scope is the honest one for eight slots. A scatter neighbors any
		// mark with any other, a legend lists all eight in a column, and fixed series
		// slots can leave the painted slots non-consecutive. Adjacent
		// scope alone let light's chart-1 and chart-7 ship at ΔE 1.90.
		const worst = worstCvdPair(theme.slots, "all");
		const violations =
			worst.deltaE < CVD_TARGET
				? [
						violation(
							theme,
							`all-pairs CVD separation is under the ${CVD_TARGET} target. ${describePair(worst)}`,
						),
					]
				: [];
		expect(violations).toEqual([]);
	});

	test("every pair of slots stays apart for full-color readers", () => {
		// The thinnest ΔE margin in the suite: dark-high-contrast clears it by 0.054.
		const worst = worstNormalPair(theme.slots, "all");
		const violations =
			worst.deltaE < NORMAL_VISION_FLOOR
				? [
						violation(
							theme,
							`an all-pairs comparison fell under the normal-vision floor of ${NORMAL_VISION_FLOOR}, and this gate has no relief valve. ${describePair(worst)}`,
						),
					]
				: [];
		expect(violations).toEqual([]);
	});

	test("every slot clears this theme's own contrast floor", () => {
		// The floor is this theme's measured minimum rounded down to two places, not
		// the flat WCAG 3:1: a flat gate would let a re-step drop a high-contrast
		// theme to the floor a standard theme sits on. `palette-gates.test.ts` holds
		// every entry at or above `CONTRAST_MIN`, so the standard still backstops the
		// map. The overflow runs through the same floor below, under its own name —
		// `lowContrastSlots` numbers by position, so passing it as a ninth entry here
		// would report a `chart-9` that does not exist.
		const minimum = CONTRAST_FLOOR_BY_THEME[theme.name];
		const violations = lowContrastSlots(theme.slots, theme.surface, { minimum }).map(
			({ slot, hex, ratio }) =>
				violation(
					theme,
					`chart-${slot} ${hex} is ${ratio.toFixed(2)}:1 against the surface, under ${minimum}:1`,
				),
		);
		expect(violations).toEqual([]);
	});

	test("the overflow slot clears this theme's own contrast floor", () => {
		// Series nine and later all paint this gray, so it has to be as readable
		// against the card as any categorical mark.
		const minimum = CONTRAST_FLOOR_BY_THEME[theme.name];
		const ratio = contrastRatio(theme.overflow, theme.surface);
		const violations =
			ratio < minimum
				? [
						violation(
							theme,
							`chart-other ${theme.overflow} is ${ratio.toFixed(2)}:1 against the surface, under ${minimum}:1`,
						),
					]
				: [];
		expect(violations).toEqual([]);
	});

	test("the overflow slot keeps its recorded distance from every categorical slot", () => {
		// A ratchet, not a floor. The overflow is achromatic by construction, and
		// simulated dichromacy strips chroma, so a low-chroma slot and this gray can
		// never be far apart under CVD — `dark` reaches only 3.81 ΔE. That is the
		// measured reason the docs tell a consumer to fold the tail into one "Other"
		// series rather than paint a ninth. Recording it stops the distance shrinking
		// further unseen. Raise an entry when a re-step lifts it; never lower one.
		const floor = OVERFLOW_SEPARATION_FLOOR[theme.name];
		const worst = closestOverflowPair(theme);
		const violations =
			worst.deltaE < floor
				? [
						violation(
							theme,
							`chart-${worst.slot} ${worst.hex} <-> chart-other ${theme.overflow} (${worst.kind}) fell to ΔE ${worst.deltaE.toFixed(2)}, under the recorded ${floor}`,
						),
					]
				: [];
		expect(violations).toEqual([]);
	});
});
