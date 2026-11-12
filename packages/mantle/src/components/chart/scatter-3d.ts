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
import { MARKER_RADIUS } from "./renderer.js";
import type { DragEnd, DragMove, FrameLabels, ScatterHit, ScatterHost } from "./scatter-engine.js";
import { drawCubeAxisLabels, drawCubeFrame, drawDepthSortedPoints } from "./scatter-3d-renderer.js";
import { ChaseTween } from "./tween.js";
import type { SeriesSpec } from "./types.js";

/**
 * The 3D part of the scatter view: the camera, its rotation drag, the
 * dimensions morph, the projection, and the cube frame. `scatter-engine.ts`
 * imports this module the first time a chart has a `zKey`, so a 2D scatter
 * plot never loads it.
 *
 * This module is internal shared implementation — not exported from the package.
 */

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

/** The 3D state of one scatter view. */
class Scatter3d {
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

	constructor(host: ScatterHost, dimensions: 1 | 2 | 3) {
		this.#host = host;
		this.snap(dimensions);
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

	/** Start a press, which may become a rotation drag. */
	press(cssX: number, cssY: number): void {
		this.#drag = { lastX: cssX, lastY: cssY, moved: false };
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

	/**
	 * Paint the cube frame and the depth-sorted cloud. Returns the frame's axis
	 * labels, which the engine paints after it restores the marks clip.
	 */
	paint(
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

	/** The nearest projected point within `radius` CSS pixels of the pointer. */
	hitAt(cssX: number, cssY: number, radius: number): ScatterHit | null {
		const specs = this.#host.specs();
		let bestDistance = radius * radius;
		let best: ScatterHit | null = null;
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

	/** The projected screen position of a datum, for keyboard stepping and a controlled `activeIndex`. */
	screenFor(index: number): { x: number; y: number } | null {
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
}

export {
	//,
	Scatter3d,
};
