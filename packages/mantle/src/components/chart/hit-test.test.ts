import { describe, expect, test } from "vitest";
import { nearestIndex } from "./hit-test.js";

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
