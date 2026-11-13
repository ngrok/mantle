// Ported from d3-shape 3.2.1 (ISC License, Copyright 2010-2026 Mike Bostock).
// The charts trace lines and areas with this port, so no chart bundle ships d3-shape.
import type { PaintContext } from "./paint-backend.js";
import type { CurveKind } from "./types.js";

/**
 * The line and area paths of a chart: d3-shape's `line` and `area` generators
 * with its `curveLinear`, `curveStep`, and `curveMonotoneX` curves. For one
 * input, a trace sends the context the calls d3-shape sends: the same
 * commands, in the same order, with the same numbers.
 *
 * This module is internal shared implementation, not exported from the package.
 */

/**
 * The path calls a trace makes. The type is structural, so a unit test can
 * record the calls without a type assertion.
 */
type PathContext = Pick<PaintContext, "moveTo" | "lineTo" | "bezierCurveTo" | "closePath">;

/** The points of one run, in the order a curve traces them. */
type Run = {
	/** The datum indexes that `from` and `to` are positions in. */
	indexes: readonly number[];
	/** The position of the first point. */
	from: number;
	/** The position of the last point. It is below `from` on an area's way back along `y0At`. */
	to: number;
	xAt: (index: number) => number;
	yAt: (index: number) => number;
	/** Whether a line joins the current point to the first point. When `false`, the run starts a subpath. */
	joined: boolean;
};

/** Traces one run, and returns how many points the curve drew. */
type CurveTracer = (ctx: PathContext, run: Run) => number;

/** Start a run at (x, y). When `joined`, a line joins the current point to it; otherwise it starts a subpath. */
const startRun = (ctx: PathContext, x: number, y: number, joined: boolean): void => {
	if (joined) {
		ctx.lineTo(x, y);
	} else {
		ctx.moveTo(x, y);
	}
};

/** d3-shape's `curveLinear`: a straight segment between each two points. */
const traceLinear: CurveTracer = (ctx, { indexes, from, to, xAt, yAt, joined }) => {
	const direction = to < from ? -1 : 1;
	let count = 0;
	for (let position = from; position !== to + direction; position += direction) {
		const index = indexes[position];
		if (index == null) {
			continue;
		}
		if (count === 0) {
			startRun(ctx, xAt(index), yAt(index), joined);
		} else {
			ctx.lineTo(xAt(index), yAt(index));
		}
		count += 1;
	}
	return count;
};

/** d3-shape's `curveStep`: each interval changes y at its middle x. */
const traceStep: CurveTracer = (ctx, { indexes, from, to, xAt, yAt, joined }) => {
	const direction = to < from ? -1 : 1;
	let count = 0;
	let previousX = Number.NaN;
	let previousY = Number.NaN;
	for (let position = from; position !== to + direction; position += direction) {
		const index = indexes[position];
		if (index == null) {
			continue;
		}
		const x = xAt(index);
		const y = yAt(index);
		if (count === 0) {
			startRun(ctx, x, y, joined);
		} else {
			const middleX = previousX * 0.5 + x * 0.5;
			ctx.lineTo(middleX, previousY);
			ctx.lineTo(middleX, y);
		}
		count += 1;
		previousX = x;
		previousY = y;
	}
	if (count > 1) {
		ctx.lineTo(previousX, previousY);
	}
	return count;
};

/** d3-shape's `sign`: `-1` below zero, and `1` for every other value, zero and `NaN` included. */
const sign = (value: number): number => (value < 0 ? -1 : 1);

/**
 * The slope at (x1, y1), the middle of three points, by Steffen's monotone
 * method (Astronomy and Astrophysics 239, 1990). The names are the paper's:
 *
 * - `h`: the width of an interval
 * - `s`: the slope of the line across an interval
 * - `p`: the slope of the parabola through all three points
 */
const slope3 = (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): number => {
	const h0 = x1 - x0;
	const h1 = x2 - x1;
	// Why the signed zero: an interval of zero width makes the line vertical.
	// The sign of the other width gives its infinite slope a direction.
	const s0 = (y1 - y0) / (h0 || (h1 < 0 ? -0 : 0));
	const s1 = (y2 - y1) / (h1 || (h0 < 0 ? -0 : 0));
	const p = (s0 * h1 + s1 * h0) / (h0 + h1);
	return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
};

/**
 * The one-sided slope at an end point of a run, from the slope `t` at the
 * other end of its interval.
 */
const slope2 = (x0: number, y0: number, x1: number, y1: number, t: number): number => {
	const h = x1 - x0;
	return h ? ((3 * (y1 - y0)) / h - t) / 2 : t;
};

/**
 * Trace the cubic from (x0, y0) to (x1, y1) that has the slopes `t0` and `t1`
 * at its ends. Each Bézier control point sits a third of the width in from its
 * end, on the slope of that end.
 */
const traceCubic = (
	ctx: PathContext,
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	t0: number,
	t1: number,
): void => {
	const dx = (x1 - x0) / 3;
	ctx.bezierCurveTo(x0 + dx, y0 + dx * t0, x1 - dx, y1 - dx * t1, x1, y1);
};

