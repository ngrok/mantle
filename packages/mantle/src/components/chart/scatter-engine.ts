import type { PaintContext, ResolvedPaint } from "./paint-backend.js";
import type { PlotRect } from "./renderer.js";
import { MARKER_RADIUS } from "./renderer.js";
import type { Scatter3d } from "./scatter-3d.js";
import { drawScatterPoints } from "./scatter-renderer.js";
import type { PointShape, SeriesSpec } from "./types.js";

/**
 * The scatter plot's part of the chart engine: the 2D paint and the hit test.
 * Only ScatterPlot passes {@link createScatterView} to its Root, so Bar, Line,
 * and Area charts load none of this code. The 3D camera, the projection, and
 * the cube frame live in `scatter-3d.ts`, which loads when a chart with a
 * `zKey` mounts (see {@link preloadScatter3d}), so a 2D scatter plot never
 * loads them.
 *
 * This module is internal shared implementation — not exported from the package.
 */

/** A linear map from data to CSS pixels: `pixel = value * k + b`. */
type Coefficients = { k: number; b: number };

/**
 * What the scatter view reads from the engine that owns it. Each member is a
 * function, so the view always reads the engine's current state.
 */
type ScatterHost = {
	plot: () => PlotRect;
	colors: () => ResolvedPaint | null;
	specs: () => readonly SeriesSpec[];
	rowCount: () => number;
	xs: () => Float64Array;
	zs: () => Float64Array;
	/** The ingested columns, by series index. A new array means a new ingest. */
	columns: () => readonly Float64Array[];
	/** The ingested column of one series, read by its key. */
	columnOf: (dataKey: string) => Float64Array | undefined;
	/** The values to paint this frame: the tweened column while a value tween runs. */
	paintedValues: (spec: SeriesSpec, seriesIndex: number) => Float64Array;
	/** The indexes of a column that hold a number. */
	definedIndexes: (values: Float64Array) => number[];
	/** A series' enter reveal opacity, from 0 to 1. */
	reveal: (dataKey: string) => number;
	shape: (dataKey: string) => PointShape;
	xCoefficients: () => Coefficients;
	yCoefficients: () => Coefficients;
	/** The tweened x and y domains, and the z domain from the last ingest. */
	domains: () => { x: [number, number]; y: [number, number]; z: [number, number] };
	xKey: () => string;
	zKey: () => string | null;
	is3d: () => boolean;
	/** Ask the engine for a repaint, such as when the 3D code finishes loading. */
	requestPaint: () => void;
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

/** A point the pointer hit, with its CSS-pixel position. */
type ScatterHit = { seriesKey: string; index: number; screenX: number; screenY: number };

/**
 * What a pointer move did during a press: `"none"` when no 3D press is in
 * progress, `"held"` when the press has not moved past the drag threshold
 * yet, and `"rotated"` when it turned the camera.
 */
type DragMove = "none" | "held" | "rotated";

/**
 * What a pointer release ended: `"none"` when no 3D press was in progress,
 * `"tap"` for a press that never moved, and `"rotated"` for a drag.
 */
type DragEnd = "none" | "tap" | "rotated";

/** The pointer must land within this distance of a scatter point to hit it. */
const SCATTER_HIT_RADIUS = 24;

/** A 3D press must move this many CSS pixels before it rotates the camera. */
const DRAG_THRESHOLD = 3;

/** The 3D class once its module has loaded. Every scatter view on the page shares it. */
let scatter3dClass: typeof Scatter3d | null = null;
let scatter3dLoad: Promise<typeof Scatter3d> | null = null;

/**
 * Start to load the 3D code, once for the page. A failed load clears the
 * promise, so the next call tries again.
 *
 * Why at mount: a dormant chart builds its engine at print, and the print
 * snapshot cannot wait for an import. A chart that loads the code when it
 * mounts has it before any paint.
 *
 * @example
 * ```ts
 * useEffect(() => {
 * 	if (zKey != null) {
 * 		preloadScatter3d().catch(() => {
 * 			// The first 3D paint loads it again and reports a failure.
 * 		});
 * 	}
 * }, [zKey]);
 * ```
 */
const preloadScatter3d = (): Promise<typeof Scatter3d> => {
	scatter3dLoad ??= import("./scatter-3d.js").then(
		(module) => {
			scatter3dClass = module.Scatter3d;
			return module.Scatter3d;
		},
		(error: unknown) => {
			scatter3dLoad = null;
			throw error;
		},
	);
	return scatter3dLoad;
};

/**
 * The scatter state one engine owns. The engine calls it once per frame to
 * paint and once per pointer event to hit test, never once per point.
 */
class ScatterView {
	readonly #host: ScatterHost;
	/** The 3D state, once its module has loaded. */
	#three: Scatter3d | null = null;
	#loading = false;
	/** A 3D press that began while the module loaded; it moves to the 3D state when it arrives. */
	#pendingPress: { x: number; y: number; moved: boolean } | null = null;
	/** The latest dimension count, for the 3D state created after it arrived. */
	#dimensions: 1 | 2 | 3 = 3;
	/** The defined indexes of each series, kept until the next ingest. */
	#indexes: {
		columns: readonly Float64Array[];
		specs: readonly SeriesSpec[];
		indexes: number[][];
		total: number;
	} | null = null;

	constructor(host: ScatterHost) {
		this.#host = host;
	}

	/**
	 * The 3D state, or `null` while its module loads. The first call starts
	 * the load if no chart started it yet, and the engine repaints when it
	 * finishes.
	 */
	#load3d(): Scatter3d | null {
		if (this.#three == null && scatter3dClass != null) {
			this.#three = new scatter3dClass(this.#host, this.#dimensions);
			const press = this.#pendingPress;
			this.#pendingPress = null;
			if (press != null) {
				this.#three.press(press.x, press.y);
			}
		}
		if (this.#three != null || this.#loading) {
			return this.#three;
		}
		this.#loading = true;
		void this.#import3d();
		return null;
	}

	async #import3d(): Promise<void> {
		try {
			await preloadScatter3d();
		} catch (error) {
			// The next 3D paint tries the load again. `reportError` sends the
			// failure to the page's error handlers, not to an unhandled rejection.
			this.#loading = false;
			reportError(error);
			return;
		}
		this.#loading = false;
		this.#load3d();
		this.#host.requestPaint();
	}

	/**
	 * Aim the camera and the collapse at a new dimension count. With `glide`
	 * off (before the first paint, or under reduced motion), they jump.
	 */
	setDimensions(dimensions: 1 | 2 | 3, options: { glide: boolean }): void {
		this.#dimensions = dimensions;
		this.#three?.setDimensions(dimensions, options);
	}

	/** Finish the camera glide and the dimensions morph at their targets. */
	snap(dimensions: 1 | 2 | 3): void {
		this.#dimensions = dimensions;
		this.#three?.snap(dimensions);
	}

	/** Advance the camera and the morph. Returns `true` while either still moves. */
	tick(now: number): boolean {
		return this.#three?.tick(now) ?? false;
	}

	/** Drop the projected points: a new ingest projects every point again. */
	resetProjection(): void {
		this.#three?.resetProjection();
	}

	/** Start a press. In 3D the press may become a rotation drag. Returns whether it did. */
	pressAt(cssX: number, cssY: number): boolean {
		if (!this.#host.is3d()) {
			return false;
		}
		const three = this.#load3d();
		if (three == null) {
			// Why keep it: a drag that starts before the module arrives must still
			// rotate, and must not end as a tap that activates a datum.
			this.#pendingPress = { x: cssX, y: cssY, moved: false };
		} else {
			three.press(cssX, cssY);
		}
		return true;
	}

	/** Follow a pointer move during a 3D press: past the threshold it turns the camera. */
	dragTo(cssX: number, cssY: number): DragMove {
		const press = this.#pendingPress;
		if (press != null) {
			press.moved ||= Math.abs(cssX - press.x) + Math.abs(cssY - press.y) > DRAG_THRESHOLD;
			return "held";
		}
		return this.#three?.dragTo(cssX, cssY) ?? "none";
	}

	/** End a press, or cancel it when the pointer leaves. */
	release(): DragEnd {
		const press = this.#pendingPress;
		if (press != null) {
			this.#pendingPress = null;
			return press.moved ? "rotated" : "tap";
		}
		return this.#three?.release() ?? "none";
	}

	/**
	 * Paint the point cloud. Returns the 3D frame's axis labels, which the
	 * engine paints through {@link paintLabels} after it restores the marks clip.
	 */
	paint(ctx: PaintContext): FrameLabels | null {
		const host = this.#host;
		const colors = host.colors();
		const specs = host.specs();
		if (colors == null || host.rowCount() === 0 || specs.length === 0) {
			return null;
		}
		if (host.is3d()) {
			return this.#load3d()?.paint(ctx, colors, specs) ?? null;
		}
		const xCo = host.xCoefficients();
		const yCo = host.yCoefficients();
		const xs = host.xs();
		// Degradation tiers count PAINTED points: sparse all-pairs data (each row
		// populating one series) must not inflate the count by the series factor.
		// Why a cache: a value tween keeps a gap a gap (`ValueTween` paints a NaN
		// end as NaN), so the defined indexes follow the columns, which change only
		// at ingest.
		const columns = host.columns();
		let cached = this.#indexes;
		if (cached == null || cached.columns !== columns || cached.specs !== specs) {
			const indexes = specs.map((_spec, seriesIndex) =>
				host.definedIndexes(columns[seriesIndex] ?? new Float64Array(0)),
			);
			cached = {
				columns,
				specs,
				indexes,
				total: indexes.reduce((sum, list) => sum + list.length, 0),
			};
			this.#indexes = cached;
		}
		const seriesIndexes = cached.indexes;
		const totalPointCount = cached.total;
		specs.forEach((spec, seriesIndex) => {
			const values = host.paintedValues(spec, seriesIndex);
			ctx.save();
			ctx.globalAlpha = host.reveal(spec.dataKey);
			drawScatterPoints(ctx, {
				color: colors.series.get(spec.dataKey) ?? "currentColor",
				surface: colors.chrome.surface,
				shape: host.shape(spec.dataKey),
				totalPointCount,
				indexes: seriesIndexes[seriesIndex] ?? [],
				xAt: (index) => (xs[index] ?? 0) * xCo.k + xCo.b,
				yAt: (index) => (values[index] ?? 0) * yCo.k + yCo.b,
				radiusAt: () => MARKER_RADIUS,
			});
			ctx.restore();
		});
		return null;
	}

	/** Paint the 3D frame's axis labels outside the marks clip, so edge labels stay whole. */
	paintLabels(ctx: PaintContext, labels: FrameLabels): void {
		this.#three?.paintLabels(ctx, labels);
	}

	/**
	 * The nearest point within {@link SCATTER_HIT_RADIUS} of the pointer: 2D
	 * from the columns, 3D from the projected buffers.
	 */
	hitAt(cssX: number, cssY: number): ScatterHit | null {
		const host = this.#host;
		if (host.is3d()) {
			return this.#three?.hitAt(cssX, cssY, SCATTER_HIT_RADIUS) ?? null;
		}
		const specs = host.specs();
		let bestDistance = SCATTER_HIT_RADIUS * SCATTER_HIT_RADIUS;
		let best: ScatterHit | null = null;
		const xCo = host.xCoefficients();
		const yCo = host.yCoefficients();
		const xs = host.xs();
		const rowCount = host.rowCount();
		for (const spec of specs) {
			const values = host.columnOf(spec.dataKey);
			if (values == null) {
				continue;
			}
			for (let index = 0; index < rowCount; index++) {
				const value = values[index] ?? Number.NaN;
				if (Number.isNaN(value)) {
					continue;
				}
				const screenX = (xs[index] ?? 0) * xCo.k + xCo.b;
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
	 * The screen position for a datum reached without a pointer (keyboard
	 * stepping, a controlled `activeIndex`): the row's first populated series,
	 * through the projection in 3D.
	 */
	screenFor(index: number): { x: number; y: number } | null {
		const host = this.#host;
		if (host.is3d()) {
			return this.#three?.screenFor(index) ?? null;
		}
		const xCo = host.xCoefficients();
		const yCo = host.yCoefficients();
		for (const spec of host.specs()) {
			const value = host.columnOf(spec.dataKey)?.[index] ?? Number.NaN;
			if (!Number.isNaN(value)) {
				return { x: (host.xs()[index] ?? 0) * xCo.k + xCo.b, y: value * yCo.k + yCo.b };
			}
		}
		return null;
	}
}

/**
 * Build the scatter view for one engine. ScatterPlot passes this function to
 * its Root; the other families pass nothing.
 *
 * @example
 * ```ts
 * const engine = new ChartEngine({ kind: "scatter", scatter: createScatterView, ...rest });
 * ```
 */
const createScatterView = (host: ScatterHost): ScatterView => new ScatterView(host);

/** Builds the scatter view an engine owns; see {@link createScatterView}. */
type ScatterViewFactory = typeof createScatterView;

export type {
	//,
	DragEnd,
	DragMove,
	FrameLabels,
	ScatterHit,
	ScatterHost,
	ScatterView,
	ScatterViewFactory,
};

export {
	//,
	createScatterView,
	DRAG_THRESHOLD,
	preloadScatter3d,
};
