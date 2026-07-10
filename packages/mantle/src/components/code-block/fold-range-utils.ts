/**
 * Shared types and helpers used by every fold-range computer
 * (`computeFoldRanges`, `computeJsonFoldRanges`). Kept in its own module so
 * the legacy raw-source parser and the token-driven parser can share a
 * single dedup/finalize pass without taking a dependency on each other.
 */

/**
 * A foldable region in a code block. Lines `startLine + 1` through
 * `endLine - 1` are hidden when the region is collapsed; the opener and
 * closer lines remain visible.
 */
type FoldableRange = {
	/**
	 * Stable identifier for the fold region within a code block. Equal to the
	 * stringified `startLine` (unique by construction after dedup), encoded
	 * into `data-fold-line` on the toggle button and `data-fold-regions` on
	 * each descendant line so the runtime delegated handler can resolve
	 * toggles by attribute lookup. Custom strategies should provide non-empty
	 * IDs that are unique within the code block; the decorator URI-encodes
	 * them before rendering so spaces and quotes remain safe.
	 */
	id: string;
	/** 1-based line number of the line that contains the opening token. */
	startLine: number;
	/** 1-based line number of the line that contains the matching closing token. */
	endLine: number;
};

/**
 * Sorts ranges by `startLine` ascending (with `endLine` descending as a
 * tiebreak so the largest span wins on a shared opener line) and keeps at
 * most one range per opener line. Mutates and returns the input.
 */
function finalizeFoldRanges(ranges: FoldableRange[]): FoldableRange[] {
	if (ranges.length <= 1) {
		return ranges;
	}
	ranges.sort((a, b) => {
		if (a.startLine !== b.startLine) {
			return a.startLine - b.startLine;
		}
		return b.endLine - a.endLine;
	});

	const filtered: FoldableRange[] = [];
	let lastStartLine = -1;
	for (const range of ranges) {
		if (range.startLine === lastStartLine) {
			continue;
		}
		filtered.push(range);
		lastStartLine = range.startLine;
	}
	return filtered;
}

export { finalizeFoldRanges };
export type { FoldableRange };
