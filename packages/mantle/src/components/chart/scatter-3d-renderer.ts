import type { PaintContext } from "./paint-backend.js";
import type { PlotRect } from "./renderer.js";
import { AXIS_FONT_SIZE, MARKER_RING, tracePointShape } from "./renderer.js";
import { SCATTER_RECT_LIMIT, SCATTER_RING_LIMIT } from "./scatter-renderer.js";
import type { PointShape } from "./types.js";

/**
 * The 3D scatter plot's draw routines over a {@link PaintContext}: the
 * depth-sorted cloud, the cube frame, and the frame's axis labels. Only
 * `scatter-3d.ts` imports this module, so it loads with the 3D code.
 *
 * This module is internal shared implementation — not exported from the package.
 */

/**
 * The subset of the 2D context {@link drawCubeFrame} strokes with. It is
 * structural, so unit tests can record calls without type assertions.
 */
type CubeFrameContext = Pick<
	PaintContext,
	| "save"
	| "restore"
	| "beginPath"
	| "moveTo"
	| "lineTo"
	| "stroke"
	| "globalAlpha"
	| "strokeStyle"
	| "lineWidth"
>;

/**
 * Depth-sorted scatter marks for the 3D projection: `order` lists point slots
 * back-to-front; radii already carry the perspective attenuation. Rings and
 * the rect fast path degrade by count exactly like the 2D scatter.
 */
const drawDepthSortedPoints = (
	ctx: PaintContext,
	options: {
		count: number;
		order: Iterable<number>;
		screenX: Float64Array;
		screenY: Float64Array;
		radius: Float64Array;
		colorAt: (slot: number) => string;
		/** Per-slot point glyph (ignored on the rect fast path). */
		shapeAt: (slot: number) => PointShape;
		/** Per-slot opacity (series enter reveals) — 1 for settled series. */
		alphaAt: (slot: number) => number;
		surface: string;
	},
): void => {
	const { count, order, screenX, screenY, radius, colorAt, shapeAt, alphaAt, surface } = options;
	ctx.save();
	if (count > SCATTER_RECT_LIMIT) {
		let currentColor = "";
		let currentAlpha = -1;
		for (const slot of order) {
			const color = colorAt(slot);
			if (color !== currentColor) {
				ctx.fillStyle = color;
				currentColor = color;
			}
			const alpha = alphaAt(slot);
			if (alpha !== currentAlpha) {
				ctx.globalAlpha = alpha;
				currentAlpha = alpha;
			}
			const size = Math.max(1, (radius[slot] ?? 0) / 2);
			ctx.fillRect((screenX[slot] ?? 0) - size / 2, (screenY[slot] ?? 0) - size / 2, size, size);
		}
		ctx.restore();
		return;
	}
	const drawRing = count <= SCATTER_RING_LIMIT;
	ctx.strokeStyle = surface;
	ctx.lineWidth = MARKER_RING;
	let currentColor = "";
	let currentAlpha = -1;
	for (const slot of order) {
		const color = colorAt(slot);
		if (color !== currentColor) {
			ctx.fillStyle = color;
			currentColor = color;
		}
		const alpha = alphaAt(slot);
		if (alpha !== currentAlpha) {
			ctx.globalAlpha = alpha;
			currentAlpha = alpha;
		}
		ctx.beginPath();
		tracePointShape(ctx, screenX[slot] ?? 0, screenY[slot] ?? 0, radius[slot] ?? 0, shapeAt(slot));
		ctx.fill();
		if (drawRing) {
			ctx.stroke();
		}
	}
	ctx.restore();
};

/**
 * The 3D scatter's orientation frame: the cube wireframe as hairlines, with
 * the three origin-corner axis edges emphasized in the axis color and
 * labeled.
 */
const drawCubeFrame = (
	ctx: CubeFrameContext,
	options: {
		gridColor: string;
		axisColor: string;
		/** The projected screen positions of the cube's 8 corners. */
		corners: ReadonlyArray<{ x: number; y: number }>;
		edges: ReadonlyArray<readonly [number, number]>;
		/** Wireframe opacity — fades with the 3rd dimension during the morph. */
		cubeAlpha: number;
		/** Axis lines with pre-projected screen endpoints (they travel with the
		 * dimensions morph, hugging the collapsed line/plane). */
		axes: ReadonlyArray<{
			label: string;
			alpha: number;
			from: { x: number; y: number };
			to: { x: number; y: number };
		}>;
	},
): void => {
	const { gridColor, axisColor, corners, edges, cubeAlpha, axes } = options;
	ctx.save();
	if (cubeAlpha > 0.01) {
		ctx.globalAlpha = cubeAlpha;
		ctx.strokeStyle = gridColor;
		ctx.lineWidth = 1;
		ctx.beginPath();
		for (const [from, to] of edges) {
			const start = corners[from];
			const end = corners[to];
			if (start == null || end == null) {
				continue;
			}
			ctx.moveTo(start.x, start.y);
			ctx.lineTo(end.x, end.y);
		}
		ctx.stroke();
	}

	ctx.strokeStyle = axisColor;
	for (const { alpha, from, to } of axes) {
		if (alpha <= 0.01) {
			continue;
		}
		ctx.globalAlpha = alpha;
		ctx.beginPath();
		ctx.moveTo(from.x, from.y);
		ctx.lineTo(to.x, to.y);
		ctx.stroke();
	}
	ctx.restore();
};

/**
 * Axis-name labels for the 3D frame, drawn AFTER the points so they stay
 * readable, each placed a fixed distance past whichever end of its axis sits
 * farther from the frame's center — outside the cube, never over the cloud.
 */
const drawCubeAxisLabels = (
	ctx: PaintContext,
	options: {
		textColor: string;
		fontFamily: string;
		plot: PlotRect;
		center: { x: number; y: number };
		axes: ReadonlyArray<{
			label: string;
			alpha: number;
			from: { x: number; y: number };
			to: { x: number; y: number };
		}>;
	},
): void => {
	const { textColor, fontFamily, plot, center, axes } = options;
	ctx.save();
	ctx.fillStyle = textColor;
	ctx.font = `${AXIS_FONT_SIZE}px ${fontFamily}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	for (const { label, alpha, from, to } of axes) {
		if (alpha <= 0.01) {
			continue;
		}
		const fromDistance = Math.hypot(from.x - center.x, from.y - center.y);
		const toDistance = Math.hypot(to.x - center.x, to.y - center.y);
		const anchor = toDistance >= fromDistance ? to : from;
		const other = toDistance >= fromDistance ? from : to;
		const length = Math.max(1, Math.hypot(anchor.x - other.x, anchor.y - other.y));
		const offsetX = ((anchor.x - other.x) / length) * 16;
		const offsetY = ((anchor.y - other.y) / length) * 16;
		const labelX = Math.min(
			plot.left + plot.width - 8,
			Math.max(plot.left + 8, anchor.x + offsetX),
		);
		const labelY = Math.min(plot.top + plot.height - 6, Math.max(plot.top + 6, anchor.y + offsetY));
		ctx.globalAlpha = alpha;
		ctx.fillText(label, labelX, labelY);
	}
	ctx.restore();
};

export {
	//,
	drawCubeAxisLabels,
	drawCubeFrame,
	drawDepthSortedPoints,
};
