import type { PaintContext, ResolvedPaint } from "./paint-backend.js";
import type { Camera } from "./projection.js";
import {
	clampPitch,
	CUBE_CORNERS,
	CUBE_EDGES,
	normalizeToCube,
	projectionMatrix,
	projectPoint,
} from "./projection.js";
import type { PlotRect } from "./renderer.js";
import { MARKER_RADIUS } from "./renderer.js";
import {
	drawCubeAxisLabels,
	drawCubeFrame,
	drawDepthSortedPoints,
	drawScatterPoints,
} from "./scatter-renderer.js";
import { ChaseTween } from "./tween.js";
import type { PointShape, SeriesSpec } from "./types.js";

/**
 * The scatter plot's part of the chart engine: the 2D and 3D paint, the hit
 * test, the 3D camera and its rotation drag, and the dimensions morph. Only
 * ScatterPlot passes {@link createScatterView} to its Root, so Bar, Line, and
 * Area charts load none of this code and build none of its tweens.
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

/** The per-axis collapse factors [y, z] that show `dimensions` axes. */
const collapseFor = (dimensions: 1 | 2 | 3): number[] => [
	dimensions >= 2 ? 1 : 0,
	dimensions >= 3 ? 1 : 0,
];

/**
 * The scatter state one engine owns. The engine calls it once per frame to
 * paint and once per pointer event to hit test, never once per point.
 */
