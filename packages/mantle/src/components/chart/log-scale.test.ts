import { describe, expect, test } from "vitest";
import { logDomain, logTicks } from "./log-scale.js";

describe("logDomain", () => {
	test("puts the floor a full decade below the smallest value and the top at the next decade", () => {
		expect(logDomain([3, 4200], ["auto", "auto"])).toEqual([-1, 4]);
		expect(logDomain([1, 1000], ["auto", "auto"])).toEqual([-1, 3]);
		// Why: a floor at 10 would give 12 under a tenth of a decade of length.
		expect(logDomain([12, 2_300_000], ["auto", "auto"])).toEqual([0, 7]);
	});

	test("keeps a positive end, and fits an end at or below zero to the data", () => {
		expect(logDomain([3, 4200], [0, 5000])).toEqual([-1, Math.log10(5000)]);
		expect(logDomain([3, 4200], [-1, "auto"])).toEqual([-1, 4]);
		expect(logDomain([3, 4200], [0.5, "auto"])).toEqual([Math.log10(0.5), 4]);
	});

	test("keeps a fixed maximum below the data and moves the automatic floor under it", () => {
		expect(logDomain([10_000, 10_000], [0, 100])).toEqual([1, 2]);
	});

	test("gives a chart with no positive value one decade", () => {
		expect(logDomain(null, ["auto", "auto"])).toEqual([0, 1]);
	});
});

describe("logTicks", () => {
	test("returns exact powers of ten, below one too", () => {
		expect(logTicks([-3, 0], 10)).toEqual([0.001, 0.01, 0.1, 1]);
	});

	test("skips decades to stay under the limit", () => {
		// Why every fourth decade: 13 decades in 4 ticks needs a stride of 4.
		expect(logTicks([0, 12], 4)).toEqual([1, 1e4, 1e8, 1e12]);
	});

	test("falls back to linear ticks inside one decade", () => {
		expect(logTicks([Math.log10(2), Math.log10(8)], 5)).toEqual([2, 4, 6]);
	});

	test("returns no tick for a limit below one, and decades for an unbounded one", () => {
		expect(logTicks([0, 3], 0)).toEqual([]);
		expect(logTicks([0, 3], Number.POSITIVE_INFINITY)).toEqual([1, 10, 100, 1000]);
	});

	test("keeps every tick finite and positive at the ends of the number range", () => {
		const ticks = logTicks([-330, 310], 4);
		expect(ticks.length).toBeGreaterThan(1);
		expect(ticks.every((value) => value > 0 && Number.isFinite(value))).toBe(true);
	});
});
