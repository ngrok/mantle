import { area as d3Area, curveLinear, curveMonotoneX, curveStep, line as d3Line } from "d3-shape";
import type { CurveKind } from "./types.js";
import type { DecimatedColumns } from "./decimate.js";

/**
 * Canvas 2D draw routines. Fixed mark specs (the loud parts of a chart are
 * the data, never the chrome):
 *
 * - lines: 2px, round join/cap
 * - bars: ≤ 24px thick, 4px rounded data-end, square at the baseline,
 *   2px surface gaps between touching fills
 * - area fills: the series hue at 10% opacity with a 2px band-edge stroke
 * - grid/axes: solid 1px hairlines, one step off the surface, never dashed
 * - markers: r ≥ 4 dots with a 2px surface ring
 *
 * All coordinates are CSS pixels (the engine sets a devicePixelRatio
 * transform). `ctx` never leaks out of this module — the renderer seam is
 * what would let a WebGL backend slot in later.
 *
 * This module is internal shared implementation — not exported from the package.
 */

/**
 * The paintable plot rectangle in CSS pixels.
 */
type PlotRect = {
	left: number;
	top: number;
	width: number;
	height: number;
};

const LINE_WIDTH = 2;
const BAR_MAX_THICKNESS = 24;
const BAR_CORNER_RADIUS = 4;
const BAR_GAP = 2;
const MARKER_RADIUS = 4;
const MARKER_RING = 2;
const AXIS_FONT_SIZE = 11;

const curveFactory = (curve: CurveKind) => {
	if (curve === "monotone") {
		return curveMonotoneX;
	}
	if (curve === "step") {
		return curveStep;
	}
	return curveLinear;
};

/**
 * Align a coordinate to the device grid for crisp 1px hairlines.
 */
const hairline = (position: number): number => Math.round(position) + 0.5;

/**
 * Draw solid hairline gridlines. Each line carries its own alpha — gridlines
 * share the axis labels' fade state so tick churn slides instead of popping.
 */
const drawGrid = (
	ctx: CanvasRenderingContext2D,
	options: {
		plot: PlotRect;
		color: string;
		xLines: ReadonlyArray<{ position: number; alpha: number }>;
		yLines: ReadonlyArray<{ position: number; alpha: number }>;
	},
): void => {
	const { plot, color, xLines, yLines } = options;
	ctx.save();
	ctx.strokeStyle = color;
	ctx.lineWidth = 1;
	for (const line of xLines) {
		ctx.globalAlpha = line.alpha;
		ctx.beginPath();
		ctx.moveTo(hairline(line.position), plot.top);
		ctx.lineTo(hairline(line.position), plot.top + plot.height);
		ctx.stroke();
	}
	for (const line of yLines) {
		ctx.globalAlpha = line.alpha;
		ctx.beginPath();
		ctx.moveTo(plot.left, hairline(line.position));
		ctx.lineTo(plot.left + plot.width, hairline(line.position));
		ctx.stroke();
	}
	ctx.restore();
};

/**
 * Draw the zero baseline bars grow from.
 */
const drawBaseline = (
	ctx: CanvasRenderingContext2D,
	options: { plot: PlotRect; color: string; y: number },
): void => {
	const { plot, color, y } = options;
	ctx.strokeStyle = color;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(plot.left, hairline(y));
	ctx.lineTo(plot.left + plot.width, hairline(y));
	ctx.stroke();
};

/**
 * One bar rectangle in CSS pixels, with rounding only at the data end.
 */
type BarRect = {
	x: number;
	width: number;
	/** Pixel y of the segment edge nearer the baseline. */
	baselineY: number;
	/** Pixel y of the segment edge nearer the data end. */
	valueY: number;
	/** Round the data-end corners (outermost segment of a stack only). */
	rounded: boolean;
};

/**
 * Fill one series' bars as a single batched path (one `fill()` per series).
 * Corner radii collapse as bars get thin (< 8px: square; width is clamped to
 * a minimum of half a pixel so ten-thousand-category charts degrade to a
 * silhouette instead of vanishing).
 */
