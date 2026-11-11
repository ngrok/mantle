import { expect, test } from "vitest";
import type { SeriesSpec } from "./types.js";
import { ingestRows } from "./ingest.js";

const series = (dataKey: string): SeriesSpec => ({
	dataKey,
	label: dataKey,
	seriesSlot: undefined,
	color: undefined,
	mark: "line",
	curve: "linear",
	markers: false,
	connectNulls: false,
	shape: undefined,
	texture: "solid",
});

const ingest = (
	rows: readonly object[],
	options: { xScale?: "linear" | "point"; zKey?: string } = {},
) =>
	ingestRows({
		rows,
		xKey: "x",
		xScale: options.xScale ?? "linear",
		specs: [series("a"), series("b")],
		zKey: options.zKey ?? null,
		rootName: "LineChart.Root",
	});

test("out-of-order rows sort by x, and a row with no position maps to -1", () => {
	const result = ingest([
		{ x: 3, a: 30, b: 1 },
		{ x: null, a: 99, b: 1 },
		{ x: 1, a: 10, b: 1 },
	]);
	expect([...result.xs]).toEqual([1, 3]);
	expect([...(result.columns[0] ?? [])]).toEqual([10, 30]);
	expect([...(result.order ?? [])]).toEqual([2, 0]);
	expect([...(result.orderInverse ?? [])]).toEqual([1, -1, 0]);
});

test("rows already in order keep no order map, so the view is the data array", () => {
	const result = ingest([
		{ x: 1, a: 1, b: 2 },
		{ x: 2, a: 3, b: 4 },
	]);
	expect(result.order).toBeNull();
	expect(result.orderInverse).toBeNull();
});

test("a missing or non-finite value is a gap the extent skips", () => {
	const result = ingest([
		{ x: 1, a: 2.5, b: Number.POSITIVE_INFINITY },
		{ x: 2, a: -4, b: 8 },
		{ x: 3, b: 1 },
	]);
	expect([...(result.columns[0] ?? [])]).toEqual([2.5, -4, Number.NaN]);
	expect([...(result.columns[1] ?? [])]).toEqual([Number.NaN, 8, 1]);
	expect([result.valueMin, result.valueMax]).toEqual([-4, 8]);
	expect(result.valuesAllIntegers).toBe(false);
});

test("a category axis keeps each x value and notices a time of day", () => {
	const result = ingest(
		[
			{ x: new Date(2026, 0, 1, 0, 0), a: 1, b: 1 },
			{ x: new Date(2026, 0, 1, 6, 30), a: 2, b: 2 },
		],
		{ xScale: "point" },
	);
	expect([...result.xs]).toEqual([0, 1]);
	expect(result.xValues).toHaveLength(2);
	expect(result.xHasTimeOfDay).toBe(true);
});

test("a key no row carries throws with the part that names it", () => {
	expect(() => ingest([{ x: 1, a: 1 }])).toThrow(
		'LineChart.Line dataKey "b" does not match any key in the provided data.',
	);
	expect(() => ingest([{ time: 1, a: 1, b: 1 }])).toThrow('LineChart.Root xKey "x"');
	expect(() => ingest([{ x: 1, a: 1, b: 1 }], { zKey: "depth" })).toThrow(
		'ScatterPlot.Root zKey "depth"',
	);
});

test("a depth column carries its extent", () => {
	const result = ingest(
		[
			{ x: 1, a: 1, b: 1, depth: 4 },
			{ x: 2, a: 1, b: 1, depth: -2 },
		],
		{ zKey: "depth" },
	);
	expect([...result.zs]).toEqual([4, -2]);
	expect(result.zExtent).toEqual([-2, 4]);
});