class ScatterView {
	readonly #host: ScatterHost;
	#camera: Camera = cameraViewFor(3);
	// Dimension changes re-aim the camera (face-on for a line or plane, the
	// default tilt for the cube); a manual drag cancels the glide.
	readonly #cameraChase = new ChaseTween({ speed: 0.12 });
	// Per-axis collapse factors [y, z] for the 3D dimensions morph: 1D collapses
	// the cloud onto the x axis, 2D onto the xy plane. Chased so dimension
	// changes glide like every other motion in the engine.
	readonly #dimensionChase = new ChaseTween({ speed: 0.16 });
	#drag: { lastX: number; lastY: number; moved: boolean } | null = null;
	#projected: {
		screenX: Float64Array;
		screenY: Float64Array;
		radius: Float64Array;
		seriesIndex: Int32Array;
		pointIndex: Int32Array;
		depths: Float64Array;
		count: number;
	} | null = null;
	/** Reusable back-to-front paint order for the 3D projection (see #paint3d). */
	#depthOrder: Int32Array = new Int32Array(0);
	/** The defined indexes of each series, kept until the next ingest. */
	#indexes: {
		columns: readonly Float64Array[];
		specs: readonly SeriesSpec[];
		indexes: number[][];
		total: number;
	} | null = null;

	constructor(host: ScatterHost) {
		this.#host = host;
		this.#dimensionChase.jump([1, 1]);
	}

	/**
	 * Aim the camera and the collapse at a new dimension count. With `glide`
	 * off (before the first paint, or under reduced motion), they jump.
	 */
	setDimensions(dimensions: 1 | 2 | 3, options: { glide: boolean }): void {
		const view = cameraViewFor(dimensions);
		if (!options.glide) {
			this.snap(dimensions);
			return;
		}
		// Unwind accumulated drag revolutions so the camera takes the short
		// way to the view instead of spinning back through every turn.
		const yawTarget =
			view.yaw + Math.round((this.#camera.yaw - view.yaw) / (Math.PI * 2)) * Math.PI * 2;
		const now = performance.now();
		this.#dimensionChase.aim(collapseFor(dimensions), now);
		this.#cameraChase.jump([this.#camera.yaw, this.#camera.pitch]);
		this.#cameraChase.aim([yawTarget, view.pitch], now);
	}

	/** Finish the camera glide and the dimensions morph at their targets. */
	snap(dimensions: 1 | 2 | 3): void {
		const view = cameraViewFor(dimensions);
		this.#dimensionChase.jump(collapseFor(dimensions));
		this.#camera = view;
		this.#cameraChase.jump([view.yaw, view.pitch]);
	}

	/** Advance the camera and the morph. Returns `true` while either still moves. */
	tick(now: number): boolean {
		let animating = this.#dimensionChase.tick(now);
		if (this.#cameraChase.tick(now)) {
			animating = true;
			const view = this.#cameraChase.values();
			this.#camera = { yaw: view[0] ?? this.#camera.yaw, pitch: view[1] ?? this.#camera.pitch };
		}
		return animating;
	}

	/** Drop the projected points: a new ingest projects every point again. */
	resetProjection(): void {
		this.#projected = null;
	}

	/** Start a press. In 3D the press may become a rotation drag. Returns whether it did. */
	pressAt(cssX: number, cssY: number): boolean {
		if (!this.#host.is3d()) {
			return false;
		}
		this.#drag = { lastX: cssX, lastY: cssY, moved: false };
		return true;
	}

	/** Follow a pointer move during a 3D press: past the threshold it turns the camera. */
	dragTo(cssX: number, cssY: number): DragMove {
		const drag = this.#drag;
		if (drag == null) {
			return "none";
		}
		const deltaX = cssX - drag.lastX;
		const deltaY = cssY - drag.lastY;
		if (!drag.moved && Math.abs(deltaX) + Math.abs(deltaY) <= DRAG_THRESHOLD) {
			return "held";
		}
		drag.moved = true;
		this.#camera = {
			yaw: this.#camera.yaw + deltaX * 0.008,
			pitch: clampPitch(this.#camera.pitch + deltaY * 0.008),
		};
		this.#cameraChase.jump([this.#camera.yaw, this.#camera.pitch]);
		drag.lastX = cssX;
		drag.lastY = cssY;
		return "rotated";
	}

	/** End a press, or cancel it when the pointer leaves. */
	release(): DragEnd {
		const drag = this.#drag;
		this.#drag = null;
		if (drag == null) {
			return "none";
		}
		return drag.moved ? "rotated" : "tap";
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
			return this.#paint3d(ctx, colors, specs);
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
		const colors = this.#host.colors();
		if (colors == null) {
			return;
		}
		drawCubeAxisLabels(ctx, {
			textColor: colors.chrome.tickText,
			fontFamily: colors.fontFamily(),
			plot: this.#host.plot(),
			center: labels.center,
			axes: labels.axes,
		});
	}

	#paint3d(
		ctx: PaintContext,
		colors: ResolvedPaint,
		specs: readonly SeriesSpec[],
	): FrameLabels | null {
		const host = this.#host;
		const plot = host.plot();
		const rowCount = host.rowCount();
		const xs = host.xs();
		const zs = host.zs();
		const matrix = projectionMatrix(this.#camera);
		const centerX = plot.left + plot.width / 2;
		const centerY = plot.top + plot.height / 2;
		// Dimensions morph: chased per-axis collapse factors. 1D pins the cloud
		// to the x axis line, 2D to the xy plane; the y/z frame fades with them.
		const collapse = this.#dimensionChase.values();
		const collapseY = collapse[0] ?? 1;
		const collapseZ = collapse[1] ?? 1;
		// The frame must survive any rotation: cube corners sit √3 units out
		// (≤ ~1.75 screen units with perspective), a plane's corners √2, a line's
		// ends 1 — so the radius breathes with the collapse, letting a face-on
		// line or plane fill more of the plot than the full rotating cube.
		const radiusFactor = 0.85 - 0.22 * collapseY - 0.11 * collapseZ;
		const cubeRadius = (Math.min(plot.width, plot.height) / 2) * radiusFactor;
		const domains = host.domains();

		// Enter reveals apply per series (via alphaAt below) so a late-added
		// series fades in without blinking the established cloud.
		const seriesReveal = specs.map((spec) => host.reveal(spec.dataKey));

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
				label: host.xKey(),
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
				label: host.zKey() ?? "z",
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
		const capacity = rowCount * specs.length;
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
			const values = host.paintedValues(spec, seriesIndex);
			for (let index = 0; index < rowCount; index++) {
				const value = values[index] ?? Number.NaN;
				const z = zs[index] ?? Number.NaN;
				if (Number.isNaN(value) || Number.isNaN(z)) {
					continue;
				}
				// Collapse scales toward the cube center, and the axis lines travel
				// with it — 1D reads as points on a centered line, 2D as a flat plane.
				const point = projectPoint(
					normalizeToCube(xs[index] ?? 0, domains.x),
					normalizeToCube(value, domains.y) * collapseY,
					normalizeToCube(z, domains.z) * collapseZ,
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
		// Resolve each series' glyph once per frame: `shapeAt` runs per point, and
		// the cloud can carry tens of thousands of them.
		const shapes = specs.map((spec) => host.shape(spec.dataKey));
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
			shapeAt: (slot) => shapes[projected.seriesIndex[slot] ?? 0] ?? "circle",
			alphaAt: (slot) => seriesReveal[projected.seriesIndex[slot] ?? 0] ?? 1,
			surface: colors.chrome.surface,
		});

		return { center: { x: centerX, y: centerY }, axes: frameAxes };
	}

	/**
	 * The nearest point within {@link SCATTER_HIT_RADIUS} of the pointer: 2D
	 * from the columns, 3D from the projected buffers.
	 */
	hitAt(cssX: number, cssY: number): ScatterHit | null {
		const host = this.#host;
		const specs = host.specs();
		let bestDistance = SCATTER_HIT_RADIUS * SCATTER_HIT_RADIUS;
		let best: ScatterHit | null = null;
		if (host.is3d()) {
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
	FrameLabels,
	ScatterHost,
	ScatterView,
	ScatterViewFactory,
};

export {
	//,
	createScatterView,
};
