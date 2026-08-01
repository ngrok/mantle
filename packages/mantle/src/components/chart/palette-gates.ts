/**
 * The measured accessibility gates the chart color palette must clear, plus the
 * CSS custom-property resolution that feeds them.
 *
 * This module is internal shared implementation — it is not exported from the
 * package. `tokens.test.ts` is its only consumer: it resolves every
 * `--color-chart-*` slot in every theme down to a concrete color and runs the
 * gates on the result, so a slot that drifts below a threshold fails CI instead
 * of shipping.
 *
 * The thresholds and the pairlist rules come from the ASD dataviz color formula
 * this repo follows. The sRGB transfer functions, the OKLab matrices, the WCAG
 * ratio, and the Machado severity-1.0 matrices are reimplemented from their
 * primary sources so the numbers match that standard bit for bit.
 *
 * Two details are load-bearing and easy to get wrong:
 *
 * - The Machado simulation runs in **linear** sRGB with a `[0, 1]` clamp. Run
 *   the same matrices on gamma-encoded sRGB and individual pairs move by up to
 *   18 ΔE, and the worst pair changes identity. `culori` ships these exact
 *   matrices and applies them the gamma way, which is why it cannot stand in.
 * - Every gate runs on the **quantized** 8-bit value, not the float the
 *   `oklch()` literal describes, because that is what a browser rasterizes.
 *
 * @see https://bottosson.github.io/posts/oklab/ — Ottosson, OKLab
 * @see doi:10.1109/TVCG.2009.113 — Machado, Oliveira & Fernandes 2009
 * @see https://www.w3.org/TR/WCAG21/#dfn-relative-luminance — WCAG 2.1 SC 1.4.3
 */

/** The OKLCH lightness band a categorical mark must sit inside, per mode. */
const LIGHTNESS_BAND = {
	light: [0.43, 0.77],
	dark: [0.48, 0.67],
} as const;

/** Below this OKLCH chroma a hue reads as gray and stops carrying identity. */
const CHROMA_FLOOR = 0.1;

/** Target separation under simulated color vision deficiency, OKLab ΔE ×100. */
const CVD_TARGET = 8;

/** Below this, a pair collapses under CVD. Secondary encoding cannot excuse it. */
const CVD_FLOOR = 6;

/** Worst-pair separation for full-color vision. A hard gate with no relief valve. */
const NORMAL_VISION_FLOOR = 15;

/** Minimum WCAG contrast ratio of a mark against the chart surface. */
const CONTRAST_MIN = 3;

/**
 * The lowest contrast ratio each theme's marks may reach on its own card
 * surface. Every entry is that theme's measured minimum rounded down to two
 * places, so a re-tuned slot that costs a theme contrast fails here instead of
 * sliding down to `CONTRAST_MIN`. Two places is the precision, not a preference:
 * `Math.pow` is not bit-identical across platforms, and a third digit would
 * ratchet the gate into that noise.
 *
 * Raise an entry whenever a re-step lifts a theme's minimum. The shipped
 * measurements are light 3.6102:1, dark 3.6520:1, light-high-contrast 3.6960:1,
 * and dark-high-contrast 6.7630:1.
 *
 * `CONTRAST_MIN` is the absolute floor the standard sets, and no entry may sit
 * under it. The high-contrast themes earn far more than 3:1, and a flat gate
 * would let them regress to the same floor as the standard themes.
 */
const CONTRAST_FLOOR_BY_THEME = {
	light: 3.61,
	dark: 3.65,
	"light-high-contrast": 3.69,
	"dark-high-contrast": 6.76,
} as const;

/** Machado, Oliveira & Fernandes (2009) at severity 1.0, for linear sRGB. */
const CVD_MATRICES = {
	protan: [
		[0.152286, 1.052583, -0.204868],
		[0.114503, 0.786281, 0.099216],
		[-0.003882, -0.048116, 1.051998],
	],
	deutan: [
		[0.367322, 0.860646, -0.227968],
		[0.280085, 0.672501, 0.047413],
		[-0.01182, 0.04294, 0.968881],
	],
	tritan: [
		[1.255528, -0.076749, -0.178779],
		[-0.078411, 0.930809, 0.147602],
		[0.004733, 0.691367, 0.3039],
	],
} as const;

