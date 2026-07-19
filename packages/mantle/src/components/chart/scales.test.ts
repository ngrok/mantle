import { describe, expect, test } from "vitest";
import {
	bandCenter,
	bandStart,
	computeBandLayout,
	invertBand,
	linearCoefficients,
	linearTicks,
	niceDomain,
	timeTicks,
} from "./scales.js";

describe("linearCoefficients", () => {
	test("maps the domain onto the range", () => {
		const { k, b } = linearCoefficients([0, 10], [0, 100]);
		expect(0 * k + b).toBe(0);
		expect(5 * k + b).toBe(50);
		expect(10 * k + b).toBe(100);
	});

	test("supports inverted ranges (y axes grow downward)", () => {
		const { k, b } = linearCoefficients([0, 100], [200, 0]);
		expect(0 * k + b).toBe(200);
		expect(100 * k + b).toBe(0);
	});

	test("a degenerate domain maps everything to the range midpoint", () => {
		const { k, b } = linearCoefficients([5, 5], [0, 100]);
		expect(5 * k + b).toBe(50);
		expect(999 * k + b).toBe(50);
	});
});

describe("computeBandLayout", () => {
	test("lays out bands with inner and outer padding", () => {
		const layout = computeBandLayout({
			count: 4,
			rangeStart: 0,
			rangeEnd: 400,
			paddingInner: 0.2,
			paddingOuter: 0.1,
		});
		// step = 400 / (4 - 0.2 + 0.2) = 100
		expect(layout.step).toBe(100);
		expect(layout.bandwidth).toBe(80);
		expect(layout.offset).toBe(10);
		expect(bandStart(layout, 0)).toBe(10);
		expect(bandStart(layout, 3)).toBe(310);
		expect(bandCenter(layout, 0)).toBe(50);
	});

	test("zero categories yields an empty layout", () => {
		const layout = computeBandLayout({
			count: 0,
			rangeStart: 0,
			rangeEnd: 400,
			paddingInner: 0.2,
			paddingOuter: 0.1,
		});
		expect(layout.step).toBe(0);
		expect(layout.bandwidth).toBe(0);
	});

	test("a point layout (paddingInner 1) spreads centers with half-step insets", () => {
		const layout = computeBandLayout({
			count: 4,
			rangeStart: 0,
			rangeEnd: 400,
			paddingInner: 1,
			paddingOuter: 0.5,
		});
		expect(layout.bandwidth).toBe(0);
		expect(layout.step).toBe(100);
		expect(bandCenter(layout, 0)).toBe(50);
		expect(bandCenter(layout, 3)).toBe(350);
	});
});

describe("invertBand", () => {
	const layout = computeBandLayout({
		count: 4,
		rangeStart: 0,
		rangeEnd: 400,
		paddingInner: 0.2,
		paddingOuter: 0.1,
	});

	test("a pixel inside a band hits that band", () => {
		expect(invertBand(layout, 50)).toBe(0);
		expect(invertBand(layout, 150)).toBe(1);
		expect(invertBand(layout, 350)).toBe(3);
	});

	test("the padding air between bands belongs to the nearest band (whole-step hit targets)", () => {
		// The gap between band 0 (ends at 90) and band 1 (starts at 110):
		expect(invertBand(layout, 95)).toBe(0);
		expect(invertBand(layout, 105)).toBe(1);
	});

	test("pixels outside the range clamp to the first and last bands", () => {
		expect(invertBand(layout, -50)).toBe(0);
		expect(invertBand(layout, 450)).toBe(3);
	});

	test("an empty layout returns null", () => {
		const empty = computeBandLayout({
			count: 0,
			rangeStart: 0,
			rangeEnd: 400,
			paddingInner: 0.2,
			paddingOuter: 0.1,
		});
		expect(invertBand(empty, 100)).toBe(null);
	});
});

describe("linearTicks", () => {
	test("lands on clean 1/2/5-stepped numbers", () => {
		expect(linearTicks([0, 1000], 5)).toEqual([0, 200, 400, 600, 800, 1000]);
	});
});

describe("timeTicks", () => {
	test("produces calendar-aligned ticks inside the domain", () => {
		const start = new Date(2026, 6, 18, 10, 0, 0).getTime();
		const end = new Date(2026, 6, 18, 16, 0, 0).getTime();
		const ticks = timeTicks([start, end], 6);
		expect(ticks.length).toBeGreaterThan(2);
		for (const tick of ticks) {
			expect(tick).toBeGreaterThanOrEqual(start);
			expect(tick).toBeLessThanOrEqual(end);
			// Hour-aligned for a 6-hour domain.
			expect(new Date(tick).getMinutes()).toBe(0);
		}
	});
});

describe("niceDomain", () => {
	test("expands to tick-aligned bounds", () => {
		expect(niceDomain([3, 97], 5)).toEqual([0, 100]);
	});

	test("keeps already-nice bounds", () => {
		expect(niceDomain([0, 100], 5)).toEqual([0, 100]);
	});

	test("pads a flat domain instead of collapsing", () => {
		const [min, max] = niceDomain([50, 50], 5);
		expect(min).toBeLessThan(50);
		expect(max).toBeGreaterThan(50);
	});

	test("pads a flat zero domain", () => {
		const [min, max] = niceDomain([0, 0], 5);
		expect(min).toBeLessThanOrEqual(0);
		expect(max).toBeGreaterThan(0);
	});

	test("handles sub-integer domains", () => {
		const [min, max] = niceDomain([0.001, 0.019], 5);
		expect(min).toBeLessThanOrEqual(0.001);
		expect(max).toBeGreaterThanOrEqual(0.019);
	});

	test("an inverted domain renders right-side-up instead of producing NaN", () => {
		// Regression: a yDomain override on the wrong side of the data must not
		// blank the chart with NaN coefficients.
		const [min, max] = niceDomain([100, 3], 5);
		expect(min).toBe(0);
		expect(max).toBe(100);
		expect(Number.isNaN(min)).toBe(false);
	});
});
