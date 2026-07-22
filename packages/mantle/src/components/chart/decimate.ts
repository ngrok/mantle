/**
 * Min/max-per-pixel-column decimation (the uPlot strategy): past ~4 points per
 * device-pixel column, a full-resolution path rasterizes to exactly the
 * vertical sliver between the column's min and max, so emitting at most four
 * vertices per column (entry, min, max, exit) is visually lossless and makes
 * redraw cost O(plot width) instead of O(points).
 *
 * This module is internal shared implementation — not exported from the package.
 */

/**
 * Decimation begins when visible points ≥ `DECIMATION_ENTER_RATIO` × device-pixel
 * columns and ends below `DECIMATION_EXIT_RATIO` × columns. The gap between the
 * two is hysteresis so streaming appends or resizes hovering at the boundary
 * don't flip rendering modes every frame.
 */
const DECIMATION_ENTER_RATIO = 4;
const DECIMATION_EXIT_RATIO = 3;

/**
 * One series' values bucketed into device-pixel columns. Struct-of-arrays:
 * a column with no finite value has `hasData[column] === 0` and represents a
 * gap. Values are in data space (not pixels) so the result can be cached
 * across y-domain changes and remapped through fresh coefficients.
 */
type DecimatedColumns = {
	columnCount: number;
	hasData: Uint8Array;
	minValue: Float64Array;
	maxValue: Float64Array;
	/** First finite value entering the column (in x order). */
	inValue: Float64Array;
	/** Last finite value leaving the column (in x order). */
	outValue: Float64Array;
};

/**
 * Decide whether to decimate, with hysteresis around the enter/exit ratios.
 *
 * @example
 * ```ts
 * const decimate = shouldDecimate({ pointCount: 100_000, columnCount: 800, wasDecimated: false }); // true
 * ```
 */
const shouldDecimate = (options: {
	pointCount: number;
	columnCount: number;
	wasDecimated: boolean;
}): boolean => {
	const { pointCount, columnCount, wasDecimated } = options;
	if (columnCount <= 0) {
		return false;
	}
	if (wasDecimated) {
		return pointCount >= columnCount * DECIMATION_EXIT_RATIO;
	}
	return pointCount >= columnCount * DECIMATION_ENTER_RATIO;
};

/**
 * Bucket `values[i]` for `i` in `[startIndex, endIndex]` into device-pixel
 * columns. `xs` must be ascending; `positionK`/`positionB` map an x value to a
 * device-pixel offset from the plot's left edge; `NaN` values are gaps.
 *
 * @example
 * ```ts
 * const columns = decimateColumns({
 * 	xs, values, startIndex: 0, endIndex: xs.length - 1,
 * 	positionK: k, positionB: b, columnCount: plotWidthDevicePx,
 * });
 * ```
 */
const decimateColumns = (options: {
	xs: Float64Array;
	values: Float64Array;
	startIndex: number;
	endIndex: number;
	positionK: number;
	positionB: number;
	columnCount: number;
}): DecimatedColumns => {
	const { xs, values, startIndex, endIndex, positionK, positionB, columnCount } = options;
	const hasData = new Uint8Array(columnCount);
	const minValue = new Float64Array(columnCount);
	const maxValue = new Float64Array(columnCount);
	const inValue = new Float64Array(columnCount);
	const outValue = new Float64Array(columnCount);

	for (let index = startIndex; index <= endIndex; index++) {
		const value = values[index] ?? Number.NaN;
		if (Number.isNaN(value)) {
			continue;
		}
		const x = xs[index] ?? Number.NaN;
		let column = Math.floor(x * positionK + positionB);
		// The point exactly at the domain's right edge (x === domainMax) floors to
		// columnCount by the fencepost; it belongs in the last column.
		if (column === columnCount) {
			column = columnCount - 1;
		}
		// Points still outside the visible column range are off-plot. During a
		// streaming/scroll domain glide the tweened domain lags the data, so
		// not-yet-visible points (x well past domainMax → column well past
		// columnCount) would otherwise clamp into the edge column and paint a
		// spurious full-height sliver at the plot's right edge. Skip them; they
		// bucket correctly once the glide catches up. (In the static case every
		// point is in-range, so nothing is skipped.)
		if (column < 0 || column >= columnCount) {
			continue;
		}
		if (hasData[column] === 0) {
			hasData[column] = 1;
			minValue[column] = value;
			maxValue[column] = value;
			inValue[column] = value;
			outValue[column] = value;
			continue;
		}
		if (value < (minValue[column] ?? Number.POSITIVE_INFINITY)) {
			minValue[column] = value;
		}
		if (value > (maxValue[column] ?? Number.NEGATIVE_INFINITY)) {
			maxValue[column] = value;
		}
		outValue[column] = value;
	}

	return { columnCount, hasData, minValue, maxValue, inValue, outValue };
};

export type {
	//,
	DecimatedColumns,
};
export {
	//,
	DECIMATION_ENTER_RATIO,
	DECIMATION_EXIT_RATIO,
	decimateColumns,
	shouldDecimate,
};
