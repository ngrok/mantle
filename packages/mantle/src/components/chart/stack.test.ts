import { describe, expect, test } from "vitest";
import { computeStackBoundaries } from "./stack.js";

describe("computeStackBoundaries", () => {
	test("stacks positive series in order from the baseline up", () => {
		const { lower, upper, min, max } = computeStackBoundaries([
			Float64Array.from([10, 20]),
			Float64Array.from([5, 15]),
		]);
		expect([...(lower[0] ?? [])]).toEqual([0, 0]);
		expect([...(upper[0] ?? [])]).toEqual([10, 20]);
		expect([...(lower[1] ?? [])]).toEqual([10, 20]);
		expect([...(upper[1] ?? [])]).toEqual([15, 35]);
		expect(min).toBe(0);
		expect(max).toBe(35);
	});

	test("negative values stack downward independently (diverging stacks)", () => {
		const { lower, upper, min, max } = computeStackBoundaries([
			Float64Array.from([10, -10]),
			Float64Array.from([-5, 20]),
		]);
		// series 0: +10 stacks up at index 0; -10 stacks down at index 1
		expect(upper[0]?.[0]).toBe(10);
		expect(lower[0]?.[1]).toBe(-10);
		// series 1: -5 stacks down at index 0; +20 stacks up at index 1
		expect(lower[1]?.[0]).toBe(-5);
		expect(upper[1]?.[0]).toBe(0);
		expect(lower[1]?.[1]).toBe(0);
		expect(upper[1]?.[1]).toBe(20);
		expect(min).toBe(-10);
		expect(max).toBe(20);
	});

	test("the stacked extent is the extent of the cumulative boundaries, not summed per-series extents", () => {
		// series maxima occur at different x — the naive sum-of-maxima (30 + 30)
		// overshoots the true stacked maximum (40).
		const { max } = computeStackBoundaries([
			Float64Array.from([30, 10]),
			Float64Array.from([10, 30]),
		]);
		expect(max).toBe(40);
	});

	test("a gap (NaN) contributes nothing and keeps series above continuous", () => {
		const { lower, upper, max } = computeStackBoundaries([
			Float64Array.from([10, Number.NaN, 10]),
			Float64Array.from([5, 5, 5]),
		]);
		expect(Number.isNaN(lower[0]?.[1] ?? 0)).toBe(true);
		expect(Number.isNaN(upper[0]?.[1] ?? 0)).toBe(true);
		// series 1 at the gap index stacks from 0 (the gap contributed nothing)
		expect(lower[1]?.[1]).toBe(0);
		expect(upper[1]?.[1]).toBe(5);
		expect(max).toBe(15);
	});

	test("empty input yields an empty result", () => {
		const { lower, upper, min, max } = computeStackBoundaries([]);
		expect(lower).toEqual([]);
		expect(upper).toEqual([]);
		expect(min).toBe(0);
		expect(max).toBe(0);
	});
});
