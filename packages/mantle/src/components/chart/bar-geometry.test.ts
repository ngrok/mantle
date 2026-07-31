import { describe, expect, test } from "vitest";
import { isStackedDataEnd, stackedSegmentEdges } from "./bar-geometry.js";

/**
 * A vertical value axis 200px tall: value `0` sits at pixel 200 and value `1`
 * at pixel 0, so a taller value maps to a smaller pixel — the sign convention
 * the engine's y coefficients produce.
 */
const toPixel = (value: number): number => 200 - value * 200;

/**
 * The horizontal mirror: value `0` sits at pixel 0 and a taller value maps to a
 * larger pixel, which is the sign the engine's value coefficients produce for
 * `orientation="horizontal"`.
 */
const toPixelRight = (value: number): number => value * 200;

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

	test("a column whose stack below rounds to no ink stays welded to the zero baseline", () => {
		// The series below contributes 0.0001, which is 0.02px — nonzero, but it
		// paints nothing. Carving against it floats the visible column off the axis
		// and shows the grid through the seam.
		const edges = stackedSegmentEdges({ lower: 0.0001, upper: 0.4, toPixel, reveal: 1, gap: GAP });
		expect(edges.baseline).toBeCloseTo(199.98, 10);
		expect(edges.value).toBeCloseTo(120, 10);
	});

	test("a segment shorter than twice the gap gives up half its extent, never all of it", () => {
		// 0.400 → 0.4045 is 0.9px tall. Carving the full 2px would push the baseline
		// edge past the data edge, and the renderer would draw the rect on the wrong
		// side of its own boundary.
		const edges = stackedSegmentEdges({ lower: 0.4, upper: 0.4045, toPixel, reveal: 1, gap: GAP });
		expect(edges.value).toBeCloseTo(119.1, 10);
		expect(edges.baseline).toBeCloseTo(119.55, 10);
	});

	test("a taller segment always paints taller, across the gap threshold", () => {
		// A carve that switches off below the gap and on above it is a cliff: 2.5px
		// of data would paint 0.5px while 2.0px of data painted 2.0px, so the bigger
		// number would read four times smaller.
		const painted = [1, 1.9, 2, 2.1, 2.5, 3, 4, 8].map((extent) => {
			const edges = stackedSegmentEdges({
				lower: 0.4,
				upper: 0.4 + extent / 200,
				toPixel,
				reveal: 1,
				gap: GAP,
			});
			return Math.abs(edges.baseline - edges.value);
		});
		for (let index = 1; index < painted.length; index++) {
			expect(painted[index]).toBeGreaterThan(painted[index - 1] ?? Number.NaN);
		}
		// Every one of them survives the carve with something left to paint.
		expect(Math.min(...painted)).toBeGreaterThan(0);
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

	test("a horizontal axis carves toward its data end too, not toward zero", () => {
		// The value axis runs the other way for `orientation="horizontal"`, and the
		// carve follows the pixel direction rather than assuming the vertical sign.
		expect(
			stackedSegmentEdges({ lower: 0.2, upper: 0.4, toPixel: toPixelRight, reveal: 1, gap: GAP }),
		).toEqual({ baseline: 42, value: 80 });
	});

	test("a horizontal negative segment welds at zero and runs left", () => {
		expect(
			stackedSegmentEdges({ lower: -0.5, upper: 0, toPixel: toPixelRight, reveal: 1, gap: GAP }),
		).toEqual({ baseline: 0, value: -100 });
	});
});

describe("isStackedDataEnd", () => {
	test("the outermost segment of the pile wears the cap and the ones under it do not", () => {
		const pile = { pileOuter: 3, toPixel };
		expect(isStackedDataEnd({ lower: 2, upper: 3, ...pile })).toBe(true);
		expect(isStackedDataEnd({ lower: 1, upper: 2, ...pile })).toBe(false);
		expect(isStackedDataEnd({ lower: 0, upper: 1, ...pile })).toBe(false);
	});

	test("a segment the column cannot show never takes the cap from the one it can", () => {
		// The top series contributes 0.001 against a 100-unit column, which is
		// 0.2px. It keeps a cap nobody sees; the 100-unit segment under it gets the
		// cap that reads, so the column does not render square-topped.
		const coarse = (value: number): number => 300 - value * 2.5;
		expect(isStackedDataEnd({ lower: 0, upper: 100, pileOuter: 100.001, toPixel: coarse })).toBe(
			true,
		);
		expect(
			isStackedDataEnd({ lower: 100, upper: 100.001, pileOuter: 100.001, toPixel: coarse }),
		).toBe(true);
	});

	test("a negative pile is measured from its own outer edge", () => {
		// `stack.ts` stores a negative segment inverted, so the data end is `lower`.
		expect(isStackedDataEnd({ lower: -0.5, upper: -0.2, pileOuter: -0.5, toPixel })).toBe(true);
		expect(isStackedDataEnd({ lower: -0.2, upper: 0, pileOuter: -0.5, toPixel })).toBe(false);
	});

	test("a torn pile end caps nothing", () => {
		expect(isStackedDataEnd({ lower: 0, upper: 1, pileOuter: Number.NaN, toPixel })).toBe(false);
	});
});
