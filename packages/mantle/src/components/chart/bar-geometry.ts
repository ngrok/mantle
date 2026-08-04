/**
 * Pixel geometry for one bar: its two edges along the value axis, and its
 * thickness across the category axis.
 *
 * Stacking accumulates in value space (see ./stack.js); this module turns one
 * segment's boundaries into the two pixel edges the renderer fills. Both axes
 * are handled in one direction-free vocabulary — value edges and a thickness —
 * so vertical and horizontal bars share the math instead of keeping mirrored
 * copies that drift apart.
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
 * The share of its band step one bar fills once the step is wide enough for
 * that share to beat {@link BAR_DENSE_THICKNESS}. A bar reads as a tooth only
 * while it stays wider than the air beside it, which is what picks this over an
 * even split: 60/40 still reads as bars at a glance, and 50/50 reads as stripes.
 */
const BAR_STEP_FILL = 0.6;

/**
 * The thickest a bar paints while the fill rule has not taken over — the cap a
 * dense chart keeps. `BAR_STEP_FILL` reaches it at a step of exactly 40px, so
 * the two rules meet with no jump, and every chart whose step is narrower than
 * that paints exactly what it painted before the fill rule existed.
 */
const BAR_DENSE_THICKNESS = 24;

/**
 * The thickest a bar paints, however wide its band. Two categories across a
 * 650px plot would fill 195px each without it, and a bar that wide reads as a
 * panel rather than a mark.
 */
const BAR_MAX_THICKNESS = 64;

/**
 * The thickness one bar paints across the category axis: its slot, capped so a
 * wide band grows the bar instead of the air beside it.
 *
 * A fixed cap makes a sparse chart look gap-toothed — seven bars across a wide
 * plot each took 24px of a 93px step and left 69px of air. The cap therefore
 * tracks the step: `BAR_STEP_FILL` of it, floored at `BAR_DENSE_THICKNESS` and
 * ceilinged at `BAR_MAX_THICKNESS`. The result depends on the step and the slot
 * alone — same layout, same pixels, and monotonic in both — and the two clamps
 * meet the fill line without a step change, so a chart never jumps thickness as
 * a row arrives or the container resizes.
 *
 * Pass the slot, not the bandwidth. Grouped series split one band, and each bar
 * fills its own slot up to the same cap, so a group tightens rather than
 * outgrowing its band.
 *
 * @example
 * ```ts
 * // Seven days across a 650px plot: a 93px step, a 74px band.
 * barThickness({ step: 92.9, slot: 74.3 }); // 55.7 — the fill rule
 * // Sixty points across the same plot: the step is too narrow to reach the cap.
 * barThickness({ step: 10.8, slot: 8.7 }); // 8.7 — the whole slot
 * ```
 */
const barThickness = (options: { step: number; slot: number }): number => {
	const { step, slot } = options;
	const cap = Math.min(BAR_MAX_THICKNESS, Math.max(BAR_DENSE_THICKNESS, step * BAR_STEP_FILL));
	return Math.min(slot, cap);
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
	BAR_DENSE_THICKNESS,
	BAR_MAX_THICKNESS,
	BAR_STEP_FILL,
	barThickness,
	isStackedDataEnd,
	stackedSegmentEdges,
};
