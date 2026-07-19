import { describe, expect, test } from "vitest";
import { decimateColumns, shouldDecimate } from "./decimate.js";
import { linearCoefficients } from "./scales.js";

describe("shouldDecimate", () => {
	test("enters at 4 points per column", () => {
		expect(shouldDecimate({ pointCount: 3200, columnCount: 800, wasDecimated: false })).toBe(true);
		expect(shouldDecimate({ pointCount: 3199, columnCount: 800, wasDecimated: false })).toBe(false);
	});

	test("exits at 3 points per column (hysteresis)", () => {
		// Between 3x and 4x, the current mode sticks.
		expect(shouldDecimate({ pointCount: 2800, columnCount: 800, wasDecimated: true })).toBe(true);
		expect(shouldDecimate({ pointCount: 2800, columnCount: 800, wasDecimated: false })).toBe(false);
		expect(shouldDecimate({ pointCount: 2399, columnCount: 800, wasDecimated: true })).toBe(false);
	});

	test("zero columns never decimates", () => {
		expect(shouldDecimate({ pointCount: 100000, columnCount: 0, wasDecimated: false })).toBe(false);
	});
});

describe("decimateColumns", () => {
	const makeColumns = (xs: number[], values: number[], columnCount: number) => {
		const first = xs[0] ?? 0;
		const last = xs[xs.length - 1] ?? 1;
		const { k, b } = linearCoefficients([first, last], [0, columnCount]);
		return decimateColumns({
			xs: Float64Array.from(xs),
			values: Float64Array.from(values),
			startIndex: 0,
			endIndex: xs.length - 1,
			positionK: k,
			positionB: b,
			columnCount,
		});
	};

	test("accumulates min/max/in/out per column", () => {
		// 8 points across 2 columns: first 4 land in column 0, last 4 in column 1.
		const columns = makeColumns([0, 1, 2, 3, 4, 5, 6, 7], [10, 40, 5, 20, 100, 90, 110, 95], 2);
		expect(columns.hasData[0]).toBe(1);
		expect(columns.inValue[0]).toBe(10);
		expect(columns.minValue[0]).toBe(5);
		expect(columns.maxValue[0]).toBe(40);
		expect(columns.outValue[0]).toBe(20);
		expect(columns.inValue[1]).toBe(100);
		expect(columns.minValue[1]).toBe(90);
		expect(columns.maxValue[1]).toBe(110);
		expect(columns.outValue[1]).toBe(95);
	});

	test("NaN values are skipped; all-NaN columns are gaps", () => {
		const columns = makeColumns([0, 1, 2, 3], [10, Number.NaN, Number.NaN, Number.NaN], 2);
		expect(columns.hasData[0]).toBe(1);
		expect(columns.minValue[0]).toBe(10);
		expect(columns.hasData[1]).toBe(0);
	});

	test("out-of-range x clamps into the edge columns", () => {
		const { k, b } = linearCoefficients([0, 10], [0, 4]);
		const columns = decimateColumns({
			xs: Float64Array.from([-5, 5, 100]),
			values: Float64Array.from([1, 2, 3]),
			startIndex: 0,
			endIndex: 2,
			positionK: k,
			positionB: b,
			columnCount: 4,
		});
		expect(columns.hasData[0]).toBe(1);
		expect(columns.inValue[0]).toBe(1);
		expect(columns.hasData[3]).toBe(1);
		expect(columns.outValue[3]).toBe(3);
	});

	test("a single point per column has equal in/min/max/out", () => {
		const columns = makeColumns([0, 1], [42, 7], 2);
		expect(columns.inValue[0]).toBe(42);
		expect(columns.minValue[0]).toBe(42);
		expect(columns.maxValue[0]).toBe(42);
		expect(columns.outValue[0]).toBe(42);
	});
});
