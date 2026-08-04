import { describe, expect, test } from "vitest";
import {
	BAR_DENSE_THICKNESS,
	BAR_MAX_THICKNESS,
	BAR_STEP_FILL,
	barThickness,
	isStackedDataEnd,
	stackedSegmentEdges,
} from "./bar-geometry.js";

/**
 * A band step and the slot one series gets from it, at mantle's `paddingInner`
 * of 0.2 — the pairing the engine actually hands `barThickness`.
 */
const singleSeries = (step: number) => ({ step, slot: step * 0.8 });

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

describe("barThickness", () => {
	test("a dense chart fills its slot, exactly as it did before the fill rule", () => {
		// 60 points across a 650px plot: a 10.8px step. The cap sits far above the
		// slot, so the bar is the slot — the case a fixed 24px cap already handled.
		expect(barThickness(singleSeries(10.8))).toBeCloseTo(8.64, 10);
		expect(barThickness(singleSeries(30))).toBe(24);
	});

	test("a sparse chart grows the bar instead of the air beside it", () => {
		// The reported defect: seven bars across a 650px plot took 24px of a 93px
		// step each, so every bar sat in 69px of air and the row read gap-toothed.
		expect(barThickness(singleSeries(92.9))).toBeCloseTo(55.74, 10);
		expect(barThickness(singleSeries(92.9))).toBeGreaterThan(BAR_DENSE_THICKNESS);
	});

	test("the two clamps meet the fill line, so thickness never jumps", () => {
		// The floor and the fill rule cross at one step — 40px — and the ceiling and
		// the fill rule at another. A mismatch there is a visible pop as a row
		// arrives or the container resizes, which no per-step assertion would catch.
		const meetsFloor = BAR_DENSE_THICKNESS / BAR_STEP_FILL;
		const meetsCeiling = BAR_MAX_THICKNESS / BAR_STEP_FILL;
		expect(barThickness({ step: meetsFloor, slot: Number.POSITIVE_INFINITY })).toBe(
			BAR_DENSE_THICKNESS,
		);
		expect(barThickness({ step: meetsCeiling, slot: Number.POSITIVE_INFINITY })).toBe(
			BAR_MAX_THICKNESS,
		);
		const thicknesses = Array.from({ length: 400 }, (_, index) =>
			barThickness(singleSeries(index + 1)),
		);
		for (let index = 1; index < thicknesses.length; index++) {
			const previous = thicknesses[index - 1] ?? Number.NaN;
			const current = thicknesses[index] ?? Number.NaN;
			expect(current).toBeGreaterThanOrEqual(previous);
			// One pixel of step may buy at most one pixel of bar, so the curve has no
			// cliff in either direction.
			expect(current - previous).toBeLessThanOrEqual(1);
		}
	});

	test("a bar never outgrows the ceiling, however wide its band", () => {
		// Two categories across a 650px plot would fill 195px each unclamped, and a
		// bar that wide reads as a panel rather than a mark.
		expect(barThickness(singleSeries(325))).toBe(BAR_MAX_THICKNESS);
		expect(barThickness(singleSeries(4000))).toBe(BAR_MAX_THICKNESS);
	});

	test("grouped series split the band and each bar fills its own slot", () => {
		// Three series inside a 92.9px step: the slot is narrower than the cap, so
		// the group tightens instead of every bar taking the sparse-chart width.
		const slot = (92.9 * 0.8 - 2 * 2) / 3;
		expect(barThickness({ step: 92.9, slot })).toBeCloseTo(slot, 10);
		expect(barThickness({ step: 92.9, slot })).toBeLessThan(barThickness(singleSeries(92.9)));
	});

	test("a layout with no bands paints nothing", () => {
		// `computeBandLayout` returns a zero step and a zero bandwidth before the
		// first measurement, and a cap of 24 on a zero slot must still be zero.
		expect(barThickness({ step: 0, slot: 0 })).toBe(0);
	});
});

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
