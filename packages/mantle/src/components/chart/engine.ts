import invariant from "tiny-invariant";
import type { ChartChromeColors } from "./colors.js";
import type { DecimatedColumns } from "./decimate.js";
import type { BandLayout } from "./scales.js";
import type { ChartStore } from "./store.js";
import type {
	ChartDatum,
	ChartDatumEvent,
	ChartOptions,
	HoverSnapshot,
	PointShape,
	SeriesColor,
	SeriesMark,
	SeriesMeta,
	SeriesSpec,
	XValue,
} from "./types.js";
import {
	observeThemeChanges,
	resolveChromeColors,
	resolveSeriesColor,
	resolveThroughProbe,
	themeSignature,
} from "./colors.js";
import { createBarTexturePattern, textureInkColor } from "./texture.js";
import { datumValue } from "./datum.js";
import { decimateColumns, shouldDecimate } from "./decimate.js";
import { formatNumber, formatXValue, hasTimeOfDay, tickFractionDigits } from "./format.js";
import { nearestIndex } from "./hit-test.js";
import type { Camera } from "./projection.js";
import {
	clampPitch,
	CUBE_CORNERS,
	CUBE_EDGES,
	normalizeToCube,
	projectionMatrix,
	projectPoint,
} from "./projection.js";
import {
	bandCenter,
	bandStart,
	computeBandLayout,
	invertBand,
	linearCoefficients,
	linearTicks,
	niceDomain,
	timeTickFormatter,
	timeTicks,
} from "./scales.js";
import type { BarRect, HorizontalBarRect, PlotRect } from "./renderer.js";
import {
	AXIS_FONT_SIZE,
	BAR_GAP,
	BAR_MAX_THICKNESS,
	drawAreaPath,
	drawAxisLabels,
	drawBars,
	drawBaseline,
	drawCubeAxisLabels,
	drawCubeFrame,
	drawDecimatedArea,
	drawDecimatedLine,
	drawGrid,
	drawHorizontalBars,
	drawLinePath,
	drawDepthSortedPoints,
	drawMarkers,
	drawReferenceLine,
	drawScatterPoints,
	drawVerticalBaseline,
	drawVerticalReferenceLine,
} from "./renderer.js";
import { computeStackBoundaries } from "./stack.js";
import type { StackBoundaries } from "./stack.js";
import { CHART_TWEEN_DURATION_MS, ChaseTween, PER_DATUM_TWEEN_LIMIT, ValueTween } from "./tween.js";
import { MARKER_RADIUS } from "./renderer.js";

/**
 * The imperative, framework-free chart engine. One instance backs one chart
 * Root for its lifetime:
 *
 * - owns the canvas (device-pixel sizing, DPR transform) and the paint loop
 * - ingests consumer rows into columnar Float64Arrays (NaN = gap)
 * - schedules on demand: every mutation coalesces into one rAF commit; an
 *   idle chart costs zero CPU (there is no always-on loop)
 * - decimates to min/max-per-pixel-column past 4 points per device pixel
 * - drives interruptible tweens (domains always; per-datum only ≤ 2,500 points
 *   with an identical x vector — streaming appends animate the domain instead)
 * - hit-tests hover/keyboard positions and publishes snapshots to the store;
 *   the crosshair/markers/hover band/tooltip are DOM overlay elements moved
 *   with transforms, so pointer moves never repaint the canvas
 * - resolves mantle color tokens once per theme (cached; invalidated by the
 *   documentElement theme attributes the ThemeProvider writes)
 *
 * React never renders inside the paint path; the engine never touches React.
 *
 * This module is internal shared implementation — not exported from the package.
 */

/**
 * The DOM overlay elements the Root binding hands to the engine. All are
 * absolutely positioned inside the plot wrapper and moved imperatively.
 */
type EngineElements = {
	/** The chart root (color-resolution host; consumer CSS var overrides apply here). */
	root: HTMLElement;
	canvas: HTMLCanvasElement;
	/** The plot wrapper the canvas fills; the resize-observation target. */
	plot: HTMLElement;
	/** Vertical crosshair hairline (line/area charts). */
	crosshair: HTMLElement;
	/** Hover band behind the active category (bar charts). */
	band: HTMLElement;
	/** Container for active-point marker dots (line/area charts). */
	markers: HTMLElement;
	/** The tooltip container; content is React-rendered, position is engine-written. */
	tooltip: HTMLElement;
};

/** The 3D frame's axis labels, painted after the marks clip is restored. */
type FrameLabels = {
	center: { x: number; y: number };
	axes: Array<{
		label: string;
		alpha: number;
		from: { x: number; y: number };
		to: { x: number; y: number };
	}>;
};

type EngineCallbacks = {
	onDatumActivate: ((event: ChartDatumEvent) => void) | null;
	onActiveIndexChange: ((index: number | null) => void) | null;
};

type ResolvedColors = {
	signature: string;
	series: Map<string, string>;
	/** The paint inputs (color + texture) the maps were resolved from, for staleness checks. */
	inputs: Map<string, string>;
	/** Rasterized pattern fills for textured bar series (no entry = solid fill). */
	barTextures: Map<string, CanvasPattern>;
	chrome: ChartChromeColors;
	fontFamily: string;
};

/**
 * The per-series inputs the resolved paint cache derives from — any change
 * (color or texture) must invalidate the cached colors and patterns.
 */
const seriesPaintInput = (meta: SeriesMeta): string => `${meta.colorInput}|${meta.texture}`;

const PART_NAME: Record<SeriesMark, string> = {
	bar: "BarChart.Bar",
	line: "LineChart.Line",
	area: "AreaChart.Area",
	scatter: "ScatterPlot.Point",
};

/** The pointer must land within this distance of a scatter point to hit it. */
const SCATTER_HIT_RADIUS = 24;
/** Drag farther than this before a 3D pointer-down counts as a rotation. */
const DRAG_THRESHOLD = 3;

const Y_TICK_COUNT = 5;
const PLOT_PADDING = 8;
const X_AXIS_BAND = 24;
const FALLBACK_AXIS_GUTTER = 40;