/** The dichromacies the CVD gate measures, and tritanopia, which it reports. */
type CvdKind = keyof typeof CVD_MATRICES;

/** A light-mode or dark-mode theme, which picks the lightness band. */
type PaletteMode = keyof typeof LIGHTNESS_BAND;

/** One of the four theme entry points mantle ships a chart palette for. */
type ThemeName = keyof typeof CONTRAST_FLOOR_BY_THEME;

type Rgb = readonly [number, number, number];

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const toLinear = (channel: number): number =>
	channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

const toGamma = (channel: number): number => {
	const value = clamp01(channel);
	return value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
};

/**
 * The linear-sRGB triplet of a 6-digit hex color.
 *
 * @example
 * ```ts
 * linearFromHex("#ffffff"); // [1, 1, 1]
 * ```
 */
const linearFromHex = (hex: string): Rgb => {
	const digits = hex.trim().replace(/^#/, "");
	if (!/^[0-9a-fA-F]{6}$/.test(digits)) {
		throw new Error(`not a 6-digit hex color: ${hex}`);
	}
	const channel = (offset: number) =>
		toLinear(Number.parseInt(digits.slice(offset, offset + 2), 16) / 255);
	return [channel(0), channel(2), channel(4)];
};

/**
 * The `[lightness, chroma, hue]` an `oklch()` literal describes. Hue is in
 * degrees, and Tailwind's `none` for an achromatic step becomes `0`.
 *
 * @example
 * ```ts
 * parseOklch("oklch(52.7% 0.154 150.069)"); // [0.527, 0.154, 150.069]
 * ```
 */
const parseOklch = (literal: string): readonly [number, number, number] => {
	const match = literal.trim().match(/^oklch\(\s*([0-9.]+)(%?)\s+([0-9.]+)\s+([0-9.]+|none)\s*\)$/);
	if (match == null) {
		throw new Error(`unparseable oklch() literal: ${literal}`);
	}
	const [, rawLightness, percent, rawChroma, rawHue] = match;
	if (rawLightness == null || rawChroma == null || rawHue == null) {
		throw new Error(`incomplete oklch() literal: ${literal}`);
	}
	const parsed = Number.parseFloat(rawLightness);
	const lightness = percent === "%" ? parsed / 100 : parsed;
	const chroma = Number.parseFloat(rawChroma);
	const hue = rawHue === "none" ? 0 : Number.parseFloat(rawHue);
	if (!Number.isFinite(lightness) || !Number.isFinite(chroma) || !Number.isFinite(hue)) {
		throw new Error(`non-finite oklch() component: ${literal}`);
	}
	return [lightness, chroma, hue];
};

const linearFromOklch = ([lightness, chroma, hue]: readonly [number, number, number]): Rgb => {
	const radians = (hue * Math.PI) / 180;
	const a = chroma * Math.cos(radians);
	const b = chroma * Math.sin(radians);
	const long = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const medium = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const short = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
		-1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
		-0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
	];
};

/**
 * The 8-bit hex an `oklch()` literal rasterizes to. Every gate reads this
 * rather than the float, because the browser paints the quantized value.
 *
 * @example
 * ```ts
 * hexFromOklch("oklch(52.7% 0.154 150.069)"); // "#008236"
 * ```
 */
const hexFromOklch = (literal: string): string => {
	const channels = linearFromOklch(parseOklch(literal)).map((channel) =>
		Math.round(toGamma(channel) * 255)
			.toString(16)
			.padStart(2, "0"),
	);
	return `#${channels.join("")}`;
};

const oklabFromLinear = ([red, green, blue]: Rgb): Rgb => {
	const long = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
	const medium = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
	const short = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
	return [
		0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short,
		1.9779984951 * long - 2.428592205 * medium + 0.4505937099 * short,
		0.0259040371 * long + 0.7827717662 * medium - 0.808675766 * short,
	];
};

