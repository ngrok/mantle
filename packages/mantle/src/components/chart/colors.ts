import type { ChartColorToken, SeriesColor } from "./types.js";

/**
 * Resolving mantle color tokens into strings a canvas context can paint with.
 *
 * Canvas `fillStyle` parses modern CSS color syntax (`oklch()`, `color-mix()`)
 * but cannot substitute `var()` or `currentColor`. The computed value of a
 * custom property arrives with every `var()` substituted, so one computed-style
 * read of the chart root resolves every token the chart paints with, inside
 * the root's own cascade. A probe element exists only for a value the canvas
 * rejects. Reads happen in the engine commit's read phase (never per frame,
 * never per point), so multi-chart dashboards don't thrash style recalculation.
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
 * One hidden probe per host, created on the first fallback read and kept
 * mounted. Inserting and removing a probe per read invalidates the host's
 * sibling-dependent styles and forces a recalc of the whole chart subtree;
 * restyling a mounted `display: none` span recalcs that span alone.
 */
const probes = new WeakMap<HTMLElement, HTMLSpanElement>();

const probeFor = (host: HTMLElement): HTMLSpanElement => {
	let probe = probes.get(host);
	if (probe == null || probe.parentNode !== host) {
		probe = host.ownerDocument.createElement("span");
		probe.style.display = "none";
		probe.setAttribute("aria-hidden", "true");
		host.appendChild(probe);
		probes.set(host, probe);
	}
	return probe;
};

/**
 * Resolve any CSS color string (including `var(...)` chains, `color-mix()`,
 * and `currentColor`) to a canvas-paintable color by computing it as the
 * `color` of a hidden probe element inside `host`. The probe participates in
 * `host`'s cascade, so chart-root-scoped custom property overrides apply to a
 * host anywhere under the Root. It is the fallback for a value the canvas
 * cannot parse; `createColorResolver` resolves the common case without it.
 *
 * @example
 * ```ts
 * resolveThroughProbe(rootElement, "color-mix(in oklab, var(--accent) 70%, black)");
 * // "rgb(28, 61, 145)" (computed, canvas-paintable)
 * ```
 */
const resolveThroughProbe = (host: HTMLElement, cssColor: string): string => {
	const probe = probeFor(host);
	probe.style.color = cssColor;
	return host.ownerDocument.defaultView?.getComputedStyle(probe).color ?? "";
};

/**
 * The canvas surface the parse check writes to. A 2D context satisfies it; a
 * test passes a fake.
 */
type ColorParseContext = Pick<CanvasRenderingContext2D, "fillStyle">;

const parseContexts = new WeakMap<Document, ColorParseContext | null>();

/**
 * One 1×1 canvas context per document for parse checks, or `null` where the
 * document has no 2D context (test DOMs).
 */
const colorParseContext = (document: Document): ColorParseContext | null => {
	const cached = parseContexts.get(document);
	if (cached !== undefined) {
		return cached;
	}
	const canvas = document.createElement("canvas");
	canvas.width = 1;
	canvas.height = 1;
	const context = canvas.getContext("2d");
	parseContexts.set(document, context);
	return context;
};

const PARSE_SENTINELS = ["#010203", "#030201"] as const;

/**
 * Whether the canvas parses `value` as a color. An invalid `fillStyle`
 * assignment keeps the previous value, so the check assigns a sentinel first
 * and reads back. A value equal to the first sentinel is tested against the
 * second, because no value equals both.
 *
 * @example
 * ```ts
 * canvasParses(context, "oklch(0.62 0.2 259)"); // true
 * canvasParses(context, "var(--color-chart-1)"); // false
 * ```
 */
// Why a cache: every chart on a page resolves the same token values, and a
// `fillStyle` round trip costs more than the computed-style read it checks.
const parseVerdicts = new WeakMap<ColorParseContext, Map<string, boolean>>();

const canvasParses = (context: ColorParseContext, value: string): boolean => {
	let verdicts = parseVerdicts.get(context);
	if (verdicts == null) {
		verdicts = new Map();
		parseVerdicts.set(context, verdicts);
	}
	const cached = verdicts.get(value);
	if (cached != null) {
		return cached;
	}
	let parses = false;
	for (const sentinel of PARSE_SENTINELS) {
		context.fillStyle = sentinel;
		context.fillStyle = value;
		if (context.fillStyle !== sentinel) {
			parses = true;
			break;
		}
	}
	verdicts.set(value, parses);
	return parses;
};

/**
 * The computed-style reads the resolver makes. A `CSSStyleDeclaration` from
 * `getComputedStyle` satisfies it; a test passes a fake.
 */
type ComputedColorSource = Pick<CSSStyleDeclaration, "getPropertyValue" | "color" | "fontFamily">;

/**
 * Resolves CSS color strings against one chart root for one resolution pass.
 * `resolve` memoizes per input, so a chart that paints one token for several
 * series reads it once.
 */
type ColorResolver = {
	/** Resolve a CSS color string to a canvas-paintable color. */
	resolve: (cssColor: string) => string;
	/** The root's computed font family, for axis labels. */
	fontFamily: string;
};

const BARE_VAR = /^var\(\s*(--[\w-]+)\s*\)$/i;

/**
 * A value the canvas cannot paint by itself: a consumer string with a nested
 * `var()` (`rgb(var(--r) 0 0)`, `var(--a, red)`), a `currentColor` inside
 * another function, or `light-dark()`, which only a color property resolves.
 */
