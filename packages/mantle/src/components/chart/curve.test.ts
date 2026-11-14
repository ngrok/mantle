import type { CurveFactory } from "d3-shape";
import { area as d3Area, curveLinear, curveMonotoneX, curveStep, line as d3Line } from "d3-shape";
import { describe, expect, test } from "vitest";
import type { CurveKind } from "./types.js";
import { traceArea, traceLine } from "./curve.js";

/**
 * Why d3-shape as the oracle: the port replaces it in every line and area
 * chart, so its paths are the contract. For each series, the call log of the
 * port must equal the call log of d3-shape to the last bit.
 */

/** One path call with its arguments. */
type PathCall = { op: "moveTo" | "lineTo" | "bezierCurveTo" | "closePath"; args: number[] };

/** A context that logs each path call. d3-shape and the port both draw into one. */
const makeRecorder = () => {
	const calls: PathCall[] = [];
	const log =
		(op: PathCall["op"]) =>
		(...args: number[]): void => {
			calls.push({ op, args });
		};
	return {
		calls,
		moveTo: log("moveTo"),
		lineTo: log("lineTo"),
		bezierCurveTo: log("bezierCurveTo"),
		closePath: log("closePath"),
	};
};

/**
 * A d3-shape generator over datum indexes, typed to draw into the recorder.
 * d3-shape's own types ask for a `CanvasRenderingContext2D`. Its curves call
 * only the four path methods.
 */
type D3Generator = {
	(indexes: readonly number[]): unknown;
	context(context: Parameters<typeof traceLine>[0] | null): unknown;
};

/** The d3-shape curve that each `CurveKind` must match. */
const D3_CURVES: Record<CurveKind, CurveFactory> = {
	linear: curveLinear,
	monotone: curveMonotoneX,
	step: curveStep,
};

const CURVES = ["linear", "step", "monotone"] as const satisfies readonly CurveKind[];

/** The two exports under test, by name. */
const TRACES = ["traceLine", "traceArea"] as const;

type Trace = (typeof TRACES)[number];

/** One series as the engine hands it to the renderer: an index list and accessors. */
type Input = {
	indexes: readonly number[];
	xAt: (index: number) => number;
	y0At: (index: number) => number;
	y1At: (index: number) => number;
	definedAt: (index: number) => boolean;
};

/** The path calls that d3-shape's `line` or `area` generator makes for one series. */
const d3Calls = (trace: Trace, curve: CurveKind, input: Input): PathCall[] => {
	const { indexes, xAt, y0At, y1At, definedAt } = input;
	const recorder = makeRecorder();
	const generator: D3Generator =
		trace === "traceLine"
			? d3Line<number>().x(xAt).y(y1At).defined(definedAt).curve(D3_CURVES[curve])
			: d3Area<number>().x(xAt).y0(y0At).y1(y1At).defined(definedAt).curve(D3_CURVES[curve]);
	generator.context(recorder);
	generator(indexes);
	return recorder.calls;
};

/** The path calls the port makes for the same series. */
const tracedCalls = (trace: Trace, curve: CurveKind, input: Input): PathCall[] => {
	const { indexes, xAt, y0At, y1At, definedAt } = input;
	const recorder = makeRecorder();
	if (trace === "traceLine") {
		traceLine(recorder, { curve, indexes, xAt, yAt: y1At, definedAt });
	} else {
		traceArea(recorder, { curve, indexes, xAt, y0At, y1At, definedAt });
	}
	return recorder.calls;
};

// Why seeded: a failed run replays with the same points.
let seed = 7;
const random = (): number => {
	seed = (seed * 1664525 + 1013904223) >>> 0;
	return seed / 4294967296;
};

/** The points of one series by datum index. A `false` in `defined` is a gap. */
type Series = { xs: number[]; y0s: number[]; y1s: number[]; defined: boolean[] };

/** A series over `xs` with random y values and a gap at each index in `gaps`. */
const seriesOver = (xs: readonly number[], gaps: readonly number[] = []): Series => ({
	xs: [...xs],
	y0s: xs.map(() => 300 + random() * 100),
	y1s: xs.map(() => random() * 300),
	defined: xs.map((_x, index) => !gaps.includes(index)),
});

/** `count` x values that ascend by uneven amounts. */
const ascending = (count: number): number[] => {
	let x = 0;
	return Array.from({ length: count }, () => {
		x += 1 + random() * 40;
		return x;
	});
};

/** A copy of `series` in which each index in `repeats` holds the point before it again. */
const withRepeats = (series: Series, repeats: readonly number[]): Series => {
	const repeated = structuredClone(series);
	for (const index of repeats) {
		repeated.xs[index] = repeated.xs[index - 1] ?? Number.NaN;
		repeated.y0s[index] = repeated.y0s[index - 1] ?? Number.NaN;
		repeated.y1s[index] = repeated.y1s[index - 1] ?? Number.NaN;
	}
	return repeated;
};

/** Every datum index: the list the engine passes to leave each gap open. */
const everyIndex = (series: Series): number[] => series.xs.map((_x, index) => index);