const drawBars = (
	ctx: CanvasRenderingContext2D,
	options: { color: string; rects: readonly BarRect[] },
): void => {
	const { color, rects } = options;
	ctx.fillStyle = color;
	ctx.beginPath();
	for (const rect of rects) {
		const width = Math.max(0.5, rect.width);
		const top = Math.min(rect.valueY, rect.baselineY);
		const height = Math.abs(rect.baselineY - rect.valueY);
		if (height === 0) {
			continue;
		}
		const radius = rect.rounded && width >= 8 ? Math.min(BAR_CORNER_RADIUS, width / 2, height) : 0;
		if (radius === 0) {
			ctx.rect(rect.x, top, width, height);
			continue;
		}
		const growsUp = rect.valueY <= rect.baselineY;
		if (growsUp) {
			ctx.roundRect(rect.x, top, width, height, [radius, radius, 0, 0]);
		} else {
			ctx.roundRect(rect.x, top, width, height, [0, 0, radius, radius]);
		}
	}
	ctx.fill();
};

/**
 * Accessor-driven full-resolution line stroke via d3-shape (used below the
 * decimation threshold; supports curves and gaps). `indexes` is the ordered
 * list of datum indexes to draw: pass every index for gap semantics (with
 * `definedAt` marking gaps) or a prefiltered finite-only list for
 * `connectNulls`.
 */
const drawLinePath = (
	ctx: CanvasRenderingContext2D,
	options: {
		color: string;
		curve: CurveKind;
		indexes: readonly number[];
		xAt: (index: number) => number;
		yAt: (index: number) => number;
		definedAt: (index: number) => boolean;
	},
): void => {
	const { color, curve, indexes, xAt, yAt, definedAt } = options;
	const path = d3Line<number>()
		.x(xAt)
		.y(yAt)
		.defined(definedAt)
		.curve(curveFactory(curve))
		.context(ctx);
	ctx.strokeStyle = color;
	ctx.lineWidth = LINE_WIDTH;
	ctx.lineJoin = "round";
	ctx.lineCap = "round";
	ctx.beginPath();
	path([...indexes]);
	ctx.stroke();
};

/**
 * Full-resolution area band (between y0 and y1) with a 10% wash fill and a
 * 2px band-edge stroke on the outer boundary.
 */
const drawAreaPath = (
	ctx: CanvasRenderingContext2D,
	options: {
		color: string;
		curve: CurveKind;
		indexes: readonly number[];
		xAt: (index: number) => number;
		y0At: (index: number) => number;
		y1At: (index: number) => number;
		definedAt: (index: number) => boolean;
	},
): void => {
	const { color, curve, indexes, xAt, y0At, y1At, definedAt } = options;
	const areaPath = d3Area<number>()
		.x(xAt)
		.y0(y0At)
		.y1(y1At)
		.defined(definedAt)
		.curve(curveFactory(curve))
		.context(ctx);
	ctx.beginPath();
	areaPath([...indexes]);
	ctx.save();
	ctx.globalAlpha = 0.1;
	ctx.fillStyle = color;
	ctx.fill();
	ctx.restore();
	const edge = d3Line<number>()
		.x(xAt)
		.y(y1At)
		.defined(definedAt)
		.curve(curveFactory(curve))
		.context(ctx);
	ctx.strokeStyle = color;
	ctx.lineWidth = LINE_WIDTH;
	ctx.lineJoin = "round";
	ctx.lineCap = "round";
	ctx.beginPath();
	edge([...indexes]);
	ctx.stroke();
};

/**
 * Decimated line stroke: at most four vertices per device-pixel column
 * (entry, min, max, exit) — O(plot width) regardless of point count.
 * `valueK`/`valueB` map data values to pixel y; `columnToX` maps a column
 * index to pixel x.
 */
