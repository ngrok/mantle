import invariant from "tiny-invariant";
import {
	barThickness,
	isStackedBaseEnd,
	isStackedDataEnd,
	revealStack,
	stackedSegmentEdges,
} from "./bar-geometry.js";
import type { DecimatedColumns } from "./decimate.js";
import type { BandLayout } from "./scales.js";
import type { ChartStore } from "./store.js";
import type {
	ChartDatum,
	ChartDatumEvent,
	ChartOptions,
	HoverSnapshot,
	PointShape,
	SeriesMark,
	SeriesMeta,
	SeriesSpec,
	XValue,
} from "./types.js";
import {
	observeResize,
	onFontsLoaded,
	prefersReducedMotion,
	watchDevicePixelRatio,
} from "./environment.js";
import { requestSharedFrame } from "./frame-loop.js";
import type {
	PaintBackend,
	PaintBackendOptions,
	PaintContext,
	ResolvedPaint,
} from "./paint-backend.js";
import { decimateColumns, shouldDecimate } from "./decimate.js";
import { formatNumber, formatXValue, tickFractionDigits } from "./format.js";
import { ingestRows, PART_NAME } from "./ingest.js";
import { nearestIndex } from "./hit-test.js";
import {
	bandCenter,
	bandHitRegion,
	bandStart,
	computeBandLayout,
	invertBand,
	linearCoefficients,
	linearTicks,
	linearTicksAtMost,
	niceDomain,
	niceZeroAnchoredDomain,
} from "./scales.js";
import { formatTimeTick, timeTicks } from "./time-ticks.js";
import type { BarRect, HorizontalBarRect, PlotRect } from "./renderer.js";
import {
	AXIS_FONT_SIZE,
	BAR_GAP,
	drawAreaPath,
	drawAxisLabels,
	drawBars,
	drawBaseline,
	drawDecimatedArea,
	drawDecimatedLine,
	drawGrid,
	drawHorizontalBars,
	drawLinePath,
	drawMarkers,
	drawReferenceLine,
	drawVerticalBaseline,
	drawVerticalReferenceLine,
} from "./renderer.js";
import type { FrameLabels, ScatterView, ScatterViewFactory } from "./scatter-engine.js";
import { computeStackBoundaries } from "./stack.js";
import type { StackBoundaries } from "./stack.js";
import { CHART_TWEEN_DURATION_MS, ChaseTween, PER_DATUM_TWEEN_LIMIT, ValueTween } from "./tween.js";

/**
 * The imperative, framework-free chart engine. One instance backs one chart
 * Root for its lifetime:
 *
 * - owns the paint backend (an SVG or a canvas surface) and the paint loop
 * - ingests consumer rows into columnar Float64Arrays (NaN = gap)
 * - schedules on demand: every mutation coalesces into one rAF commit; an
 *   idle chart costs zero CPU (there is no always-on loop)
 * - decimates to min/max-per-pixel-column past 4 points per device pixel
 * - drives interruptible tweens (domains always; per-datum only ≤ 2,500 points
 *   with an identical x vector — streaming appends animate the domain instead)
 * - hit-tests hover/keyboard positions and publishes snapshots to the store;
 *   the crosshair/markers/hover band/tooltip are DOM overlay elements moved
 *   with transforms, so pointer moves never repaint the canvas
 * - asks the backend for its colors once per paint signature (a theme, for
 *   the canvas backend; CSS resolves the SVG backend's colors)
 * - paints only while the Root reports it near the viewport (`setInView`), so a
 *   list of charts pays for the ones a reader can see; the rest ingest and
 *   answer keyboard input but paint nothing
 * - plays its motion only while the Root reports it on screen (`setOnScreen`);
 *   a chart near the viewport but off screen paints each new state at once
 *
 * React never renders inside the paint path; the engine never touches React.
 *
 * This module is internal shared implementation — not exported from the package.
 */

/**
 * The DOM overlay elements the Root binding hands to the engine. All are
 * absolutely positioned inside the plot wrapper and moved imperatively.
 */
/** The three layers the engine positions around the active datum. */
type HoverLayers = {
	/** Vertical crosshair hairline (line/area charts). */
	crosshair: HTMLElement;
	/** Hover band behind the active category (bar charts). */
	band: HTMLElement;
	/** Container for active-point marker dots (line/area charts). */
	markers: HTMLElement;
};

type EngineElements = {
	/** The chart root (color-resolution host; consumer CSS var overrides apply here). */
	root: HTMLElement;
	/** The plot wrapper the paint surface fills; the resize-observation target. */
	plot: HTMLElement;
	/**
	 * The tooltip container; content is React-rendered, position is
	 * engine-written. `null` until the Root mounts it on the first hover
	 * (see `attachTooltip`).
	 */
	tooltip: HTMLElement | null;
};

type EngineCallbacks = {
	onDatumActivate: ((event: ChartDatumEvent) => void) | null;
	onActiveIndexChange: ((index: number | null) => void) | null;
};

/**
 * The per-series inputs the resolved paint cache derives from — any change
 * (color or texture) must invalidate the cached colors and patterns.
 */
const seriesPaintInput = (meta: SeriesMeta): string => `${meta.colorInput}|${meta.texture}`;

const Y_TICK_COUNT = 5;
/** The vertical space, in CSS pixels, that one y-axis tick label needs. */
const Y_TICK_SPACING = 28;
const PLOT_PADDING = 8;
const X_AXIS_BAND = 24;
const FALLBACK_AXIS_GUTTER = 40;

/** The most axis label widths one engine holds before it measures again from empty. */
const TEXT_WIDTH_CACHE_LIMIT = 512;

/** Width of the left-edge scroll-mask fade band, in CSS pixels. */
const EDGE_FADE_WIDTH = 40;
/**
 * The longest gap between two window slides that still counts as one stream.
 * A slower feed reads as separate updates, so its x domain chases.
 */
const STREAM_MAX_INTERVAL_MS = 2000;
/** How long after the last window slide the left-edge fade lingers before decaying. */
const EDGE_FADE_LINGER_MS = 1000;

/** The pixel gap between neighboring bands, from the step width: 2px, then 1px, then none. */
const BAND_GAP_STEPS = [
	{ minStep: 6, gap: 2 },
	{ minStep: 3, gap: 1 },
] as const;

/** A series with no boundaries: the fallback for an index past the spec list. */
const EMPTY_SEGMENTS = { lower: null, upper: new Float64Array(0), reveal: 1 } as const;

/** The gap between the segments of a stack, in CSS pixels. */
const STACK_GAP = 1;

/** The headroom a bar chart without ticks keeps over its tallest bar. */
const BAR_HEADROOM = 1.12;

/**
 * The keys a horizontal bar chart reads by its layout, each with the key a
 * vertical chart reads for the same step. The categories run from the top
 * down, so the Down arrow and Page Down move forward.
 */
const HORIZONTAL_BAR_KEYS: ReadonlyMap<string, string> = new Map([
	["ArrowDown", "ArrowRight"],
	["ArrowUp", "ArrowLeft"],
	["PageDown", "PageUp"],
	["PageUp", "PageDown"],
]);

/**
 * The share of a band's step left as air: a fixed pixel gap, so dense bars
 * fill their step whatever its width.
 */
const bandPadding = (step: number): number => {
	const gap = BAND_GAP_STEPS.find((entry) => step >= entry.minStep)?.gap ?? 0;
	return step > 0 ? gap / step : 0;
};

/** The pixel gap between bars in one band: `BAR_GAP` when roomy, 1 when tight, 0 when cramped. */
const barGap = ({ bandwidth, groupCount }: { bandwidth: number; groupCount: number }): number => {
	if (bandwidth >= 8 * groupCount) {
		return BAR_GAP;
	}
	if (bandwidth >= 3 * groupCount) {
		return 1;
	}
	return 0;
};

