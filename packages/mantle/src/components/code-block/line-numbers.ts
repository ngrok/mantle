/**
 * A line range is a string in the format of `start-end` where `start` and `end` are line numbers.
 */
export type LineRange = `${number}-${number}`;

const MAX_EXPANDED_LINE_RANGE_LENGTH = 1_000;

/**
 * Given a list of line ranges and numbers, resolves them into a unique list of line numbers as a set.
 *
 * @example
 * ```tsx
 * const highlightedLines = resolveLineNumbers(1, "3-5", 7, "10-12");
 * // Returns: Set {1, 3, 4, 5, 7, 10, 11, 12}
 *
 * const singleLine = resolveLineNumbers(42);
 * // Returns: Set {42}
 * ```
 */
export function resolveLineNumbers(...items: (LineRange | number)[]): Set<number> {
	const lineNumberSet = new Set<number>();

	for (const item of items) {
		if (typeof item === "number") {
			if (!isPositiveLineNumber(item)) {
				continue;
			}
			// only support integer line numbers
			const int = Math.floor(item);
			lineNumberSet.add(int);
		} else {
			const separatorIndex = item.indexOf("-");
			const startPart = item.slice(0, separatorIndex);
			const endPart = item.slice(separatorIndex + 1);
			let start = Number.parseInt(startPart, 10);
			let end = Number.parseInt(endPart, 10);

			// ignore invalid ranges that don't contain valid line numbers
			if (!isPositiveLineNumber(start) || !isPositiveLineNumber(end)) {
				continue;
			}

			// swap start and end if they are backwards
			if (start > end) {
				[start, end] = [end, start];
			}

			if (end - start + 1 > MAX_EXPANDED_LINE_RANGE_LENGTH) {
				continue;
			}

			for (let i = start; i <= end; i++) {
				lineNumberSet.add(i);
			}
		}
	}

	return lineNumberSet;
}

/**
 * Type Predicate: checks if a value is a positive, finite integer.
 */
const isPositiveLineNumber = (value: number | undefined): value is number =>
	value != null && !Number.isNaN(value) && value > 0 && Number.isFinite(value);
