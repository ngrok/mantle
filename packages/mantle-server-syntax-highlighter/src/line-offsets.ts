/**
 * Helpers for converting parser byte offsets into 1-indexed line numbers.
 *
 * Every AST-based fold strategy in this package speaks line numbers (because
 * `FoldableRange.startLine` / `endLine` are line-anchored), but parsers like
 * `oxc-parser` and `postcss` report offsets / line+col tuples derived from
 * byte positions. Building a single sorted `lineOffsets` array up front keeps
 * the per-node lookup `O(log n)` instead of rescanning the source each call.
 */

/**
 * Returns an array where index `i` holds the byte offset of the start of
 * the `i + 1`-th line of `source`. The first entry is always `0`.
 *
 * Treats `\n`, `\r\n`, and bare `\r` as line breaks so it agrees with how
 * Shiki, oxc, parse5, and postcss split lines (they all match the JS
 * runtime's `String.prototype.split(/\r\n|\r|\n/)` behavior in practice).
 */
function buildLineOffsets(source: string): number[] {
	const offsets: number[] = [0];
	const length = source.length;
	for (let index = 0; index < length; index += 1) {
		const character = source.charCodeAt(index);
		if (character === 10) {
			offsets.push(index + 1);
			continue;
		}
		if (character === 13) {
			// `\r\n` and bare `\r` both start a new line at index + 1 (or + 2 when
			// followed by `\n`); skip the `\n` to avoid pushing a duplicate offset.
			const isCrLf = index + 1 < length && source.charCodeAt(index + 1) === 10;
			offsets.push(isCrLf ? index + 2 : index + 1);
			if (isCrLf) {
				index += 1;
			}
		}
	}
	return offsets;
}

/**
 * Returns the 1-indexed line number that contains `offset` in the source
 * scanned by {@link buildLineOffsets}. Out-of-range offsets clamp to the
 * first or last line.
 */
function offsetToLine(lineOffsets: readonly number[], offset: number): number {
	if (lineOffsets.length === 0) {
		return 1;
	}
	if (offset <= 0) {
		return 1;
	}
	let low = 0;
	let high = lineOffsets.length - 1;
	while (low < high) {
		// Bias the midpoint toward `high` so the loop terminates when
		// `lineOffsets[mid] <= offset` repeatedly succeeds with `low === mid`.
		const mid = (low + high + 1) >>> 1;
		const start = lineOffsets[mid] ?? 0;
		if (start <= offset) {
			low = mid;
		} else {
			high = mid - 1;
		}
	}
	return low + 1;
}

export { buildLineOffsets, offsetToLine };
