import { describe, expect, test } from "vitest";
import { compareDatesNewestToOldest } from "./compare.js";
import { compareDatesOldestToNewest } from "./compare.js";

describe("compareDatesNewestToOldest", () => {
	test("should return a negative number if B comes earlier in time than A", () => {
		const now = new Date();
		const dateA = new Date(now);
		const dateB = new Date(now.getTime() - 1000); // 1 second earlier
		expect(compareDatesNewestToOldest(dateA, dateB)).toBeLessThan(0);
	});

	test("should return a positive number if B comes later in time than A", () => {
		const now = new Date();
		const dateA = new Date(now);
		const dateB = new Date(now.getTime() + 1000); // 1 second later
		expect(compareDatesNewestToOldest(dateA, dateB)).toBeGreaterThan(0);
	});

	test("should return 0 if both dates are equivalent", () => {
		const now = new Date();
		const dateA = new Date(now);
		const dateB = new Date(now);
		expect(compareDatesNewestToOldest(dateA, dateB)).toBe(0);
	});
});

describe("compareDatesOldestToNewest", () => {
	test("should return a negative number if A comes earlier in time than B", () => {
		const now = new Date();
		const dateA = new Date(now.getTime() - 1000); // 1 second earlier
		const dateB = new Date(now);
		expect(compareDatesOldestToNewest(dateA, dateB)).toBeLessThan(0);
	});

	test("should return a positive number if A comes later in time than B", () => {
		const now = new Date();
		const dateA = new Date(now.getTime() + 1000); // 1 second later
		const dateB = new Date(now);
		expect(compareDatesOldestToNewest(dateA, dateB)).toBeGreaterThan(0);
	});

	test("should return 0 if both dates are equivalent", () => {
		const now = new Date();
		const dateA = new Date(now);
		const dateB = new Date(now);
		expect(compareDatesOldestToNewest(dateA, dateB)).toBe(0);
	});
});