/**
 * The OKLCH lightness and chroma of a hex color.
 *
 * @example
 * ```ts
 * oklchOf("#737373"); // { lightness: 0.5555…, chroma: 0 } — a neutral gray
 * ```
 */
const oklchOf = (hex: string): { lightness: number; chroma: number } => {
	const [lightness, a, b] = oklabFromLinear(linearFromHex(hex));
	return { lightness, chroma: Math.hypot(a, b) };
};

/**
 * The WCAG 2.1 contrast ratio between two hex colors, lighter over darker.
 *
 * @example
 * ```ts
 * contrastRatio("#767676", "#ffffff"); // 4.5422… — the documented 4.5:1 boundary
 * ```
 */
const contrastRatio = (first: string, second: string): number => {
	const luminance = (hex: string) => {
		const [red, green, blue] = linearFromHex(hex);
		return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
	};
	const [high, low] = [luminance(first), luminance(second)].toSorted((a, b) => b - a);
	if (high == null || low == null) {
		throw new Error("contrastRatio needs two colors");
	}
	return (high + 0.05) / (low + 0.05);
};

/**
 * A hex color as one kind of dichromat sees it — Machado severity 1.0, applied
 * in linear sRGB and clamped back into gamut.
 *
 * @example
 * ```ts
 * simulateCvd("#ff0000", "protan"); // [0.166…, 0.125…, 0] in linear sRGB
 * ```
 */
const simulateCvd = (hex: string, kind: CvdKind): Rgb => {
	const [red, green, blue] = linearFromHex(hex);
	const matrix = CVD_MATRICES[kind];
	const row = (index: 0 | 1 | 2) => {
		const [toRed, toGreen, toBlue] = matrix[index];
		return clamp01(toRed * red + toGreen * green + toBlue * blue);
	};
	return [row(0), row(1), row(2)];
};

/**
 * Euclidean OKLab distance ×100 between two hex colors. Omit `kind` for
 * unsimulated vision.
 *
 * @example
 * ```ts
 * deltaE("#ff0000", "#00ff00");           // 51.98… — obvious to a full-color reader
 * deltaE("#ff0000", "#00ff00", "deutan"); // 22.22… — the same pair, collapsing
 * ```
 */
const deltaE = (first: string, second: string, kind?: CvdKind): number => {
	const lab = (hex: string) =>
		oklabFromLinear(kind == null ? linearFromHex(hex) : simulateCvd(hex, kind));
	const [firstL, firstA, firstB] = lab(first);
	const [secondL, secondA, secondB] = lab(second);
	return 100 * Math.hypot(firstL - secondL, firstA - secondA, firstB - secondB);
};

/**
 * Which pairs of slots a chart form can put side by side. A stack, bar, or line
 * only ever touches its neighbor, so `"adjacent"` gates the palette as a chart
 * of unpinned series hands it out, in order. Scatter marks can neighbor any
 * other mark, so a scatter palette must clear every pair — a strictly harder
 * test that caps how many series the form can carry.
 *
 * Neither scope covers a chart that pins a color: an explicit `color` spends a
 * slot without painting it, so the slots on screen are no longer consecutive.
 * `bar-chart.mdx` makes that check the consumer's.
 */
type PairScope = "adjacent" | "all";

const pairsOf = (count: number, scope: PairScope): Array<readonly [number, number]> => {
	if (scope === "adjacent") {
		return Array.from({ length: count - 1 }, (_, index) => [index, index + 1] as const);
	}
	return Array.from({ length: count }, (_, first) =>
		Array.from({ length: count - first - 1 }, (_, offset) => [first, first + 1 + offset] as const),
	).flat();
};

/** One slot that sits outside the mode's lightness band. */
type OffBandSlot = { slot: number; hex: string; lightness: number };

/**
 * The slots whose OKLCH lightness falls outside the mode's band. Empty is a
 * pass.
 *
 * @example
 * ```ts
 * offBandSlots(["#3e6ff4"], "light"); // [] — L 0.584 sits inside 0.43–0.77
 * ```
 */