/** Width of the left-edge scroll-mask fade band, in CSS pixels. */
const EDGE_FADE_WIDTH = 40;
/** How long after the last window slide the left-edge fade lingers before decaying. */
const EDGE_FADE_LINGER_MS = 1000;

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

	#ctx: CanvasRenderingContext2D | null;
	#resizeObserver: ResizeObserver | null = null;
	#themeDisconnect: (() => void) | null = null;
	#tooltipResizeObserver: ResizeObserver | null = null;
	#dprCleanup: (() => void) | null = null;

	#cssWidth = 0;
	#cssHeight = 0;
	#dpr = 1;

	#rows: readonly ChartDatum[] = [];
	#rowCount = 0;
	#xs = new Float64Array(0);
	#xValues: XValue[] = [];
	#order: Int32Array | null = null;
	/** source index → view index; -1 for rows dropped at ingest. Built iff `#order` is. */
	#orderInverse: Int32Array | null = null;
	/** Any x value carries a time-of-day component (drives date label granularity). */
	#xHasTimeOfDay = false;
	#pendingIngest = false;
	#columns = new Map<string, Float64Array>();
	#valueMin = 0;
	#valueMax = 0;
	#stack: StackBoundaries | null = null;

	// Domains chase their targets (liveline-style exponential glide) so regular
	// retargets — streaming appends — read as continuous motion, never
	// ease-stop-jump ticks. Per-datum morphs and reveals stay fixed-duration.
	#yTween = new ChaseTween({ speed: 0.16 });
	#xTween = new ChaseTween({ speed: 0.2 });
	#valueTweens = new Map<string, ValueTween>();
	#revealTweens = new Map<string, ValueTween>();
	#hasIngested = false;
	#xLabelFade = new Map<number, { alpha: number; target: number; text: string }>();
	#yLabelFade = new Map<number, { alpha: number; target: number; text: string }>();
	#lastPaintTime = 0;

	#decimated = false;
	#decimationCache = new Map<string, { key: string; columns: DecimatedColumns }>();

	// Liveline-style left-edge scroll mask: streaming appends that drop the
	// oldest row hard-clip exiting marks at the plot edge while the chasing
	// domain opens a pulsing wedge there. While the window slides, marks fade
	// out through a band at the left edge so exits dissolve instead of popping.
	#edgeFade = { alpha: 0, target: 0 };
	#lastSlideAt = 0;
	#edgeFadeDecayTimer: ReturnType<typeof setTimeout> | null = null;
	#marksLayerCanvas: HTMLCanvasElement | null = null;

	#colors: ResolvedColors | null = null;

	#plot: PlotRect = { left: 0, top: 0, width: 0, height: 0 };
	#bandLayout: BandLayout | null = null;

	#zs = new Float64Array(0);
	#zDomain: [number, number] = [0, 1];
	#camera: Camera = { yaw: 0.65, pitch: -0.35 };
	// Dimension changes re-aim the camera (face-on for a line or plane, the
	// default tilt for the cube); a manual drag cancels the glide.
	#cameraChase = new ChaseTween({ speed: 0.12 });
	// Per-axis collapse factors [y, z] for the 3D dimensions morph: 1D collapses
	// the cloud onto the x axis, 2D onto the xy plane. Chased so dimension
	// changes glide like every other motion in the engine.
	#dimensionChase = new ChaseTween({ speed: 0.16 });
	#drag: { lastX: number; lastY: number; moved: boolean } | null = null;
	/**
	 * Whether the current press began on the overlay. Click semantics require
	 * down + up on the chart: a drag that started outside (text selection, a
	 * press on the legend) releasing over the plot must not activate.
	 */
	#pressed = false;
	#projected: {
		screenX: Float64Array;
		screenY: Float64Array;
		radius: Float64Array;
		seriesIndex: Int32Array;
		pointIndex: Int32Array;
		depths: Float64Array;
		count: number;
	} | null = null;
	/** Reusable back-to-front paint order for the 3D projection (see #paintScatter3d). */
	#depthOrder: Int32Array = new Int32Array(0);
	/** Reference-line colors resolved once per color signature (see #resolveReferenceColor). */
	#referenceColorCache = new Map<string, string>();
	#referenceColorSignature = "";
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
	#frame = 0;
	#destroyed = false;

	constructor(options: { kind: SeriesMark; elements: EngineElements; store: ChartStore }) {
		this.#kind = options.kind;
		this.#elements = options.elements;
		this.#store = options.store;
		this.#ctx = options.elements.canvas.getContext("2d");

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
			this.#schedule();
		};

		if (typeof ResizeObserver !== "undefined") {
			this.#resizeObserver = new ResizeObserver((entries) => {
				// Record only; never paint or mutate DOM synchronously inside the
				// observer callback (avoids resize-loop errors and layout thrash).
				const entry = entries[0];
				if (entry == null) {
					return;
				}
				this.#cssWidth = entry.contentRect.width;
				this.#cssHeight = entry.contentRect.height;
				this.#dpr = this.#currentDpr();
				this.#decimationCache.clear();
				// The cached hover pixel is in plot space; a resize moves every mark,
				// so drop it and let #updateOverlay recompute from the new projection
				// (a stale pixel would detach the marker/tooltip from its point).
				this.#activeScreen = null;
				this.#schedule();
			});
			this.#resizeObserver.observe(options.elements.plot);

			this.#tooltipResizeObserver = new ResizeObserver(() => {
				this.#tooltipSize = {
					width: this.#elements.tooltip.offsetWidth,
					height: this.#elements.tooltip.offsetHeight,
				};
				this.#scheduleOverlay();
			});
			this.#tooltipResizeObserver.observe(options.elements.tooltip);
		}

		const documentElement = options.elements.root.ownerDocument.documentElement;
		this.#themeDisconnect = observeThemeChanges(documentElement, () => {
			this.#colors = null;
			this.#schedule();
		});
		this.#watchDpr();
		this.#dimensionChase.jump([1, 1]);
	}

	destroy(): void {
		this.#destroyed = true;
		this.#resizeObserver?.disconnect();
		this.#tooltipResizeObserver?.disconnect();
		this.#themeDisconnect?.();
		this.#dprCleanup?.();
		this.#store.onSeriesChange = null;
		this.#store.onPresentationChange = null;
		if (this.#edgeFadeDecayTimer != null) {
			clearTimeout(this.#edgeFadeDecayTimer);
			this.#edgeFadeDecayTimer = null;
		}
		if (this.#frame !== 0) {
			cancelAnimationFrame(this.#frame);
		}
	}

	/**
	 * Browser zoom and monitor moves change devicePixelRatio without resizing
	 * the element. A resolution media query matching the CURRENT ratio fires
	 * once when it stops matching; re-arm at the new ratio each time.
	 */
	#watchDpr(): void {
		if (typeof matchMedia === "undefined" || this.#destroyed) {
			return;
		}
		this.#dprCleanup?.();
		const media = matchMedia(`(resolution: ${this.#currentDpr()}dppx)`);
		const onChange = (): void => {
			this.#dpr = this.#currentDpr();
			this.#decimationCache.clear();
			this.#schedule();
			this.#watchDpr();
		};
		media.addEventListener("change", onChange, { once: true });
		this.#dprCleanup = () => media.removeEventListener("change", onChange);
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
			const target = [options.dimensions >= 2 ? 1 : 0, options.dimensions >= 3 ? 1 : 0];
			const view = cameraViewFor(options.dimensions);
			if (this.#tweenDuration() === 0 || !this.#hasIngested) {
				// Snap before first paint (and under reduced motion) — a chart must
				// not mount mid-collapse.
				this.#dimensionChase.jump(target);
				this.#camera = view;
				this.#cameraChase.jump([view.yaw, view.pitch]);
			} else {
				// Unwind accumulated drag revolutions so the camera takes the short
				// way to the view instead of spinning back through every turn.
				const yawTarget =
					view.yaw + Math.round((this.#camera.yaw - view.yaw) / (Math.PI * 2)) * Math.PI * 2;
				this.#dimensionChase.aim(target, performance.now());
				this.#cameraChase.jump([this.#camera.yaw, this.#camera.pitch]);
				this.#cameraChase.aim([yawTarget, view.pitch], performance.now());
			}
		}
		if (
			previous.xKey !== options.xKey ||
			previous.xScale !== options.xScale ||
			previous.zKey !== options.zKey ||
			previous.stacked !== options.stacked ||
			previous.yDomain[0] !== options.yDomain[0] ||
			previous.yDomain[1] !== options.yDomain[1]
		) {
			this.#pendingIngest = true;
		}
		this.#schedule();
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
		if (this.#drag != null) {
			// 3D rotation drag: update the camera, suppress hover, repaint.
			const deltaX = cssX - this.#drag.lastX;
			const deltaY = cssY - this.#drag.lastY;
			if (this.#drag.moved || Math.abs(deltaX) + Math.abs(deltaY) > DRAG_THRESHOLD) {
				this.#drag.moved = true;
				this.#camera = {
					yaw: this.#camera.yaw + deltaX * 0.008,
					pitch: clampPitch(this.#camera.pitch + deltaY * 0.008),
				};
				this.#cameraChase.jump([this.#camera.yaw, this.#camera.pitch]);
				this.#drag.lastX = cssX;
				this.#drag.lastY = cssY;
				this.#setActive(null, { viaKeyboard: false, notify: false });
				this.#schedule();
			}
			return;
		}
		this.#pointerX = cssX;
		this.#pointerY = cssY;
		if (this.#kind === "scatter") {
			const hit = this.#scatterHitAt(cssX, cssY);
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
		if (this.#is3d()) {
			this.#drag = { lastX: cssX, lastY: cssY, moved: false };
			return;
		}
		this.handlePointerMove(cssX, cssY);
	}

	/**
	 * Pointer-up activates the datum under the pointer — but only when the
	 * press began on the overlay (and never when it was rotating the 3D
	 * camera). Leaving the plot mid-press cancels, preserving
	 * drag-away-to-cancel.
	 */
	handlePointerUp(cssX: number, cssY: number): void {
		const drag = this.#drag;
		this.#drag = null;
		const pressed = this.#pressed;
		this.#pressed = false;
		if (drag != null) {
			if (drag.moved) {
				return;
			}
			// A tap in 3D: inspect, then activate.
			this.handlePointerMove(cssX, cssY);
		}
		if (!pressed) {
			return;
		}
		this.handleActivate(cssX, cssY);
	}

	handlePointerLeave(): void {
		this.#pointerX = null;
		this.#pointerY = null;
		this.#drag = null;
		this.#pressed = false;
		this.#activeSeriesKey = null;
		this.#activeScreen = null;
		this.#setActive(null, { viaKeyboard: false, notify: true });
	}

	handleActivate(cssX: number | null, cssY: number | null): void {
		const index = this.#effectiveIndex();
		if (index == null) {
			return;
		}
		const sourceIndex = this.#toSourceIndex(index);
		const datum = this.#rows[sourceIndex];
		if (datum == null) {
			return;
		}
		const dataKey = ((): string | null => {
			if (this.#kind === "scatter") {
				return this.#activeSeriesKey;
			}
			if (cssX == null || cssY == null) {
				return null;
			}
			return this.#nearestSeries(index, cssX, cssY);
		})();
		this.#callbacks.onDatumActivate?.({
			// Public indexes address the consumer's data array, not the sorted view.
			index: sourceIndex,
			xValue: this.#xValues[index] ?? "",
			datum,
			dataKey,
		});
	}

	/**
	 * Keyboard interaction on the focusable overlay. Returns `true` when the
	 * key was handled (the caller prevents default). Arrow strides widen to one
	 * device-pixel column when decimated so dense charts stay traversable.
	 */
	handleKeyDown(key: string): boolean {
		if (this.#rowCount === 0) {
			return false;
		}
		const last = this.#rowCount - 1;
		const current = this.#effectiveIndex();
		const stride = this.#decimated
			? Math.max(1, Math.floor(this.#rowCount / Math.max(1, this.#plot.width * this.#dpr)))
			: 1;
		const pageStride = Math.max(1, Math.floor(this.#rowCount / 10));

		const target = (() => {
			switch (key) {
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
					return null;
				}
				default: {
					return undefined;
				}
			}
		})();

		if (target === undefined) {
			if (key === "Enter" || key === " ") {
				this.handleActivate(null, null);
				return true;
			}
			return false;
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
	 * Force color re-resolution (e.g. after consumer-driven CSS variable changes).
	 */
	invalidateColors(): void {
		this.#colors = null;
		this.#schedule();
	}

	/**
	 * Finish every in-flight motion at its target immediately (animate switched
	 * off, or reduced motion arriving mid-glide).
	 */
	#snapAllMotion(): void {
		this.#yTween.jump(this.#targetYDomain());
		this.#xTween.jump(this.#targetXDomain());
		this.#dimensionChase.jump([
			this.#options.dimensions >= 2 ? 1 : 0,
			this.#options.dimensions >= 3 ? 1 : 0,
		]);
		const view = cameraViewFor(this.#options.dimensions);
		this.#camera = view;
		this.#cameraChase.jump([view.yaw, view.pitch]);
		for (const tween of this.#valueTweens.values()) {
			tween.snap();
		}
		for (const tween of this.#revealTweens.values()) {
			tween.snap();
		}
		this.#edgeFade.alpha = this.#edgeFade.target;
		this.#schedule();
	}

	// ---- data ingest ----------------------------------------------------------

	#ingest(): void {
		const rows = this.#rows;
		const { xKey, xScale } = this.#options;
		const specs = this.#store.seriesSpecs();
		this.#decimationCache.clear();
		const previousXs = this.#xs;

		// x values + sort order (continuous scales require ascending x; rows whose
		// x cannot be coerced — null/unparseable dates — are dropped entirely, since
		// a point with no position would poison the domain into NaN).
		if (xScale === "band" || xScale === "point") {
			const count = rows.length;
			const xs = new Float64Array(count);
			const xValues: XValue[] = Array.from({ length: count }, () => "");
			// `undefined` means the x key is absent from the row: when EVERY row
			// misses it that is an xKey typo, and it must fail fast the way a
			// dataKey typo does — not render a full axis of "undefined" categories.
			let foundX = false;
			for (let index = 0; index < count; index++) {
				const row = rows[index];
				const raw = row == null ? undefined : datumValue(row, xKey);
				if (raw !== undefined) {
					foundX = true;
				}
				xValues[index] =
					typeof raw === "string" || typeof raw === "number" || raw instanceof Date
						? raw
						: String(raw);
				xs[index] = index;
			}
			invariant(
				count === 0 || foundX,
				`${this.#rootName()} xKey "${xKey}" does not match any key in the provided data. Available keys: ${Object.keys(rows[0] ?? {}).join(", ")}.`,
			);
			this.#order = null;
			this.#orderInverse = null;
			this.#rowCount = count;
			this.#xs = xs;
			this.#xValues = xValues;
		} else {
			const entries: Array<{ source: number; x: number }> = [];
			// `undefined` = key absent (an all-rows absence is a typo, below);
			// `null` = an explicit per-row gap that drops silently; a present but
			// uncoercible value that leaves NO coercible rows at all means the
			// data cannot live on this scale — silence would render a blank chart
			// with zero diagnostics.
			let sawXKey = false;
			let sawNonNullish = false;
			let sawCoercible = false;
			for (let index = 0; index < rows.length; index++) {
				const row = rows[index];
				const raw = row == null ? undefined : datumValue(row, xKey);
				if (raw !== undefined) {
					sawXKey = true;
				}
				if (raw != null) {
					sawNonNullish = true;
				}
				// Only finite x survives: Infinity (like NaN and invalid dates) has
				// no position and would poison the domain into NaN, blanking the chart.
				const x = toEpochOrNumber(raw, xScale === "time");
				if (Number.isFinite(x)) {
					entries.push({ source: index, x });
					sawCoercible = true;
				}
			}
			invariant(
				rows.length === 0 || sawXKey,
				`${this.#rootName()} xKey "${xKey}" does not match any key in the provided data. Available keys: ${Object.keys(rows[0] ?? {}).join(", ")}.`,
			);
			invariant(
				!sawNonNullish || sawCoercible,
				`${this.#rootName()} could not read any "${xKey}" values as ${xScale === "time" ? "dates" : "numbers"} for the "${xScale}" x scale — check the xScale and the data types.`,
			);
			// Sorting once at ingest keeps decimation and hit-testing correct for
			// out-of-order API responses; the sorted view is the engine's contract.
			let sortedAscending = true;
			for (let index = 1; index < entries.length; index++) {
				if ((entries[index]?.x ?? 0) < (entries[index - 1]?.x ?? 0)) {
					sortedAscending = false;
					break;
				}
			}
			const ordered = sortedAscending ? entries : entries.toSorted((a, b) => a.x - b.x);
			const count = ordered.length;
			const xs = new Float64Array(count);
			const xValues: XValue[] = Array.from({ length: count }, () => "");
			let identityOrder = count === rows.length;
			const order = new Int32Array(count);
			for (let index = 0; index < count; index++) {
				const entry = ordered[index];
				if (entry == null) {
					continue;
				}
				xs[index] = entry.x;
				if (xScale === "time") {
					xValues[index] = new Date(entry.x);
				} else {
					xValues[index] = entry.x;
				}
				order[index] = entry.source;
				if (entry.source !== index) {
					identityOrder = false;
				}
			}
			if (identityOrder) {
				this.#order = null;
				this.#orderInverse = null;
			} else {
				this.#order = order;
				// The inverse (source → view) backs the public index contract:
				// consumers speak in their data array's indexes; -1 marks dropped rows.
				const inverse = new Int32Array(rows.length).fill(-1);
				for (let index = 0; index < count; index++) {
					const source = order[index];
					if (source != null) {
						inverse[source] = index;
					}
				}
				this.#orderInverse = inverse;
			}
			this.#rowCount = count;
			this.#xs = xs;
			this.#xValues = xValues;
		}
		// Date label granularity is a dataset property, not a sample property:
		// the midnight point inside an hourly series must keep its time of day.
		let xHasTime = false;
		for (const value of this.#xValues) {
			if (value instanceof Date && hasTimeOfDay(value)) {
				xHasTime = true;
				break;
			}
		}
		this.#xHasTimeOfDay = xHasTime;

		// Left-edge scroll mask activation. The streaming signature is a window
		// slide: the first x advanced while the last kept up. A jump backward or
		// an unrelated data swap deactivates immediately; an unchanged x vector
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
			last >= previousLast
		) {
			this.#edgeFade.target = 1;
			this.#lastSlideAt = performance.now();
		} else if (first !== previousFirst || last !== previousLast) {
			this.#edgeFade.target = 0;
		}
		const count = this.#rowCount;

		// Per-datum tweens are only meaningful when old and new points share the
		// same x positions — index-aligned interpolation across a shifted window
		// would morph each point into its neighbor's value.
		let sameXVector = previousXs.length === count && count <= PER_DATUM_TWEEN_LIMIT;
		if (sameXVector) {
			for (let index = 0; index < count; index++) {
				if (previousXs[index] !== this.#xs[index]) {
					sameXVector = false;
					break;
				}
			}
		}

		// Per-series columns (NaN = gap) + extent + fail-fast key validation.
		const previousColumns = this.#columns;
		this.#columns = new Map();
		let min = Number.POSITIVE_INFINITY;
		let max = Number.NEGATIVE_INFINITY;
		for (const spec of specs) {
			const values = new Float64Array(count);
			let found = false;
			for (let index = 0; index < count; index++) {
				const originalIndex = this.#order == null ? index : (this.#order[index] ?? index);
				const row = rows[originalIndex];
				const raw = row == null ? undefined : datumValue(row, spec.dataKey);
				if (raw === undefined) {
					values[index] = Number.NaN;
					continue;
				}
				found = true;
				// Non-finite values (an Infinity from an upstream divide-by-zero)
				// render as gaps — fed into the extent they would nice the domain
				// into NaN and blank the entire chart.
				const value = typeof raw === "number" && Number.isFinite(raw) ? raw : Number.NaN;
				values[index] = value;
				if (!Number.isNaN(value)) {
					if (value < min) {
						min = value;
					}
					if (value > max) {
						max = value;
					}
				}
			}
			invariant(
				count === 0 || found,
				`${PART_NAME[spec.mark]} dataKey "${spec.dataKey}" does not match any key in the provided data. Available keys: ${Object.keys(rows[0] ?? {}).join(", ")}.`,
			);
			this.#columns.set(spec.dataKey, values);
		}
		this.#valueMin = min === Number.POSITIVE_INFINITY ? 0 : min;
		this.#valueMax = max === Number.NEGATIVE_INFINITY ? 0 : max;

		// 3D scatter: the depth column, sorted-aligned like every series column.
		const zKey = this.#options.zKey;
		if (this.#kind === "scatter" && zKey != null) {
			const zs = new Float64Array(count);
			let zMin = Number.POSITIVE_INFINITY;
			let zMax = Number.NEGATIVE_INFINITY;
			let zFound = false;
			for (let index = 0; index < count; index++) {
				const originalIndex = this.#order == null ? index : (this.#order[index] ?? index);
				const row = rows[originalIndex];
				const raw = row == null ? undefined : datumValue(row, zKey);
				if (raw !== undefined) {
					zFound = true;
				}
				const value = typeof raw === "number" && Number.isFinite(raw) ? raw : Number.NaN;
				zs[index] = value;
				if (!Number.isNaN(value)) {
					if (value < zMin) {
						zMin = value;
					}
					if (value > zMax) {
						zMax = value;
					}
				}
			}
			invariant(
				count === 0 || zFound,
				`ScatterPlot.Root zKey "${zKey}" does not match any key in the provided data. Available keys: ${Object.keys(rows[0] ?? {}).join(", ")}.`,
			);
			this.#zs = zs;
			this.#zDomain =
				zMin === Number.POSITIVE_INFINITY ? [0, 1] : niceDomain([zMin, zMax], Y_TICK_COUNT);
		} else {
			this.#zs = new Float64Array(0);
		}
		this.#projected = null;
		// A fresh ingest re-projects every point; the cached hover pixel would
		// otherwise strand the marker on the pre-ingest projection.
		this.#activeScreen = null;

		this.#stack = this.#options.stacked
			? computeStackBoundaries(
					specs.map((spec) => this.#columns.get(spec.dataKey) ?? new Float64Array(0)),
				)
			: null;

		this.#decimated = shouldDecimate({
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

		this.#retargetTweens(specs, previousColumns, sameXVector);

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
		previousColumns: Map<string, Float64Array>,
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
			this.#xTween.aim(this.#targetXDomain(), now);
		}

		// Per-datum tweens: only below the limit and only when the x vector is
		// unchanged — index-aligned interpolation across a shifted window would
		// morph each point into its neighbor's value.
		const perDatum = this.#rowCount > 0 && this.#rowCount <= PER_DATUM_TWEEN_LIMIT && sameXVector;
		const activeKeys = new Set<string>();
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
			const hadPrevious = previousColumns.has(spec.dataKey);
			if (this.#stack != null) {
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
			} else {
				retargetBuffer(
					spec.dataKey,
					this.#columns.get(spec.dataKey) ?? new Float64Array(0),
					hadPrevious,
				);
			}

			// Enter reveal: once per series, on its first non-empty data.
			if (!this.#revealTweens.has(spec.dataKey) && this.#rowCount > 0) {
				const reveal = new ValueTween();
				reveal.retarget([0], { duration: 0, now });
				reveal.retarget([1], { duration: this.#tweenDuration(), now });
				this.#revealTweens.set(spec.dataKey, reveal);
			}
		});

		for (const key of this.#valueTweens.keys()) {
			if (!activeKeys.has(key)) {
				this.#valueTweens.delete(key);
			}
		}
	}

	#tweenDuration(): number {
		if (!this.#options.animate) {
			return 0;
		}
		if (
			typeof matchMedia !== "undefined" &&
			matchMedia("(prefers-reduced-motion: reduce)").matches
		) {
			return 0;
		}
		return CHART_TWEEN_DURATION_MS;
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
		const niced = niceDomain([min, max], Y_TICK_COUNT);
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
	#horizontalBars(): boolean {
		return this.#kind === "bar" && this.#options.orientation === "horizontal";
	}

	/** The public Root part name for error messages, e.g. `"BarChart.Root"`. */
	#rootName(): string {
		return `${PART_NAME[this.#kind].split(".")[0] ?? "Chart"}.Root`;
	}

	/**
	 * The offscreen layer marks paint through while the left-edge fade is
	 * active — a destination-out erase on the main canvas would punch out the
	 * gridlines beneath the marks. Returns `null` when a 2D context is
	 * unavailable (test DOMs); callers fall back to painting directly,
	 * unmasked.
	 */
	#marksLayer(
		deviceWidth: number,
		deviceHeight: number,
	): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
		let canvas = this.#marksLayerCanvas;
		if (canvas == null) {
			canvas = this.#elements.canvas.ownerDocument.createElement("canvas");
			this.#marksLayerCanvas = canvas;
		}
		if (canvas.width !== deviceWidth || canvas.height !== deviceHeight) {
			canvas.width = deviceWidth;
			canvas.height = deviceHeight;
		}
		const ctx = canvas.getContext("2d");
		if (ctx == null) {
			return null;
		}
		return { canvas, ctx };
	}

	// ---- scheduling + paint ---------------------------------------------------

	/** Schedule a full canvas repaint (plus overlay sync) on the next frame. */
	#schedule(): void {
		this.#needsPaint = true;
		this.#request();
	}

	/**
	 * Schedule only the DOM overlay sync (crosshair/band/markers/tooltip
	 * transforms). This is the hover path — pointer moves never repaint the
	 * canvas.
	 */
	#scheduleOverlay(): void {
		this.#request();
	}

	#request(): void {
		if (this.#scheduled || this.#destroyed) {
			return;
		}
		this.#scheduled = true;
		this.#frame = requestAnimationFrame(() => {
			this.#scheduled = false;
			this.#frame = 0;
			this.#commit();
		});
	}

	#commit(): void {
		if (this.#destroyed) {
			return;
		}
		this.flushIngest();
		if (this.#needsPaint) {
			this.#needsPaint = false;
			const now = performance.now();
			let animating = false;
			animating = this.#yTween.tick(now) || animating;
			animating = this.#xTween.tick(now) || animating;
			for (const tween of this.#valueTweens.values()) {
				animating = tween.tick(now) || animating;
			}
			for (const tween of this.#revealTweens.values()) {
				animating = tween.tick(now) || animating;
			}
			animating = this.#dimensionChase.tick(now) || animating;
			if (this.#cameraChase.tick(now)) {
				animating = true;
				const view = this.#cameraChase.values();
				this.#camera = { yaw: view[0] ?? this.#camera.yaw, pitch: view[1] ?? this.#camera.pitch };
			}

			this.#resolveColorsIfNeeded();
			this.#layout();
			animating = this.#paint(now) || animating;

			if (animating) {
				this.#schedule();
			}
		}
		this.#updateOverlay();
	}

	#currentDpr(): number {
		if (typeof devicePixelRatio === "number" && devicePixelRatio > 0) {
			return Math.min(devicePixelRatio, 3);
		}
		return 1;
	}

	#resolveColorsIfNeeded(): void {
		const root = this.#elements.root;
		// Pattern tiles rasterize at the device pixel ratio, so a dpr change
		// (zoom, monitor move) re-resolves alongside theme changes. Orientation is
		// in the key too: the "perpendicular" texture rung flips with the bars, so
		// a runtime orientation change must regenerate the cached patterns.
		const signature = `${themeSignature(root.ownerDocument.documentElement)}|${this.#dpr}|${this.#options.orientation}`;
		if (this.#colors?.signature === signature) {
			return;
		}
		const view = root.ownerDocument.defaultView;
		if (view == null) {
			return;
		}
		const ctx = this.#ctx;
		const series = new Map<string, string>();
		const inputs = new Map<string, string>();
		const barTextures = new Map<string, CanvasPattern>();
		for (const meta of this.#store.seriesMeta()) {
			const resolved = resolveSeriesColor(root, meta.colorInput);
			series.set(meta.dataKey, resolved);
			inputs.set(meta.dataKey, seriesPaintInput(meta));
			if (ctx != null && meta.mark === "bar" && meta.texture !== "solid") {
				const pattern = createBarTexturePattern(ctx, {
					texture: meta.texture,
					color: resolved,
					ink: resolveThroughProbe(root, textureInkColor(resolved)),
					devicePixelRatio: this.#dpr,
					orientation: this.#options.orientation,
				});
				if (pattern != null) {
					barTextures.set(meta.dataKey, pattern);
				}
			}
		}
		this.#colors = {
			signature,
			series,
			inputs,
			barTextures,
			chrome: resolveChromeColors(root),
			fontFamily: view.getComputedStyle(root).fontFamily || "sans-serif",
		};
	}

	/**
	 * Resolve a reference-line color, cached per color input and invalidated with
	 * the theme/dpr color signature. A reference line paints on every animation
	 * frame, so resolving through the DOM probe each time would force a style
	 * recalc inside the paint loop.
	 */
	#resolveReferenceColor(input: SeriesColor): string {
		const signature = this.#colors?.signature ?? "";
		if (signature !== this.#referenceColorSignature) {
			this.#referenceColorCache.clear();
			this.#referenceColorSignature = signature;
		}
		const cached = this.#referenceColorCache.get(input);
		if (cached != null) {
			return cached;
		}
		const resolved = resolveSeriesColor(this.#elements.root, input);
		this.#referenceColorCache.set(input, resolved);
		return resolved;
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
		const top = PLOT_PADDING;
		const bottom = bottomAxis ? X_AXIS_BAND : PLOT_PADDING;
		const height = Math.max(0, this.#cssHeight - top - bottom);
		// Publish top/height (which don't depend on the left gutter) before
		// measuring the gutter: the horizontal category stride in #xTicks()
		// budgets labels against the category-axis pixel extent (plot.height when
		// horizontal). Measuring against a stale/zero previous plot would size the
		// gutter to a single label and clip wide category names off the left edge
		// on the first paint (and permanently under reduced motion, where no
		// follow-up frame re-lays-out).
		this.#plot = {
			left: PLOT_PADDING,
			top,
			width: Math.max(0, this.#cssWidth - PLOT_PADDING * 2),
			height,
		};
		let left = PLOT_PADDING;
		if (leftAxis) {
			left = FALLBACK_AXIS_GUTTER;
			const ctx = this.#ctx;
			if (ctx != null && this.#colors != null) {
				ctx.font = `${AXIS_FONT_SIZE}px ${this.#colors.fontFamily}`;
				let widest = 0;
				// The gutter holds whichever labels the orientation puts on the left:
				// value ticks when vertical, category names when horizontal.
				const labels = horizontal
					? this.#xTicks().map((tick) => tick.text)
					: this.#yTicks().map((tick) => tick.text);
				for (const text of labels) {
					const width = ctx.measureText(text).width;
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
			width: Math.max(0, this.#cssWidth - left - PLOT_PADDING),
			height,
		};
		// The category band lays out along whichever pixel axis carries categories:
		// x when vertical, y when horizontal.
		const bandRangeStart = horizontal ? this.#plot.top : this.#plot.left;
		const bandRangeEnd = horizontal
			? this.#plot.top + this.#plot.height
			: this.#plot.left + this.#plot.width;
		if (this.#options.xScale === "band") {
			this.#bandLayout = computeBandLayout({
				count: this.#rowCount,
				rangeStart: bandRangeStart,
				rangeEnd: bandRangeEnd,
				paddingInner: 0.2,
				paddingOuter: 0.1,
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

		this.#decimated = shouldDecimate({
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
		const ticks = linearTicks(
			[domain[0] ?? 0, domain[1] ?? 1],
			snapshot.yAxis?.tickCount ?? Y_TICK_COUNT,
		);
		const format = snapshot.yAxis?.tickFormat;
		// Precision follows the tick step, so small-magnitude domains (error
		// rates) never collapse neighboring labels into identical "0"s.
		const digits =
			ticks.length > 1
				? tickFractionDigits(Math.abs((ticks[1] ?? 0) - (ticks[0] ?? 0)))
				: undefined;
		return ticks.map((value) => ({
			value,
			text:
				format == null
					? formatNumber(value, digits == null ? undefined : { maximumFractionDigits: digits })
					: format(value),
		}));
	}

	#xTicks(): Array<{ index: number | null; value: number; text: string }> {
		const snapshot = this.#store.getSnapshot();
		const format = snapshot.xAxis?.tickFormat;
		if (this.#bandLayout != null) {
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
				ticks.push({
					index,
					value: index,
					text:
						format == null
							? formatXValue(value, { datasetHasTimeOfDay: this.#xHasTimeOfDay })
							: format(value),
				});
			}
			return ticks;
		}
		const domain = this.#xTween.values();
		const range: [number, number] = [domain[0] ?? 0, domain[1] ?? 1];
		const count = snapshot.xAxis?.tickCount ?? Math.max(2, Math.floor(this.#plot.width / 90));
		if (this.#options.xScale === "time") {
			const defaultFormat = timeTickFormatter(range);
			return timeTicks(range, count).map((epoch) => ({
				index: null,
				value: epoch,
				text: format == null ? defaultFormat(epoch) : format(new Date(epoch)),
			}));
		}
		const ticks = linearTicks(range, count);
		const digits =
			ticks.length > 1
				? tickFractionDigits(Math.abs((ticks[1] ?? 0) - (ticks[0] ?? 0)))
				: undefined;
		return ticks.map((value) => ({
			index: null,
			value,
			text:
				format == null
					? formatNumber(value, digits == null ? undefined : { maximumFractionDigits: digits })
					: format(value),
		}));
	}

	#paint(now: number): boolean {
		const ctx = this.#ctx;
		const colors = this.#colors;
		if (ctx == null || colors == null || this.#cssWidth <= 0 || this.#cssHeight <= 0) {
			return false;
		}
		const paintDt = Math.min(50, Math.max(0, now - this.#lastPaintTime));
		this.#lastPaintTime = now;
		const canvas = this.#elements.canvas;
		const deviceWidth = Math.round(this.#cssWidth * this.#dpr);
		const deviceHeight = Math.round(this.#cssHeight * this.#dpr);
		if (canvas.width !== deviceWidth || canvas.height !== deviceHeight) {
			// Setting the backing store clears the canvas — only touch it on change.
			canvas.width = deviceWidth;
			canvas.height = deviceHeight;
		}
		ctx.setTransform(this.#dpr, 0, 0, this.#dpr, 0, 0);
		ctx.clearRect(0, 0, this.#cssWidth, this.#cssHeight);

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
		const instantLabels = this.#tweenDuration() === 0;
		const desiredXTicks = is3d ? [] : this.#desiredXTicks(ctx, colors.fontFamily);
		const desiredYTicks = is3d ? [] : this.#desiredValueTicks(ctx, colors.fontFamily);
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
		if (snapshot.grid != null && !is3d) {
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
		}

		// marks — through an offscreen layer while the left-edge fade is active,
		// so the destination-out erase touches only marks, never the grid
		// painted beneath them.
		const fadeWidth = Math.min(EDGE_FADE_WIDTH, plot.width * 0.25);
		let marksCtx = ctx;
		let marksLayer: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;
		if (edgeFade.alpha > 0.01 && fadeWidth > 1) {
			marksLayer = this.#marksLayer(deviceWidth, deviceHeight);
			if (marksLayer != null) {
				marksLayer.ctx.setTransform(this.#dpr, 0, 0, this.#dpr, 0, 0);
				marksLayer.ctx.clearRect(0, 0, this.#cssWidth, this.#cssHeight);
				marksCtx = marksLayer.ctx;
			}
		}
		marksCtx.save();
		marksCtx.beginPath();
		marksCtx.rect(plot.left, plot.top, plot.width, plot.height + 1);
		marksCtx.clip();
		let frameLabels: FrameLabels | null = null;
		if (this.#kind === "bar") {
			if (horizontal) {
				this.#paintHorizontalBars(marksCtx, specs);
			} else {
				this.#paintBars(marksCtx, specs, yCo);
			}
		} else if (this.#kind === "scatter") {
			frameLabels = this.#paintScatter(marksCtx, specs, yCo);
		} else {
			this.#paintLinesOrAreas(marksCtx, specs, yCo);
		}
		marksCtx.restore();
		if (marksLayer != null) {
			// Liveline's scroll mask: erase the layer through a horizontal alpha
			// ramp at the plot's left edge, then composite it over the grid.
			marksCtx.save();
			marksCtx.globalCompositeOperation = "destination-out";
			const eraseGradient = marksCtx.createLinearGradient(plot.left, 0, plot.left + fadeWidth, 0);
			eraseGradient.addColorStop(0, `rgba(0, 0, 0, ${edgeFade.alpha})`);
			eraseGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
			marksCtx.fillStyle = eraseGradient;
			marksCtx.fillRect(plot.left, plot.top, fadeWidth, plot.height + 1);
			marksCtx.restore();
			ctx.drawImage(marksLayer.canvas, 0, 0, this.#cssWidth, this.#cssHeight);
		}

		// 3D frame labels: after the clip so edge-adjacent labels stay whole.
		if (frameLabels != null) {
			drawCubeAxisLabels(ctx, {
				textColor: colors.chrome.tickText,
				fontFamily: colors.fontFamily,
				plot,
				center: frameLabels.center,
				axes: frameLabels.axes,
			});
		}

		// baseline (bars grow from a single baseline; keep it visible) — a vertical
		// baseline at value zero when horizontal, a horizontal one otherwise.
		if (this.#kind === "bar" && this.#rowCount > 0) {
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
				reference.color == null
					? colors.chrome.reference
					: this.#resolveReferenceColor(reference.color);
			if (horizontal) {
				drawVerticalReferenceLine(ctx, {
					plot,
					color,
					textColor: colors.chrome.tickText,
					x: position,
					label: reference.label,
					fontFamily: colors.fontFamily,
				});
			} else {
				drawReferenceLine(ctx, {
					plot,
					color,
					textColor: colors.chrome.tickText,
					y: position,
					label: reference.label,
					fontFamily: colors.fontFamily,
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
				fontFamily: colors.fontFamily,
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
	#desiredXTicks(
		ctx: CanvasRenderingContext2D,
		fontFamily: string,
	): Array<{ key: number; text: string }> {
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
			const half = horizontal ? (AXIS_FONT_SIZE + 4) / 2 : ctx.measureText(tick.text).width / 2;
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
	 * The value ticks that SHOULD be visible this frame. Vertical charts stack
	 * them in the left gutter (a handful of {@link Y_TICK_COUNT} labels that don't
	 * collide), so they pass through unthinned. Horizontal charts place them along
	 * the x axis where — like the category axis when vertical — they collide by
	 * measured width, so thin them by width there (skip, never rotate).
	 */
	#desiredValueTicks(
		ctx: CanvasRenderingContext2D,
		fontFamily: string,
	): Array<{ key: number; text: string }> {
		const ticks = this.#yTicks();
		if (!this.#horizontalBars()) {
			return ticks.map((tick) => ({ key: tick.value, text: tick.text }));
		}
		ctx.font = `${AXIS_FONT_SIZE}px ${fontFamily}`;
		const valueCo = this.#valueCoefficients();
		const desired: Array<{ key: number; text: string }> = [];
		let previousEnd = Number.NEGATIVE_INFINITY;
		for (const tick of ticks) {
			const position = tick.value * valueCo.k + valueCo.b;
			const half = ctx.measureText(tick.text).width / 2;
			if (position - half < previousEnd + 8) {
				continue;
			}
			previousEnd = position + half;
			desired.push({ key: tick.value, text: tick.text });
		}
		return desired;
	}

	#paintedValues(spec: SeriesSpec, boundary: "value" | "lower" | "upper"): Float64Array {
		const key = boundary === "value" ? spec.dataKey : `${spec.dataKey}:${boundary}`;
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
			return this.#columns.get(spec.dataKey) ?? new Float64Array(0);
		}
		const specIndex = this.#store
			.seriesSpecs()
			.findIndex((entry) => entry.dataKey === spec.dataKey);
		const rows = boundary === "lower" ? this.#stack?.lower : this.#stack?.upper;
		return rows?.[specIndex] ?? new Float64Array(0);
	}

	#reveal(dataKey: string): number {
		const tween = this.#revealTweens.get(dataKey);
		return tween?.values()[0] ?? 1;
	}

	#paintBars(
		ctx: CanvasRenderingContext2D,
		specs: readonly SeriesSpec[],
		yCo: { k: number; b: number },
	): void {
		const layout = this.#bandLayout;
		const colors = this.#colors;
		if (layout == null || colors == null || this.#rowCount === 0 || specs.length === 0) {
			return;
		}
		const baselineY = 0 * yCo.k + yCo.b;
		const stacked = this.#stack != null;
		const groupCount = stacked ? 1 : specs.length;
		const gap =
			layout.bandwidth >= 8 * groupCount ? BAR_GAP : layout.bandwidth >= 3 * groupCount ? 1 : 0;
		const slotWidth = (layout.bandwidth - gap * (groupCount - 1)) / groupCount;
		const barWidth = Math.min(BAR_MAX_THICKNESS, slotWidth);

		specs.forEach((spec, seriesIndex) => {
			const reveal = this.#reveal(spec.dataKey);
			const rects: BarRect[] = [];
			const lower = stacked ? this.#paintedValues(spec, "lower") : null;
			const upper = stacked
				? this.#paintedValues(spec, "upper")
				: this.#paintedValues(spec, "value");
			const isOutermost = seriesIndex === specs.length - 1;
			for (let index = 0; index < this.#rowCount; index++) {
				const upperValue = upper[index] ?? Number.NaN;
				if (Number.isNaN(upperValue)) {
					continue;
				}
				const lowerValue = lower == null ? 0 : (lower[index] ?? 0);
				const slotStart = stacked
					? bandStart(layout, index) + (layout.bandwidth - barWidth) / 2
					: bandStart(layout, index) +
						(layout.bandwidth - (slotWidth * groupCount + gap * (groupCount - 1))) / 2 +
						seriesIndex * (slotWidth + gap) +
						(slotWidth - barWidth) / 2;
				let baseY = Number.isNaN(lowerValue) ? baselineY : lowerValue * yCo.k + yCo.b;
				let valueY = upperValue * yCo.k + yCo.b;
				// Enter reveal: grow from the baseline.
				valueY = baseY + (valueY - baseY) * reveal;
				// 2px surface gap between stacked segments, carved entirely from the
				// outer segment's baseline side (geometric, not painted).
				if (stacked && lower != null && seriesIndex > 0 && !Number.isNaN(lowerValue) && gap > 0) {
					baseY -= Math.sign(baseY - valueY) * gap;
				}
				rects.push({
					x: slotStart,
					width: barWidth,
					baselineY: baseY,
					valueY,
					rounded: !stacked || isOutermost,
				});
			}
			// Textured series paint with their cached pattern; a missing pattern
			// (solid texture, or tile rasterization unavailable) falls back to the
			// solid series color so bars never vanish.
			drawBars(ctx, {
				fill:
					colors.barTextures.get(spec.dataKey) ?? colors.series.get(spec.dataKey) ?? "currentColor",
				rects,
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
	#paintHorizontalBars(ctx: CanvasRenderingContext2D, specs: readonly SeriesSpec[]): void {
		const layout = this.#bandLayout;
		const colors = this.#colors;
		if (layout == null || colors == null || this.#rowCount === 0 || specs.length === 0) {
			return;
		}
		const valueCo = this.#valueCoefficients();
		const baselineX = 0 * valueCo.k + valueCo.b;
		const stacked = this.#stack != null;
		const groupCount = stacked ? 1 : specs.length;
		const gap =
			layout.bandwidth >= 8 * groupCount ? BAR_GAP : layout.bandwidth >= 3 * groupCount ? 1 : 0;
		const slotHeight = (layout.bandwidth - gap * (groupCount - 1)) / groupCount;
		const barThickness = Math.min(BAR_MAX_THICKNESS, slotHeight);

		specs.forEach((spec, seriesIndex) => {
			const reveal = this.#reveal(spec.dataKey);
			const rects: HorizontalBarRect[] = [];
			const lower = stacked ? this.#paintedValues(spec, "lower") : null;
			const upper = stacked
				? this.#paintedValues(spec, "upper")
				: this.#paintedValues(spec, "value");
			const isOutermost = seriesIndex === specs.length - 1;
			for (let index = 0; index < this.#rowCount; index++) {
				const upperValue = upper[index] ?? Number.NaN;
				if (Number.isNaN(upperValue)) {
					continue;
				}
				const lowerValue = lower == null ? 0 : (lower[index] ?? 0);
				const slotStart = stacked
					? bandStart(layout, index) + (layout.bandwidth - barThickness) / 2
					: bandStart(layout, index) +
						(layout.bandwidth - (slotHeight * groupCount + gap * (groupCount - 1))) / 2 +
						seriesIndex * (slotHeight + gap) +
						(slotHeight - barThickness) / 2;
				let baseX = Number.isNaN(lowerValue) ? baselineX : lowerValue * valueCo.k + valueCo.b;
				let valueX = upperValue * valueCo.k + valueCo.b;
				// Enter reveal: grow from the baseline.
				valueX = baseX + (valueX - baseX) * reveal;
				// 2px surface gap between stacked segments, carved entirely from the
				// outer segment's baseline side (geometric, not painted).
				if (stacked && lower != null && seriesIndex > 0 && !Number.isNaN(lowerValue) && gap > 0) {
					baseX -= Math.sign(baseX - valueX) * gap;
				}
				rects.push({
					y: slotStart,
					height: barThickness,
					baselineX: baseX,
					valueX,
					rounded: !stacked || isOutermost,
				});
			}
			drawHorizontalBars(ctx, {
				fill:
					colors.barTextures.get(spec.dataKey) ?? colors.series.get(spec.dataKey) ?? "currentColor",
				rects,
			});
		});
	}

	#paintLinesOrAreas(
		ctx: CanvasRenderingContext2D,
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

		specs.forEach((spec) => {
			const color = colors.series.get(spec.dataKey) ?? "currentColor";
			const reveal = this.#reveal(spec.dataKey);
			ctx.save();
			if (reveal < 1) {
				ctx.beginPath();
				ctx.rect(this.#plot.left, 0, this.#plot.width * reveal, this.#cssHeight);
				ctx.clip();
			}
			if (this.#decimated) {
				this.#paintDecimatedSeries(ctx, spec, color, yCo);
				ctx.restore();
				return;
			}
			const isArea = spec.mark === "area";
			const upper = this.#paintedValues(spec, this.#stack != null ? "upper" : "value");
			const lower = this.#stack != null ? this.#paintedValues(spec, "lower") : null;
			const definedAt = (index: number): boolean => !Number.isNaN(upper[index] ?? Number.NaN);
			// connectNulls joins across gaps by drawing only the finite indexes;
			// without it, NaN indexes stay in the list and defined() breaks the path.
			const indexes: number[] = [];
			for (let index = 0; index < this.#rowCount; index++) {
				if (!spec.connectNulls || definedAt(index)) {
					indexes.push(index);
				}
			}
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
		ctx: CanvasRenderingContext2D,
		spec: SeriesSpec,
		color: string,
		yCo: { k: number; b: number },
	): void {
		const columnCount = Math.max(1, Math.round(this.#plot.width * this.#dpr));
		const columnToX = (column: number): number => this.#plot.left + (column + 0.5) / this.#dpr;
		if (spec.mark === "area") {
			const upper = this.#decimatedFor(
				`${spec.dataKey}:upper`,
				this.#paintedValues(spec, this.#stack != null ? "upper" : "value"),
				columnCount,
			);
			const lower =
				this.#stack != null
					? this.#decimatedFor(
							`${spec.dataKey}:lower`,
							this.#paintedValues(spec, "lower"),
							columnCount,
						)
					: null;
			if (lower == null) {
				drawDecimatedArea(ctx, {
					color,
					lowerColumns: zeroColumns(upper, 0),
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
			this.#paintedValues(spec, "value"),
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
		// Otherwise pick the series whose painted value sits nearest the pointer
		// along the value axis (x when horizontal, y otherwise).
		const { k, b } = horizontal ? this.#valueCoefficients() : this.#yCoefficients();
		const pointerAlongValue = horizontal ? cssX : cssY;
		let nearest: string | null = null;
		let bestDistance = Number.POSITIVE_INFINITY;
		specs.forEach((spec, seriesIndex) => {
			// Stacked marks paint at their cumulative boundary, so hit-test the
			// boundary — raw values would misattribute everything to the largest series.
			const values =
				this.#stack == null ? this.#columns.get(spec.dataKey) : this.#stack.upper[seriesIndex];
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
		const meta = this.#store.seriesMeta();
		let points = meta.map((series) => {
			const values = this.#columns.get(series.dataKey);
			const value = values?.[index] ?? Number.NaN;
			return {
				dataKey: series.dataKey,
				label: series.label,
				value: Number.isNaN(value) ? null : value,
				color: series.color,
			};
		});
		if (this.#options.stacked) {
			// Tooltip rows match the visual top-to-bottom order of the stack.
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
			xValue: this.#xValues[index] ?? "",
			datum,
			points,
			viaKeyboard: this.#viaKeyboard,
		};
		if (this.#is3d()) {
			const zValue = this.#zs[index] ?? Number.NaN;
			snapshot.zValue = Number.isNaN(zValue) ? null : zValue;
		}
		this.#store.publishHover(snapshot);
	}

	#paintScatter(
		ctx: CanvasRenderingContext2D,
		specs: readonly SeriesSpec[],
		yCo: { k: number; b: number },
	): FrameLabels | null {
		const colors = this.#colors;
		if (colors == null || this.#rowCount === 0 || specs.length === 0) {
			return null;
		}
		if (this.#is3d()) {
			return this.#paintScatter3d(ctx, specs);
		}
		const xCo = this.#xCoefficients();
		// Degradation tiers count PAINTED points: sparse all-pairs data (each row
		// populating one series) must not inflate the count by the series factor.
		const seriesIndexes = specs.map((spec) => {
			const values = this.#paintedValues(spec, "value");
			const indexes: number[] = [];
			for (let index = 0; index < this.#rowCount; index++) {
				if (!Number.isNaN(values[index] ?? Number.NaN)) {
					indexes.push(index);
				}
			}
			return indexes;
		});
		const totalPointCount = seriesIndexes.reduce((sum, indexes) => sum + indexes.length, 0);
		specs.forEach((spec, seriesIndex) => {
			const values = this.#paintedValues(spec, "value");
			const indexes = seriesIndexes[seriesIndex] ?? [];
			ctx.save();
			ctx.globalAlpha = this.#reveal(spec.dataKey);
			drawScatterPoints(ctx, {
				color: colors.series.get(spec.dataKey) ?? "currentColor",
				surface: colors.chrome.surface,
				shape: spec.shape,
				totalPointCount,
				indexes,
				xAt: (index) => (this.#xs[index] ?? 0) * xCo.k + xCo.b,
				yAt: (index) => (values[index] ?? 0) * yCo.k + yCo.b,
				radiusAt: () => MARKER_RADIUS,
			});
			ctx.restore();
		});
		return null;
	}

	#paintScatter3d(ctx: CanvasRenderingContext2D, specs: readonly SeriesSpec[]): FrameLabels | null {
		const colors = this.#colors;
		if (colors == null) {
			return null;
		}
		const plot = this.#plot;
		const matrix = projectionMatrix(this.#camera);
		const centerX = plot.left + plot.width / 2;
		const centerY = plot.top + plot.height / 2;
		// The frame must survive any rotation: cube corners sit √3 units out
		// (≤ ~1.75 screen units with perspective), a plane's corners √2, a line's
		// ends 1 — so the radius breathes with the collapse, letting a face-on
		// line or plane fill more of the plot than the full rotating cube.
		const collapseValues = this.#dimensionChase.values();
		const breatheY = collapseValues[0] ?? 1;
		const breatheZ = collapseValues[1] ?? 1;
		const radiusFactor = 0.85 - 0.22 * breatheY - 0.11 * breatheZ;
		const cubeRadius = (Math.min(plot.width, plot.height) / 2) * radiusFactor;
		const xDomainRaw = this.#xTween.values();
		const xDomain: [number, number] = [xDomainRaw[0] ?? 0, xDomainRaw[1] ?? 1];
		const yDomainRaw = this.#yTween.values();
		const yDomain: [number, number] = [yDomainRaw[0] ?? 0, yDomainRaw[1] ?? 1];
		const zDomain = this.#zDomain;

		// Enter reveals apply per series (via alphaAt below) so a late-added
		// series fades in without blinking the established cloud.
		const seriesReveal = specs.map((spec) => this.#reveal(spec.dataKey));

		// Dimensions morph: chased per-axis collapse factors. 1D pins the cloud
		// to the x axis line, 2D to the xy plane; the y/z frame fades with them.
		const collapse = this.#dimensionChase.values();
		const collapseY = collapse[0] ?? 1;
		const collapseZ = collapse[1] ?? 1;

		const toScreen = (nx: number, ny: number, nz: number): { x: number; y: number } => {
			const projected = projectPoint(nx, ny, nz, matrix);
			return { x: centerX + projected.x * cubeRadius, y: centerY - projected.y * cubeRadius };
		};
		const corners = CUBE_CORNERS.map(([cornerX, cornerY, cornerZ]) =>
			toScreen(cornerX, cornerY, cornerZ),
		);
		const firstSpec = specs[0];
		const yLabel = specs.length === 1 && firstSpec != null ? firstSpec.dataKey : "y";
		const frameAxes = [
			{
				label: this.#options.xKey,
				alpha: 1,
				from: toScreen(-1, -collapseY, -collapseZ),
				to: toScreen(1, -collapseY, -collapseZ),
			},
			{
				label: yLabel,
				alpha: collapseY,
				from: toScreen(-1, -1, -collapseZ),
				to: toScreen(-1, 1, -collapseZ),
			},
			{
				label: this.#options.zKey ?? "z",
				alpha: collapseZ,
				from: toScreen(-1, -collapseY, -1),
				to: toScreen(-1, -collapseY, 1),
			},
		];
		drawCubeFrame(ctx, {
			gridColor: colors.chrome.grid,
			axisColor: colors.chrome.baseline,
			corners,
			edges: CUBE_EDGES,
			// The full wireframe belongs to the 3rd dimension; below it only the
			// axis lines carry orientation. The axes travel with the morph so they
			// always hug the collapsed line/plane (x through the collapsed center,
			// y along its left edge) instead of stranding at a cube corner.
			cubeAlpha: collapseZ,
			axes: frameAxes,
		});

		// Project every populated point into reusable scratch buffers.
		const capacity = this.#rowCount * specs.length;
		let projected = this.#projected;
		if (projected == null || projected.screenX.length < capacity) {
			projected = {
				screenX: new Float64Array(capacity),
				screenY: new Float64Array(capacity),
				radius: new Float64Array(capacity),
				seriesIndex: new Int32Array(capacity),
				pointIndex: new Int32Array(capacity),
				depths: new Float64Array(capacity),
				count: 0,
			};
		}
		const depths = projected.depths;
		let count = 0;
		specs.forEach((spec, seriesIndex) => {
			const values = this.#paintedValues(spec, "value");
			for (let index = 0; index < this.#rowCount; index++) {
				const value = values[index] ?? Number.NaN;
				const z = this.#zs[index] ?? Number.NaN;
				if (Number.isNaN(value) || Number.isNaN(z)) {
					continue;
				}
				// Collapse scales toward the cube center, and the axis lines travel
				// with it — 1D reads as points on a centered line, 2D as a flat plane.
				const point = projectPoint(
					normalizeToCube(this.#xs[index] ?? 0, xDomain),
					normalizeToCube(value, yDomain) * collapseY,
					normalizeToCube(z, zDomain) * collapseZ,
					matrix,
				);
				projected.screenX[count] = centerX + point.x * cubeRadius;
				projected.screenY[count] = centerY - point.y * cubeRadius;
				projected.radius[count] = MARKER_RADIUS * point.scale;
				projected.seriesIndex[count] = seriesIndex;
				projected.pointIndex[count] = index;
				depths[count] = point.depth;
				count += 1;
			}
		});
		projected.count = count;
		this.#projected = projected;

		// Paint back-to-front, reusing a persistent order buffer — a fresh
		// Array+toSorted every frame churned GC during rotation/dimension morphs.
		if (this.#depthOrder.length < count) {
			this.#depthOrder = new Int32Array(capacity);
		}
		const order = this.#depthOrder.subarray(0, count);
		for (let slot = 0; slot < count; slot++) {
			order[slot] = slot;
		}
		order.sort((a, b) => (depths[b] ?? 0) - (depths[a] ?? 0));
		drawDepthSortedPoints(ctx, {
			count,
			order,
			screenX: projected.screenX,
			screenY: projected.screenY,
			radius: projected.radius,
			colorAt: (slot) => {
				const spec = specs[projected.seriesIndex[slot] ?? 0];
				return spec == null ? "currentColor" : (colors.series.get(spec.dataKey) ?? "currentColor");
			},
			shapeAt: (slot) => specs[projected.seriesIndex[slot] ?? 0]?.shape ?? "circle",
			alphaAt: (slot) => seriesReveal[projected.seriesIndex[slot] ?? 0] ?? 1,
			surface: colors.chrome.surface,
		});

		// Labels are drawn by #paint after the marks clip is restored, so a label
		// nudged past the plot edge isn't sliced off.
		return { center: { x: centerX, y: centerY }, axes: frameAxes };
	}

	/**
	 * The scatter hit test: the nearest point within {@link SCATTER_HIT_RADIUS}
	 * of the pointer — 2D from the columns, 3D from the projected buffers.
	 */
	#scatterHitAt(
		cssX: number,
		cssY: number,
	): { seriesKey: string; index: number; screenX: number; screenY: number } | null {
		const specs = this.#store.seriesSpecs();
		const limit = SCATTER_HIT_RADIUS * SCATTER_HIT_RADIUS;
		let bestDistance = limit;
		let best: { seriesKey: string; index: number; screenX: number; screenY: number } | null = null;
		if (this.#is3d()) {
			const projected = this.#projected;
			if (projected == null) {
				return null;
			}
			for (let slot = 0; slot < projected.count; slot++) {
				const deltaX = (projected.screenX[slot] ?? 0) - cssX;
				const deltaY = (projected.screenY[slot] ?? 0) - cssY;
				const distance = deltaX * deltaX + deltaY * deltaY;
				if (distance < bestDistance) {
					const spec = specs[projected.seriesIndex[slot] ?? 0];
					if (spec == null) {
						continue;
					}
					bestDistance = distance;
					best = {
						seriesKey: spec.dataKey,
						index: projected.pointIndex[slot] ?? 0,
						screenX: projected.screenX[slot] ?? 0,
						screenY: projected.screenY[slot] ?? 0,
					};
				}
			}
			return best;
		}
		const xCo = this.#xCoefficients();
		const yCo = this.#yCoefficients();
		for (const spec of specs) {
			const values = this.#columns.get(spec.dataKey);
			if (values == null) {
				continue;
			}
			for (let index = 0; index < this.#rowCount; index++) {
				const value = values[index] ?? Number.NaN;
				if (Number.isNaN(value)) {
					continue;
				}
				const screenX = (this.#xs[index] ?? 0) * xCo.k + xCo.b;
				const screenY = value * yCo.k + yCo.b;
				const deltaX = screenX - cssX;
				const deltaY = screenY - cssY;
				const distance = deltaX * deltaX + deltaY * deltaY;
				if (distance < bestDistance) {
					bestDistance = distance;
					best = { seriesKey: spec.dataKey, index, screenX, screenY };
				}
			}
		}
		return best;
	}

	/**
	 * The screen position for a scatter datum reached without a pointer
	 * (keyboard stepping, controlled activeIndex): the row's first populated
	 * series, via the projection in 3D.
	 */
	#screenForIndex(index: number): { x: number; y: number } | null {
		const specs = this.#store.seriesSpecs();
		if (this.#is3d()) {
			const projected = this.#projected;
			if (projected == null) {
				return null;
			}
			for (let slot = 0; slot < projected.count; slot++) {
				if ((projected.pointIndex[slot] ?? -1) === index) {
					return { x: projected.screenX[slot] ?? 0, y: projected.screenY[slot] ?? 0 };
				}
			}
			return null;
		}
		const xCo = this.#xCoefficients();
		const yCo = this.#yCoefficients();
		for (const spec of specs) {
			const value = this.#columns.get(spec.dataKey)?.[index] ?? Number.NaN;
			if (!Number.isNaN(value)) {
				return { x: (this.#xs[index] ?? 0) * xCo.k + xCo.b, y: value * yCo.k + yCo.b };
			}
		}
		return null;
	}

	#updateOverlay(): void {
		const { crosshair, band, markers, tooltip } = this.#elements;
		const index = this.#effectiveIndex();
		const visible = index != null && this.#rowCount > 0;
		const isBar = this.#kind === "bar";
		const isScatter = this.#kind === "scatter";

		crosshair.style.opacity = visible && !isBar && !isScatter ? "1" : "0";
		band.style.opacity = visible && isBar ? "1" : "0";
		markers.style.opacity = visible && !isBar ? "1" : "0";
		tooltip.style.opacity = visible ? "1" : "0";
		if (!visible) {
			return;
		}

		const plot = this.#plot;

		if (isScatter) {
			const screen = this.#activeScreen ?? this.#screenForIndex(index);
			if (screen == null) {
				markers.style.opacity = "0";
				tooltip.style.opacity = "0";
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
				const meta = this.#store.seriesMeta();
				const active =
					this.#activeSeriesKey == null
						? meta.find((series) => {
								const value = this.#columns.get(series.dataKey)?.[index] ?? Number.NaN;
								return !Number.isNaN(value);
							})
						: meta.find((series) => series.dataKey === this.#activeSeriesKey);
				dot.style.opacity = "1";
				styleMarkerDot(dot, active?.shape ?? "circle", active?.color ?? "currentColor");
				dot.style.transform = `translate3d(${screen.x}px, ${screen.y}px, 0)`;
			}
			this.#positionTooltip(screen.x, screen.y);
			return;
		}

		const xPx = this.#xPixel(index);
		const horizontal = this.#horizontalBars();

		if (isBar) {
			const layout = this.#bandLayout;
			if (layout != null) {
				const stepStart = bandStart(layout, index) - (layout.step - layout.bandwidth) / 2;
				if (horizontal) {
					// The band spans the full plot width at the category's y row.
					band.style.transform = `translate3d(${plot.left}px, ${stepStart}px, 0)`;
					band.style.width = `${plot.width}px`;
					band.style.height = `${Math.max(layout.step, 24)}px`;
				} else {
					band.style.transform = `translate3d(${stepStart}px, ${plot.top}px, 0)`;
					band.style.width = `${Math.max(layout.step, 24)}px`;
					band.style.height = `${plot.height}px`;
				}
			}
		} else {
			crosshair.style.transform = `translate3d(${xPx}px, ${plot.top}px, 0)`;
			crosshair.style.height = `${plot.height}px`;

			// One marker dot per series, synced imperatively.
			const meta = this.#store.seriesMeta();
			const specs = this.#store.seriesSpecs();
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
				const raw = this.#columns.get(series.dataKey)?.[index] ?? Number.NaN;
				const spec = specs[seriesIndex];
				const painted =
					spec == null
						? Number.NaN
						: (this.#paintedValues(spec, this.#stack != null ? "upper" : "value")[index] ??
							Number.NaN);
				if (Number.isNaN(raw) || Number.isNaN(painted)) {
					dot.style.opacity = "0";
					return;
				}
				dot.style.opacity = "1";
				styleMarkerDot(dot, series.shape, series.color);
				dot.style.transform = `translate3d(${xPx}px, ${painted * yCo.k + yCo.b}px, 0)`;
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
	 * Position the tooltip near an anchor point, flipping sides at the plot
	 * edge and clamping vertically inside the plot.
	 */
	#positionTooltip(anchorX: number, anchorY: number): void {
		const plot = this.#plot;
		const tooltip = this.#elements.tooltip;
		const size = this.#tooltipSize;
		const gapX = 12;
		let tooltipLeft = anchorX + gapX;
		if (
			tooltipLeft + size.width > plot.left + plot.width &&
			anchorX - gapX - size.width >= plot.left
		) {
			tooltipLeft = anchorX - gapX - size.width;
		}
		const tooltipTop = Math.min(
			Math.max(plot.top, anchorY - size.height / 2),
			plot.top + plot.height - size.height,
		);
		tooltip.style.transform = `translate3d(${tooltipLeft}px, ${Math.max(plot.top, tooltipTop)}px, 0)`;
	}
}

/**
 * The camera view a dimension reads best from: face-on for a line or a plane
 * (a tilted line floating in space looks broken), the default tilt for the
 * full cube.
 */
const cameraViewFor = (dimensions: 1 | 2 | 3): Camera => {
	if (dimensions === 3) {
		// Slightly above and to the right — the standard "looking down at the
		// cube" explainer view.
		return { yaw: 0.65, pitch: -0.35 };
	}
	return { yaw: 0, pitch: 0 };
};

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
 */
const POINT_SHAPE_CLIP_PATHS: Record<PointShape, string> = {
	circle: "circle(50%)",
	square: "inset(8%)",
	triangle: "polygon(50% 0%, 100% 100%, 0% 100%)",
	diamond: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
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

/**
 * Sync a hover dot's glyph and fill color. Style writes are idempotent, so
 * calling on every overlay sync is safe.
 */
const styleMarkerDot = (dot: HTMLElement, shape: PointShape, color: string): void => {
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

/**
 * Coerce a consumer x value for continuous scales. Time scales accept `Date`,
 * epoch milliseconds, or parseable date strings.
 */
const toEpochOrNumber = (raw: unknown, isTime: boolean): number => {
	if (raw instanceof Date) {
		return raw.getTime();
	}
	if (typeof raw === "number") {
		return raw;
	}
	if (isTime && typeof raw === "string") {
		return new Date(raw).getTime();
	}
	return Number.NaN;
};

/**
 * A zero-baseline stand-in for the lower boundary of an unstacked area.
 */
const zeroColumns = (template: DecimatedColumns, baseline: number): DecimatedColumns => ({
	columnCount: template.columnCount,
	hasData: template.hasData,
	minValue: new Float64Array(template.columnCount).fill(baseline),
	maxValue: new Float64Array(template.columnCount).fill(baseline),
	inValue: new Float64Array(template.columnCount).fill(baseline),
	outValue: new Float64Array(template.columnCount).fill(baseline),
});

export type {
	//,
	EngineCallbacks,
	EngineElements,
};
export {
	//,
	ChartEngine,
	POINT_SHAPE_CLIP_PATHS,
};