class ChartEngine {
	#kind: SeriesMark;
	#elements: EngineElements;
	#store: ChartStore;
	#options: ChartOptions = {
		xKey: "",
		xScale: "linear",
		yDomain: ["auto", "auto"],
		orientation: "vertical",
		zKey: null,
		dimensions: 3,
		stacked: false,
		animate: true,
	};
	#callbacks: EngineCallbacks = { onDatumActivate: null, onActiveIndexChange: null };

	#backend: PaintBackend;
	#stopResize: (() => void) | null = null;
	#stopRatio: (() => void) | null = null;
	#stopTooltipResize: (() => void) | null = null;
	#fontsCleanup: (() => void) | null = null;
	/** The owning window, or `null` in a detached document. */
	#view: Window | null = null;

	/**
	 * Whether the Root reports the chart near the viewport. Paint, text
	 * measurement, and color resolution wait for it; ingest, layout, and the
	 * keyboard point cursor do not.
	 */
	#inView: boolean;
	/**
	 * Whether the Root reports the chart inside the viewport. Glides, chases,
	 * and fades play only there: a chart that is near the viewport but off
	 * screen paints each new state at once.
	 */
	#onScreen: boolean;
	/** Set between `beforeprint` and `afterprint`, when every chart paints. */
	#printing = false;
	/**
	 * Whether a reader has seen the chart inside the viewport. Until then every
	 * series' enter reveal holds at zero, so a chart painted one viewport ahead
	 * of the scroll draws its marks when it comes into view, not before.
	 */
	#seen: boolean;
	/** Whether a dormant commit still owes a layout (see `#commit`). */
	#needsLayout = false;

	#cssWidth = 0;
	#cssHeight = 0;
	#dpr = 1;

	#rows: readonly ChartDatum[] = [];
	#rowCount = 0;
	#xs = new Float64Array(0);
	/**
	 * The consumer's raw x value per view index, on band and point scales only.
	 * A continuous scale derives its `Date` or number from `#xs` at the read
	 * (`#xValueAt`), so a 100k-row ingest never retains 100k `Date` objects.
	 */
	#xValues: XValue[] = [];
	#order: Int32Array | null = null;
	/** source index → view index; -1 for rows dropped at ingest. Built iff `#order` is. */
	#orderInverse: Int32Array | null = null;
	/**
	 * Any category x value carries a time-of-day component. `#xTicks` reads it
	 * for date label granularity on band and point scales only.
	 */
	#xHasTimeOfDay = false;
	#pendingIngest = false;
	/** One column per series, in `seriesSpecs()` order as of the last ingest. */
	#columns: Float64Array[] = [];
	/** The column of each `dataKey`, for the reads that start from a key. */
	#columnIndex = new Map<string, number>();
	#valueMin = 0;
	#valueMax = 0;
	/**
	 * Every finite series value is an integer. Integer-count data (requests,
	 * errors) never renders fractional value ticks — a "1.5" label on a count
	 * axis is meaningless — so value tick generation clamps its step to whole
	 * numbers while this holds (MNTL-56).
	 */
	#valuesAllIntegers = true;
	/** Every x position is an integer; linear x scales get the same whole-step tick clamp. */
	#xsAllIntegers = true;
	#stack: StackBoundaries | null = null;

	// Domains chase their targets, so a retarget mid-motion never jumps. A
	// stream's x domain glides in a straight line instead (see `#streamInterval`).
	// Per-datum morphs and reveals stay fixed-duration.
	#yTween = new ChaseTween({ speed: 0.16 });
	#xTween = new ChaseTween({ speed: 0.2 });
	#valueTweens = new Map<string, ValueTween>();
	#revealTweens = new Map<string, ValueTween>();
	#hasIngested = false;
	#xLabelFade = new Map<number, { alpha: number; target: number; text: string }>();
	#yLabelFade = new Map<number, { alpha: number; target: number; text: string }>();
	#lastPaintTime = 0;
	/**
	 * The last tick list of each axis and the inputs it came from. Each frame
	 * builds each list twice (gutter layout, then paint). A value tween keeps
	 * the category ticks for the whole glide.
	 */
	#yTickMemo: {
		key: string;
		format: unknown;
		ticks: Array<{ value: number; text: string }>;
	} | null = null;
	#xTickMemo: {
		key: string;
		format: unknown;
		xValues: readonly XValue[];
		ticks: Array<{ index: number | null; value: number; text: string }>;
	} | null = null;
	/**
	 * Axis label widths at the resolved axis font. Labels repeat across frames,
	 * so the engine measures each text once. A color resolution clears it,
	 * because the font family resolves with the colors.
	 */
	#textWidths = new Map<string, number>();

	/**
	 * Whether the marks paint one column per device pixel, which also widens
	 * the arrow-key stride to one column. Never set on a scatter plot: it paints
	 * every point, so its cursor must reach every point.
	 */
	#decimated = false;
	#decimationCache = new Map<string, { key: string; columns: DecimatedColumns }>();

	// Liveline-style left-edge scroll mask: streaming appends that drop the
	// oldest row hard-clip exiting marks at the plot edge while the moving
	// domain opens a wedge there. While the window slides, marks fade
	// out through a band at the left edge so exits dissolve instead of popping.
	#edgeFade = { alpha: 0, target: 0 };
	#lastSlideAt = Number.NEGATIVE_INFINITY;
	/** Whether the last ingest slid the window forward. */
	#sliding = false;
	/**
	 * The smoothed time between window slides, in ms. `null` until two slides
	 * arrive within {@link STREAM_MAX_INTERVAL_MS} of each other.
	 */
	#streamInterval: number | null = null;
	#edgeFadeDecayTimer: ReturnType<typeof setTimeout> | null = null;

	#colors: ResolvedPaint | null = null;
	#colorScope: { className: string | undefined; style: object } | null = null;

	#plot: PlotRect = { left: 0, top: 0, width: 0, height: 0 };
	#bandLayout: BandLayout | null = null;

	#zs = new Float64Array(0);
	#zDomain: [number, number] = [0, 1];
	/** The scatter paint, hit test, and 3D camera. `null` for every other kind. */
	#scatter: ScatterView | null = null;
	readonly #createHoverLayers: (() => HoverLayers) | null;
	/** The hover layers, made the first time the engine shows an active datum. */
	#hover: HoverLayers | null = null;
	/**
	 * Whether the current press began on the overlay. Click semantics require
	 * down + up on the chart: a drag that started outside (text selection, a
	 * press on the legend) releasing over the plot must not activate.
	 */
	#pressed = false;
	/**
	 * Bar rects reused across series and frames. A tween repaints every bar on
	 * every frame, and a fresh object per bar is garbage at frame rate.
	 */
	#barRects: BarRect[] = [];
	#horizontalBarRects: HorizontalBarRect[] = [];
	/** `0..rowCount-1`, the index list of a line or area that does not connect nulls. */
	#allIndexes: number[] = [];
	/** The zero lower envelope of an unstacked decimated area, per column count. */
	#zeroColumns: DecimatedColumns | null = null;
	#activeScreen: { x: number; y: number } | null = null;
	#activeSeriesKey: string | null = null;

	/** The uncontrolled active position, in view space (sorted/filtered). */
	#activeIndex: number | null = null;
	/** The consumer's controlled index, in source space (their `data` array). */
	#controlledIndex: number | null | undefined = undefined;
	/**
	 * The last index notified to a controlled consumer, so the echo arriving
	 * back through `setControlledActiveIndex` keeps its interaction source.
	 */
	#pendingControlledEcho: { index: number | null; viaKeyboard: boolean } | null = null;
	#viaKeyboard = false;
	#pointerX: number | null = null;
	#pointerY: number | null = null;
	#tooltipSize: { width: number; height: number } = { width: 0, height: 0 };

	#scheduled = false;
	#needsPaint = false;
	#cancelFrame: (() => void) | null = null;
	#destroyed = false;

	constructor(options: {
		kind: SeriesMark;
		elements: EngineElements;
		store: ChartStore;
		/** Builds the surface the engine paints on; the engine inserts it into the plot. */
		backend: (options: PaintBackendOptions) => PaintBackend;
		/** The Root's slot name, such as `"bar-chart"`, for the surface's `data-slot`. */
		slotName: string;
		/** Builds the scatter view. Required for `kind: "scatter"`, and ignored for every other kind. */
		scatter?: ScatterViewFactory;
		/**
		 * Builds the hover layers. The engine calls it the first time it shows an
		 * active datum, appends the layers to the plot, and removes them on
		 * `destroy`. Leave it out for a static chart, which never hovers.
		 */
		createHoverLayers?: () => HoverLayers;
		/**
		 * Whether the chart starts near the viewport. The Root passes `false` and
		 * reports visibility through `setInView`; a bare engine paints at once.
		 *
		 * @default true
		 */
		inView?: boolean;
		/**
		 * Whether the chart starts inside the viewport. The Root passes what it
		 * knows at activation and reports each change through `setOnScreen`.
		 *
		 * @default true
		 */
		onScreen?: boolean;
		/**
		 * The plot's CSS size when it is already known (the intersection entry
		 * that activated the chart carries it), so the first commit paints
		 * instead of waiting for the resize observer's first delivery.
		 */
		size?: { width: number; height: number };
	}) {
		this.#kind = options.kind;
		this.#elements = options.elements;
		this.#createHoverLayers = options.createHoverLayers ?? null;
		this.#store = options.store;
		this.#inView = options.inView ?? true;
		this.#onScreen = options.onScreen ?? true;
		// A bare engine is in view from the start, so its first ingest reveals.
		this.#seen = this.#inView;
		if (options.size != null) {
			this.#cssWidth = options.size.width;
			this.#cssHeight = options.size.height;
		}
		// Why seed here: the first commit runs before the resize observer
		// delivers, and a ratio of 1 there would key the color cache wrong and
		// resolve every color twice.
		this.#dpr = this.#currentDpr();
		this.#backend = options.backend({
			root: options.elements.root,
			plot: options.elements.plot,
			slotName: options.slotName,
			onColorsChange: this.#onColorsChange,
		});
		// The surface goes under the overlay, which the Root renders first.
		options.elements.plot.prepend(this.#backend.element);

		this.#store.onSeriesChange = () => {
			// Deferred (not ingested inline): a series (re)registration and its
			// matching rows can arrive in the same React commit but in separate
			// layout effects — ingesting mid-commit would validate one render's
			// specs against the other render's rows. `flushIngest` runs after the
			// commit's effects (and `#commit` backstops before any paint).
			this.#pendingIngest = true;
			this.#schedule();
		};
		this.#store.onPresentationChange = () => {
			// Why re-aim: a bar chart's domain depends on whether an axis or a grid
			// draws ticks. Aiming at an unchanged target does nothing.
			this.#aimYDomain();
			this.#schedule();
		};

		this.#stopResize = observeResize(options.elements.plot, (entry) => {
			// Record only; never paint or mutate DOM synchronously inside the
			// observer callback (avoids resize-loop errors and layout thrash).
			const dpr = this.#currentDpr();
			if (
				entry.contentRect.width === this.#cssWidth &&
				entry.contentRect.height === this.#cssHeight &&
				dpr === this.#dpr
			) {
				return;
			}
			this.#cssWidth = entry.contentRect.width;
			this.#cssHeight = entry.contentRect.height;
			this.#dpr = dpr;
			this.#decimationCache.clear();
			// The cached hover pixel is in plot space; a resize moves every mark,
			// so drop it and let #updateOverlay recompute from the new projection
			// (a stale pixel would detach the marker/tooltip from its point).
			this.#activeScreen = null;
			this.#schedule();
		});
		if (this.#inView) {
			this.#observeTooltip();
		}

		this.#fontsCleanup = onFontsLoaded(options.elements.root.ownerDocument, () => {
			this.#textWidths.clear();
			// Why the guard: a chart with no text paints the same frame again.
			if (this.#drawsText()) {
				this.#schedule();
			}
		});
		this.#view = options.elements.root.ownerDocument.defaultView;
		// Why the engine watches and not the backend: decimation, pointer snap,
		// and the keyboard stride read the ratio on every surface.
		const view = this.#view;
		this.#stopRatio = view == null ? null : watchDevicePixelRatio(view, this.#onRatioChange);
		if (this.#kind === "scatter") {
			invariant(options.scatter != null, "A scatter ChartEngine needs a `scatter` view factory.");
			this.#scatter = options.scatter({
				plot: () => this.#plot,
				colors: () => this.#colors,
				specs: () => this.#store.seriesSpecs(),
				rowCount: () => this.#rowCount,
				xs: () => this.#xs,
				zs: () => this.#zs,
				columns: () => this.#columns,
				columnOf: (dataKey) => this.#columnOf(dataKey),
				paintedValues: (spec, seriesIndex) => this.#paintedValues(spec, "value", seriesIndex),
				definedIndexes: (values) => this.#definedIndexes(values),
				reveal: (dataKey) => this.#reveal(dataKey),
				shape: (dataKey) => this.#store.seriesShape(dataKey),
				xCoefficients: () => this.#xCoefficients(),
				yCoefficients: () => this.#yCoefficients(),
				domains: () => {
					const x = this.#xTween.values();
					const y = this.#yTween.values();
					return { x: [x[0] ?? 0, x[1] ?? 1], y: [y[0] ?? 0, y[1] ?? 1], z: this.#zDomain };
				},
				xKey: () => this.#options.xKey,
				zKey: () => this.#options.zKey,
				is3d: () => this.#is3d(),
				requestPaint: () => this.#schedule(),
			});
		}
	}

	#onRatioChange = (): void => {
		this.#dpr = this.#currentDpr();
		this.#decimationCache.clear();
		this.#schedule();
	};

	#onColorsChange = (): void => {
		this.#colors = null;
		this.#schedule();
	};

	destroy(): void {
		this.#destroyed = true;
		this.#stopResize?.();
		this.#stopRatio?.();
		this.#stopTooltipResize?.();
		this.#backend.destroy();
		this.#backend.element.remove();
		this.#fontsCleanup?.();
		this.#store.onSeriesChange = null;
		this.#store.onPresentationChange = null;
		if (this.#edgeFadeDecayTimer != null) {
			clearTimeout(this.#edgeFadeDecayTimer);
			this.#edgeFadeDecayTimer = null;
		}
		this.#cancelFrame?.();
		this.#cancelFrame = null;
		if (this.#hover != null) {
			this.#hover.crosshair.remove();
			this.#hover.band.remove();
			this.#hover.markers.remove();
			this.#hover = null;
		}
	}

	/**
	 * Report whether the chart is near the viewport. Entering runs the paint
	 * the dormant commits skipped. A dormant engine holds settled state (every
	 * tween jumps instead of gliding), so entry paints the current data at
	 * once; only the enter reveal animates, and `markSeen` owns that.
	 */
	setInView(inView: boolean): void {
		if (inView === this.#inView || this.#destroyed) {
			return;
		}
		this.#inView = inView;
		if (!inView) {
			return;
		}
		this.#observeTooltip();
		if (this.#needsPaint || this.#pendingIngest) {
			this.#request();
		}
	}

	/**
	 * Report whether the chart is inside the viewport. Off screen, the chart
	 * paints each new state at once, and motion in flight ends at its target.
	 *
	 * @example
	 * ```ts
	 * engine.setOnScreen(entry.isIntersecting);
	 * ```
	 */
	setOnScreen(onScreen: boolean): void {
		if (onScreen === this.#onScreen || this.#destroyed) {
			return;
		}
		this.#onScreen = onScreen;
		// Why the pending paint: each retarget schedules one, and so does a commit
		// that left a tween, a chase, or a fade in motion. A chart at rest has none.
		if (!onScreen && this.#needsPaint) {
			this.#snapAllMotion();
			this.#schedule();
		}
	}

	/**
	 * Report that the chart is inside the viewport for the first time. Every
	 * series' enter reveal, held at zero until now, plays from here, so a chart
	 * painted ahead of the scroll draws its marks as the reader reaches it.
	 */
	markSeen(): void {
		if (this.#seen || this.#destroyed) {
			return;
		}
		this.#seen = true;
		const now = performance.now();
		// Why not `#motionDuration`: the Root marks a rebuilt engine seen when the
		// chart was on screen before, and that chart can be off screen now.
		const duration = this.#tweenDuration();
		for (const reveal of this.#revealTweens.values()) {
			reveal.retarget([1], { duration, now });
		}
		this.#schedule();
	}

	/**
	 * Free the surface memory of a chart far from the viewport: the canvas
	 * backend drops its bitmap, and the SVG backend holds none. The next
	 * in-view commit repaints in full.
	 */
	releaseBackingStores(): void {
		if (this.#destroyed || this.#backend.kind === "svg") {
			return;
		}
		this.#backend.release();
		this.#needsPaint = true;
	}

	/**
	 * Run the pending commit now, inside the caller's task, instead of on the
	 * next animation frame. Activation calls it so a chart paints in the task
	 * that activated it.
	 *
	 * @example
	 * ```ts
	 * engine.setRows(rows);
	 * engine.commitNow(); // painted before this line returns
	 * ```
	 */
	commitNow(): void {
		if (this.#destroyed) {
			return;
		}
		this.#cancelFrame?.();
		this.#cancelFrame = null;
		this.#scheduled = false;
		this.#commit();
	}

	/**
	 * Hand the engine its tooltip container once the Root mounts it. The
	 * container arrives on the first hover, so a chart nobody points at never
	 * holds one. Passing `null` detaches it.
	 *
	 * @example
	 * ```ts
	 * engine.attachTooltip(tooltipElement);
	 * ```
	 */
	attachTooltip(element: HTMLElement | null): void {
		if (this.#elements.tooltip === element || this.#destroyed) {
			return;
		}
		this.#stopTooltipResize?.();
		this.#stopTooltipResize = null;
		this.#tooltipSize = { width: 0, height: 0 };
		this.#elements.tooltip = element;
		if (element != null && this.#inView) {
			this.#observeTooltip();
		}
		this.#scheduleOverlay();
	}

	/**
	 * Paint for the print snapshot. No animation frame runs between
	 * `beforeprint` and the snapshot, so a chart that waited for a frame would
	 * print blank. Idempotent within one print: a second call is a no-op.
	 *
	 * @example
	 * ```ts
	 * window.addEventListener("beforeprint", () => engine.paintForPrint());
	 * ```
	 */
	paintForPrint(): void {
		if (this.#destroyed || this.#printing) {
			return;
		}
		this.#printing = true;
		if (this.#cssWidth === 0 || this.#cssHeight === 0) {
			const rect = this.#elements.plot.getBoundingClientRect();
			this.#cssWidth = rect.width;
			this.#cssHeight = rect.height;
		}
		// A reveal held for a reader who never scrolled here would print blank.
		if (!this.#seen) {
			this.#seen = true;
			const now = performance.now();
			for (const reveal of this.#revealTweens.values()) {
				reveal.retarget([1], { duration: 0, now });
			}
		}
		// Why settle: the snapshot takes this one frame, so motion left in flight prints part-way.
		this.#snapAllMotion();
		this.#needsPaint = true;
		this.#commit();
	}

	/**
	 * End the print snapshot: a chart away from the viewport frees the surface
	 * memory the print allocated.
	 *
	 * @example
	 * ```ts
	 * window.addEventListener("afterprint", () => engine.afterPrint());
	 * ```
	 */
	afterPrint(): void {
		if (this.#destroyed || !this.#printing) {
			return;
		}
		this.#printing = false;
		if (!this.#inView) {
			this.releaseBackingStores();
		}
	}

	/**
	 * Observe the tooltip's size once the chart can show it, through the one
	 * resize observer its document shares. The read of `offsetWidth` forces a
	 * layout, so a dormant chart never pays for it.
	 */
	#observeTooltip(): void {
		const tooltip = this.#elements.tooltip;
		if (tooltip == null || this.#stopTooltipResize != null) {
			return;
		}
		this.#stopTooltipResize = observeResize(tooltip, () => {
			// Why: with no active datum the surface holds no rows, and that box
			// would place the next readout until its own size arrives.
			if (this.#effectiveIndex() == null) {
				return;
			}
			this.#tooltipSize = {
				width: tooltip.offsetWidth,
				height: tooltip.offsetHeight,
			};
			// Why record only: a move here can add a scrollbar to an ancestor, which
			// resizes an observed box inside this observer pass and raises a loop error.
			this.#scheduleOverlay();
		});
	}

	setOptions(options: ChartOptions): void {
		const previous = this.#options;
		this.#options = options;
		if (previous.xScale !== options.xScale) {
			// Band/point fade keys are indexes; continuous keys are data values —
			// stale entries would be reinterpreted under the new scale.
			this.#xLabelFade.clear();
		}
		if (previous.animate && !options.animate) {
			// Motion switched off mid-glide: settle everything now instead of
			// letting in-flight chases play out.
			this.#snapAllMotion();
		}
		if (previous.dimensions !== options.dimensions) {
			// Snap before first paint (and under reduced motion): a chart must not
			// mount mid-collapse.
			this.#scatter?.setDimensions(options.dimensions, {
				glide: this.#tweenDuration() > 0 && this.#hasIngested,
			});
		}
		if (
			previous.xKey !== options.xKey ||
			previous.xScale !== options.xScale ||
			previous.zKey !== options.zKey ||
			previous.stacked !== options.stacked
		) {
			this.#pendingIngest = true;
		}
		if (previous.yDomain[0] !== options.yDomain[0] || previous.yDomain[1] !== options.yDomain[1]) {
			// Why no re-ingest: `#ingest` never reads `yDomain`. The override only
			// moves the value tween's target, so re-aim it here. The columns, the
			// stack, and the decimation cache (keyed by the x domain) stay. Every
			// mark moves, so drop the cached hover pixel (plot space) the way the
			// resize observer does.
			this.#activeScreen = null;
			this.#aimYDomain();
		}
		this.#schedule();
	}

	/** Move the value tween to the current target domain, if the chart has data. */
	#aimYDomain(): void {
		if (!this.#hasIngested) {
			return;
		}
		if (this.#tweenDuration() === 0) {
			this.#yTween.jump(this.#targetYDomain());
		} else {
			this.#yTween.aim(this.#targetYDomain(), performance.now());
		}
	}

	setCallbacks(callbacks: EngineCallbacks): void {
		this.#callbacks = callbacks;
	}

	setRows(rows: readonly ChartDatum[]): void {
		if (rows === this.#rows) {
			return;
		}
		this.#rows = rows;
		this.#pendingIngest = true;
		this.#schedule();
	}

	/**
	 * Run any pending ingest now. Rows, options, and series registrations all
	 * mark ingest pending instead of ingesting inline, because within one React
	 * commit they arrive in separate layout effects — a series registering
	 * against rows the Root has not pushed yet (or vice versa) would fail the
	 * dataKey fail-fast on data that IS consistent once the commit finishes.
	 * The Root binding calls this in a layout effect that runs after every
	 * commit's child effects; `#commit` also flushes as a backstop so a pending
	 * ingest can never reach paint (e.g. a series part deep in consumer state
	 * that re-rendered without the Root).
	 */
	flushIngest(): void {
		if (!this.#pendingIngest || this.#destroyed) {
			return;
		}
		this.#pendingIngest = false;
		this.#ingest();
	}

	/**
	 * Controlled active index: `undefined` means uncontrolled; a number (an
	 * index into the consumer's `data` array) or `null` mirrors the consumer's
	 * state into the hover UI.
	 *
	 * When the incoming value echoes an index this engine just notified through
	 * `onActiveIndexChange`, the interaction source (keyboard vs pointer) is
	 * restored from that notification — otherwise keyboard stepping on a
	 * controlled chart would round-trip back as a pointer-flavored snapshot and
	 * silence the aria-live announcer.
	 */
	setControlledActiveIndex(index: number | null | undefined): void {
		const echo = this.#pendingControlledEcho;
		this.#pendingControlledEcho = null;
		const wasControlled = this.#controlledIndex !== undefined;
		this.#controlledIndex = index;
		if (index !== undefined) {
			const viaKeyboard = echo != null && echo.index === index ? echo.viaKeyboard : false;
			this.#setActive(index == null ? null : this.#toViewIndex(index), {
				viaKeyboard,
				notify: false,
			});
		} else if (wasControlled) {
			// Leaving controlled mode: reset to "no active point" instead of
			// resurrecting whatever uncontrolled index was frozen when control
			// began — the store would keep serving that stale snapshot.
			this.#setActive(null, { viaKeyboard: false, notify: false });
		}
		this.#scheduleOverlay();
	}

	handlePointerMove(cssX: number, cssY: number): void {
		const scatter = this.#scatter;
		const drag = scatter?.dragTo(cssX, cssY) ?? "none";
		if (drag !== "none") {
			// A 3D rotation drag suppresses hover and repaints.
			if (drag === "rotated") {
				this.#setActive(null, { viaKeyboard: false, notify: false });
				this.#schedule();
			}
			return;
		}
		this.#pointerX = cssX;
		this.#pointerY = cssY;
		if (scatter != null) {
			const hit = scatter.hitAt(cssX, cssY);
			this.#activeSeriesKey = hit?.seriesKey ?? null;
			this.#activeScreen = hit == null ? null : { x: hit.screenX, y: hit.screenY };
			this.#setActive(hit?.index ?? null, { viaKeyboard: false, notify: true });
			return;
		}
		const index = this.#indexAtPixel(cssX, cssY);
		this.#setActive(index, { viaKeyboard: false, notify: true });
	}

	/**
	 * Pointer-down begins a rotation drag in 3D mode; everywhere else it is
	 * tap-to-inspect (the same hover path as a move).
	 */
	handlePointerDown(cssX: number, cssY: number): void {
		this.#pressed = true;
		if (this.#scatter?.pressAt(cssX, cssY) === true) {
			return;
		}
		this.handlePointerMove(cssX, cssY);
	}

	/**
	 * Pointer-up activates the datum under the pointer, but only when the press
	 * began on the overlay, and never when it rotated the 3D camera. Leaving the
	 * plot mid-press cancels, which keeps drag-away-to-cancel. With
	 * `activate: false` the release ends the press and activates nothing: the
	 * Root passes it for a button that is not the primary one.
	 */
	handlePointerUp(
		cssX: number,
		cssY: number,
		{ activate = true }: { activate?: boolean } = {},
	): void {
		const drag = this.#scatter?.release() ?? "none";
		const pressed = this.#pressed;
		this.#pressed = false;
		if (drag === "rotated") {
			return;
		}
		if (drag === "tap") {
			// A tap in 3D: inspect, then activate.
			this.handlePointerMove(cssX, cssY);
		}
		if (!pressed || !activate) {
			return;
		}
		this.handleActivate(cssX, cssY);
	}

	handlePointerLeave(): void {
		this.#pointerX = null;
		this.#pointerY = null;
		this.#scatter?.release();
		this.#pressed = false;
		this.#activeSeriesKey = null;
		this.#activeScreen = null;
		this.#setActive(null, { viaKeyboard: false, notify: true });
	}

	/**
	 * Report one activation through `onDatumActivate`. A pointer position names
	 * the datum under it. `null` coordinates (Enter or Space) name the active
	 * datum.
	 */
	handleActivate(cssX: number | null, cssY: number | null): void {
		const target = this.#activationTarget(cssX, cssY);
		if (target == null) {
			return;
		}
		const sourceIndex = this.#toSourceIndex(target.index);
		const datum = this.#rows[sourceIndex];
		if (datum == null) {
			return;
		}
		this.#callbacks.onDatumActivate?.({
			// Public indexes address the consumer's data array, not the sorted view.
			index: sourceIndex,
			xValue: this.#xValueAt(target.index),
			datum,
			dataKey: target.dataKey,
		});
	}

	/**
	 * The datum an activation names, as a view index, with its series.
	 *
	 * Why the pointer position and not the active index: a controlled index is
	 * the consumer's, and it can stay on another datum through the press.
	 */
	#activationTarget(
		cssX: number | null,
		cssY: number | null,
	): { index: number; dataKey: string | null } | null {
		if (cssX == null || cssY == null) {
			const index = this.#effectiveIndex();
			if (index == null) {
				return null;
			}
			return { index, dataKey: this.#kind === "scatter" ? this.#activeSeriesKey : null };
		}
		if (this.#scatter != null) {
			const hit = this.#scatter.hitAt(cssX, cssY);
			return hit == null ? null : { index: hit.index, dataKey: hit.seriesKey };
		}
		const index = this.#indexAtPixel(cssX, cssY);
		return index == null ? null : { index, dataKey: this.#nearestSeries(index, cssX, cssY) };
	}

	/**
	 * Keyboard interaction on the focusable overlay. Returns `true` when the
	 * key was handled (the caller prevents default). Arrow strides widen to one
	 * device-pixel column when decimated so dense charts stay traversable.
	 * The engine handles Escape, Enter, and Space only while a datum is active.
	 * Pass the event's `repeat`: a held Enter or Space activates once.
	 *
	 * @example
	 * ```ts
	 * if (engine.handleKeyDown(event.key, { repeat: event.repeat })) {
	 * 	event.preventDefault();
	 * }
	 * ```
	 */
	handleKeyDown(key: string, { repeat = false }: { repeat?: boolean } = {}): boolean {
		if (this.#rowCount === 0) {
			return false;
		}
		const last = this.#rowCount - 1;
		const current = this.#effectiveIndex();
		const stride = this.#decimated
			? Math.max(1, Math.floor(this.#rowCount / Math.max(1, this.#plot.width * this.#dpr)))
			: 1;
		const pageStride = Math.max(1, Math.floor(this.#rowCount / 10));
		const stepKey = this.#horizontalBars() ? (HORIZONTAL_BAR_KEYS.get(key) ?? key) : key;

		const target = (() => {
			switch (stepKey) {
				case "ArrowLeft": {
					return Math.max(0, (current ?? this.#rowCount) - stride);
				}
				case "ArrowRight": {
					return Math.min(last, (current ?? -1) + stride);
				}
				case "PageUp": {
					return Math.min(last, (current ?? 0) + pageStride);
				}
				case "PageDown": {
					return Math.max(0, (current ?? last) - pageStride);
				}
				case "Home": {
					return 0;
				}
				case "End": {
					return last;
				}
				case "Escape": {
					// Why: with no datum to dismiss, Escape belongs to the surface around the chart.
					return current == null ? undefined : null;
				}
				default: {
					return undefined;
				}
			}
		})();

		if (target === undefined) {
			const activates = key === "Enter" || key === " ";
			// Why the active datum: with none to activate, Space must still scroll the page.
			if (!activates || current == null) {
				return false;
			}
			if (!repeat) {
				this.handleActivate(null, null);
			}
			return true;
		}
		// Reset BOTH pointer axes: a stale #pointerX would anchor a horizontal
		// bar's keyboard tooltip to the old pointer column instead of the plot
		// center (the vertical case already relied on #pointerY being cleared).
		this.#pointerX = null;
		this.#pointerY = null;
		this.#activeSeriesKey = null;
		this.#activeScreen = null;
		this.#setActive(target, { viaKeyboard: true, notify: true });
		return true;
	}

	/**
	 * Drop the resolved colors and repaint, so the next commit reads them from
	 * the Root's computed style again. A no-op before the first resolution.
	 */
	invalidateColors(): void {
		if (this.#colors == null) {
			return;
		}
		this.#colors = null;
		this.#schedule();
	}

	/**
	 * Records the Root's `className` and `style`, where a `--color-chart-<name>` or
	 * `color` override lives. A changed value drops the resolved colors.
	 * Compare `style` by reference, so pass a shallow-stable object.
	 */
	setColorScope(className: string | undefined, style: object): void {
		const scope = this.#colorScope;
		if (scope != null && scope.className === className && scope.style === style) {
			return;
		}
		this.#colorScope = { className, style };
		this.invalidateColors();
	}

	/**
	 * End every motion in flight at its target: `animate` turned off, the chart
	 * left the screen, or a print starts. The caller paints the settled frame.
	 */
	#snapAllMotion(): void {
		this.#yTween.jump(this.#targetYDomain());
		this.#xTween.jump(this.#targetXDomain());
		this.#scatter?.settle(this.#options.dimensions);
		for (const tween of this.#valueTweens.values()) {
			tween.snap();
		}
		for (const tween of this.#revealTweens.values()) {
			tween.snap();
		}
		this.#edgeFade.alpha = this.#edgeFade.target;
	}

	// ---- data ingest ----------------------------------------------------------

	#ingest(): void {
		const rows = this.#rows;
		const { xScale } = this.#options;
		const specs = this.#store.seriesSpecs();
		this.#decimationCache.clear();
		const previousXs = this.#xs;
		const previousXValues = this.#xValues;
		const ingested = ingestRows({
			rows,
			xKey: this.#options.xKey,
			xScale,
			specs,
			zKey: this.#kind === "scatter" ? this.#options.zKey : null,
			rootName: this.#rootName(),
		});
		this.#rowCount = ingested.rowCount;
		this.#xs = ingested.xs;
		this.#xValues = ingested.xValues;
		this.#order = ingested.order;
		this.#orderInverse = ingested.orderInverse;
		this.#xsAllIntegers = ingested.xsAllIntegers;
		this.#xHasTimeOfDay = ingested.xHasTimeOfDay;

		// Left-edge scroll mask activation. The streaming signature is a window
		// slide: the first x advanced into the previous window while the last kept
		// up. A jump backward or forward past the previous window, or an unrelated
		// data swap, deactivates immediately; an unchanged x vector
		// (a series toggle mid-stream) leaves the fade to the paint-side linger.
		const first = this.#xs[0];
		const last = this.#xs[this.#rowCount - 1];
		const previousFirst = previousXs[0];
		const previousLast = previousXs[previousXs.length - 1];
		if (
			!this.#is3d() &&
			(xScale === "linear" || xScale === "time") &&
			first != null &&
			last != null &&
			previousFirst != null &&
			previousLast != null &&
			first > previousFirst &&
			first <= previousLast &&
			last >= previousLast
		) {
			this.#edgeFade.target = 1;
			const now = performance.now();
			const sinceLastSlide = now - this.#lastSlideAt;
			// Why a smoothed interval: timer jitter of a few ms per append would
			// otherwise change the scroll speed on every append.
			if (sinceLastSlide > STREAM_MAX_INTERVAL_MS) {
				this.#streamInterval = null;
			} else if (this.#streamInterval == null) {
				this.#streamInterval = sinceLastSlide;
			} else {
				this.#streamInterval = this.#streamInterval * 0.7 + sinceLastSlide * 0.3;
			}
			this.#lastSlideAt = now;
			this.#sliding = true;
		} else if (first !== previousFirst || last !== previousLast) {
			this.#edgeFade.target = 0;
			this.#streamInterval = null;
			this.#sliding = false;
		} else {
			this.#sliding = false;
		}
		const count = this.#rowCount;

		// Per-datum tweens are only meaningful when old and new points share the
		// same x positions — index-aligned interpolation across a shifted window
		// would morph each point into its neighbor's value.
		// Why the categories: a category scale's positions are the indexes, which
		// are equal whenever the counts are, so only the categories show a shift.
		const categorical = xScale === "band" || xScale === "point";
		let sameXVector = previousXs.length === count && count <= PER_DATUM_TWEEN_LIMIT;
		if (sameXVector) {
			for (let index = 0; index < count; index++) {
				const same = categorical
					? sameCategory(previousXValues[index], this.#xValues[index])
					: previousXs[index] === this.#xs[index];
				if (!same) {
					sameXVector = false;
					break;
				}
			}
		}

		const previousColumnIndex = this.#columnIndex;
		this.#columns = ingested.columns;
		this.#columnIndex = new Map(specs.map((spec, index) => [spec.dataKey, index]));
		this.#valueMin = ingested.valueMin;
		this.#valueMax = ingested.valueMax;
		this.#valuesAllIntegers = ingested.valuesAllIntegers;
		this.#zs = ingested.zs;
		this.#zDomain = ingested.zExtent == null ? [0, 1] : niceDomain(ingested.zExtent, Y_TICK_COUNT);
		this.#scatter?.resetProjection();
		// A fresh ingest re-projects every point; the cached hover pixel would
		// otherwise strand the marker on the pre-ingest projection.
		this.#activeScreen = null;

		this.#stack = this.#options.stacked ? computeStackBoundaries(this.#columns) : null;

		this.#decimated =
			this.#kind !== "scatter" &&
			shouldDecimate({
				pointCount: count,
				columnCount: Math.max(1, Math.round(this.#plot.width * this.#dpr)),
				wasDecimated: this.#decimated,
			});

		// A series registered after the first paint has no resolved canvas color
		// yet (the theme signature is unchanged, so the lazy cache would skip it
		// and paint would fall back to currentColor). Invalidate when the series
		// set or any series' color/texture input changed — not on every data tick.
		const resolved = this.#colors;
		if (resolved != null) {
			for (const meta of this.#store.seriesMeta()) {
				if (resolved.inputs.get(meta.dataKey) !== seriesPaintInput(meta)) {
					this.#colors = null;
					break;
				}
			}
		}

		this.#retargetTweens(specs, previousColumnIndex, sameXVector);

		// Data changed under the active position: clamp, then force a republish
		// so the snapshot reflects the fresh rows even at an unchanged index.
		const active = this.#effectiveIndex();
		if (active != null) {
			this.#setActive(Math.min(active, Math.max(0, count - 1)), {
				viaKeyboard: this.#viaKeyboard,
				notify: false,
			});
		}
		this.#publishSnapshot({ force: true });
	}

	#retargetTweens(
		specs: readonly SeriesSpec[],
		previousColumnIndex: ReadonlyMap<string, number>,
		sameXVector: boolean,
	): void {
		const now = performance.now();
		const duration = this.#tweenDuration();
		const firstIngest = !this.#hasIngested;
		this.#hasIngested = this.#hasIngested || this.#rowCount > 0;

		// Domains: snap on first data (and under reduced motion); otherwise glide.
		if (firstIngest || duration === 0) {
			this.#yTween.jump(this.#targetYDomain());
			this.#xTween.jump(this.#targetXDomain());
		} else {
			this.#yTween.aim(this.#targetYDomain(), now);
			if (this.#kind === "bar") {
				// Why a jump: the band layout places every bar, so no bar paint reads the x domain.
				this.#xTween.jump(this.#targetXDomain());
			} else if (this.#sliding && this.#streamInterval != null) {
				// Why a straight line: a stream's x axis is time passing, so it
				// scrolls at one speed. A chase covers most of each step in the first
				// frames after an append and then stalls before the next one.
				this.#xTween.glide(this.#targetXDomain(), { now, duration: this.#streamInterval });
			} else {
				this.#xTween.aim(this.#targetXDomain(), now);
			}
		}

		// Per-datum tweens run under the limit and on an unchanged x vector: a tween
		// by index across a shifted window moves each point toward its neighbor's
		// value. A decimated paint reads the settled column, so a tween there
		// repeats one frame.
		const perDatum =
			this.#rowCount > 0 &&
			this.#rowCount <= PER_DATUM_TWEEN_LIMIT &&
			sameXVector &&
			!this.#decimated;
		// Why none above the limit: `#paintedValues` reads no tween there, and each
		// tween holds three copies of its column.
		const holdsValueTweens = this.#rowCount <= PER_DATUM_TWEEN_LIMIT;
		const activeKeys = new Set<string>();
		const registeredKeys = new Set<string>();
		const retargetBuffer = (tweenKey: string, target: Float64Array, hadPrevious: boolean) => {
			activeKeys.add(tweenKey);
			let tween = this.#valueTweens.get(tweenKey);
			if (tween == null) {
				tween = new ValueTween();
				this.#valueTweens.set(tweenKey, tween);
			}
			const animate = perDatum && hadPrevious && tween.values().length === target.length;
			tween.retarget(target, { duration: animate ? duration : 0, now });
		};

		specs.forEach((spec, seriesIndex) => {
			registeredKeys.add(spec.dataKey);
			const hadPrevious = previousColumnIndex.has(spec.dataKey);
			// Above the limit the prune below drops a tween the series held under it.
			if (holdsValueTweens && this.#stack != null) {
				retargetBuffer(
					`${spec.dataKey}:lower`,
					this.#stack.lower[seriesIndex] ?? new Float64Array(0),
					hadPrevious,
				);
				retargetBuffer(
					`${spec.dataKey}:upper`,
					this.#stack.upper[seriesIndex] ?? new Float64Array(0),
					hadPrevious,
				);
			} else if (holdsValueTweens) {
				retargetBuffer(
					spec.dataKey,
					this.#columns[seriesIndex] ?? new Float64Array(0),
					hadPrevious,
				);
			}

			// Enter reveal: once per registered series, on its first non-empty data.
			// A chart nobody has seen holds it at zero until `markSeen`, unless
			// there is no motion to play.
			if (!this.#revealTweens.has(spec.dataKey) && this.#rowCount > 0) {
				const reveal = new ValueTween();
				const motion = this.#motionDuration();
				reveal.retarget([0], { duration: 0, now });
				if (this.#seen || motion === 0) {
					// A seen chart that is off screen now reveals a new series at once.
					reveal.retarget([1], { duration: this.#seen ? this.#tweenDuration() : 0, now });
				}
				this.#revealTweens.set(spec.dataKey, reveal);
			}
		});

		// Prune both maps to the registered series. A series that unmounts and
		// later remounts enters again, so it plays its enter reveal again; a prop
		// change re-registers inside one commit, before the flush, and keeps its
		// entry. Without the prune, a chart that churns series keys (a top-N by
		// endpoint) keeps one tween per key it ever saw for the engine's lifetime.
		for (const key of this.#valueTweens.keys()) {
			if (!activeKeys.has(key)) {
				this.#valueTweens.delete(key);
			}
		}
		for (const key of this.#revealTweens.keys()) {
			if (!registeredKeys.has(key)) {
				this.#revealTweens.delete(key);
			}
		}
	}

	/**
	 * How long a glide takes this frame: zero while dormant, so a chart that
	 * enters view paints its current data instead of gliding from a stale
	 * domain it never showed. Off screen it is zero too: no reader sees a glide
	 * there.
	 */
	#tweenDuration(): number {
		const visible = this.#inView && this.#onScreen;
		if (!visible && !this.#printing) {
			return 0;
		}
		return this.#motionDuration();
	}

	/** The glide duration the viewer's settings allow, whatever the visibility. */
	#motionDuration(): number {
		if (!this.#options.animate) {
			return 0;
		}
		if (this.#reducedMotion()) {
			return 0;
		}
		return CHART_TWEEN_DURATION_MS;
	}

	/** Whether the viewer prefers reduced motion; `#paint` reads this on every animated frame. */
	#reducedMotion(): boolean {
		return this.#view != null && prefersReducedMotion(this.#view);
	}

	#targetYDomain(): [number, number] {
		const [minOverride, maxOverride] = this.#options.yDomain;
		let min: number;
		let max: number;
		if (this.#stack != null) {
			min = Math.min(0, this.#stack.min);
			max = Math.max(0, this.#stack.max);
		} else if (this.#kind === "line" || this.#kind === "scatter") {
			min = this.#valueMin;
			max = this.#valueMax;
		} else {
			min = Math.min(0, this.#valueMin);
			max = Math.max(0, this.#valueMax);
		}
		if (typeof minOverride === "number") {
			min = minOverride;
		}
		if (typeof maxOverride === "number") {
			max = maxOverride;
		}
		if (this.#rowCount === 0) {
			return [0, 1];
		}
		if (this.#kind === "bar" && !this.#hasTicks()) {
			// Why no nice step: with no tick to land on, a nice maximum only adds a
			// headroom that changes from chart to chart.
			return [
				typeof minOverride === "number" ? minOverride : min * BAR_HEADROOM,
				// Why the fallback only at a zero minimum: negative-only bars keep
				// zero as their top edge, and only an all-zero domain needs a span.
				typeof maxOverride === "number" ? maxOverride : max * BAR_HEADROOM || (min < 0 ? 0 : 1),
			];
		}
		// Bars and areas measure length from zero, so both document an axis minimum
		// fixed at the baseline. A line or a scatter may float its domain.
		const zeroAnchored = this.#kind === "bar" || this.#kind === "area";
		const niced = zeroAnchored
			? niceZeroAnchoredDomain([min, max], Y_TICK_COUNT)
			: niceDomain([min, max], Y_TICK_COUNT);
		// Never let niceness move an explicit override or re-cross a zero baseline.
		return [
			typeof minOverride === "number" ? minOverride : niced[0],
			typeof maxOverride === "number" ? maxOverride : niced[1],
		];
	}

	#targetXDomain(): [number, number] {
		if (this.#rowCount === 0) {
			return [0, 1];
		}
		const first = this.#xs[0] ?? 0;
		const last = this.#xs[this.#rowCount - 1] ?? 0;
		if (first === last) {
			return [first - 0.5, last + 0.5];
		}
		if (this.#kind === "scatter") {
			// Points on the exact plot edge get half-clipped; give scatter niced
			// breathing room the way the y axis already has.
			return niceDomain([first, last], Y_TICK_COUNT);
		}
		return [first, last];
	}

	#is3d(): boolean {
		return this.#kind === "scatter" && this.#options.zKey != null;
	}

	/**
	 * Horizontal bar orientation: categories band down the y axis, values run
	 * along x from a left baseline. The engine's semantic structures (x =
	 * category ticks and fades, the y tween = the value domain) are unchanged —
	 * orientation only flips which pixel axis each maps onto.
	 */
	/** Whether any part draws ticks: an axis or a grid. */
	#hasTicks(): boolean {
		const snapshot = this.#store.getSnapshot();
		return snapshot.xAxis != null || snapshot.yAxis != null || snapshot.grid != null;
	}

	/**
	 * Whether a font changes what the chart paints: tick labels (which also thin
	 * the gridlines by their width), a reference line's label, or the 3D frame's
	 * axis names.
	 */
	#drawsText(): boolean {
		return (
			this.#hasTicks() ||
			this.#is3d() ||
			this.#store
				.getSnapshot()
				.referenceLines.some((line) => line.label != null && line.label.length > 0)
		);
	}

	#horizontalBars(): boolean {
		return this.#kind === "bar" && this.#options.orientation === "horizontal";
	}

	/** The public Root part name for error messages, e.g. `"BarChart.Root"`. */
	#rootName(): string {
		return `${PART_NAME[this.#kind].split(".")[0] ?? "Chart"}.Root`;
	}

	/**
	 * The width of one axis label. The caller has set `ctx.font` to the axis
	 * font.
	 */
	#textWidth(ctx: PaintContext, text: string): number {
		let width = this.#textWidths.get(text);
		if (width == null) {
			// Why the bound: a streaming time axis makes new labels without end.
			if (this.#textWidths.size >= TEXT_WIDTH_CACHE_LIMIT) {
				this.#textWidths.clear();
			}
			width = ctx.measureText(text).width;
			this.#textWidths.set(text, width);
		}
		return width;
	}

	// ---- scheduling + paint ---------------------------------------------------

	/** Schedule a full repaint (plus overlay sync) on the next frame. */
	#schedule(): void {
		this.#needsPaint = true;
		this.#needsLayout = true;
		this.#request();
	}

	/**
	 * Schedule only the DOM overlay sync (crosshair/band/markers/tooltip
	 * transforms). This is the hover path — pointer moves never repaint the
	 * marks.
	 */
	#scheduleOverlay(): void {
		this.#request();
	}

	#request(): void {
		const view = this.#view;
		if (this.#scheduled || this.#destroyed || view == null) {
			return;
		}
		this.#scheduled = true;
		this.#cancelFrame = requestSharedFrame(view, this.#onFrame);
	}

	#onFrame = (): void => {
		this.#scheduled = false;
		this.#cancelFrame = null;
		this.#commit();
	};

	#commit(): void {
		if (this.#destroyed) {
			return;
		}
		this.flushIngest();
		if (this.#needsPaint && !this.#inView && !this.#printing) {
			// Why layout without paint: a dormant chart can show a controlled
			// active index, and the overlay below positions its markers from the
			// plot rect. The paint waits for entry.
			if (this.#needsLayout) {
				this.#needsLayout = false;
				this.#layout();
			}
		} else if (this.#needsPaint) {
			this.#needsPaint = false;
			this.#needsLayout = false;
			const now = performance.now();
			let animating = false;
			const valueExtent = this.#horizontalBars() ? this.#plot.width : this.#plot.height;
			animating =
				this.#yTween.tick(now, this.#settleDistance(this.#yTween, valueExtent)) || animating;
			animating =
				this.#xTween.tick(now, this.#settleDistance(this.#xTween, this.#plot.width)) || animating;
			for (const tween of this.#valueTweens.values()) {
				animating = tween.tick(now) || animating;
			}
			for (const tween of this.#revealTweens.values()) {
				animating = tween.tick(now) || animating;
			}
			animating = (this.#scatter?.tick(now) ?? false) || animating;

			if (this.#cssWidth > 0 && this.#cssHeight > 0) {
				this.#resolveColorsIfNeeded();
			}
			this.#layout();
			animating = this.#paint(now) || animating;

			if (animating) {
				this.#schedule();
			}
		}
		this.#updateOverlay();
	}

	/**
	 * How far a domain bound is from its target, in domain units, when no mark
	 * is more than half a device pixel from its end position. `extent` is the
	 * length in CSS pixels of the axis the domain maps onto. While the plot has
	 * no size, the result is `0`, which sets no floor.
	 */
	#settleDistance(chase: ChaseTween, extent: number): number {
		const domain = chase.values();
		const span = Math.abs((domain[1] ?? 0) - (domain[0] ?? 0));
		return extent > 0 && Number.isFinite(span) ? (span * 0.5) / (extent * this.#dpr) : 0;
	}

	#currentDpr(): number {
		if (typeof devicePixelRatio === "number" && devicePixelRatio > 0) {
			return Math.min(devicePixelRatio, 3);
		}
		return 1;
	}

	#resolveColorsIfNeeded(): void {
		const signature = this.#backend.paintSignature({
			devicePixelRatio: this.#dpr,
			orientation: this.#options.orientation,
		});
		if (this.#colors?.signature === signature) {
			return;
		}
		const colors = this.#backend.resolvePaint({
			series: this.#store.seriesMeta(),
			devicePixelRatio: this.#dpr,
			orientation: this.#options.orientation,
			signature,
		});
		if (colors == null) {
			return;
		}
		// The font family resolves with the colors, so the measured widths are stale.
		this.#textWidths.clear();
		this.#colors = colors;
	}

	#layout(): void {
		const snapshot = this.#store.getSnapshot();
		const is3d = this.#is3d();
		const horizontal = this.#horizontalBars();
		const hasXAxis = !is3d && snapshot.xAxis != null;
		const hasYAxis = !is3d && snapshot.yAxis != null;
		// Which composed axis part lands on which physical edge: vertically the
		// value axis (YAxis) sits in the left gutter and the category axis (XAxis)
		// runs along the bottom; horizontal orientation flips the two.
		const leftAxis = horizontal ? hasXAxis : hasYAxis;
		const bottomAxis = horizontal ? hasYAxis : hasXAxis;
		// A bar chart without ticks runs its bars edge to edge, like a sparkline.
		const padding = this.#kind === "bar" && !this.#hasTicks() ? 0 : PLOT_PADDING;
		const top = padding;
		const bottom = bottomAxis ? X_AXIS_BAND : padding;
		const height = Math.max(0, this.#cssHeight - top - bottom);
		// Publish top/height (which don't depend on the left gutter) before
		// measuring the gutter: the horizontal category stride in #xTicks()
		// budgets labels against the category-axis pixel extent (plot.height when
		// horizontal). Measuring against a stale/zero previous plot would size the
		// gutter to a single label and clip wide category names off the left edge
		// on the first paint (and permanently under reduced motion, where no
		// follow-up frame re-lays-out).
		this.#plot = {
			left: padding,
			top,
			width: Math.max(0, this.#cssWidth - padding * 2),
			height,
		};
		let left = padding;
		if (leftAxis) {
			left = FALLBACK_AXIS_GUTTER;
			// Why colors first: a dormant chart lays out without resolved colors, and
			// asking for the context here would allocate one it never paints with.
			const ctx = this.#colors == null ? null : this.#backend.measureContext();
			if (ctx != null && this.#colors != null) {
				ctx.font = `${AXIS_FONT_SIZE}px ${this.#colors.fontFamily()}`;
				let widest = 0;
				// The gutter holds whichever labels the orientation puts on the left:
				// value ticks when vertical, category names when horizontal.
				const labels = horizontal
					? this.#xTicks().map((tick) => tick.text)
					: this.#yTicks().map((tick) => tick.text);
				for (const text of labels) {
					const width = this.#textWidth(ctx, text);
					if (width > widest) {
						widest = width;
					}
				}
				left = Math.ceil(widest) + 14;
			}
		}
		this.#plot = {
			left,
			top,
			width: Math.max(0, this.#cssWidth - left - padding),
			height,
		};
		// The category band lays out along whichever pixel axis carries categories:
		// x when vertical, y when horizontal.
		const bandRangeStart = horizontal ? this.#plot.top : this.#plot.left;
		const bandRangeEnd = horizontal
			? this.#plot.top + this.#plot.height
			: this.#plot.left + this.#plot.width;
		if (this.#options.xScale === "band") {
			// Why a fixed gap: dense bars fill their step, and the thickness cap keeps
			// sparse bars from growing into panels.
			const air = bandPadding((bandRangeEnd - bandRangeStart) / Math.max(1, this.#rowCount));
			this.#bandLayout = computeBandLayout({
				count: this.#rowCount,
				rangeStart: bandRangeStart,
				rangeEnd: bandRangeEnd,
				paddingInner: air,
				paddingOuter: air / 2,
			});
		} else if (this.#options.xScale === "point") {
			this.#bandLayout = computeBandLayout({
				count: this.#rowCount,
				rangeStart: bandRangeStart,
				rangeEnd: bandRangeEnd,
				paddingInner: 1,
				paddingOuter: 0.5,
			});
		} else {
			this.#bandLayout = null;
		}

		this.#decimated =
			this.#kind !== "scatter" &&
			shouldDecimate({
				pointCount: this.#rowCount,
				columnCount: Math.max(1, Math.round(this.#plot.width * this.#dpr)),
				wasDecimated: this.#decimated,
			});
	}

	#yCoefficients(): { k: number; b: number } {
		const domain = this.#yTween.values();
		return linearCoefficients(
			[domain[0] ?? 0, domain[1] ?? 1],
			[this.#plot.top + this.#plot.height, this.#plot.top],
		);
	}

	/**
	 * Value-axis coefficients: the value domain (`#yTween`) mapped onto the pixel
	 * axis values actually run along. For vertical bars this is the y axis (grows
	 * up, identical to {@link #yCoefficients}); for horizontal bars it is the x
	 * axis (grows right from a left baseline).
	 */
	#valueCoefficients(): { k: number; b: number } {
		const domain = this.#yTween.values();
		const range: [number, number] = this.#horizontalBars()
			? [this.#plot.left, this.#plot.left + this.#plot.width]
			: [this.#plot.top + this.#plot.height, this.#plot.top];
		return linearCoefficients([domain[0] ?? 0, domain[1] ?? 1], range);
	}

	#xCoefficients(): { k: number; b: number } {
		const domain = this.#xTween.values();
		return linearCoefficients(
			[domain[0] ?? 0, domain[1] ?? 1],
			[this.#plot.left, this.#plot.left + this.#plot.width],
		);
	}

	#xPixel(index: number): number {
		const layout = this.#bandLayout;
		if (layout != null) {
			return bandCenter(layout, index);
		}
		const { k, b } = this.#xCoefficients();
		return (this.#xs[index] ?? 0) * k + b;
	}

	#yTicks(): Array<{ value: number; text: string }> {
		const snapshot = this.#store.getSnapshot();
		const domain = this.#yTween.values();
		const tickCount = snapshot.yAxis?.tickCount;
		// Why a height limit: the labels stack in the left gutter, so a short plot
		// holds fewer of them. The horizontal value axis thins by measured width.
		const fit = this.#horizontalBars()
			? Number.POSITIVE_INFINITY
			: Math.max(2, Math.floor(this.#plot.height / Y_TICK_SPACING));
		// Integer data keeps integer ticks even mid-glide (tweened fractional
		// domain bounds) and under a fractional yDomain override — integrality is
		// a fact about the data, not the domain.
		const limit = Math.min(tickCount ?? Number.POSITIVE_INFINITY, fit);
		const count = tickCount ?? Y_TICK_COUNT;
		const format = snapshot.yAxis?.tickFormat;
		const key = `${domain[0]}|${domain[1]}|${limit}|${count}|${this.#valuesAllIntegers}`;
		const memo = this.#yTickMemo;
		if (memo != null && memo.key === key && memo.format === format) {
			return memo.ticks;
		}
		const ticks = linearTicksAtMost([domain[0] ?? 0, domain[1] ?? 1], limit, {
			count,
			integer: this.#valuesAllIntegers,
		});
		const step = ticks.length > 1 ? Math.abs((ticks[1] ?? 0) - (ticks[0] ?? 0)) : 0;
		// Precision follows the tick step, so small-magnitude domains (error
		// rates) never collapse neighboring labels into identical "0"s. A single
		// tick has no step, so the domain span sets its precision: `1.0002` in
		// `[1.0001, 1.0003]` must not round to `1`.
		const span = Math.abs((domain[1] ?? 1) - (domain[0] ?? 0));
		const precision = ticks.length > 1 ? step : span;
		const digits = precision > 0 ? tickFractionDigits(precision) : undefined;
		const labeled = ticks.map((value) => {
			const defaultLabel = formatNumber(
				value,
				digits == null ? undefined : { maximumFractionDigits: digits },
			);
			return {
				value,
				text: format == null ? defaultLabel : format(value, { defaultLabel, step }),
			};
		});
		this.#yTickMemo = { key, format, ticks: labeled };
		return labeled;
	}

	#xTicks(): Array<{ index: number | null; value: number; text: string }> {
		const format = this.#store.getSnapshot().xAxis?.tickFormat;
		const key = this.#xTickKey();
		const memo = this.#xTickMemo;
		if (
			memo != null &&
			memo.key === key &&
			memo.format === format &&
			memo.xValues === this.#xValues
		) {
			return memo.ticks;
		}
		const ticks = this.#buildXTicks();
		this.#xTickMemo = { key, format, xValues: this.#xValues, ticks };
		return ticks;
	}

	/**
	 * Whether the x ticks are the categories of a band or point scale.
	 *
	 * Why the scale and not `#bandLayout`: `#layout` sizes the gutter of a
	 * horizontal bar chart from these ticks before it builds the band layout.
	 */
	#hasCategoryTicks(): boolean {
		const { xScale } = this.#options;
		return xScale === "band" || xScale === "point";
	}

	/**
	 * Every input of {@link #buildXTicks} except the formatter and the category
	 * values, which the memo compares by identity.
	 */
	#xTickKey(): string {
		if (this.#hasCategoryTicks()) {
			const horizontal = this.#horizontalBars();
			const axisExtent = horizontal ? this.#plot.height : this.#plot.width;
			return `band|${horizontal}|${axisExtent}|${this.#rowCount}|${this.#xHasTimeOfDay}`;
		}
		const domain = this.#xTween.values();
		const tickCount = this.#store.getSnapshot().xAxis?.tickCount;
		return `${this.#options.xScale}|${domain[0]}|${domain[1]}|${tickCount}|${this.#plot.width}|${this.#xsAllIntegers}`;
	}

	#buildXTicks(): Array<{ index: number | null; value: number; text: string }> {
		const snapshot = this.#store.getSnapshot();
		const format = snapshot.xAxis?.tickFormat;
		if (this.#hasCategoryTicks()) {
			// Pre-thin dense category axes by stride before any text measurement so
			// ten-thousand-band charts never format ten thousand labels per paint.
			// The category axis runs along whichever pixel dimension carries it —
			// x (width, labels side by side) when vertical, y (height, labels
			// stacked) when horizontal — so budget label slots against THAT
			// dimension. #desiredXTicks does the precise per-label collision
			// thinning afterward.
			const horizontal = this.#horizontalBars();
			const axisExtent = horizontal ? this.#plot.height : this.#plot.width;
			const perLabel = horizontal ? AXIS_FONT_SIZE + 4 : 60;
			const maxLabels = Math.max(1, Math.floor(axisExtent / perLabel));
			const stride = Math.max(1, Math.ceil(this.#rowCount / maxLabels));
			const ticks: Array<{ index: number | null; value: number; text: string }> = [];
			for (let index = 0; index < this.#rowCount; index += stride) {
				const value = this.#xValues[index] ?? "";
				const defaultLabel = formatXValue(value, { datasetHasTimeOfDay: this.#xHasTimeOfDay });
				ticks.push({
					index,
					value: index,
					text: format == null ? defaultLabel : format(value, { defaultLabel }),
				});
			}
			return ticks;
		}
		const domain = this.#xTween.values();
		const range: [number, number] = [domain[0] ?? 0, domain[1] ?? 1];
		const count = snapshot.xAxis?.tickCount ?? Math.max(2, Math.floor(this.#plot.width / 90));
		if (this.#options.xScale === "time") {
			return timeTicks(range, count).map((epoch) => {
				const defaultLabel = formatTimeTick(epoch);
				return {
					index: null,
					value: epoch,
					text: format == null ? defaultLabel : format(new Date(epoch), { defaultLabel }),
				};
			});
		}
		// Same whole-step clamp as the value axis: a linear x over integer data
		// (attempt number, batch index) never grows fractional ticks.
		const ticks = linearTicks(range, count, { integer: this.#xsAllIntegers });
		const digits =
			ticks.length > 1
				? tickFractionDigits(Math.abs((ticks[1] ?? 0) - (ticks[0] ?? 0)))
				: undefined;
		return ticks.map((value) => {
			const defaultLabel = formatNumber(
				value,
				digits == null ? undefined : { maximumFractionDigits: digits },
			);
			return {
				index: null,
				value,
				text: format == null ? defaultLabel : format(value, { defaultLabel }),
			};
		});
	}

	#paint(now: number): boolean {
		const colors = this.#colors;
		if (colors == null || this.#cssWidth <= 0 || this.#cssHeight <= 0) {
			return false;
		}
		const ctx = this.#backend.begin({
			cssWidth: this.#cssWidth,
			cssHeight: this.#cssHeight,
			devicePixelRatio: this.#dpr,
		});
		if (ctx == null) {
			return false;
		}
		const animating = this.#paintFrame(ctx, colors, now);
		this.#backend.end();
		return animating;
	}

	/** Draw one frame into a context the backend began. Returns whether a fade still moves. */
	#paintFrame(ctx: PaintContext, colors: ResolvedPaint, now: number): boolean {
		const paintDt = Math.min(50, Math.max(0, now - this.#lastPaintTime));
		this.#lastPaintTime = now;
		const snapshot = this.#store.getSnapshot();
		const plot = this.#plot;
		if (plot.width <= 0 || plot.height <= 0) {
			return false;
		}
		const yCo = this.#yCoefficients();
		const xCo = this.#xCoefficients();
		const specs = this.#store.seriesSpecs();
		const is3d = this.#is3d();

		// Tick fade state: desired tick sets fade in/out instead of popping, and
		// gridlines share the label alphas so everything slides together while
		// the domains glide.
		// Why instant in a print: the snapshot takes one frame, and a label that
		// fades in is at its first step there.
		const instantLabels = this.#printing || this.#tweenDuration() === 0;
		// Why the guard: a chart with no axis and no grid draws no labels and no
		// gridlines, and the `ctx.font` write plus a `measureText` per tick cost
		// a sparkline more than its bars.
		const wantsTicks = this.#hasTicks();
		const desiredXTicks = is3d || !wantsTicks ? [] : this.#desiredXTicks(ctx, colors.fontFamily());
		const desiredYTicks =
			is3d || !wantsTicks ? [] : this.#desiredValueTicks(ctx, colors.fontFamily());
		let labelsAnimating = advanceLabelFade(this.#xLabelFade, desiredXTicks, paintDt, instantLabels);
		labelsAnimating =
			advanceLabelFade(this.#yLabelFade, desiredYTicks, paintDt, instantLabels) || labelsAnimating;

		// Left-edge scroll mask strength: eases in while streaming slides the
		// window, decays after the stream idles long enough for the domain
		// chase to settle. A static gradient is not motion, so reduced motion
		// only snaps the strength — the mask itself stays.
		const edgeFade = this.#edgeFade;
		if (edgeFade.target === 1) {
			if (now - this.#lastSlideAt > EDGE_FADE_LINGER_MS) {
				edgeFade.target = 0;
			} else if (this.#edgeFadeDecayTimer == null) {
				// One-shot wake at linger expiry: an idle chart schedules no
				// frames, so without this the mask would freeze on after the
				// stream's last tick.
				const remaining = EDGE_FADE_LINGER_MS - (now - this.#lastSlideAt) + 17;
				this.#edgeFadeDecayTimer = setTimeout(() => {
					this.#edgeFadeDecayTimer = null;
					this.#schedule();
				}, remaining);
			}
		}
		if (instantLabels) {
			edgeFade.alpha = edgeFade.target;
		} else {
			const speed = edgeFade.target > edgeFade.alpha ? 0.16 : 0.08;
			const factor = 1 - Math.pow(1 - speed, paintDt / 16.67);
			edgeFade.alpha += (edgeFade.target - edgeFade.alpha) * factor;
			if (Math.abs(edgeFade.target - edgeFade.alpha) < 0.02) {
				edgeFade.alpha = edgeFade.target;
			}
		}
		if (edgeFade.alpha !== edgeFade.target) {
			labelsAnimating = true;
		}
		// Orientation projects the two semantic axes onto pixels. Category (the
		// band structure, `#xLabelFade`) runs along x when vertical and y when
		// horizontal; value (`#yLabelFade`, the y tween) runs along y when
		// vertical and x when horizontal.
		const horizontal = this.#horizontalBars();
		const valueCo = horizontal ? this.#valueCoefficients() : yCo;
		const categoryPosition = (key: number): number =>
			this.#bandLayout != null ? bandCenter(this.#bandLayout, key) : key * xCo.k + xCo.b;
		const valuePosition = (value: number): number => value * valueCo.k + valueCo.b;
		const categoryLines = [...this.#xLabelFade.entries()].map(([key, entry]) => ({
			position: categoryPosition(key),
			alpha: entry.alpha,
		}));
		const valueLines = [...this.#yLabelFade.entries()].map(([key, entry]) => ({
			position: valuePosition(key),
			alpha: entry.alpha,
		}));

		// grid (2D only — the 3D frame is the cube wireframe). `lines` is physical:
		// "horizontal" draws horizontal lines, "vertical" vertical ones. Category
		// and value each supply whichever direction their axis currently occupies.
		const paintGrid = (): void => {
			if (snapshot.grid == null || is3d) {
				return;
			}
			// An unset direction (the store publishes `undefined` for "author left
			// it to the chart") defaults to VALUE gridlines — perpendicular to the
			// bars: horizontal for vertical bars / line / area, vertical for
			// horizontal bars.
			const lines = snapshot.grid.lines ?? (horizontal ? "vertical" : "horizontal");
			const horizontalLines = horizontal ? categoryLines : valueLines;
			const verticalLines = horizontal ? valueLines : categoryLines;
			drawGrid(ctx, {
				plot,
				color: colors.chrome.grid,
				xLines: lines === "horizontal" ? [] : verticalLines,
				yLines: lines === "vertical" ? [] : horizontalLines,
			});
		};

		// The left-edge fade touches only the marks: the backend fades them
		// through a ramp at the plot's left edge and keeps the grid whole.
		const fadeWidth = Math.min(EDGE_FADE_WIDTH, plot.width * 0.25);
		const fading = edgeFade.alpha > 0.01 && fadeWidth > 1;
		// Why a holder: the marks callback writes it, and a `let` would narrow to `null` past the call.
		const frame: { labels: FrameLabels | null } = { labels: null };
		this.#backend.composite(ctx, {
			underlay: paintGrid,
			marks: () => {
				ctx.save();
				ctx.beginPath();
				ctx.rect(plot.left, plot.top, plot.width, plot.height + 1);
				ctx.clip();
				if (this.#kind === "bar") {
					if (horizontal) {
						this.#paintHorizontalBars(ctx, specs);
					} else {
						this.#paintBars(ctx, specs, yCo);
					}
				} else if (this.#kind === "scatter") {
					frame.labels = this.#scatter?.paint(ctx) ?? null;
				} else {
					this.#paintLinesOrAreas(ctx, specs, yCo);
				}
				ctx.restore();
			},
			fade: fading
				? {
						left: plot.left,
						top: plot.top,
						width: fadeWidth,
						height: plot.height + 1,
						alpha: edgeFade.alpha,
					}
				: null,
		});

		// 3D frame labels: after the clip so edge-adjacent labels stay whole.
		if (frame.labels != null) {
			this.#scatter?.paintLabels(ctx, frame.labels);
		}

		// baseline (bars grow from a single baseline; keep it visible) — a vertical
		// baseline at value zero when horizontal, a horizontal one otherwise. A
		// chart without ticks skips it: its rounded bar ends mark the base.
		if (this.#kind === "bar" && this.#rowCount > 0 && this.#hasTicks()) {
			if (horizontal) {
				drawVerticalBaseline(ctx, { plot, color: colors.chrome.baseline, x: valuePosition(0) });
			} else {
				drawBaseline(ctx, { plot, color: colors.chrome.baseline, y: valuePosition(0) });
			}
		}

		// reference lines mark a value, so they run across the value axis: a
		// vertical line when horizontal, horizontal otherwise. Skipped when off the
		// value axis (an unclipped line would strike the label strip) and in 3D.
		for (const reference of is3d ? [] : snapshot.referenceLines) {
			const position = valuePosition(reference.y);
			const outOfRange = horizontal
				? position < plot.left || position > plot.left + plot.width
				: position < plot.top || position > plot.top + plot.height;
			if (outOfRange) {
				continue;
			}
			const color =
				reference.color == null ? colors.chrome.reference : colors.resolve(reference.color);
			if (horizontal) {
				drawVerticalReferenceLine(ctx, {
					plot,
					color,
					textColor: colors.chrome.tickText,
					x: position,
					label: reference.label,
					fontFamily: colors.fontFamily(),
				});
			} else {
				drawReferenceLine(ctx, {
					plot,
					color,
					textColor: colors.chrome.tickText,
					y: position,
					label: reference.label,
					fontFamily: colors.fontFamily(),
				});
			}
		}

		// axis labels (2D only), drawn from the fade maps so exits fade out. The
		// category set fills the left gutter (right-aligned, `yLabels`) when
		// horizontal and the bottom strip (`xLabels`) when vertical; value swaps
		// the other way.
		const categoryLabels =
			snapshot.xAxis == null || is3d
				? []
				: [...this.#xLabelFade.entries()].map(([key, entry]) => ({
						position: categoryPosition(key),
						text: entry.text,
						alpha: entry.alpha,
					}));
		const valueLabels =
			snapshot.yAxis == null || is3d
				? []
				: [...this.#yLabelFade.entries()].map(([key, entry]) => ({
						position: valuePosition(key),
						text: entry.text,
						alpha: entry.alpha,
					}));
		const xLabels = horizontal ? valueLabels : categoryLabels;
		const yLabels = horizontal ? categoryLabels : valueLabels;
		if (xLabels.length > 0 || yLabels.length > 0) {
			drawAxisLabels(ctx, {
				plot,
				color: colors.chrome.tickText,
				fontFamily: colors.fontFamily(),
				xLabels,
				yLabels,
			});
		}
		return labelsAnimating;
	}

	/**
	 * The category ticks that SHOULD be visible this frame: generated for the
	 * current (possibly mid-glide) domain, then collision-thinned (skip, never
	 * rotate). Vertical charts thin by measured label width along x; horizontal
	 * charts thin by label height, since categories stack down the y axis. Keys
	 * are band indexes on band scales and tick values on continuous ones.
	 */
	#desiredXTicks(ctx: PaintContext, fontFamily: string): Array<{ key: number; text: string }> {
		ctx.font = `${AXIS_FONT_SIZE}px ${fontFamily}`;
		const horizontal = this.#horizontalBars();
		const xCo = this.#xCoefficients();
		const desired: Array<{ key: number; text: string }> = [];
		let previousEnd = Number.NEGATIVE_INFINITY;
		for (const tick of this.#xTicks()) {
			const isBand = tick.index != null && this.#bandLayout != null;
			const position =
				isBand && this.#bandLayout != null
					? bandCenter(this.#bandLayout, tick.index ?? 0)
					: tick.value * xCo.k + xCo.b;
			// Horizontal labels stack vertically, so they collide by line height,
			// not text width.
			const half = horizontal ? (AXIS_FONT_SIZE + 4) / 2 : this.#textWidth(ctx, tick.text) / 2;
			const gap = horizontal ? 2 : 8;
			if (position - half < previousEnd + gap) {
				continue;
			}
			previousEnd = position + half;
			desired.push({ key: isBand ? (tick.index ?? 0) : tick.value, text: tick.text });
		}
		return desired;
	}

	/**
	 * The value ticks that SHOULD be visible this frame, thinned so no two labels
	 * overlap (skip, never rotate). Vertical charts stack them in the left gutter,
	 * where they collide by line height. Horizontal charts place them along the x
	 * axis, where they collide by measured width.
	 */
	#desiredValueTicks(ctx: PaintContext, fontFamily: string): Array<{ key: number; text: string }> {
		const ticks = this.#yTicks();
		const valueCo = this.#valueCoefficients();
		if (!this.#horizontalBars()) {
			const desired: Array<{ key: number; text: string }> = [];
			let previous = Number.NaN;
			for (const tick of ticks) {
				const position = tick.value * valueCo.k + valueCo.b;
				if (Math.abs(position - previous) < AXIS_FONT_SIZE + 2) {
					continue;
				}
				previous = position;
				desired.push({ key: tick.value, text: tick.text });
			}
			return desired;
		}
		ctx.font = `${AXIS_FONT_SIZE}px ${fontFamily}`;
		const desired: Array<{ key: number; text: string }> = [];
		let previousEnd = Number.NEGATIVE_INFINITY;
		for (const tick of ticks) {
			const position = tick.value * valueCo.k + valueCo.b;
			const half = this.#textWidth(ctx, tick.text) / 2;
			if (position - half < previousEnd + 8) {
				continue;
			}
			previousEnd = position + half;
			desired.push({ key: tick.value, text: tick.text });
		}
		return desired;
	}

	/**
	 * The values one series paints this frame: the in-flight per-datum tween
	 * when one applies, else the settled column or stack boundary. `seriesIndex`
	 * is the series' position in `seriesSpecs()` paint order. `#ingest` built the
	 * stack in that order. Every caller iterates that list and already holds the
	 * index.
	 */
	#paintedValues(
		series: Pick<SeriesSpec, "dataKey">,
		boundary: "value" | "lower" | "upper",
		seriesIndex: number,
	): Float64Array {
		const key = boundary === "value" ? series.dataKey : `${series.dataKey}:${boundary}`;
		// Never feed tween frames into the decimated path: decimated columns are
		// cached by (x domain, width), which doesn't change while values tween, so
		// the first frame's columns would be cached and painted forever.
		if (!this.#decimated && this.#rowCount <= PER_DATUM_TWEEN_LIMIT) {
			const tween = this.#valueTweens.get(key);
			if (tween != null && tween.values().length === this.#rowCount) {
				return tween.values();
			}
		}
		if (boundary === "value") {
			return this.#columns[seriesIndex] ?? new Float64Array(0);
		}
		const rows = boundary === "lower" ? this.#stack?.lower : this.#stack?.upper;
		return rows?.[seriesIndex] ?? new Float64Array(0);
	}

	/**
	 * The column of one series by its key. The paint path holds each series'
	 * index; an event between a registration and the next ingest does not, and
	 * a key cannot read another series' column.
	 */
	#columnOf(dataKey: string): Float64Array | undefined {
		const index = this.#columnIndex.get(dataKey);
		return index == null ? undefined : this.#columns[index];
	}

	/** The indexes below `#rowCount` where `values` holds a number. */
	#definedIndexes(values: Float64Array): number[] {
		const indexes: number[] = [];
		for (let index = 0; index < this.#rowCount; index++) {
			if (!Number.isNaN(values[index] ?? Number.NaN)) {
				indexes.push(index);
			}
		}
		return indexes;
	}

	/** `0..count-1`, built once per row count and shared by every series and frame. */
	#allIndexesUpTo(count: number): readonly number[] {
		if (this.#allIndexes.length !== count) {
			this.#allIndexes = Array.from({ length: count }, (_unused, index) => index);
		}
		return this.#allIndexes;
	}

	#reveal(dataKey: string): number {
		const tween = this.#revealTweens.get(dataKey);
		return tween?.values()[0] ?? 1;
	}

	/**
	 * Each bar series' boundaries and the reveal still to apply. A stacked
	 * chart that is still entering re-stacks its revealed shares, so each column
	 * grows as one bar; its segments then carry no reveal of their own.
	 */
	#barSegments(
		specs: readonly SeriesSpec[],
	): Array<{ lower: Float64Array | null; upper: Float64Array; reveal: number }> {
		const reveals = specs.map((spec) => this.#reveal(spec.dataKey));
		if (this.#stack == null) {
			return specs.map((spec, seriesIndex) => ({
				lower: null,
				upper: this.#paintedValues(spec, "value", seriesIndex),
				reveal: reveals[seriesIndex] ?? 1,
			}));
		}
		const lower = specs.map((spec, seriesIndex) => this.#paintedValues(spec, "lower", seriesIndex));
		const upper = specs.map((spec, seriesIndex) => this.#paintedValues(spec, "upper", seriesIndex));
		if (reveals.every((reveal) => reveal >= 1)) {
			return specs.map((_, seriesIndex) => ({
				lower: lower[seriesIndex] ?? null,
				upper: upper[seriesIndex] ?? new Float64Array(0),
				reveal: 1,
			}));
		}
		const revealed = revealStack({ lower, upper, reveal: reveals, count: this.#rowCount });
		return specs.map((_, seriesIndex) => ({
			lower: revealed.lower[seriesIndex] ?? null,
			upper: revealed.upper[seriesIndex] ?? new Float64Array(0),
			reveal: 1,
		}));
	}

	/**
	 * The baseline-side boundary of one bar segment: the stacked lower boundary,
	 * or the zero baseline when the chart does not stack. `computeStackBoundaries`
	 * pairs its `NaN`s, so a defined upper implies a defined lower — the fallback
	 * only keeps a torn column anchored at zero instead of at `NaN`.
	 */
	#segmentLower(lower: Float64Array | null, index: number): number {
		if (lower == null) {
			return 0;
		}
		const value = lower[index] ?? 0;
		return Number.isNaN(value) ? 0 : value;
	}

	/**
	 * Whether this segment sits at the data end of its column's pile, and so
	 * wears the renderer's rounded cap. Every unstacked bar is its own data end.
	 *
	 * Stacked, the answer is per column and per pile. The last-registered series
	 * tops the stack only where it carries a value. Rounding it everywhere leaves
	 * a square cap on every column where it is zero. Boundaries come from the
	 * settled stack, which holds the cap still through a transition.
	 */
	#isDataEnd(seriesIndex: number, index: number, toPixel: (value: number) => number): boolean {
		const stack = this.#stack;
		if (stack == null) {
			return true;
		}
		const lower = stack.lower[seriesIndex]?.[index] ?? Number.NaN;
		const upper = stack.upper[seriesIndex]?.[index] ?? Number.NaN;
		if (Number.isNaN(lower) || Number.isNaN(upper)) {
			return false;
		}
		const negative = lower < 0;
		const end = (negative ? stack.negativeEnd : stack.positiveEnd)[index] ?? -1;
		if (end < 0) {
			return false;
		}
		const pileOuter = (negative ? stack.lower : stack.upper)[end]?.[index] ?? Number.NaN;
		return isStackedDataEnd({ lower, upper, pileOuter, toPixel });
	}

	#paintBars(ctx: PaintContext, specs: readonly SeriesSpec[], yCo: { k: number; b: number }): void {
		const layout = this.#bandLayout;
		const colors = this.#colors;
		if (layout == null || colors == null || this.#rowCount === 0 || specs.length === 0) {
			return;
		}
		const stacked = this.#stack != null;
		const groupCount = stacked ? 1 : specs.length;
		const gap = barGap({ bandwidth: layout.bandwidth, groupCount });
		const slotWidth = (layout.bandwidth - gap * (groupCount - 1)) / groupCount;
		const barWidth = barThickness({ step: layout.step, slot: slotWidth });
		const toPixel = (value: number): number => value * yCo.k + yCo.b;
		const stackGap = stacked ? STACK_GAP : 0;

		const rects = this.#barRects;
		const segments = this.#barSegments(specs);
		specs.forEach((spec, seriesIndex) => {
			const { lower, upper, reveal } = segments[seriesIndex] ?? EMPTY_SEGMENTS;
			let count = 0;
			for (let index = 0; index < this.#rowCount; index++) {
				const upperValue = upper[index] ?? Number.NaN;
				if (Number.isNaN(upperValue)) {
					continue;
				}
				const lowerValue = this.#segmentLower(lower, index);
				const slotStart = stacked
					? bandStart(layout, index) + (layout.bandwidth - barWidth) / 2
					: bandStart(layout, index) +
						(layout.bandwidth - (slotWidth * groupCount + gap * (groupCount - 1))) / 2 +
						seriesIndex * (slotWidth + gap) +
						(slotWidth - barWidth) / 2;
				const edges = stackedSegmentEdges({
					lower: lowerValue,
					upper: upperValue,
					toPixel,
					reveal,
					gap: stackGap,
				});
				const rect = rects[count] ?? emptyBarRect();
				rects[count] = rect;
				count += 1;
				rect.x = slotStart;
				rect.width = barWidth;
				rect.baselineY = edges.baseline;
				rect.valueY = edges.value;
				rect.rounded = this.#isDataEnd(seriesIndex, index, toPixel);
				rect.roundedBase = isStackedBaseEnd({ baseline: edges.baseline, toPixel });
			}
			// Textured series paint with their cached pattern; a missing pattern
			// (solid texture, or tile rasterization unavailable) falls back to the
			// solid series color so bars never vanish.
			drawBars(ctx, {
				fill:
					colors.barFills.get(spec.dataKey) ?? colors.series.get(spec.dataKey) ?? "currentColor",
				rects,
				count,
			});
		});
	}

	/**
	 * The {@link #paintBars} mirror for `orientation="horizontal"`: categories
	 * band down the y axis and values run along x from a left baseline. The slot
	 * math is identical with x and y swapped — group slots stack down the band,
	 * bar thickness is a y extent, and the reveal grows rightward from the value
	 * baseline.
	 */
	#paintHorizontalBars(ctx: PaintContext, specs: readonly SeriesSpec[]): void {
		const layout = this.#bandLayout;
		const colors = this.#colors;
		if (layout == null || colors == null || this.#rowCount === 0 || specs.length === 0) {
			return;
		}
		const valueCo = this.#valueCoefficients();
		const stacked = this.#stack != null;
		const groupCount = stacked ? 1 : specs.length;
		const gap = barGap({ bandwidth: layout.bandwidth, groupCount });
		const slotHeight = (layout.bandwidth - gap * (groupCount - 1)) / groupCount;
		const barHeight = barThickness({ step: layout.step, slot: slotHeight });
		const toPixel = (value: number): number => value * valueCo.k + valueCo.b;
		const stackGap = stacked ? STACK_GAP : 0;

		const rects = this.#horizontalBarRects;
		const segments = this.#barSegments(specs);
		specs.forEach((spec, seriesIndex) => {
			const { lower, upper, reveal } = segments[seriesIndex] ?? EMPTY_SEGMENTS;
			let count = 0;
			for (let index = 0; index < this.#rowCount; index++) {
				const upperValue = upper[index] ?? Number.NaN;
				if (Number.isNaN(upperValue)) {
					continue;
				}
				const lowerValue = this.#segmentLower(lower, index);
				const slotStart = stacked
					? bandStart(layout, index) + (layout.bandwidth - barHeight) / 2
					: bandStart(layout, index) +
						(layout.bandwidth - (slotHeight * groupCount + gap * (groupCount - 1))) / 2 +
						seriesIndex * (slotHeight + gap) +
						(slotHeight - barHeight) / 2;
				const edges = stackedSegmentEdges({
					lower: lowerValue,
					upper: upperValue,
					toPixel,
					reveal,
					gap: stackGap,
				});
				const rect = rects[count] ?? emptyHorizontalBarRect();
				rects[count] = rect;
				count += 1;
				rect.y = slotStart;
				rect.height = barHeight;
				rect.baselineX = edges.baseline;
				rect.valueX = edges.value;
				rect.rounded = this.#isDataEnd(seriesIndex, index, toPixel);
				rect.roundedBase = isStackedBaseEnd({ baseline: edges.baseline, toPixel });
			}
			drawHorizontalBars(ctx, {
				fill:
					colors.barFills.get(spec.dataKey) ?? colors.series.get(spec.dataKey) ?? "currentColor",
				rects,
				count,
			});
		});
	}

	#paintLinesOrAreas(
		ctx: PaintContext,
		specs: readonly SeriesSpec[],
		yCo: { k: number; b: number },
	): void {
		const colors = this.#colors;
		if (colors == null || this.#rowCount === 0) {
			return;
		}
		const xCo = this.#xCoefficients();
		const layout = this.#bandLayout;
		const xAt = (index: number): number =>
			layout != null ? bandCenter(layout, index) : (this.#xs[index] ?? 0) * xCo.k + xCo.b;

		specs.forEach((spec, seriesIndex) => {
			const color = colors.series.get(spec.dataKey) ?? "currentColor";
			const reveal = this.#reveal(spec.dataKey);
			ctx.save();
			if (reveal < 1) {
				ctx.beginPath();
				ctx.rect(this.#plot.left, 0, this.#plot.width * reveal, this.#cssHeight);
				ctx.clip();
			}
			if (this.#decimated) {
				this.#paintDecimatedSeries(ctx, spec, seriesIndex, color, yCo);
				ctx.restore();
				return;
			}
			const isArea = spec.mark === "area";
			const upper = this.#paintedValues(spec, this.#stack != null ? "upper" : "value", seriesIndex);
			const lower = this.#stack != null ? this.#paintedValues(spec, "lower", seriesIndex) : null;
			const definedAt = (index: number): boolean => !Number.isNaN(upper[index] ?? Number.NaN);
			// connectNulls joins across gaps by drawing only the finite indexes;
			// without it, NaN indexes stay in the list and defined() breaks the path.
			const indexes = spec.connectNulls
				? this.#definedIndexes(upper)
				: this.#allIndexesUpTo(this.#rowCount);
			const yAt = (index: number): number => (upper[index] ?? 0) * yCo.k + yCo.b;
			if (isArea) {
				const y0At =
					lower == null
						? (): number => 0 * yCo.k + yCo.b
						: (index: number): number => (lower[index] ?? 0) * yCo.k + yCo.b;
				drawAreaPath(ctx, {
					color,
					curve: spec.curve,
					indexes,
					xAt,
					y0At,
					y1At: yAt,
					definedAt,
				});
			} else {
				drawLinePath(ctx, { color, curve: spec.curve, indexes, xAt, yAt, definedAt });
				if (spec.markers && this.#plot.width / this.#rowCount >= 12) {
					drawMarkers(ctx, {
						color,
						surface: colors.chrome.surface,
						shape: spec.shape,
						indexes,
						xAt,
						yAt,
						definedAt,
					});
				}
			}
			ctx.restore();
		});
	}

	#paintDecimatedSeries(
		ctx: PaintContext,
		spec: SeriesSpec,
		seriesIndex: number,
		color: string,
		yCo: { k: number; b: number },
	): void {
		const columnCount = Math.max(1, Math.round(this.#plot.width * this.#dpr));
		const columnToX = (column: number): number => this.#plot.left + (column + 0.5) / this.#dpr;
		if (spec.mark === "area") {
			const upper = this.#decimatedFor(
				`${spec.dataKey}:upper`,
				this.#paintedValues(spec, this.#stack != null ? "upper" : "value", seriesIndex),
				columnCount,
			);
			const lower =
				this.#stack != null
					? this.#decimatedFor(
							`${spec.dataKey}:lower`,
							this.#paintedValues(spec, "lower", seriesIndex),
							columnCount,
						)
					: null;
			if (lower == null) {
				let zero = this.#zeroColumns;
				if (zero?.columnCount !== columnCount) {
					zero = zeroColumns(columnCount);
					this.#zeroColumns = zero;
				}
				drawDecimatedArea(ctx, {
					color,
					lowerColumns: zero,
					upperColumns: upper,
					columnToX,
					valueK: yCo.k,
					valueB: yCo.b,
				});
			} else {
				drawDecimatedArea(ctx, {
					color,
					lowerColumns: lower,
					upperColumns: upper,
					columnToX,
					valueK: yCo.k,
					valueB: yCo.b,
				});
			}
			return;
		}
		const columns = this.#decimatedFor(
			spec.dataKey,
			this.#paintedValues(spec, "value", seriesIndex),
			columnCount,
		);
		drawDecimatedLine(ctx, { color, columns, columnToX, valueK: yCo.k, valueB: yCo.b });
	}

	#decimatedFor(cacheKey: string, values: Float64Array, columnCount: number): DecimatedColumns {
		// Cache in data space keyed by (x domain, device-pixel width): y-domain
		// tweens remap through fresh coefficients without re-running the O(n)
		// accumulator.
		const domain = this.#xTween.values();
		const key = `${domain[0] ?? 0}:${domain[1] ?? 1}:${columnCount}`;
		const cached = this.#decimationCache.get(cacheKey);
		if (cached != null && cached.key === key) {
			return cached.columns;
		}
		const range: [number, number] = [domain[0] ?? 0, domain[1] ?? 1];
		const co = linearCoefficients(range, [0, columnCount]);
		const columns = decimateColumns({
			xs: this.#xs,
			values,
			startIndex: 0,
			endIndex: this.#rowCount - 1,
			positionK: co.k,
			positionB: co.b,
			columnCount,
		});
		this.#decimationCache.set(cacheKey, { key, columns });
		return columns;
	}

	// ---- hover / keyboard / overlay -------------------------------------------

	#effectiveIndex(): number | null {
		if (this.#rowCount === 0) {
			return null;
		}
		let raw: number | null;
		if (this.#controlledIndex !== undefined) {
			// Controlled values live in source space; convert at the read so the
			// mapping stays fresh across re-ingests (sorts and drops can change it).
			raw = this.#controlledIndex == null ? null : this.#toViewIndex(this.#controlledIndex);
		} else {
			raw = this.#activeIndex;
		}
		if (raw == null) {
			return null;
		}
		// Clamp at the read so an out-of-range controlled index (or one stranded
		// by a data shrink) never positions the overlay off-plot.
		return Math.min(Math.max(0, raw), this.#rowCount - 1);
	}

	/** Map a view-space (sorted/filtered) index back to the consumer's `data` array. */
	#toSourceIndex(viewIndex: number): number {
		return this.#order == null ? viewIndex : (this.#order[viewIndex] ?? viewIndex);
	}

	/**
	 * Map a consumer `data` index into the engine's view; `null` when that row
	 * was dropped at ingest (no position on the axis). Out-of-range input is
	 * clamped, mirroring {@link #effectiveIndex}.
	 */
	#toViewIndex(sourceIndex: number): number | null {
		if (this.#rows.length === 0) {
			return null;
		}
		const clamped = Math.min(Math.max(0, sourceIndex), this.#rows.length - 1);
		if (this.#orderInverse == null) {
			return clamped;
		}
		const view = this.#orderInverse[clamped] ?? -1;
		return view === -1 ? null : view;
	}

	/**
	 * The public x value at a view index:
	 * - the consumer's category on a band or point scale
	 * - a `Date` on a time scale
	 * - a number on a linear scale
	 * - `""` out of range
	 *
	 * A continuous scale builds the value from `#xs` per read, so each snapshot
	 * and activation carries its own `Date`.
	 */
	#xValueAt(index: number): XValue {
		if (index < 0 || index >= this.#rowCount) {
			return "";
		}
		const { xScale } = this.#options;
		if (xScale === "band" || xScale === "point") {
			return this.#xValues[index] ?? "";
		}
		const x = this.#xs[index] ?? 0;
		return xScale === "time" ? new Date(x) : x;
	}

	#indexAtPixel(cssX: number, cssY: number): number | null {
		if (this.#rowCount === 0) {
			return null;
		}
		const layout = this.#bandLayout;
		if (layout != null) {
			// The band runs down y when horizontal, so invert against the pointer's
			// position along the band's own axis.
			return invertBand(layout, this.#horizontalBars() ? cssY : cssX);
		}
		const { k, b } = this.#xCoefficients();
		if (k === 0) {
			return 0;
		}
		let x = cssX;
		if (this.#decimated) {
			// Snap to the device-pixel column center so every pointer position in a
			// column yields the same (stable) snapshot index.
			const column = Math.floor((cssX - this.#plot.left) * this.#dpr);
			x = this.#plot.left + (column + 0.5) / this.#dpr;
		}
		return nearestIndex(this.#xs, this.#rowCount, (x - b) / k);
	}

	#nearestSeries(index: number, cssX: number, cssY: number): string | null {
		const specs = this.#store.seriesSpecs();
		const horizontal = this.#horizontalBars();
		// Grouped bars: the pointer's slot within the band names the series. The
		// slots stack along the band's axis — y when horizontal, x otherwise.
		const layout = this.#bandLayout;
		if (this.#kind === "bar" && this.#stack == null && layout != null && specs.length > 1) {
			const withinBand = (horizontal ? cssY : cssX) - bandStart(layout, index);
			const slot = Math.floor((withinBand / Math.max(1, layout.bandwidth)) * specs.length);
			return specs[Math.min(specs.length - 1, Math.max(0, slot))]?.dataKey ?? null;
		}
		const { k, b } = horizontal ? this.#valueCoefficients() : this.#yCoefficients();
		const pointerAlongValue = horizontal ? cssX : cssY;
		// Stacked bars: a segment is a filled span, not a boundary, so the segment
		// CONTAINING the pointer names the series. Nearest-boundary would hand the
		// half of every segment nearer the baseline to the series below it.
		const stack = this.#stack;
		if (this.#kind === "bar" && stack != null) {
			for (let seriesIndex = 0; seriesIndex < specs.length; seriesIndex++) {
				const lower = stack.lower[seriesIndex]?.[index] ?? Number.NaN;
				const upper = stack.upper[seriesIndex]?.[index] ?? Number.NaN;
				if (Number.isNaN(lower) || Number.isNaN(upper) || lower === upper) {
					continue;
				}
				const lowerPixel = lower * k + b;
				const upperPixel = upper * k + b;
				if (
					pointerAlongValue >= Math.min(lowerPixel, upperPixel) &&
					pointerAlongValue <= Math.max(lowerPixel, upperPixel)
				) {
					return specs[seriesIndex]?.dataKey ?? null;
				}
			}
		}
		// Otherwise pick the series whose painted value sits nearest the pointer
		// along the value axis (x when horizontal, y otherwise) — the mark IS the
		// boundary for a line or an area, and a pointer clear of a stack still
		// names the segment it is closest to.
		let nearest: string | null = null;
		let bestDistance = Number.POSITIVE_INFINITY;
		specs.forEach((spec, seriesIndex) => {
			// Stacked marks paint at their cumulative boundary, so hit-test the
			// boundary — raw values would misattribute everything to the largest series.
			const values =
				this.#stack == null ? this.#columnOf(spec.dataKey) : this.#stack.upper[seriesIndex];
			const value = values?.[index] ?? Number.NaN;
			if (Number.isNaN(value)) {
				return;
			}
			const distance = Math.abs(value * k + b - pointerAlongValue);
			if (distance < bestDistance) {
				bestDistance = distance;
				nearest = spec.dataKey;
			}
		});
		return nearest;
	}

	/**
	 * Set the active position (view-space index). `notify` reports the change
	 * through `onActiveIndexChange` in SOURCE space — public indexes always
	 * address the consumer's `data` array, never the engine's sorted view.
	 */
	#setActive(index: number | null, options: { viaKeyboard: boolean; notify: boolean }): void {
		const clamped =
			index == null || this.#rowCount === 0
				? null
				: Math.min(Math.max(0, index), this.#rowCount - 1);
		const controlled = this.#controlledIndex !== undefined;
		if (options.notify && clamped !== this.#effectiveIndex()) {
			const sourceIndex = clamped == null ? null : this.#toSourceIndex(clamped);
			this.#callbacks.onActiveIndexChange?.(sourceIndex);
			if (controlled) {
				// The consumer owns the state: remember the interaction source for
				// the echo, and publish nothing now — a snapshot of the OLD index
				// wearing the NEW interaction source would be spurious.
				this.#pendingControlledEcho = { index: sourceIndex, viaKeyboard: options.viaKeyboard };
				return;
			}
		}
		this.#viaKeyboard = options.viaKeyboard;
		if (!controlled) {
			this.#activeIndex = clamped;
		}
		this.#publishSnapshot();
		this.#scheduleOverlay();
	}

	#lastPublishedIndex: number | null = null;
	#lastPublishedViaKeyboard = false;
	#lastPublishedSeriesKey: string | null = null;

	#publishSnapshot(options: { force: boolean } = { force: false }): void {
		const index = this.#effectiveIndex();
		if (
			!options.force &&
			index === this.#lastPublishedIndex &&
			this.#viaKeyboard === this.#lastPublishedViaKeyboard &&
			// A scatter row can carry several series' points at one index — moving
			// between same-row dots changes the hit series without changing index.
			this.#activeSeriesKey === this.#lastPublishedSeriesKey
		) {
			return;
		}
		this.#lastPublishedIndex = index;
		this.#lastPublishedViaKeyboard = this.#viaKeyboard;
		this.#lastPublishedSeriesKey = this.#activeSeriesKey;
		if (index == null || this.#rowCount === 0) {
			this.#store.publishHover(null);
			return;
		}
		const sourceIndex = this.#toSourceIndex(index);
		const datum = this.#rows[sourceIndex] ?? {};
		// The store rebuilds `series` on every registration change, so reading it
		// costs no sort per hover; `seriesMeta()` re-sorts per call.
		const meta = this.#store.getSnapshot().series;
		let points = meta.map((series) => {
			const values = this.#columnOf(series.dataKey);
			const value = values?.[index] ?? Number.NaN;
			return {
				dataKey: series.dataKey,
				label: series.label,
				value: Number.isNaN(value) ? null : value,
				color: series.color,
			};
		});
		if (this.#options.stacked) {
			// Rows run from the far end of the pile back to the baseline, so they
			// match what a reader scans: top-down on a vertical chart, and from the
			// right-hand end leftward on a horizontal one.
			points.reverse();
		}
		if (this.#kind === "scatter") {
			// Scatter rows are individual points: the readout names the hit point's
			// series (pointer) or the row's populated series (keyboard) — never a
			// column of em dashes for every series the row doesn't carry.
			points =
				this.#activeSeriesKey == null
					? points.filter((point) => point.value != null)
					: points.filter((point) => point.dataKey === this.#activeSeriesKey);
		}
		const snapshot: HoverSnapshot = {
			// Public indexes address the consumer's data array, not the sorted view.
			index: sourceIndex,
			xValue: this.#xValueAt(index),
			datum,
			points,
			viaKeyboard: this.#viaKeyboard,
		};
		if (this.#options.stacked && points.length > 1) {
			snapshot.total = points.reduce((sum, point) => sum + (point.value ?? 0), 0);
		}
		if (this.#is3d()) {
			const zValue = this.#zs[index] ?? Number.NaN;
			snapshot.zValue = Number.isNaN(zValue) ? null : zValue;
		}
		this.#store.publishHover(snapshot);
	}

	#updateOverlay(): void {
		const index = this.#effectiveIndex();
		const visible = index != null && this.#rowCount > 0;
		const hover = this.#hover ?? (visible ? this.#appendHoverLayers() : null);
		// A static chart has no layers to place. Before its first active datum,
		// an interactive chart has nothing to show.
		if (hover == null) {
			return;
		}
		const { tooltip } = this.#elements;
		const { crosshair, band, markers } = hover;
		const isBar = this.#kind === "bar";
		const isScatter = this.#kind === "scatter";

		crosshair.style.opacity = visible && !isBar && !isScatter ? "1" : "0";
		band.style.opacity = visible && isBar ? "1" : "0";
		markers.style.opacity = visible && !isBar ? "1" : "0";
		if (tooltip != null) {
			tooltip.style.opacity = visible ? "1" : "0";
		}
		if (!visible) {
			return;
		}

		const plot = this.#plot;

		if (isScatter) {
			const screen = this.#activeScreen ?? this.#scatter?.screenFor(index) ?? null;
			if (screen == null) {
				markers.style.opacity = "0";
				if (tooltip != null) {
					tooltip.style.opacity = "0";
				}
				return;
			}
			while (markers.children.length > 1) {
				markers.lastElementChild?.remove();
			}
			if (markers.children.length === 0) {
				markers.appendChild(createMarkerDot(markers.ownerDocument));
			}
			const dot = markers.children[0];
			if (dot instanceof HTMLElement) {
				const meta = this.#store.getSnapshot().series;
				const active =
					this.#activeSeriesKey == null
						? meta.find((series) => {
								const value = this.#columnOf(series.dataKey)?.[index] ?? Number.NaN;
								return !Number.isNaN(value);
							})
						: meta.find((series) => series.dataKey === this.#activeSeriesKey);
				dot.style.opacity = "1";
				styleMarkerDot(dot, active?.shape ?? "circle", active?.color ?? "currentColor");
				dot.style.transform = `translate(${screen.x}px, ${screen.y}px)`;
			}
			this.#positionTooltip(screen.x, screen.y);
			return;
		}

		const xPx = this.#xPixel(index);
		const horizontal = this.#horizontalBars();

		if (isBar) {
			const layout = this.#bandLayout;
			if (layout != null) {
				// The highlight is the hit region itself. A wider one would wash over
				// the neighbors it does not select — at 60 categories the old 24px
				// floor reached a third of the way into the next bar. A region under
				// a pixel wide rasterizes to nothing, so the band keeps 1px and stays
				// centered on the region rather than growing off one end.
				const region = bandHitRegion(layout, index);
				const size = Math.max(1, region.size);
				const start = region.start - (size - region.size) / 2;
				if (horizontal) {
					// The band spans the full plot width at the category's y row.
					band.style.transform = `translate(${plot.left}px, ${start}px)`;
					band.style.width = `${plot.width}px`;
					band.style.height = `${size}px`;
				} else {
					band.style.transform = `translate(${start}px, ${plot.top}px)`;
					band.style.width = `${size}px`;
					band.style.height = `${plot.height}px`;
				}
			}
		} else {
			crosshair.style.transform = `translate(${xPx}px, ${plot.top}px)`;
			crosshair.style.height = `${plot.height}px`;

			// One marker dot per series, synced imperatively. The overlay syncs on
			// every hover frame, so read the store's cached paint-order list instead
			// of re-sorting the registrations per sync.
			const meta = this.#store.getSnapshot().series;
			while (markers.children.length > meta.length) {
				markers.lastElementChild?.remove();
			}
			while (markers.children.length < meta.length) {
				markers.appendChild(createMarkerDot(markers.ownerDocument));
			}
			const yCo = this.#yCoefficients();
			meta.forEach((series, seriesIndex) => {
				const dot = markers.children[seriesIndex];
				if (!(dot instanceof HTMLElement)) {
					return;
				}
				// Visibility follows the RAW value (a null row hides the dot even if
				// the stack carries a boundary through the gap); position follows the
				// PAINTED value — the stacked upper boundary when stacking — so the
				// dot sits on its series' drawn line, never at the unstacked height.
				const raw = this.#columnOf(series.dataKey)?.[index] ?? Number.NaN;
				const painted =
					this.#paintedValues(series, this.#stack != null ? "upper" : "value", seriesIndex)[
						index
					] ?? Number.NaN;
				if (Number.isNaN(raw) || Number.isNaN(painted)) {
					dot.style.opacity = "0";
					return;
				}
				dot.style.opacity = "1";
				styleMarkerDot(dot, series.shape, series.color);
				dot.style.transform = `translate(${xPx}px, ${painted * yCo.k + yCo.b}px)`;
			});
		}

		if (isBar && horizontal && this.#bandLayout != null) {
			// Anchor beside the hovered row: track the pointer along the value axis,
			// centered on the category band.
			this.#positionTooltip(
				this.#pointerX ?? plot.left + plot.width / 2,
				bandCenter(this.#bandLayout, index),
			);
		} else {
			this.#positionTooltip(xPx, this.#pointerY ?? plot.top + 8);
		}
	}

	/**
	 * Make the hover layers and append them to the plot, above the paint
	 * surface and the overlay. A chart nobody points at never holds them.
	 */
	#appendHoverLayers(): HoverLayers | null {
		if (this.#createHoverLayers == null) {
			return null;
		}
		const hover = this.#createHoverLayers();
		this.#elements.plot.append(hover.crosshair, hover.band, hover.markers);
		this.#hover = hover;
		return hover;
	}

	/**
	 * Position the tooltip near an anchor point, flipping sides at the plot edge
	 * and clamping vertically. The inner clamp holds the readout inside the plot
	 * rect, which keeps it off the tick labels the x-axis band reserves below.
	 * When the readout is taller than the plot, the outer clamp pins it to the
	 * wrapper's top edge instead of spilling the overflow past the bottom.
	 */
	#positionTooltip(anchorX: number, anchorY: number): void {
		const plot = this.#plot;
		const tooltip = this.#elements.tooltip;
		if (tooltip == null) {
			return;
		}
		// Why measure here: the surface mounts with its first readout, and the size
		// observer reports after this frame's layout. One read places that readout.
		// A dormant chart skips the read, which forces a layout.
		if (this.#inView && this.#tooltipSize.width === 0 && this.#tooltipSize.height === 0) {
			this.#tooltipSize = { width: tooltip.offsetWidth, height: tooltip.offsetHeight };
		}
		const size = this.#tooltipSize;
		const gapX = 12;
		let tooltipLeft = anchorX + gapX;
		if (
			tooltipLeft + size.width > plot.left + plot.width &&
			anchorX - gapX - size.width >= plot.left
		) {
			tooltipLeft = anchorX - gapX - size.width;
		}
		const tooltipTop = Math.max(
			0,
			Math.min(anchorY - size.height / 2, plot.top + plot.height - size.height),
		);
		tooltip.style.transform = `translate(${tooltipLeft}px, ${tooltipTop}px)`;
	}
}

