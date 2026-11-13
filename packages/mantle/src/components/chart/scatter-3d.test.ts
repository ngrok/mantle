import { describe, expect, test } from "vitest";
import type { PaintContext, ResolvedPaint } from "./paint-backend.js";
import { Scatter3d } from "./scatter-3d.js";
import type { ScatterHost } from "./scatter-engine.js";
import type { SeriesSpec } from "./types.js";

/**
 * These tests call a `Scatter3d` over a hand-built host. happy-dom has no 2D
 * context, so a recording context stands in for the canvas.
 */

const colors: ResolvedPaint = {
	signature: "test",
	series: new Map([
		["a", "#f00"],
		["b", "#00f"],
	]),
	inputs: new Map(),
	barFills: new Map(),
	chrome: { grid: "#aaa", baseline: "#888", surface: "#fff", tickText: "#222", reference: "#888" },
	fontFamily: () => "sans-serif",
	resolve: () => "#f00",
};

const seriesSpec = (dataKey: string): SeriesSpec => ({
	dataKey,
	label: dataKey,
	color: "blue",
	mark: "scatter",
	curve: "linear",
	markers: false,
	connectNulls: false,
	shape: "circle",
	texture: "solid",
});

/** Two series of three points each, six points in all. */
const specs = [seriesSpec("a"), seriesSpec("b")];
const xs = Float64Array.from([0, 1, 2]);
const zs = Float64Array.from([0, 1, 2]);
const columns = [Float64Array.from([1, 2, 3]), Float64Array.from([3, 1, 2])];

/** A paint context that records the name of each call it gets. */
const recordingContext = (): { context: PaintContext; calls: string[] } => {
	const calls: string[] = [];
	const record = (name: string) => (): void => {
		calls.push(name);
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
		measureText: () => ({ width: 10 }),
	};
	return { context, calls };
};

/** A 3D scatter host over the two series, each at its reveal in `reveals`. */
const hostAt = (reveals: { a: number; b: number }): ScatterHost => ({
	plot: () => ({ left: 0, top: 0, width: 400, height: 200 }),
	colors: () => colors,
	specs: () => specs,
	rowCount: () => xs.length,
	xs: () => xs,
	zs: () => zs,
	columns: () => columns,
	columnOf: (dataKey) => columns[specs.findIndex((spec) => spec.dataKey === dataKey)],
	paintedValues: (_spec, seriesIndex) => columns[seriesIndex] ?? new Float64Array(0),
	definedIndexes: (values) => [...values.keys()],
	reveal: (dataKey) => (dataKey === "a" ? reveals.a : reveals.b),
	shape: () => "circle",
	xCoefficients: () => ({ k: 1, b: 0 }),
	yCoefficients: () => ({ k: 1, b: 0 }),
	domains: () => ({ x: [0, 2], y: [0, 4], z: [0, 2] }),
	xKey: () => "x",
	zKey: () => "z",
	is3d: () => true,
	requestPaint: () => {},
});

/** Paint one frame of the cloud. Returns the 3D state and the calls the paint made. */
const paintAt = (reveals: { a: number; b: number }): { three: Scatter3d; calls: string[] } => {
	const { context, calls } = recordingContext();
	const three = new Scatter3d(hostAt(reveals), 3);
	three.paint(context, colors, specs);
	return { three, calls };
};

/** The calls that only a point makes: the cube frame strokes lines and fills nothing. */
const pointCalls = (calls: readonly string[]): string[] =>
	calls.filter((name) => name === "arc" || name === "fill" || name === "fillRect");

describe("Scatter3d paint", () => {
	// Why the call list: an alpha under half of one 8-bit step changes no pixel,
	// so the calls a paint makes are the one trace of the work it skips.
	test.each([
		{ at: "0", reveal: 0 },
		{ at: "0.001 (a moment after the reveal starts)", reveal: 0.001 },
	])("a cloud makes no point call with every series at a reveal of $at", ({ reveal }) => {
		const { calls } = paintAt({ a: reveal, b: reveal });

		expect(pointCalls(calls)).toEqual([]);
	});

	test.each([
		{ at: "1/510 (half of one 8-bit alpha step)", reveal: 1 / 510 },
		{ at: "1", reveal: 1 },
	])("a cloud traces one arc for each point with every series at a reveal of $at", ({ reveal }) => {
		const { calls } = paintAt({ a: reveal, b: reveal });

		expect(calls.filter((name) => name === "arc")).toHaveLength(6);
	});

	test("a revealed series still paints while another series waits at a reveal of 0", () => {
		const { calls } = paintAt({ a: 1, b: 0 });

		expect(calls.filter((name) => name === "arc").length).toBeGreaterThanOrEqual(3);
	});

	test("a cloud at a reveal of 0 still answers the hit test", () => {
		const { three } = paintAt({ a: 0, b: 0 });
		const position = three.screenFor(1);
		if (position == null) {
			throw new Error("expected the paint to project row 1");
		}

		expect(three.hitAt(position.x, position.y, 24)).toMatchObject({ seriesKey: "a", index: 1 });
	});
});

describe("Scatter3d settle", () => {
	/** A 3D state at the default view of `dimensions`, and a read of where it paints row 0. */
	const mountAt = (dimensions: 1 | 2 | 3) => {
		const { context } = recordingContext();
		const three = new Scatter3d(hostAt({ a: 1, b: 1 }), dimensions);
		const paintedRow = (): { x: number; y: number } | null => {
			three.paint(context, colors, specs);
			return three.screenFor(0);
		};
		return { three, paintedRow };
	};

	test("a camera at rest keeps the view that a drag gave it", () => {
		const { three, paintedRow } = mountAt(3);
		const initial = paintedRow();
		three.press(100, 100);
		three.dragTo(160, 120);
		three.release();
		const rotated = paintedRow();
		// Guards the drag: a camera that did not turn would pass the check below.
		expect(rotated).not.toEqual(initial);

		// A print and a chart that leaves the screen both settle the motion.
		three.settle(3);

		expect(paintedRow()).toEqual(rotated);
	});

	test("a camera glide in flight ends at the view of the dimension count", () => {
		const { three, paintedRow } = mountAt(3);
		three.setDimensions(2, { glide: true });

		three.settle(2);

		expect(paintedRow()).toEqual(mountAt(2).paintedRow());
	});
});
