/**
 * Pixel geometry for one bar segment along the value axis.
 *
 * Stacking accumulates in value space (see ./stack.js); this module turns one
 * segment's boundaries into the two pixel edges the renderer fills. It works
 * along the value axis alone, so vertical and horizontal bars share it instead
 * of keeping mirrored copies that drift apart.
 *
 * This module is internal shared implementation — not exported from the package.
 */

/**
 * The two pixel edges of one painted bar segment.
 */
type SegmentEdges = {
	/** Pixel of the edge nearer the zero baseline. */
	baseline: number;
	/** Pixel of the edge nearer the data end. */
	value: number;
};

/**
 * The pixel edges of one bar segment, with the enter reveal applied and the
 * surface gap carved from its baseline side.
 *
 * `lower` and `upper` are the segment's cumulative boundaries. A positive
 * segment runs `lower` → `upper` away from zero and a negative one runs
 * `upper` → `lower`, so the data end is whichever boundary sits further from
 * zero — pick the ends by pile, or the cap, the reveal, and the gap all land
 * on the wrong edge of a diverging stack. Pass `lower: 0` for an unstacked bar.
 *
 * Two guards keep the gap from damaging the segment it separates:
 *
 * - Carve only when the baseline-side boundary is off zero. A segment that
 *   starts at zero has nothing below it to separate from, so carving would
 *   lift the whole column off the axis. Sparse stacks hit this constantly —
 *   every series below the first non-zero one contributes nothing.
 * - Carve only when the segment is longer than the gap. A shorter one would
 *   invert, and the renderer draws an inverted rect on the wrong side of its
 *   own boundary, or drops it when the two edges meet.
 *
 * @example
 * ```ts
 * // The 0.4 → 0.6 segment of a stack, on an axis where 0 is 200px and 1 is 0px.
 * stackedSegmentEdges({ lower: 0.4, upper: 0.6, toPixel: (v) => 200 - v * 200, reveal: 1, gap: 2 });
 * // { baseline: 122, value: 80 } — 2px carved off the 120px baseline edge
 * ```
 */
const stackedSegmentEdges = (options: {
	lower: number;
	upper: number;
	toPixel: (value: number) => number;
	/** Enter-animation progress, `0` (collapsed at the baseline) to `1`. */
	reveal: number;
	/** Surface gap in pixels between touching segments; `0` to disable. */
	gap: number;
}): SegmentEdges => {
	const { lower, upper, toPixel, reveal, gap } = options;
	const negative = lower < 0;
	const baselineValue = negative ? upper : lower;
	const dataValue = negative ? lower : upper;
	const baseline = toPixel(baselineValue);
	const value = baseline + (toPixel(dataValue) - baseline) * reveal;
	if (baselineValue === 0 || Math.abs(baseline - value) <= gap) {
		return { baseline, value };
	}
	return { baseline: baseline - Math.sign(baseline - value) * gap, value };
};

export type {
	//,
	SegmentEdges,
};
export {
	//,
	stackedSegmentEdges,
};
