import { describe, expect, test } from "vitest";
import type { PaintContext } from "./paint-backend.js";
import { tracePointShape } from "./renderer.js";
import { drawDepthSortedPoints } from "./scatter-3d-renderer.js";
import type { PointShape } from "./types.js";

/** One call on the paint context: the method name, then its arguments. */
type PaintCall = [method: string, ...args: unknown[]];

/** A paint context that records each call it gets. */
const recordingContext = (): { context: PaintContext; calls: PaintCall[] } => {
	const calls: PaintCall[] = [];
	const record =
		(method: string) =>
		(...args: unknown[]): void => {
			calls.push([method, ...args]);
		};
	const context: PaintContext = {
		fillStyle: "",
		strokeStyle: "",
		lineWidth: 1,
		globalAlpha: 1,
		lineJoin: "miter",
		lineCap: "butt",
		font: "",
		textAlign: "start",
		textBaseline: "alphabetic",
		save: record("save"),
		restore: record("restore"),
		beginPath: record("beginPath"),
		closePath: record("closePath"),
		moveTo: record("moveTo"),
		lineTo: record("lineTo"),
		bezierCurveTo: record("bezierCurveTo"),
		rect: record("rect"),
		roundRect: record("roundRect"),
		arc: record("arc"),
		fill: record("fill"),
		stroke: record("stroke"),
		fillRect: record("fillRect"),
		clip: record("clip"),
		setLineDash: record("setLineDash"),
		fillText: record("fillText"),
		measureText: () => ({ width: 0 }),
	};
	return { context, calls };
};

/**
 * The calls `drawDepthSortedPoints` makes for a cloud of two points in the
 * ringed tier: (10, 20) at radius 4, then (40, 25) at radius 5. The list leaves
 * out the `save` and the `restore` around them.
 */
const pointCalls = (shape: PointShape): PaintCall[] => {
	const { context, calls } = recordingContext();
	drawDepthSortedPoints(context, {
		count: 2,
		order: [0, 1],
		screenX: Float64Array.from([10, 40]),
		screenY: Float64Array.from([20, 25]),
		radius: Float64Array.from([4, 5]),
		colorAt: () => "red",
		shapeAt: () => shape,
		alphaAt: () => 1,
		surface: "white",
	});
	return calls.filter(([method]) => method !== "save" && method !== "restore");
};

/** The calls `tracePointShape` makes for one glyph. */
const tracedCalls = (
	shape: PointShape,
	point: { x: number; y: number; radius: number },
): PaintCall[] => {
	const { context, calls } = recordingContext();
	tracePointShape(context, point.x, point.y, point.radius, shape);
	return calls;
};

describe("drawDepthSortedPoints", () => {
	// Why the call list: the calls on the paint context are the output of a draw
	// routine, not a count of its internal calls.
	test("a ringed circle is its own path of one `arc`, with no `moveTo`", () => {
		expect(pointCalls("circle")).toEqual([
			["beginPath"],
			["arc", 10, 20, 4, 0, Math.PI * 2],
			["fill"],
			["stroke"],
			["beginPath"],
			["arc", 40, 25, 5, 0, Math.PI * 2],
			["fill"],
			["stroke"],
		]);
	});

	test("a ringed square is its own path, the one that `tracePointShape` traces", () => {
		expect(pointCalls("square")).toEqual([
			["beginPath"],
			...tracedCalls("square", { x: 10, y: 20, radius: 4 }),
			["fill"],
			["stroke"],
			["beginPath"],
			...tracedCalls("square", { x: 40, y: 25, radius: 5 }),
			["fill"],
			["stroke"],
		]);
	});
});