/** The defined indexes alone: the list the engine passes for `connectNulls`. */
const definedIndexes = (series: Series): number[] =>
	everyIndex(series).filter((index) => series.defined[index] ?? false);

/** What the renderer reads for `series` over one index list. */
const inputOf = (series: Series, indexes: readonly number[] = everyIndex(series)): Input => ({
	indexes,
	xAt: (index) => series.xs[index] ?? Number.NaN,
	y0At: (index) => series.y0s[index] ?? Number.NaN,
	y1At: (index) => series.y1s[index] ?? Number.NaN,
	definedAt: (index) => series.defined[index] ?? false,
});

const gapInTheMiddle = seriesOver(ascending(9), [3, 4]);

/** One row per kind of series the port branches on, with the subpaths that d3-shape draws for it. */
const FIXTURES: ReadonlyArray<{ name: string; input: Input; subpaths: number }> = [
	{ name: "no points", input: inputOf(seriesOver([])), subpaths: 0 },
	{ name: "one point", input: inputOf(seriesOver(ascending(1))), subpaths: 1 },
	{ name: "two points", input: inputOf(seriesOver(ascending(2))), subpaths: 1 },
	{ name: "three points", input: inputOf(seriesOver(ascending(3))), subpaths: 1 },
	{ name: "many points", input: inputOf(seriesOver(ascending(240))), subpaths: 1 },
	{ name: "a gap at the start", input: inputOf(seriesOver(ascending(8), [0, 1])), subpaths: 1 },
	{ name: "a gap in the middle", input: inputOf(gapInTheMiddle), subpaths: 2 },
	{ name: "a gap at the end", input: inputOf(seriesOver(ascending(8), [6, 7])), subpaths: 1 },
	{
		name: "runs of one defined point",
		input: inputOf(seriesOver(ascending(7), [1, 3, 5])),
		subpaths: 4,
	},
	{
		// `connectNulls`: the list skips the gap, so position and index differ past it.
		name: "the defined indexes alone, across a gap",
		input: inputOf(gapInTheMiddle, definedIndexes(gapInTheMiddle)),
		subpaths: 1,
	},
	{
		name: "equal consecutive x values",
		input: inputOf(seriesOver([10, 10, 24.5, 60, 60, 60, 71, 71])),
		subpaths: 1,
	},
	{ name: "descending x", input: inputOf(seriesOver(ascending(9).toReversed())), subpaths: 1 },
	{
		name: "descending x with equal consecutive x values",
		input: inputOf(seriesOver([71, 71, 60, 60, 60, 24.5, 10, 10])),
		subpaths: 1,
	},
	{
		name: "a point repeated at the start, in the middle, and at the end",
		input: inputOf(withRepeats(seriesOver(ascending(8)), [1, 4, 7])),
		subpaths: 1,
	},
	{
		name: "one point repeated for a whole run",
		input: inputOf(withRepeats(seriesOver(ascending(3)), [1, 2])),
		subpaths: 1,
	},
];

/**
 * Random series that mix the rows above. Half of them sit on a coarse grid,
 * where equal coordinates and repeated points are common.
 */
const SWEEP: readonly Series[] = Array.from({ length: 300 }, () => {
	const count = Math.floor(random() * 16);
	const gridSize = random() < 0.5 ? 40 : 0;
	const snap = (value: number): number =>
		gridSize === 0 ? value : Math.round(value / gridSize) * gridSize;
	const gapRate = random() < 0.4 ? 0 : random() * 0.5;
	let x = 400;
	return {
		xs: Array.from({ length: count }, () => {
			// Most moves in x go forward and the rest go back. On the grid, a short
			// move lands on the x before it.
			x += (random() - 0.3) * 70;
			return snap(x);
		}),
		y0s: Array.from({ length: count }, () => snap(300 + random() * 100)),
		y1s: Array.from({ length: count }, () => snap(random() * 300)),
		defined: Array.from({ length: count }, () => random() >= gapRate),
	};
});

describe.each(TRACES)("%s", (trace) => {
	describe.each(CURVES)("with the %s curve", (curve) => {
		test.each(FIXTURES)("makes d3-shape's path calls for $name", ({ input, subpaths }) => {
			const expected = d3Calls(trace, curve, input);
			// Guards the fixture: d3-shape must draw the subpaths the name promises.
			expect(expected.filter((call) => call.op === "moveTo")).toHaveLength(subpaths);
			expect(tracedCalls(trace, curve, input)).toEqual(expected);
		});

		test("makes d3-shape's path calls for random series, with gaps open and with gaps joined", () => {
			let compared = 0;
			for (const [seriesNumber, series] of SWEEP.entries()) {
				for (const indexes of [everyIndex(series), definedIndexes(series)]) {
					const input = inputOf(series, indexes);
					const expected = d3Calls(trace, curve, input);
					expect(tracedCalls(trace, curve, input), `series ${seriesNumber}`).toEqual(expected);
					compared += expected.length;
				}
			}
			// Guards the sweep: series that draw nothing pass every comparison above.
			expect(compared).toBeGreaterThan(0);
		});
	});
});