/**
 * Whether two category values name the same category. A `Date` compares by
 * its time, because a new fetch builds new `Date` objects for the same buckets.
 */
const sameCategory = (previous: XValue | undefined, next: XValue | undefined): boolean =>
	// Why `Object.is`: `NaN`, and the time of an invalid `Date`, must equal itself.
	previous instanceof Date && next instanceof Date
		? Object.is(previous.getTime(), next.getTime())
		: Object.is(previous, next);

/**
 * Advance a tick-label fade map toward its desired set: wanted labels fade in,
 * unwanted fade out and are pruned. Returns `true` while any alpha is still
 * moving (the caller keeps scheduling frames).
 */
const advanceLabelFade = (
	fade: Map<number, { alpha: number; target: number; text: string }>,
	desired: ReadonlyArray<{ key: number; text: string }>,
	dt: number,
	instant: boolean,
): boolean => {
	for (const entry of fade.values()) {
		entry.target = 0;
	}
	for (const tick of desired) {
		const entry = fade.get(tick.key);
		if (entry == null) {
			fade.set(tick.key, { alpha: instant ? 1 : 0, target: 1, text: tick.text });
		} else {
			entry.target = 1;
			entry.text = tick.text;
		}
	}
	const fadeInFactor = 1 - Math.pow(1 - 0.16, dt / 16.67);
	const fadeOutFactor = 1 - Math.pow(1 - 0.12, dt / 16.67);
	let animating = false;
	for (const [key, entry] of fade) {
		if (instant) {
			entry.alpha = entry.target;
		} else {
			const factor = entry.target > entry.alpha ? fadeInFactor : fadeOutFactor;
			entry.alpha += (entry.target - entry.alpha) * factor;
		}
		if (entry.target === 1 && entry.alpha > 0.98) {
			entry.alpha = 1;
		}
		if (entry.target === 0 && entry.alpha < 0.03) {
			fade.delete(key);
			continue;
		}
		if (entry.alpha !== entry.target) {
			animating = true;
		}
	}
	return animating;
};