/**
 * d3-shape's `curveMonotoneX`: a cubic spline that keeps y monotone between
 * each two points, so the curve never overshoots the data.
 */
const traceMonotone: CurveTracer = (ctx, { indexes, from, to, xAt, yAt, joined }) => {
	const direction = to < from ? -1 : 1;
	let count = 0;
	let x0 = Number.NaN;
	let y0 = Number.NaN;
	let x1 = Number.NaN;
	let y1 = Number.NaN;
	let t0 = Number.NaN;
	for (let position = from; position !== to + direction; position += direction) {
		const index = indexes[position];
		if (index == null) {
			continue;
		}
		const x = xAt(index);
		const y = yAt(index);
		// Why skip a point equal to the one before it: an interval of zero length has no slope.
		if (x === x1 && y === y1) {
			continue;
		}
		if (count === 0) {
			startRun(ctx, x, y, joined);
		} else if (count > 1) {
			// Why one point late: the slope at (x1, y1) needs the point after it.
			const t1 = slope3(x0, y0, x1, y1, x, y);
			traceCubic(ctx, x0, y0, x1, y1, count === 2 ? slope2(x0, y0, x1, y1, t1) : t0, t1);
			t0 = t1;
		}
		count += 1;
		x0 = x1;
		y0 = y1;
		x1 = x;
		y1 = y;
	}
	if (count === 2) {
		ctx.lineTo(x1, y1);
	} else if (count > 2) {
		traceCubic(ctx, x0, y0, x1, y1, t0, slope2(x0, y0, x1, y1, t0));
	}
	return count;
};

/**
 * The tracer of one curve. Why no lookup table: untyped code can pass a value
 * outside `CurveKind`, and that value must draw straight segments.
 */
const curveTracer = (curve: CurveKind): CurveTracer => {
	if (curve === "monotone") {
		return traceMonotone;
	}
	if (curve === "step") {
		return traceStep;
	}
	return traceLinear;
};

/**
 * Call `onRun` with the first and the last position of each run in `indexes`.
 * A run is the defined points between two gaps.
 */
const forEachRun = (
	indexes: readonly number[],
	definedAt: (index: number) => boolean,
	onRun: (from: number, to: number) => void,
): void => {
	let from: number | null = null;
	// Why one position past the end: it ends a run that holds the last index.
	for (let position = 0; position <= indexes.length; position++) {
		const index = indexes[position];
		if (index != null && definedAt(index)) {
			from ??= position;
		} else if (from != null) {
			onRun(from, position - 1);
			from = null;
		}
	}
};

/**
 * Trace a line through the defined points of `indexes` into the current path
 * of `ctx`, as d3-shape's `line` generator does. Each run of defined points is
 * one subpath, so a `false` from `definedAt` leaves a gap. A list of only the
 * defined indexes joins the line across the gaps.
 *
 * @example
 * ```ts
 * ctx.beginPath();
 * traceLine(ctx, { curve: "monotone", indexes: [0, 1, 2], xAt, yAt, definedAt });
 * ctx.stroke();
 * ```
 */
const traceLine = (
	ctx: PathContext,
	options: {
		curve: CurveKind;
		/** The datum indexes to draw, in order. */
		indexes: readonly number[];
		xAt: (index: number) => number;
		yAt: (index: number) => number;
		/** Whether the datum has a point. */
		definedAt: (index: number) => boolean;
	},
): void => {
	const { curve, indexes, xAt, yAt, definedAt } = options;
	const trace = curveTracer(curve);
	forEachRun(indexes, definedAt, (from, to) => {
		const count = trace(ctx, { indexes, from, to, xAt, yAt, joined: false });
		// Why close a run of one point: under round caps a closed point paints a
		// dot. An open point paints nothing.
		if (count === 1) {
			ctx.closePath();
		}
	});
};

/**
 * Trace the band between `y0At` and `y1At` into the current path of `ctx`, as
 * d3-shape's `area` generator does. Each run of defined points is one closed
 * subpath: forward along `y1At`, then back along `y0At`.
 *
 * `xAt` must return the same value each time for one index, because the way
 * back reads it again.
 *
 * @example
 * ```ts
 * ctx.beginPath();
 * traceArea(ctx, { curve: "linear", indexes: [0, 1, 2], xAt, y0At, y1At, definedAt });
 * ctx.fill();
 * ```
 */
const traceArea = (
	ctx: PathContext,
	options: {
		curve: CurveKind;
		/** The datum indexes to draw, in order. */
		indexes: readonly number[];
		xAt: (index: number) => number;
		/** The y of the band's baseline edge. */
		y0At: (index: number) => number;
		/** The y of the band's data edge. */
		y1At: (index: number) => number;
		/** Whether the datum has a point. */
		definedAt: (index: number) => boolean;
	},
): void => {
	const { curve, indexes, xAt, y0At, y1At, definedAt } = options;
	const trace = curveTracer(curve);
	forEachRun(indexes, definedAt, (from, to) => {
		trace(ctx, { indexes, from, to, xAt, yAt: y1At, joined: false });
		trace(ctx, { indexes, from: to, to: from, xAt, yAt: y0At, joined: true });
		ctx.closePath();
	});
};

export {
	//,
	traceArea,
	traceLine,
};
