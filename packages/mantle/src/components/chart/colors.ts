import type { ChartColorToken, SeriesColor } from "./types.js";

/**
 * The chart color vocabulary: the series slot tokens, the decorative fill,
 * and the chrome colors, all as CSS. The SVG backend paints these strings as
 * they are; `canvas-colors.ts` resolves them for a canvas.
 *
 * This module is internal shared implementation — not exported from the package.
 */

const CHART_COLOR_TOKENS = [
	"chart-1",
	"chart-2",
	"chart-3",
	"chart-4",
	"chart-5",
	"chart-6",
	"chart-7",
	"chart-8",
	"chart-other",
] as const;

/**
 * Type guard for the chart color token vocabulary.
 *
 * @example
 * ```ts
 * isChartColorToken("chart-3"); // true
 * isChartColorToken("#ff0000"); // false
 * ```
 */
const isChartColorToken = (value: string): value is ChartColorToken =>
	(CHART_COLOR_TOKENS as readonly string[]).includes(value);

/**
 * The CSS custom property a chart color token reads from.
 */
const chartTokenVariable = (token: ChartColorToken): string => `--color-${token}`;

/**
 * The color every series paints on a `decorative` chart, whatever slot or
 * `color` it would otherwise wear. A placeholder encodes no series identity, so
 * one neutral fill replaces the categorical palette — and the token is tuned so
 * a message laid over the marks stays above the WCAG AA text floor without a
 * scrim or a blur. `chart/decorative-contrast.test.tsx` measures every theme.
 *
 * Kept out of {@link CHART_COLOR_TOKENS} on purpose: it is a mode, not a slot a
 * consumer can assign a series to.
 */
const CHART_DECORATIVE_COLOR = "var(--color-chart-decorative)";

/**
 * The order automatic series take unreserved slots in.
 */
const SLOT_ORDER: readonly ChartColorToken[] = [
	"chart-1",
	"chart-2",
	"chart-3",
	"chart-4",
	"chart-5",
	"chart-6",
	"chart-7",
	"chart-8",
];

/**
 * Chrome (non-series) paint colors, from mantle functional tokens.
 */
type ChartChromeColors = {
	/** Hairline gridlines — `--border-color-card-muted`. */
	grid: string;
	/** The zero baseline on bar charts — `--border-color-card`. */
	baseline: string;
	/** Axis tick labels — `--text-color-muted`. */
	tickText: string;
	/** Reference lines — `--color-neutral-500`. */
	reference: string;
	/** The chart surface, used for marker rings and stacked-segment gaps — `--background-color-card`. */
	surface: string;
};

/** The chrome colors as CSS, which an SVG resolves in the Root's cascade. */
const CHART_CHROME_CSS: ChartChromeColors = {
	grid: "var(--border-color-card-muted)",
	baseline: "var(--border-color-card)",
	tickText: "var(--text-color-muted)",
	reference: "var(--color-neutral-500)",
	surface: "var(--background-color-card)",
};

/**
 * A series color as CSS: a token reads its custom property, and any other
 * string is already CSS.
 *
 * @example
 * ```ts
 * cssSeriesColor("chart-2"); // "var(--color-chart-2)"
 * cssSeriesColor("#e40014"); // "#e40014"
 * ```
 */
const cssSeriesColor = (color: SeriesColor): string =>
	isChartColorToken(color) ? `var(${chartTokenVariable(color)})` : color;

export type {
	//,
	ChartChromeColors,
};
export {
	//,
	CHART_CHROME_CSS,
	CHART_COLOR_TOKENS,
	CHART_DECORATIVE_COLOR,
	chartTokenVariable,
	cssSeriesColor,
	isChartColorToken,
	SLOT_ORDER,
};
