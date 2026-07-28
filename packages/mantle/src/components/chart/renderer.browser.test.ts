import { describe, expect, test, vi } from "vitest";
import type { DecimatedColumns } from "./decimate.js";
import type { BarRect, HorizontalBarRect } from "./renderer.js";
import { drawBars, drawDecimatedArea, drawDecimatedLine, drawHorizontalBars } from "./renderer.js";

/**
 * Geometry tests for the batched paint routines: bar corner/width clamping and
 * the decimated line/area pen bookkeeping. These take a real
 * `CanvasRenderingContext2D` (happy-dom's `getContext("2d")` returns `null`),
 * so they run in browser mode and record the path ops the renderer emits
 * instead of sampling pixels — a bridged gap or a corner rounded at the wrong
 * end is invisible to ink counting.
 */

type PathOp = { op: string; args: number[]; radii?: number[] };

/**
 * A real 2D context whose path-building methods record instead of rasterize,
 * plus the `beginPath`/`fill`/`stroke` spies that pin the batching contract
 * (one path and one fill per series).
 */
const makeRecorder = () => {
	const canvas = document.createElement("canvas");
	canvas.width = 200;
	canvas.height = 200;
	const context = canvas.getContext("2d");
	if (context == null) {
		throw new Error("expected a real 2d context in browser mode");
	}
	const ops: PathOp[] = [];
	vi.spyOn(context, "moveTo").mockImplementation((x, y) => {
		ops.push({ op: "moveTo", args: [x, y] });
	});
	vi.spyOn(context, "lineTo").mockImplementation((x, y) => {
		ops.push({ op: "lineTo", args: [x, y] });
	});
	vi.spyOn(context, "rect").mockImplementation((x, y, width, height) => {
		ops.push({ op: "rect", args: [x, y, width, height] });
	});
	vi.spyOn(context, "roundRect").mockImplementation((x, y, width, height, radii) => {
		ops.push({
			op: "roundRect",
			args: [x, y, width, height],
			radii: Array.isArray(radii) ? radii.filter((value) => typeof value === "number") : [],
		});
	});
	vi.spyOn(context, "closePath").mockImplementation(() => {
		ops.push({ op: "closePath", args: [] });
	});
	return {
		context,
		ops,
		beginPath: vi.spyOn(context, "beginPath").mockImplementation(() => {}),
		fill: vi.spyOn(context, "fill").mockImplementation(() => {}),
		stroke: vi.spyOn(context, "stroke").mockImplementation(() => {}),
	};
};

const barRect = (overrides: Partial<BarRect> = {}): BarRect => ({
	x: 10,
	width: 20,
	baselineY: 100,
	valueY: 40,
	rounded: true,
	...overrides,
});

const horizontalBarRect = (overrides: Partial<HorizontalBarRect> = {}): HorizontalBarRect => ({
	y: 10,
	height: 20,
	baselineX: 40,
	valueX: 100,
	rounded: true,
	...overrides,
});

describe("drawBars", () => {
	test("a positive bar rounds only the two corners at its data end", () => {
		const recorder = makeRecorder();
		drawBars(recorder.context, { fill: "#3e6ff4", rects: [barRect()] });
		expect(recorder.ops).toEqual([
			{ op: "roundRect", args: [10, 40, 20, 60], radii: [4, 4, 0, 0] },
		]);
		// One path, one fill for the whole series.
		expect(recorder.beginPath).toHaveBeenCalledTimes(1);
		expect(recorder.fill).toHaveBeenCalledTimes(1);
	});

	test("a negative bar rounds its data end below the baseline, not the baseline end", () => {
		const recorder = makeRecorder();
		drawBars(recorder.context, {
			fill: "#3e6ff4",
			rects: [barRect({ baselineY: 100, valueY: 160 })],
		});
		expect(recorder.ops).toEqual([
			{ op: "roundRect", args: [10, 100, 20, 60], radii: [0, 0, 4, 4] },
		]);
	});

	test("a bar sitting exactly on the baseline paints nothing", () => {
		const recorder = makeRecorder();
		drawBars(recorder.context, {
			fill: "#3e6ff4",
			rects: [barRect({ baselineY: 100, valueY: 100 }), barRect({ x: 40 })],
		});
		// Only the second, non-zero bar contributes geometry.
		expect(recorder.ops).toEqual([
			{ op: "roundRect", args: [40, 40, 20, 60], radii: [4, 4, 0, 0] },
		]);
	});

	test("bars thinner than 8px go square, and never thinner than half a pixel", () => {
		// Ten-thousand-category charts degrade to a silhouette instead of vanishing.
		const recorder = makeRecorder();
		drawBars(recorder.context, {
			fill: "#3e6ff4",
			rects: [
				barRect({ x: 0, width: 0.2 }),
				barRect({ x: 20, width: 7.9 }),
				barRect({ x: 40, width: 8 }),
			],
		});
		expect(recorder.ops).toEqual([
			{ op: "rect", args: [0, 40, 0.5, 60] },
			{ op: "rect", args: [20, 40, 7.9, 60] },
			{ op: "roundRect", args: [40, 40, 8, 60], radii: [4, 4, 0, 0] },
		]);
	});

	test("the corner radius collapses to fit a short bar", () => {
		const recorder = makeRecorder();
		drawBars(recorder.context, {
			fill: "#3e6ff4",
			rects: [barRect({ baselineY: 100, valueY: 98 })],
		});
		expect(recorder.ops).toEqual([{ op: "roundRect", args: [10, 98, 20, 2], radii: [2, 2, 0, 0] }]);
	});

	test("inner stack segments opt out of rounding", () => {
		const recorder = makeRecorder();
		drawBars(recorder.context, { fill: "#3e6ff4", rects: [barRect({ rounded: false })] });
		expect(recorder.ops).toEqual([{ op: "rect", args: [10, 40, 20, 60] }]);
	});
});

