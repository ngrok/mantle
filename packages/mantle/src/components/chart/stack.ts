/**
 * Stacking accumulation for bar and area charts.
 *
 * Stacking runs BEFORE decimation: it produces full-resolution cumulative
 * boundary series (layer edges), and decimation then buckets those boundaries.
 * Decimating raw series first and stacking after is incorrect — per-column
 * minima/maxima of different series occur at different x samples, so the
 * composed edges would be fabricated geometry and the stack's top would
 * overshoot the true total (sum of maxima ≥ max of sums).
 *
 * This module is internal shared implementation — not exported from the package.
 */

/**
 * Cumulative stack boundaries. For series `s` at index `i`, the painted
 * segment/band spans `lower[s][i]` → `upper[s][i]`. Positive values stack
 * upward from the positive cumulative sum and negative values stack downward,
 * so diverging stacks are correct by construction. A `NaN` value contributes
 * zero to the stack and marks that series' segment as a gap at that index.
 */
type StackBoundaries = {
	lower: Float64Array[];
	upper: Float64Array[];
	/** Extent of the outermost boundaries — the stacked y domain. */
	min: number;
	max: number;
	/**
	 * The series index at the data end of each column's positive pile — the last
	 * series with a value above zero there. `-1` marks a column with no positive
	 * segment, which matches no series index. Zero-valued and `NaN` series paint
	 * nothing, so they never claim the end.
	 */
	positiveEnd: Int32Array;
	/** The negative pile's mirror of {@link StackBoundaries.positiveEnd}. */
	negativeEnd: Int32Array;
};

/**
 * Accumulate stacked boundaries in registration order (first series sits at
 * the baseline; later series stack outward), and record which series lands at
 * each column's data end. The ends are per column, not per series: a series
 * that is zero on one column and the tallest on the next tops only the second,
 * and only the topper wears the renderer's rounded cap.
 *
 * @example
 * ```ts
 * const { lower, upper, positiveEnd } = computeStackBoundaries([httpValues, tcpValues]);
 * // tcp's band at i spans lower[1][i] → upper[1][i]
 * // positiveEnd[i] is 0 wherever tcp is zero and http is not
 * ```
 */
const computeStackBoundaries = (seriesValues: readonly Float64Array[]): StackBoundaries => {
	const seriesCount = seriesValues.length;
	const pointCount = seriesValues[0]?.length ?? 0;
	const lower: Float64Array[] = [];
	const upper: Float64Array[] = [];
	for (let series = 0; series < seriesCount; series++) {
		lower.push(new Float64Array(pointCount));
		upper.push(new Float64Array(pointCount));
	}

	let min = 0;
	let max = 0;
	const positiveSum = new Float64Array(pointCount);
	const negativeSum = new Float64Array(pointCount);
	// -1 is the empty-pile marker; Int32Array zero-fills, which is a real index.
	const positiveEnd = new Int32Array(pointCount).fill(-1);
	const negativeEnd = new Int32Array(pointCount).fill(-1);

	for (let series = 0; series < seriesCount; series++) {
		const values = seriesValues[series];
		const lowerRow = lower[series];
		const upperRow = upper[series];
		if (values == null || lowerRow == null || upperRow == null) {
			continue;
		}
		for (let index = 0; index < pointCount; index++) {
			const value = values[index] ?? Number.NaN;
			if (Number.isNaN(value)) {
				// A gap contributes nothing; keep the boundary continuous at the
				// current cumulative sum so series above don't tear.
				lowerRow[index] = Number.NaN;
				upperRow[index] = Number.NaN;
				continue;
			}
			if (value >= 0) {
				const start = positiveSum[index] ?? 0;
				const end = start + value;
				positiveSum[index] = end;
				lowerRow[index] = start;
				upperRow[index] = end;
				if (end > max) {
					max = end;
				}
				if (value > 0) {
					// Series ascend, so the last writer is the outermost segment.
					positiveEnd[index] = series;
				}
			} else {
				const start = negativeSum[index] ?? 0;
				const end = start + value;
				negativeSum[index] = end;
				lowerRow[index] = end;
				upperRow[index] = start;
				if (end < min) {
					min = end;
				}
				negativeEnd[index] = series;
			}
		}
	}

	return { lower, upper, min, max, positiveEnd, negativeEnd };
};

export type {
	//,
	StackBoundaries,
};
export {
	//,
	computeStackBoundaries,
};
