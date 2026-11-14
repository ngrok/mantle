import { describe, expect, test } from "vitest";
import { lowerBound, nearestIndex } from "./hit-test.js";

describe("nearestIndex", () => {
	const xs = Float64Array.from([0, 10, 20, 30, 40]);

	test("snaps to the closest sample", () => {
		expect(nearestIndex(xs, xs.length, 12)).toBe(1);
		expect(nearestIndex(xs, xs.length, 16)).toBe(2);
		expect(nearestIndex(xs, xs.length, 0)).toBe(0);
		expect(nearestIndex(xs, xs.length, 40)).toBe(4);
	});

	test("clamps outside the domain", () => {
		expect(nearestIndex(xs, xs.length, -100)).toBe(0);
		expect(nearestIndex(xs, xs.length, 1000)).toBe(4);
	});

	test("ties prefer the earlier sample", () => {
		expect(nearestIndex(xs, xs.length, 15)).toBe(1);
	});

	test("empty data returns null", () => {
		expect(nearestIndex(new Float64Array(0), 0, 5)).toBe(null);
	});

	test("a single sample always wins", () => {
		expect(nearestIndex(Float64Array.from([7]), 1, -100)).toBe(0);
		expect(nearestIndex(Float64Array.from([7]), 1, 100)).toBe(0);
	});
});

describe("lowerBound", () => {
	test("returns the first index the predicate rejects, for every split of every length", () => {
		const mismatches: Array<{ length: number; split: number; found: number }> = [];
		for (let length = 0; length <= 33; length++) {
			for (let split = 0; split <= length; split++) {
				const found = lowerBound(length, (index) => index < split);
				if (found !== split) {
					mismatches.push({ length, split, found });
				}
			}
		}

		expect(mismatches).toEqual([]);
	});

	test("finds the index in at most log2(length) + 1 probes", () => {
		let probes = 0;

		lowerBound(1024, (index) => {
			probes += 1;
			return index < 700;
		});

		expect(probes).toBeLessThanOrEqual(11);
	});
});
