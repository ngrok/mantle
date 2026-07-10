import { finalizeFoldRanges, type FoldableRange } from "./fold-range-utils.js";

type JsonBracketStackEntry = {
	opener: 123 | 91;
	line: number;
};

/**
 * Computes foldable ranges for a JSON source string. Each multi-line `{...}`
 * or `[...]` produces one range whose opener and closer lines remain visible
 * when collapsed (matching VS Code's folding behavior).
 *
 * The parser is intentionally permissive: it skips over unmatched/invalid
 * bracket sequences instead of throwing, so a partially valid JSON snippet
 * still gets the folds it can. Strings, escape sequences, and unicode
 * escapes are handled correctly so brackets inside string literals don't
 * open spurious folds.
 *
 * Runs in a single pass over the source (O(n) chars). At most one fold range
 * per opener line is emitted — when several brackets open on the same line,
 * only the outermost (largest range) survives, so a single click collapses
 * the whole sub-tree without rendering stacked toggles.
 *
 * @example
 * ```ts
 * computeJsonFoldRanges(`{\n  "a": [\n    1\n  ]\n}`);
 * // => [
 * //   { id: "1", startLine: 1, endLine: 5 },
 * //   { id: "2", startLine: 2, endLine: 4 },
 * // ]
 * ```
 */
function computeJsonFoldRanges(code: string): FoldableRange[] {
	const length = code.length;
	if (length === 0) {
		return [];
	}

	const stack: JsonBracketStackEntry[] = [];
	const ranges: FoldableRange[] = [];

	let line = 1;
	let index = 0;

	while (index < length) {
		const character = code.charCodeAt(index);

		if (character === 10) {
			// '\n'
			line += 1;
			index += 1;
			continue;
		}
		if (character === 13) {
			// '\r' — treat \r\n and bare \r as a line break
			line += 1;
			index += 1;
			if (index < length && code.charCodeAt(index) === 10) {
				index += 1;
			}
			continue;
		}

		if (character === 34) {
			// '"' — skip over string contents (including escaped quotes)
			index += 1;
			while (index < length) {
				const stringChar = code.charCodeAt(index);
				if (stringChar === 92) {
					// '\\' — skip the next char unconditionally; do not advance line on escaped \n
					index += 2;
					continue;
				}
				if (stringChar === 34) {
					index += 1;
					break;
				}
				if (stringChar === 10 || stringChar === 13) {
					// Unterminated string spanning a line — bail without advancing further into it.
					break;
				}
				index += 1;
			}
			continue;
		}

		if (character === 123 || character === 91) {
			// '{' or '['
			stack.push({ opener: character, line });
			index += 1;
			continue;
		}

		if (character === 125 || character === 93) {
			// '}' or ']'
			const matchingOpener = character === 125 ? 123 : 91;
			const top = stack[stack.length - 1];
			if (top?.opener === matchingOpener) {
				stack.pop();
				if (top.line !== line) {
					ranges.push({ id: String(top.line), startLine: top.line, endLine: line });
				}
			} else if (top != null) {
				// Mismatched closer: the active bracket sequence is structurally
				// invalid, so prevent any containing opener from pairing later.
				stack.length = 0;
			}
			index += 1;
			continue;
		}

		index += 1;
	}

	return finalizeFoldRanges(ranges);
}

export { computeJsonFoldRanges };
export type { FoldableRange };