/**
 * An active-point marker dot for the hover overlay: an 8px dot with a 2px
 * surface ring, positioned by transform.
 */
/**
 * Per-glyph clip paths for the DOM hover dots and legend keys. The square is
 * inset toward equal fill area with the circle; the polygons are naturally
 * lighter than their box.
 *
 * The box is the ceiling here, not the polygon, so this family cannot hold the
 * canvas paths' equal-area contract — the shipped triangle paints 64% of the
 * circle's ink, and the star 39%. Each polygon does hold its canvas twin's
 * silhouette. The cross is the plus rotated in place rather than widened to
 * fill the box, so that pair carries equal ink here too.
 */
const POINT_SHAPE_CLIP_PATHS: Record<PointShape, string> = {
	circle: "circle(50%)",
	square: "inset(8%)",
	triangle: "polygon(50% 0%, 100% 100%, 0% 100%)",
	diamond: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
	"triangle-down": "polygon(0% 0%, 100% 0%, 50% 100%)",
	plus: "polygon(33.33% 0%, 66.67% 0%, 66.67% 33.33%, 100% 33.33%, 100% 66.67%, 66.67% 66.67%, 66.67% 100%, 33.33% 100%, 33.33% 66.67%, 0% 66.67%, 0% 33.33%, 33.33% 33.33%)",
	cross:
		"polygon(73.57% 2.86%, 97.14% 26.43%, 73.57% 50%, 97.14% 73.57%, 73.57% 97.14%, 50% 73.57%, 26.43% 97.14%, 2.86% 73.57%, 26.43% 50%, 2.86% 26.43%, 26.43% 2.86%, 50% 26.43%)",
	star: "polygon(50% 2.45%, 61.8% 38.77%, 100% 38.77%, 69.1% 61.23%, 80.9% 97.55%, 50% 75.1%, 19.1% 97.55%, 30.9% 61.23%, 0% 38.77%, 38.2% 38.77%)",
};