describe("drawHorizontalBars", () => {
	test("a rightward bar rounds only its right end", () => {
		const recorder = makeRecorder();
		drawHorizontalBars(recorder.context, { fill: "#3e6ff4", rects: [horizontalBarRect()] });
		expect(recorder.ops).toEqual([
			{ op: "roundRect", args: [40, 10, 60, 20], radii: [0, 4, 4, 0] },
		]);
		expect(recorder.fill).toHaveBeenCalledTimes(1);
	});

	test("a leftward (negative) bar rounds its left end", () => {
		const recorder = makeRecorder();
		drawHorizontalBars(recorder.context, {
			fill: "#3e6ff4",
			rects: [horizontalBarRect({ baselineX: 100, valueX: 40 })],
		});
		expect(recorder.ops).toEqual([
			{ op: "roundRect", args: [40, 10, 60, 20], radii: [4, 0, 0, 4] },
		]);
	});

	test("a zero-value bar paints nothing, and thin bars go square at a half-pixel floor", () => {
		const recorder = makeRecorder();
		drawHorizontalBars(recorder.context, {
			fill: "#3e6ff4",
			rects: [
				horizontalBarRect({ baselineX: 40, valueX: 40 }),
				horizontalBarRect({ y: 30, height: 0.2 }),
				horizontalBarRect({ y: 60, height: 8 }),
			],
		});
		expect(recorder.ops).toEqual([
			{ op: "rect", args: [40, 30, 60, 0.5] },
			{ op: "roundRect", args: [40, 60, 60, 8], radii: [0, 4, 4, 0] },
		]);
	});
});

/**
 * Five device-pixel columns with an outage at column 2, mapped 10px apart with
 * an identity value→pixel transform so the recorded coordinates read as
 * `(column * 10, value)`.
 */
const gappedColumns = (options: {
	minValue: number[];
	maxValue: number[];
	inValue?: number[];
	outValue?: number[];
}): DecimatedColumns => ({
	columnCount: 5,
	hasData: new Uint8Array([1, 1, 0, 1, 1]),
	minValue: new Float64Array(options.minValue),
	maxValue: new Float64Array(options.maxValue),
	inValue: new Float64Array(options.inValue ?? options.minValue),
	outValue: new Float64Array(options.outValue ?? options.maxValue),
});

const columnToX = (column: number): number => column * 10;

