import type { PointShape } from "./types.js";
import type { PaintContext } from "./paint-backend.js";
import { MARKER_RING, tracePointShape } from "./renderer.js";

/**
 * The scatter plot's 2D draw routine over a {@link PaintContext}. Only the
 * scatter modules import this module, so Bar, Line, and Area charts load none
 * of it. The 3D draw routines live in `scatter-3d.ts`.
 *
 * This module is internal shared implementation — not exported from the package.
 */

/**
 * Past this many points, scatter marks drop their surface ring (three canvas
 * ops per point → one); past four times this, dots become 2×2 rects (no arc
 * rasterization) so 50k+ point clouds stay in the frame budget.
 */
const SCATTER_RING_LIMIT = 5000;
const SCATTER_RECT_LIMIT = 20000;

/**
 * Scatter marks for one series: r≥4 dots with a 2px surface ring, degrading
 * by total point count (ring dropped, then rect fast path). `radiusAt` lets
 * the 3D projection attenuate size with depth; return 0 to skip a point.
 */
const drawScatterPoints = (
	ctx: PaintContext,
	options: {
		color: string;
		surface: string;
		/** The series' point glyph (ignored on the 2×2-rect fast path). */
		shape: PointShape;
		/** Total points across ALL series this paint — the degradation input. */
		totalPointCount: number;
		indexes: readonly number[];
		xAt: (index: number) => number;
		yAt: (index: number) => number;
		radiusAt: (index: number) => number;
	},
): void => {
	const { color, surface, shape, totalPointCount, indexes, xAt, yAt, radiusAt } = options;
	ctx.fillStyle = color;
	if (totalPointCount > SCATTER_RECT_LIMIT) {
		ctx.beginPath();
		for (const index of indexes) {
			if (radiusAt(index) <= 0) {
				continue;
			}
			ctx.rect(xAt(index) - 1, yAt(index) - 1, 2, 2);
		}
		ctx.fill();
		return;
	}
	const drawRing = totalPointCount <= SCATTER_RING_LIMIT;
	ctx.strokeStyle = surface;
	ctx.lineWidth = MARKER_RING;
	for (const index of indexes) {
		const radius = radiusAt(index);
		if (radius <= 0) {
			continue;
		}
		ctx.beginPath();
		tracePointShape(ctx, xAt(index), yAt(index), radius, shape);
		ctx.fill();
		if (drawRing) {
			ctx.stroke();
		}
	}
};

export {
	//,
	drawScatterPoints,
	SCATTER_RECT_LIMIT,
	SCATTER_RING_LIMIT,
};