const UNRESOLVED = /var\(|currentcolor|light-dark\(/i;

/**
 * Create the resolver for one resolution pass. A bare `var(--name)` reads
 * the custom property's computed value (with `var()` substituted),
 * `currentColor` reads the computed `color`, and any other string is tried
 * as-is. Whatever the canvas rejects resolves through the probe, which mounts
 * in `host`. With no parse context (a test DOM) a non-empty value passes
 * through unchecked.
 *
 * @example
 * ```ts
 * const resolver = createColorResolver(root, {
 *   computed: getComputedStyle(root),
 *   parseContext: colorParseContext(root.ownerDocument),
 * });
 * resolver.resolve("var(--color-chart-1)"); // "oklch(62.2% .203 259)"
 * ```
 */
const createColorResolver = (
	host: HTMLElement,
	source: { computed: ComputedColorSource; parseContext: ColorParseContext | null },
): ColorResolver => {
	const { computed, parseContext } = source;
	const resolved = new Map<string, string>();
	const resolve = (cssColor: string): string => {
		const cached = resolved.get(cssColor);
		if (cached != null) {
			return cached;
		}
		const trimmed = cssColor.trim();
		const bareVar = BARE_VAR.exec(trimmed);
		let candidate: string;
		if (bareVar?.[1] != null) {
			candidate = computed.getPropertyValue(bareVar[1]).trim();
		} else if (trimmed.toLowerCase() === "currentcolor") {
			candidate = computed.color;
		} else {
			candidate = trimmed;
		}
		let result: string;
		if (candidate === "" || UNRESOLVED.test(candidate)) {
			result = resolveThroughProbe(host, trimmed);
		} else if (parseContext == null || canvasParses(parseContext, candidate)) {
			result = candidate;
		} else {
			result = resolveThroughProbe(host, trimmed);
		}
		resolved.set(cssColor, result);
		return result;
	};
	return { resolve, fontFamily: computed.fontFamily || "sans-serif" };
};

/**
 * Resolve a series color (token or custom CSS string) through a resolver.
 *
 * @example
 * ```ts
 * resolveSeriesColor(resolver, "chart-2"); // "oklch(47.8% .106 159.7)"
 * resolveSeriesColor(resolver, "#e40014"); // "#e40014"
 * ```
 */
const resolveSeriesColor = (resolver: ColorResolver, color: SeriesColor): string => {
	if (isChartColorToken(color)) {
		return resolver.resolve(`var(${chartTokenVariable(color)})`);
	}
	return resolver.resolve(color);
};

/**
 * Resolve the chrome color set through a resolver.
 *
 * @example
 * ```ts
 * const chrome = resolveChromeColors(resolver);
 * context.strokeStyle = chrome.grid;
 * ```
 */
const resolveChromeColors = (resolver: ColorResolver): ChartChromeColors => ({
	grid: resolver.resolve("var(--border-color-card-muted)"),
	baseline: resolver.resolve("var(--border-color-card)"),
	tickText: resolver.resolve("var(--text-color-muted)"),
	reference: resolver.resolve("var(--color-neutral-500)"),
	surface: resolver.resolve("var(--background-color-card)"),
});

/**
 * A cache-key string identifying the currently applied theme. Any change to
 * the html element's theme class/attributes produces a different signature.
 */
const themeSignature = (documentElement: HTMLElement): string =>
	`${documentElement.className}|${documentElement.getAttribute("data-applied-theme") ?? ""}|${documentElement.getAttribute("data-theme") ?? ""}`;

type ThemeWatch = {
	observer: MutationObserver;
	listeners: Set<() => void>;
	signature: string;
};

const themeWatches = new WeakMap<HTMLElement, ThemeWatch>();

/**
 * Watch the documentElement for theme changes (the same channel mantle's
 * ThemeProvider writes and `MantleStyleSheets` observes). Every chart in a
 * document shares one observer, and listeners run only when the signature
 * changed, so a same-value attribute rewrite re-resolves nothing. The callback
 * invalidates caches and schedules a commit; it never resolves synchronously.
 *
 * @example
 * ```ts
 * const disconnect = observeThemeChanges(document.documentElement, () => engine.invalidateColors());
 * ```
 */
const observeThemeChanges = (documentElement: HTMLElement, onChange: () => void): (() => void) => {
	let watch = themeWatches.get(documentElement);
	if (watch == null) {
		const listeners = new Set<() => void>();
		const created: ThemeWatch = {
			observer: new MutationObserver(() => {
				const signature = themeSignature(documentElement);
				if (signature === created.signature) {
					return;
				}
				created.signature = signature;
				for (const listener of listeners) {
					listener();
				}
			}),
			listeners,
			signature: themeSignature(documentElement),
		};
		created.observer.observe(documentElement, {
			attributes: true,
			attributeFilter: ["class", "data-applied-theme", "data-theme"],
		});
		themeWatches.set(documentElement, created);
		watch = created;
	}
	watch.listeners.add(onChange);
	return () => {
		watch.listeners.delete(onChange);
		if (watch.listeners.size === 0) {
			watch.observer.disconnect();
			themeWatches.delete(documentElement);
		}
	};
};

export type {
	//,
	ChartChromeColors,
	ColorParseContext,
	ColorResolver,
	ComputedColorSource,
};
export {
	//,
	canvasParses,
	CHART_COLOR_TOKENS,
	CHART_DECORATIVE_COLOR,
	chartTokenVariable,
	colorParseContext,
	createColorResolver,
	isChartColorToken,
	observeThemeChanges,
	resolveChromeColors,
	resolveSeriesColor,
	resolveThroughProbe,
	SLOT_ORDER,
	themeSignature,
};
