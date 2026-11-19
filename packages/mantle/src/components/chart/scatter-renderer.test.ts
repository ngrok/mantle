import { describe, expect, test } from "vitest";
import { tracePointShape } from "./renderer.js";
import { drawScatterPoints } from "./scatter-renderer.js";
import type { PaintCall } from "../../test-utils/recording-paint-context.js";
import { recordingPaintContext } from "../../test-utils/recording-paint-context.js";
import type { PointShape } from "./types.js";

/**
 * The calls `drawScatterPoints` makes for a series of two points in the ringed
 * tier: (10, 20) at radius 4, then (40, 25) at radius 5.
 */
const pointCalls = (shape: PointShape): PaintCall[] => {
	const { context, calls } = recordingPaintContext();
	drawScatterPoints(context, {
		color: "red",
		surface: "white",
		shape,
		totalPointCount: 2,
		indexes: [0, 1],
		xAt: (index) => 10 + index * 30,
		yAt: (index) => 20 + index * 5,
		radiusAt: (index) => 4 + index,
	});
	return calls;
};

/** The calls `tracePointShape` makes for one glyph. */
const tracedCalls = (
	shape: PointShape,
	point: { x: number; y: number; radius: number },
): PaintCall[] => {
	const { context, calls } = recordingPaintContext();
	tracePointShape(context, point.x, point.y, point.radius, shape);
	return calls;
};

describe("drawScatterPoints", () => {
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