describe("drawDecimatedLine", () => {
	test("the pen lifts across a gap and the min/max sliver is emitted only where it exists", () => {
		const recorder = makeRecorder();
		drawDecimatedLine(recorder.context, {
			color: "#3e6ff4",
			columns: {
				columnCount: 5,
				hasData: new Uint8Array([1, 1, 0, 1, 1]),
				// Column 1 spans 0..5 entering at 2 and leaving at 3; every other
				// column carries a single value, so it needs no sliver.
				inValue: new Float64Array([1, 2, 0, 4, 6]),
				minValue: new Float64Array([1, 0, 0, 4, 6]),
				maxValue: new Float64Array([1, 5, 0, 4, 6]),
				outValue: new Float64Array([1, 3, 0, 4, 6]),
			},
			columnToX,
			valueK: 1,
			valueB: 0,
		});
		expect(recorder.ops).toEqual([
			{ op: "moveTo", args: [0, 1] },
			{ op: "lineTo", args: [10, 2] },
			// The column's vertical extent, then its exit value.
			{ op: "lineTo", args: [10, 0] },
			{ op: "lineTo", args: [10, 5] },
			{ op: "lineTo", args: [10, 3] },
			// The gap at column 2 lifts the pen: column 3 starts a new subpath
			// instead of bridging the outage.
			{ op: "moveTo", args: [30, 4] },
			{ op: "lineTo", args: [40, 6] },
		]);
		expect(recorder.stroke).toHaveBeenCalledTimes(1);
	});

	test("value coefficients map data space onto pixels", () => {
		const recorder = makeRecorder();
		drawDecimatedLine(recorder.context, {
			color: "#3e6ff4",
			columns: {
				columnCount: 2,
				hasData: new Uint8Array([1, 1]),
				inValue: new Float64Array([0, 10]),
				minValue: new Float64Array([0, 10]),
				maxValue: new Float64Array([0, 10]),
				outValue: new Float64Array([0, 10]),
			},
			columnToX,
			// A flipped axis: value 0 sits at the plot bottom (y = 100).
			valueK: -2,
			valueB: 100,
		});
		expect(recorder.ops).toEqual([
			{ op: "moveTo", args: [0, 100] },
			{ op: "lineTo", args: [10, 80] },
		]);
	});
});

describe("drawDecimatedArea", () => {
	test("each contiguous run of data columns is its own closed fill — a gap is never bridged", () => {
		// Regression guard: a single sweep over all columns would paint a solid
		// band across an outage window and fabricate data presence.
		const recorder = makeRecorder();
		drawDecimatedArea(recorder.context, {
			color: "#3e6ff4",
			lowerColumns: gappedColumns({
				minValue: [0, 1, 0, 3, 4],
				maxValue: [0, 1, 0, 3, 4],
			}),
			upperColumns: gappedColumns({
				minValue: [10, 11, 0, 13, 14],
				maxValue: [10, 11, 0, 13, 14],
			}),
			columnToX,
			valueK: 1,
			valueB: 0,
		});
		const lastClose = recorder.ops.map((op) => op.op).lastIndexOf("closePath");
		expect(recorder.ops.slice(0, lastClose + 1)).toEqual([
			// Run one: columns 0..1 out along the upper envelope, back along the lower.
			{ op: "moveTo", args: [0, 10] },
			{ op: "lineTo", args: [10, 11] },
			{ op: "lineTo", args: [10, 1] },
			{ op: "lineTo", args: [0, 0] },
			{ op: "closePath", args: [] },
			// Run two: columns 3..4, a separate subpath across the gap at column 2.
			{ op: "moveTo", args: [30, 13] },
			{ op: "lineTo", args: [40, 14] },
			{ op: "lineTo", args: [40, 4] },
			{ op: "lineTo", args: [30, 3] },
			{ op: "closePath", args: [] },
		]);
		// The gap column's x is never visited, by the fill or the band-edge stroke.
		expect(recorder.ops.filter((op) => op.args[0] === 20)).toEqual([]);
		expect(recorder.fill).toHaveBeenCalledTimes(1);
		// The upper envelope is stroked as the band edge.
		expect(recorder.stroke).toHaveBeenCalledTimes(1);
	});

	test("a fully populated column range is one closed run", () => {
		const recorder = makeRecorder();
		drawDecimatedArea(recorder.context, {
			color: "#3e6ff4",
			lowerColumns: {
				columnCount: 3,
				hasData: new Uint8Array([1, 1, 1]),
				inValue: new Float64Array([0, 0, 0]),
				minValue: new Float64Array([0, 1, 2]),
				maxValue: new Float64Array([0, 1, 2]),
				outValue: new Float64Array([0, 1, 2]),
			},
			upperColumns: {
				columnCount: 3,
				hasData: new Uint8Array([1, 1, 1]),
				inValue: new Float64Array([10, 11, 12]),
				minValue: new Float64Array([10, 11, 12]),
				maxValue: new Float64Array([10, 11, 12]),
				outValue: new Float64Array([10, 11, 12]),
			},
			columnToX,
			valueK: 1,
			valueB: 0,
		});
		const closes = recorder.ops.filter((op) => op.op === "closePath");
		expect(closes).toHaveLength(1);
	});
});
