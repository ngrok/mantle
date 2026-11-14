import { isColor } from "../../utils/color/index.js";
import type { SeriesColor } from "./types.js";

/**
 * The chart color vocabulary: series colors, the decorative fill, and the
 * chrome colors, all as CSS. The SVG backend paints these strings as
 * they are; `canvas-colors.ts` resolves them for a canvas.
 *
 * This module is internal shared implementation — not exported from the package.
 */

/**
 * The color every series paints on a `decorative` chart, whatever `color` it
 * would otherwise wear. A placeholder encodes no series identity, so one
 * neutral fill replaces every series color, and the token is tuned so
 * a message laid over the marks stays above the WCAG AA text floor without a
 * scrim or a blur. `chart/decorative-contrast.test.tsx` measures every theme.
 *
 * It is a mode, not a color a consumer can give a series.
 */
const CHART_DECORATIVE_COLOR = "var(--color-chart-decorative)";

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
 * A series color as CSS: a mantle color name reads its chart token, and any
 * other string is already CSS.
 *
 * @example
 * ```ts
 * cssSeriesColor("emerald"); // "var(--color-chart-emerald)"
 * cssSeriesColor("#e40014"); // "#e40014"
 * ```
 */
const cssSeriesColor = (color: SeriesColor): string =>
	isColor(color) ? `var(--color-chart-${color})` : color;

export type {
	//,
	ChartChromeColors,
};
export {
	//,
	CHART_CHROME_CSS,
	CHART_DECORATIVE_COLOR,
	cssSeriesColor,
};