const offBandSlots = (hexes: readonly string[], mode: PaletteMode): OffBandSlot[] => {
	const [floor, ceiling] = LIGHTNESS_BAND[mode];
	return hexes
		.map((hex, index) => ({ slot: index + 1, hex, lightness: oklchOf(hex).lightness }))
		.filter(({ lightness }) => lightness < floor || lightness > ceiling);
};

/**
 * The slots whose OKLCH chroma sits under the floor, so they read as gray.
 * Empty is a pass.
 *
 * @example
 * ```ts
 * lowChromaSlots(["#737373"]); // one entry — a neutral gray does no identity work
 * ```
 */
const lowChromaSlots = (hexes: readonly string[]): Array<{ slot: number; chroma: number }> =>
	hexes
		.map((hex, index) => ({ slot: index + 1, chroma: oklchOf(hex).chroma }))
		.filter(({ chroma }) => chroma < CHROMA_FLOOR);

/** The closest pair on a pairlist, under one vision model. */
type WorstPair = {
	deltaE: number;
	first: { slot: number; hex: string };
	second: { slot: number; hex: string };
	kind: CvdKind | "normal";
};

const closestPair = (
	hexes: readonly string[],
	scope: PairScope,
	kinds: ReadonlyArray<CvdKind | "normal">,
): WorstPair => {
	let worst: WorstPair | null = null;
	for (const kind of kinds) {
		for (const [first, second] of pairsOf(hexes.length, scope)) {
			const firstHex = hexes[first];
			const secondHex = hexes[second];
			if (firstHex == null || secondHex == null) {
				continue;
			}
			const distance = deltaE(firstHex, secondHex, kind === "normal" ? undefined : kind);
			if (worst == null || distance < worst.deltaE) {
				worst = {
					deltaE: distance,
					first: { slot: first + 1, hex: firstHex },
					second: { slot: second + 1, hex: secondHex },
					kind,
				};
			}
		}
	}
	if (worst == null) {
		throw new Error("closestPair needs at least two colors");
	}
	return worst;
};

/**
 * The closest pair under simulated protanopia or deuteranopia — the pair a
 * dichromat is most likely to read as one color.
 *
 * @example
 * ```ts
 * worstCvdPair(["#009689", "#e7000b"], "adjacent").deltaE; // 14.11…
 * ```
 */
const worstCvdPair = (hexes: readonly string[], scope: PairScope): WorstPair =>
	closestPair(hexes, scope, ["protan", "deutan"]);

/**
 * The closest pair under full-color vision.
 *
 * @example
 * ```ts
 * worstNormalPair(["#e7000b", "#f6339a"], "adjacent").deltaE; // 15.84…
 * ```
 */
const worstNormalPair = (hexes: readonly string[], scope: PairScope): WorstPair =>
	closestPair(hexes, scope, ["normal"]);

/**
 * The slots that do not clear a contrast minimum against the chart surface.
 * `minimum` defaults to the absolute `CONTRAST_MIN`; pass a theme's own floor
 * from `CONTRAST_FLOOR_BY_THEME` to hold that theme to what it measures today.
 * Empty is a pass.
 *
 * @example
 * ```ts
 * lowContrastSlots(["#3e6ff4"], "#ffffff");                  // [] — 4.39:1 clears 3:1
 * lowContrastSlots(["#3e6ff4"], "#ffffff", { minimum: 4.5 }); // one entry — 4.39:1 misses 4.5:1
 * ```
 */
const lowContrastSlots = (
	hexes: readonly string[],
	surface: string,
	{ minimum = CONTRAST_MIN }: { minimum?: number } = {},
): Array<{ slot: number; hex: string; ratio: number }> =>
	hexes
		.map((hex, index) => ({ slot: index + 1, hex, ratio: contrastRatio(hex, surface) }))
		.filter(({ ratio }) => ratio < minimum);

/** One stylesheet in a lookup chain, with its declarations already collected. */
type StyleSheetLayer = { name: string; declarations: Map<string, string> };