const drawDecimatedLine = (
	ctx: CanvasRenderingContext2D,
	options: {
		color: string;
		columns: DecimatedColumns;
		columnToX: (column: number) => number;
		valueK: number;
		valueB: number;
	},
): void => {
	const { color, columns, columnToX, valueK, valueB } = options;
	ctx.strokeStyle = color;
	ctx.lineWidth = LINE_WIDTH;
	ctx.lineJoin = "round";
	ctx.lineCap = "round";
	ctx.beginPath();
	let penDown = false;
	for (let column = 0; column < columns.columnCount; column++) {
		if (columns.hasData[column] === 0) {
			penDown = false;
			continue;
		}
		const x = columnToX(column);
		const inY = (columns.inValue[column] ?? 0) * valueK + valueB;
		const minY = (columns.minValue[column] ?? 0) * valueK + valueB;
		const maxY = (columns.maxValue[column] ?? 0) * valueK + valueB;
		const outY = (columns.outValue[column] ?? 0) * valueK + valueB;
		if (penDown) {
			ctx.lineTo(x, inY);
		} else {
			ctx.moveTo(x, inY);
			penDown = true;
		}
		if (minY !== inY || maxY !== inY) {
			ctx.lineTo(x, minY);
			ctx.lineTo(x, maxY);
		}
		if (outY !== maxY) {
			ctx.lineTo(x, outY);
		}
	}
	ctx.stroke();
};

/**
 * Decimated area band: per column, fill the sliver between the lower
 * boundary's minimum envelope and the upper boundary's maximum envelope,
 * stroking the upper envelope as the band edge.
 */
const drawDecimatedArea = (
	ctx: CanvasRenderingContext2D,
	options: {
		color: string;
		lowerColumns: DecimatedColumns;
		upperColumns: DecimatedColumns;
		columnToX: (column: number) => number;
		valueK: number;
		valueB: number;
	},
): void => {
	const { color, lowerColumns, upperColumns, columnToX, valueK, valueB } = options;
	// Fill per contiguous run of data columns so gap columns stay unpainted —
	// bridging an outage window would fabricate data presence.
	ctx.beginPath();
	let runStart = -1;
	const closeRun = (runEnd: number): void => {
		if (runStart < 0) {
			return;
		}
		let penDown = false;
		for (let column = runStart; column <= runEnd; column++) {
			const x = columnToX(column);
			const y = (upperColumns.maxValue[column] ?? 0) * valueK + valueB;
			if (penDown) {
				ctx.lineTo(x, y);
			} else {
				ctx.moveTo(x, y);
				penDown = true;
			}
		}
		for (let column = runEnd; column >= runStart; column--) {
			const x = columnToX(column);
			const y = (lowerColumns.minValue[column] ?? 0) * valueK + valueB;
			ctx.lineTo(x, y);
		}
		ctx.closePath();
		runStart = -1;
	};
	for (let column = 0; column < upperColumns.columnCount; column++) {
		if (upperColumns.hasData[column] === 0) {
			closeRun(column - 1);
			continue;
		}
		if (runStart < 0) {
			runStart = column;
		}
	}
	closeRun(upperColumns.columnCount - 1);
	ctx.save();
	ctx.globalAlpha = 0.1;
	ctx.fillStyle = color;
	ctx.fill();
	ctx.restore();
	drawDecimatedLine(ctx, { color, columns: upperColumns, columnToX, valueK, valueB });
};

/**
 * Point markers with a 2px surface ring so dots stay legible where they cross
 * lines or each other.
 */
const drawMarkers = (
	ctx: CanvasRenderingContext2D,
	options: {
		color: string;
		surface: string;
		indexes: readonly number[];
		xAt: (index: number) => number;
		yAt: (index: number) => number;
		definedAt: (index: number) => boolean;
	},
): void => {
	const { color, surface, indexes, xAt, yAt, definedAt } = options;
	ctx.fillStyle = color;
	ctx.strokeStyle = surface;
	ctx.lineWidth = MARKER_RING;
	for (const index of indexes) {
		if (!definedAt(index)) {
			continue;
		}
		ctx.beginPath();
		ctx.arc(xAt(index), yAt(index), MARKER_RADIUS, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
	}
};

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
	ctx: CanvasRenderingContext2D,
	options: {
		color: string;
		surface: string;
		/** Total points across ALL series this paint — the degradation input. */
		totalPointCount: number;
		indexes: readonly number[];
		xAt: (index: number) => number;
		yAt: (index: number) => number;
		radiusAt: (index: number) => number;
	},
): void => {
	const { color, surface, totalPointCount, indexes, xAt, yAt, radiusAt } = options;
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
		ctx.arc(xAt(index), yAt(index), radius, 0, Math.PI * 2);
		ctx.fill();
		if (drawRing) {
			ctx.stroke();
		}
	}
};

