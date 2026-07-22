import type { ChartColorToken, SeriesColor } from "./types.js";

/**
 * Resolving mantle color tokens into strings a canvas context can paint with.
 *
 * Canvas `fillStyle` natively parses modern CSS color syntax (`oklch()`,
 * `color-mix()`), but it cannot substitute `var()` or `currentColor` — those
 * require a computed-style read against a live element. Reads are cached per
 * theme and happen in the engine commit's read phase (never per frame, never
 * per point) so multi-chart dashboards don't thrash style recalculation.
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
 * The default sticky-slot order series claim colors in.
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
 * Chrome (non-series) paint colors, resolved from mantle functional tokens.
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

/**
 * Whether a CSS color string needs a computed-style pass before canvas can
 * paint with it. Matches `var()` and `currentColor` case-insensitively — CSS
 * function names and keywords are case-insensitive, so `currentcolor` and
 * `VAR(...)` must resolve through the probe just like their canonical spellings
 * (canvas would otherwise silently ignore the unresolved value and keep the
 * previous fill).
 */
const needsComputedResolution = (cssColor: string): boolean => {
	const normalized = cssColor.toLowerCase();
	return normalized.includes("var(") || normalized.includes("currentcolor");
};

/**
 * Resolve any CSS color string (including `var(...)` chains, `color-mix()`,
 * and `currentColor`) to a canvas-paintable color by computing it as the
 * `color` of a probe element inside `host`. The probe participates in
 * `host`'s cascade, so chart-root-scoped custom property overrides apply.
 *
 * @example
 * ```ts
 * resolveThroughProbe(rootElement, "color-mix(in oklab, oklch(0.6 0.19 260) 70%, black)");
 * // "rgb(28, 61, 145)" (computed, canvas-paintable)
 * ```
 */
const resolveThroughProbe = (host: HTMLElement, cssColor: string): string => {
	const document = host.ownerDocument;
	const probe = document.createElement("span");
	probe.style.display = "none";
	probe.style.color = cssColor;
	host.appendChild(probe);
	const resolved = document.defaultView?.getComputedStyle(probe).color ?? "";
	probe.remove();
	return resolved;
};

/**
 * Resolve a series color (token or custom CSS string) against a chart root
 * element.
 *
 * @example
 * ```ts
 * resolveSeriesColor(rootElement, "chart-2"); // "oklch(0.527 0.154 150.069)"
 * resolveSeriesColor(rootElement, "#e40014"); // "#e40014" (passthrough)
 * ```
 */
const resolveSeriesColor = (host: HTMLElement, color: SeriesColor): string => {
	if (isChartColorToken(color)) {
		return resolveThroughProbe(host, `var(${chartTokenVariable(color)})`);
	}
	if (needsComputedResolution(color)) {
		return resolveThroughProbe(host, color);
	}
	return color;
};

/**
 * Resolve the chrome color set against a chart root element.
 *
 * @example
 * ```ts
 * const chrome = resolveChromeColors(rootElement);
 * context.strokeStyle = chrome.grid;
 * ```
 */
const resolveChromeColors = (host: HTMLElement): ChartChromeColors => ({
	grid: resolveThroughProbe(host, "var(--border-color-card-muted)"),
	baseline: resolveThroughProbe(host, "var(--border-color-card)"),
	tickText: resolveThroughProbe(host, "var(--text-color-muted)"),
	reference: resolveThroughProbe(host, "var(--color-neutral-500)"),
	surface: resolveThroughProbe(host, "var(--background-color-card)"),
});

/**
 * A cache-key string identifying the currently applied theme. Any change to
 * the html element's theme class/attributes produces a different signature.
 */
const themeSignature = (documentElement: HTMLElement): string =>
	`${documentElement.className}|${documentElement.getAttribute("data-applied-theme") ?? ""}|${documentElement.getAttribute("data-theme") ?? ""}`;

/**
 * Watch the documentElement for theme changes (the same channel mantle's
 * ThemeProvider writes and `MantleStyleSheets` observes). The callback should
 * only invalidate caches and schedule a commit — never resolve synchronously.
 *
 * @example
 * ```ts
 * const disconnect = observeThemeChanges(document.documentElement, () => engine.invalidateColors());
 * ```
 */
const observeThemeChanges = (documentElement: HTMLElement, onChange: () => void): (() => void) => {
	const observer = new MutationObserver(onChange);
	observer.observe(documentElement, {
		attributes: true,
		attributeFilter: ["class", "data-applied-theme", "data-theme"],
	});
	return () => observer.disconnect();
};

export type {
	//,
	ChartChromeColors,
};
export {
	//,
	CHART_COLOR_TOKENS,
	chartTokenVariable,
	isChartColorToken,
	needsComputedResolution,
	observeThemeChanges,
	resolveChromeColors,
	resolveSeriesColor,
	resolveThroughProbe,
	SLOT_ORDER,
	themeSignature,
};