/**
 * A hover dot: a card-colored ring layer behind an inset fill layer, both
 * clipped to the series' glyph. A CSS border cannot follow a clip-path, so
 * the 2px surface ring is faked with same-shaped stacked layers.
 */
const createMarkerDot = (ownerDocument: Document): HTMLElement => {
	const dot = ownerDocument.createElement("div");
	dot.setAttribute("data-slot", "chart-active-point");
	dot.style.position = "absolute";
	dot.style.width = "12px";
	dot.style.height = "12px";
	dot.style.left = "-6px";
	dot.style.top = "-6px";
	// Why: the dot is two background colors, and forced colors mode replaces
	// both with the page background. The two layers inherit the opt-out.
	dot.style.forcedColorAdjust = "none";
	const ring = ownerDocument.createElement("div");
	ring.style.position = "absolute";
	ring.style.inset = "0";
	ring.style.backgroundColor = "var(--background-color-card)";
	const fill = ownerDocument.createElement("div");
	fill.style.position = "absolute";
	fill.style.inset = "2px";
	dot.appendChild(ring);
	dot.appendChild(fill);
	return dot;
};

/** The glyph and color each hover dot last wore, so an unchanged sync writes nothing. */
const markerDotStyles = new WeakMap<HTMLElement, { shape: PointShape; color: string }>();