/**
 * Depth-sorted scatter marks for the 3D projection: `order` lists point slots
 * back-to-front; radii already carry the perspective attenuation. Rings and
 * the rect fast path degrade by count exactly like the 2D scatter.
 */
const drawDepthSortedPoints = (
	ctx: CanvasRenderingContext2D,
	options: {
		count: number;
		order: readonly number[];
		screenX: Float64Array;
		screenY: Float64Array;
		radius: Float64Array;
		colorAt: (slot: number) => string;
		/** Per-slot opacity (series enter reveals) — 1 for settled series. */
		alphaAt: (slot: number) => number;
		surface: string;
	},
): void => {
	const { count, order, screenX, screenY, radius, colorAt, alphaAt, surface } = options;
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
		ctx.arc(screenX[slot] ?? 0, screenY[slot] ?? 0, radius[slot] ?? 0, 0, Math.PI * 2);
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
	ctx: CanvasRenderingContext2D,
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
	ctx: CanvasRenderingContext2D,
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

/**
 * A dashed reference line with an optional right-aligned label above it.
 * Dashing is reserved for thresholds (gridlines stay solid) — the dash is
 * what says "this is a marker, not data".
 */
const drawReferenceLine = (
	ctx: CanvasRenderingContext2D,
	options: {
		plot: PlotRect;
		color: string;
		textColor: string;
		y: number;
		label: string | undefined;
		fontFamily: string;
	},
): void => {
	const { plot, color, textColor, y, label, fontFamily } = options;
	ctx.strokeStyle = color;
	ctx.lineWidth = 1;
	ctx.setLineDash([4, 4]);
	ctx.beginPath();
	ctx.moveTo(plot.left, hairline(y));
	ctx.lineTo(plot.left + plot.width, hairline(y));
	ctx.stroke();
	ctx.setLineDash([]);
	if (label != null && label.length > 0) {
		ctx.font = `${AXIS_FONT_SIZE}px ${fontFamily}`;
		ctx.fillStyle = textColor;
		ctx.textAlign = "right";
		ctx.textBaseline = "bottom";
		ctx.fillText(label, plot.left + plot.width - 4, y - 3);
	}
};

/**
 * Axis tick labels: y labels right-aligned in the left gutter, x labels
 * centered under their positions. Callers pre-thin x labels to avoid
 * collisions (skip, never rotate); per-label alpha carries the fade state so
 * entering/exiting ticks slide instead of popping.
 */
const drawAxisLabels = (
	ctx: CanvasRenderingContext2D,
	options: {
		plot: PlotRect;
		color: string;
		fontFamily: string;
		xLabels: ReadonlyArray<{ position: number; text: string; alpha: number }>;
		yLabels: ReadonlyArray<{ position: number; text: string; alpha: number }>;
	},
): void => {
	const { plot, color, fontFamily, xLabels, yLabels } = options;
	ctx.save();
	ctx.font = `${AXIS_FONT_SIZE}px ${fontFamily}`;
	ctx.fillStyle = color;
	ctx.textAlign = "right";
	ctx.textBaseline = "middle";
	for (const label of yLabels) {
		ctx.globalAlpha = label.alpha;
		ctx.fillText(label.text, plot.left - 8, label.position);
	}
	ctx.textAlign = "center";
	ctx.textBaseline = "top";
	for (const label of xLabels) {
		ctx.globalAlpha = label.alpha;
		ctx.fillText(label.text, label.position, plot.top + plot.height + 8);
	}
	ctx.restore();
};

export type {
	//,
	BarRect,
	PlotRect,
};
export {
	//,
	AXIS_FONT_SIZE,
	BAR_CORNER_RADIUS,
	BAR_GAP,
	BAR_MAX_THICKNESS,
	drawAreaPath,
	drawAxisLabels,
	drawBars,
	drawBaseline,
	drawCubeAxisLabels,
	drawCubeFrame,
	drawDecimatedArea,
	drawDepthSortedPoints,
	drawDecimatedLine,
	drawGrid,
	drawLinePath,
	drawMarkers,
	drawReferenceLine,
	drawScatterPoints,
	hairline,
	LINE_WIDTH,
	MARKER_RADIUS,
};
