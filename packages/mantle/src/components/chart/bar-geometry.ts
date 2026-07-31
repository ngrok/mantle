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
 * The shortest extent that covers a device pixel at a device-pixel ratio of
 * `1`. Anything below it paints nothing, so it can neither own a column's cap
 * nor push its neighbor off the zero baseline. Value equality cannot stand in
 * for this: a sub-cent contribution against a dollar-scale axis is a nonzero
 * value that rounds to no ink.
 */
const MIN_VISIBLE_EXTENT = 0.5;

/**
 * The data-end boundary of one segment — the one further from zero. A positive
 * segment runs `lower` → `upper`; a negative one runs `upper` → `lower`.
 */
const dataEndOf = (lower: number, upper: number): number => (lower < 0 ? lower : upper);

/**
 * The pixel edges of one bar segment, with the enter reveal applied and the
 * surface gap carved from its baseline side.
 *
 * `lower` and `upper` are the segment's cumulative boundaries. Pick the two
 * ends by pile, or the cap, the reveal, and the gap all land on the wrong edge
 * of a diverging stack. Pass `lower: 0` for an unstacked bar.
 *
 * Two rules keep the gap from damaging the segment it separates:
 *
 * - Carve only when the baseline edge clears the zero pixel. A column whose
 *   stack below paints nothing has nothing to separate from, and carving there
 *   lifts the whole column off the axis. Sparse stacks hit this constantly.
 * - Carve at most half the painted extent. A full carve off a short segment
 *   inverts it, and the renderer draws an inverted rect on the wrong side of
 *   its own boundary. Halving keeps the painted extent rising with the value.
 *   Skipping the carve below a threshold instead makes a taller segment paint
 *   shorter than the one beside it.
 *
 * @example
 * ```ts
 * // The 0.4 → 0.6 segment of a stack, on an axis where 0 is 200px and 1 is 0px.
 * stackedSegmentEdges({ lower: 0.4, upper: 0.6, toPixel: (v) => 200 - v * 200, reveal: 1, gap: 2 });
 * // { baseline: 118, value: 80 } — 2px carved off the 120px baseline edge
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
	const baseline = toPixel(negative ? upper : lower);
	const value = baseline + (toPixel(dataEndOf(lower, upper)) - baseline) * reveal;
	if (Math.abs(baseline - toPixel(0)) < MIN_VISIBLE_EXTENT) {
		return { baseline, value };
	}
	const carve = Math.min(gap, Math.abs(baseline - value) / 2);
	return { baseline: baseline - Math.sign(baseline - value) * carve, value };
};

/**
 * Whether one stacked segment wears the renderer's rounded cap: its data edge
 * must land within a device pixel of the outer edge of the pile it belongs to.
 *
 * `computeStackBoundaries` records the outermost series that carries a value.
 * A segment thinner than a pixel paints nothing, so the cap has to follow what
 * the column shows instead. Pixel distance answers both at once: the invisible
 * segment keeps a cap nobody can see, and the segment under it gets the one
 * that reads.
 *
 * Pass boundaries from the settled stack, never from a tween. A tweened edge
 * measured against a settled pile end matches nothing until the tween lands,
 * which strips the cap for the whole transition.
 *
 * @example
 * ```ts
 * // A 100-unit segment under a 0.001-unit one still tops the column it paints.
 * isStackedDataEnd({ lower: 0, upper: 100, pileOuter: 100.001, toPixel: (v) => 300 - v * 2.5 });
 * // true
 * ```
 */
const isStackedDataEnd = (options: {
	lower: number;
	upper: number;
	/** The pile's outer boundary at this column, from the settled stack. */
	pileOuter: number;
	toPixel: (value: number) => number;
}): boolean => {
	const { lower, upper, pileOuter, toPixel } = options;
	if (Number.isNaN(pileOuter)) {
		return false;
	}
	const dataEnd = toPixel(dataEndOf(lower, upper));
	return Math.abs(dataEnd - toPixel(pileOuter)) < MIN_VISIBLE_EXTENT;
};

export {
	//,
	isStackedDataEnd,
	stackedSegmentEdges,
};