/**
 * Sync a hover dot's glyph and fill color. The overlay syncs on every hover
 * frame, and the glyph and color rarely change, so a sync that matches the
 * last one skips the attribute and style writes.
 */
const styleMarkerDot = (dot: HTMLElement, shape: PointShape, color: string): void => {
	const last = markerDotStyles.get(dot);
	if (last?.shape === shape && last.color === color) {
		return;
	}
	markerDotStyles.set(dot, { shape, color });
	const clip = POINT_SHAPE_CLIP_PATHS[shape];
	dot.setAttribute("data-shape", shape);
	const [ring, fill] = dot.children;
	if (ring instanceof HTMLElement) {
		ring.style.clipPath = clip;
	}
	if (fill instanceof HTMLElement) {
		fill.style.clipPath = clip;
		fill.style.backgroundColor = color;
	}
};

const emptyBarRect = (): BarRect => ({
	x: 0,
	width: 0,
	baselineY: 0,
	valueY: 0,
	rounded: false,
	roundedBase: false,
});

const emptyHorizontalBarRect = (): HorizontalBarRect => ({
	y: 0,
	height: 0,
	baselineX: 0,
	valueX: 0,
	rounded: false,
	roundedBase: false,
});

/**
 * A zero-baseline stand-in for the lower boundary of an unstacked area.
 */
const zeroColumns = (columnCount: number): DecimatedColumns => {
	const zeros = new Float64Array(columnCount);
	return {
		columnCount,
		hasData: new Uint8Array(columnCount).fill(1),
		minValue: zeros,
		maxValue: zeros,
		inValue: zeros,
		outValue: zeros,
	};
};

export type {
	//,
	EngineCallbacks,
	EngineElements,
	HoverLayers,
};
export {
	//,
	ChartEngine,
	POINT_SHAPE_CLIP_PATHS,
};
