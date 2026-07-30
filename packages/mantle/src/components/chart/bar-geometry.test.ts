import { describe, expect, test } from "vitest";
import { stackedSegmentEdges } from "./bar-geometry.js";

/**
 * A vertical value axis 200px tall: value `0` sits at pixel 200 and value `1`
 * at pixel 0, so a taller value maps to a smaller pixel — the sign convention
 * the engine's y coefficients produce.
 */
const toPixel = (value: number): number => 200 - value * 200;

const GAP = 2;

describe("stackedSegmentEdges", () => {
	test("an unstacked bar spans the baseline to its value with no gap carved", () => {
		expect(stackedSegmentEdges({ lower: 0, upper: 0.5, toPixel, reveal: 1, gap: GAP })).toEqual({
			baseline: 200,
			value: 100,
		});
	});

	test("a segment stacked on a painted one gives up the gap from its baseline edge", () => {
		// 0.2 → 0.4 is 40px tall; the baseline edge moves 2px toward the data end.
		expect(stackedSegmentEdges({ lower: 0.2, upper: 0.4, toPixel, reveal: 1, gap: GAP })).toEqual({
			baseline: 158,
			value: 120,
		});
	});

	test("a segment whose stack below it is empty stays welded to the zero baseline", () => {
		// Every series below contributed 0, so `lower` is 0 and there is nothing to
		// separate from. Carving here would float the whole column off the axis.
		expect(stackedSegmentEdges({ lower: 0, upper: 0.4, toPixel, reveal: 1, gap: GAP })).toEqual({
			baseline: 200,
			value: 120,
		});
	});

	test("a segment shorter than the gap keeps its full extent instead of inverting", () => {
		// 0.400 → 0.4045 is 0.9px tall. Carving 2px would push the baseline edge
		// past the data edge, and the renderer would draw the rect on the wrong
		// side of its own boundary.
		const edges = stackedSegmentEdges({ lower: 0.4, upper: 0.4045, toPixel, reveal: 1, gap: GAP });
		expect(edges.baseline).toBeCloseTo(120, 10);
		expect(edges.value).toBeCloseTo(119.1, 10);
	});

	test("a segment exactly as tall as the gap survives instead of collapsing to nothing", () => {
		// Carving the full 2px would make the two edges meet, and the renderer
		// drops a zero-height rect outright.
		const edges = stackedSegmentEdges({ lower: 0.4, upper: 0.41, toPixel, reveal: 1, gap: GAP });
		expect(Math.abs(edges.baseline - edges.value)).toBeCloseTo(GAP, 10);
	});

	test("a negative segment runs away from zero, so the data end is its lower boundary", () => {
		// stack.ts stores a negative segment inverted: `upper` is the edge nearer
		// zero. Reading them in array order would put the cap, the reveal, and the
		// gap on the wrong end.
		expect(stackedSegmentEdges({ lower: -0.5, upper: 0, toPixel, reveal: 1, gap: GAP })).toEqual({
			baseline: 200,
			value: 300,
		});
	});

	test("the gap on a negative segment comes off the edge nearer zero", () => {
		const edges = stackedSegmentEdges({ lower: -0.5, upper: -0.2, toPixel, reveal: 1, gap: GAP });
		expect(edges.baseline).toBeCloseTo(242, 10);
		expect(edges.value).toBeCloseTo(300, 10);
	});

	test("the reveal grows the segment out of its baseline edge", () => {
		const edges = stackedSegmentEdges({ lower: 0.2, upper: 0.4, toPixel, reveal: 0.5, gap: GAP });
		// Half of the 40px extent, measured from the pre-carve baseline of 160.
		expect(edges.value).toBeCloseTo(140, 10);
		expect(edges.baseline).toBeCloseTo(158, 10);
	});

	test("a collapsed reveal carves nothing, so the segment cannot invert on the first frame", () => {
		const edges = stackedSegmentEdges({ lower: 0.2, upper: 0.4, toPixel, reveal: 0, gap: GAP });
		expect(edges.baseline).toBe(160);
		expect(edges.value).toBe(160);
	});

	test("a zero gap leaves the segment untouched", () => {
		expect(stackedSegmentEdges({ lower: 0.2, upper: 0.4, toPixel, reveal: 1, gap: 0 })).toEqual({
			baseline: 160,
			value: 120,
		});
	});
});
