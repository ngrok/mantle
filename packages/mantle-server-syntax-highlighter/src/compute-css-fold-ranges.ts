import { finalizeFoldRanges, type FoldableRange } from "@ngrok/mantle/highlight-utils";

/**
 * Raw-source fold computer for CSS — single-pass, parser-quality without a
 * parser dependency.
 *
 * Mirrors `computeJsonFoldRanges` but adds CSS-specific lexical features:
 *
 * - `/* … *​/` block comments are skipped wholesale.
 * - `"…"` and `'…'` string literals (including `\\` and `\` escapes) are
 *   skipped so braces inside `content: "{ }"` don't open folds.
 * - Backslash escapes outside of strings (CSS identifiers can use them) are
 *   transparent — we just consume the next character.
 *
 * lightningcss is the project's preferred CSS parser, but its public visitor
 * API only surfaces *start* locations (`Location { line, column }`), not end
 * locations, which is what `FoldableRange.endLine` requires. Until upstream
 * exposes end spans we get the same correctness from a single-pass brace
 * matcher with a tiny CSS lexer — and skip the ~5MB native dep.
 *
 * @see https://github.com/parcel-bundler/lightningcss/issues/512
 */

/**
 * Computes foldable ranges for a CSS source string. Each multi-line `{ … }`
 * (style rule, at-rule body, nested rule, keyframe selector) emits one range
 * with the opener and closer lines staying visible.
 *
 * Tolerant of malformed CSS — unmatched braces are dropped silently rather
 * than throwing, so a partial snippet still gets every fold it can. This
 * matches the behavior of `computeJsonFoldRanges` for JSON.
 *
 * @example
 * computeCssFoldRanges({ code: ".a {\n  color: red;\n}" });
 * // => [{ id: "1", startLine: 1, endLine: 3 }]
 */
function computeCssFoldRanges({
	code,
}: {
	/** Raw CSS source code to scan. */
	code: string;
}): FoldableRange[] {
	const length = code.length;
	if (length === 0) {
		return [];
	}

	const stack: number[] = [];
	const ranges: FoldableRange[] = [];

	let line = 1;
	let index = 0;

	while (index < length) {
		const character = code.charCodeAt(index);

		if (character === 10) {
			line += 1;
			index += 1;
			continue;
		}
		if (character === 13) {
			line += 1;
			index += 1;
			if (index < length && code.charCodeAt(index) === 10) {
				index += 1;
			}
			continue;
		}

		// `/* … */` block comment — CSS has no line comments in standard CSS.
		if (character === 47 && index + 1 < length && code.charCodeAt(index + 1) === 42) {
			index += 2;
			while (index < length) {
				const commentChar = code.charCodeAt(index);
				if (commentChar === 10) {
					line += 1;
					index += 1;
					continue;
				}
				if (commentChar === 13) {
					line += 1;
					index += 1;
					if (index < length && code.charCodeAt(index) === 10) {
						index += 1;
					}
					continue;
				}
				if (commentChar === 42 && index + 1 < length && code.charCodeAt(index + 1) === 47) {
					index += 2;
					break;
				}
				index += 1;
			}
			continue;
		}

		// `"…"` or `'…'` string literal. CSS allows escaped newlines (`\` followed
		// by a newline) which continue the string; treat any backslash as
		// "skip the next char" without bumping the line counter past it.
		if (character === 34 || character === 39) {
			const quote = character;
			index += 1;
			while (index < length) {
				const stringChar = code.charCodeAt(index);
				if (stringChar === 92) {
					index += 1;
					if (index >= length) {
						break;
					}
					const escaped = code.charCodeAt(index);
					if (escaped === 10) {
						line += 1;
					} else if (escaped === 13) {
						line += 1;
						if (index + 1 < length && code.charCodeAt(index + 1) === 10) {
							index += 1;
						}
					}
					index += 1;
					continue;
				}
				if (stringChar === quote) {
					index += 1;
					break;
				}
				if (stringChar === 10) {
					// CSS strings normally can't span unescaped newlines; bail to
					// avoid swallowing the rest of the file when the quote is
					// stranded.
					break;
				}
				index += 1;
			}
			continue;
		}

		if (character === 123) {
			stack.push(line);
			index += 1;
			continue;
		}

		if (character === 125) {
			const startLine = stack.pop();
			if (startLine != null && startLine !== line) {
				ranges.push({ id: String(startLine), startLine, endLine: line });
			}
			index += 1;
			continue;
		}

		index += 1;
	}

	return finalizeFoldRanges(ranges);
}

export { computeCssFoldRanges };