/**
 * Every `--name: value;` declaration in one stylesheet, last one winning.
 *
 * Block structure is ignored on purpose: inside a single mantle theme file the
 * later declaration is also the more specific one.
 *
 * Why strip comments first: a theme file documents a custom property in prose,
 * and left in place that text both invents a declaration nothing declares and
 * swallows the real declaration on the next line, because the value match runs
 * to the first semicolon.
 *
 * @example
 * ```ts
 * collectDeclarations(":root { --color-chart-1: var(--color-blue-500); }");
 * // Map { "--color-chart-1" => "var(--color-blue-500)" }
 * ```
 */
const collectDeclarations = (css: string): Map<string, string> => {
	const declarations = new Map<string, string>();
	const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
	// A value can span lines (`color-mix(...)`), so match through the semicolon.
	for (const match of withoutComments.matchAll(/(--[a-zA-Z0-9_-]+)\s*:\s*([^;{}]+);/g)) {
		const [, name, value] = match;
		if (name != null && value != null) {
			declarations.set(name, value.replace(/\s+/g, " ").trim());
		}
	}
	return declarations;
};

/**
 * Name one stylesheet for a lookup chain.
 *
 * @example
 * ```ts
 * layer("mantle.css", mantleCss);
 * ```
 */
const layer = (name: string, css: string): StyleSheetLayer => ({
	name,
	declarations: collectDeclarations(css),
});

const ALIAS_ONLY = /^var\(\s*(--[a-zA-Z0-9_-]+)\s*\)$/;

/** A resolved custom property: the literal, and the file that declared it. */
type ResolvedProperty = { name: string; literal: string; source: string };

/**
 * Follow one custom property through a lookup chain down to a literal value.
 *
 * The chain models the cascade a browser applies — the theme file outranks
 * `mantle.css`, which outranks Tailwind's own theme. Strict and loud by design:
 * a missing name, a `var()` carrying a fallback, a resolution cycle, or a value
 * that is neither a plain alias nor a literal all throw. A silent fallback here
 * would turn the gates back into decoration.
 *
 * @example
 * ```ts
 * resolveProperty([layer("mantle.css", css)], "--color-chart-1");
 * // { name: "--color-blue-500", literal: "oklch(58.4% 0.2069 265.3)", source: "mantle.css" }
 * ```
 */
const resolveProperty = (chain: readonly StyleSheetLayer[], property: string): ResolvedProperty => {
	const seen = new Set<string>();
	let current = property;
	for (;;) {
		if (seen.has(current)) {
			throw new Error(`cycle resolving ${property}: revisited ${current}`);
		}
		seen.add(current);
		const hit = chain
			.map((sheet) => {
				const value = sheet.declarations.get(current);
				return value == null ? null : { value, source: sheet.name };
			})
			.find((candidate) => candidate != null);
		if (hit == null) {
			throw new Error(`unresolved custom property ${current} (resolving ${property})`);
		}
		const alias = hit.value.match(ALIAS_ONLY);
		if (alias?.[1] != null) {
			current = alias[1];
			continue;
		}
		if (hit.value.includes("var(")) {
			throw new Error(
				`${current} is neither a plain alias nor a literal: ${hit.value} (resolving ${property})`,
			);
		}
		return { name: current, literal: hit.value, source: hit.source };
	}
};

export type {
	CvdKind,
	OffBandSlot,
	PairScope,
	PaletteMode,
	ResolvedProperty,
	ThemeName,
	WorstPair,
};
export {
	//,
	CHROMA_FLOOR,
	CONTRAST_FLOOR_BY_THEME,
	CONTRAST_MIN,
	CVD_FLOOR,
	CVD_TARGET,
	LIGHTNESS_BAND,
	NORMAL_VISION_FLOOR,
	collectDeclarations,
	contrastRatio,
	deltaE,
	hexFromOklch,
	layer,
	lowChromaSlots,
	lowContrastSlots,
	offBandSlots,
	oklchOf,
	parseOklch,
	resolveProperty,
	simulateCvd,
	worstCvdPair,
	worstNormalPair,
};
