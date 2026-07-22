/**
 * Pointer → datum hit-testing.
 *
 * Continuous x uses a binary search for the nearest sample (O(log n) per
 * pointer move at 100k points); band x inverts the band-step math directly
 * (see `invertBand` in ./scales.js).
 *
 * This module is internal shared implementation — not exported from the package.
 */

/**
 * The index in ascending `xs` (first `length` entries) whose value is nearest
 * to `x` — the crosshair snap. Returns `null` for empty data.
 *
 * @example
 * ```ts
 * const index = nearestIndex(xs, xs.length, cursorXValue);
 * ```
 */
const nearestIndex = (xs: Float64Array, length: number, x: number): number | null => {
	if (length <= 0) {
		return null;
	}
	let low = 0;
	let high = length - 1;
	const first = xs[0] ?? 0;
	const last = xs[high] ?? 0;
	if (x <= first) {
		return 0;
	}
	if (x >= last) {
		return high;
	}
	while (high - low > 1) {
		const mid = (low + high) >> 1;
		if ((xs[mid] ?? 0) <= x) {
			low = mid;
		} else {
			high = mid;
		}
	}
	const lowDistance = x - (xs[low] ?? 0);
	const highDistance = (xs[high] ?? 0) - x;
	return highDistance < lowDistance ? high : low;
};

export {
	//,
	nearestIndex,
};
