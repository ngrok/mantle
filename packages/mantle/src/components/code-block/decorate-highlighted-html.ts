import type { LineRange } from "./line-numbers.js";
import { resolveLineNumbers } from "./line-numbers.js";
import { clsx } from "../../utils/cx/clsx.js";
import type { FoldableRange } from "./compute-json-fold-ranges.js";

/** Removes trailing `\n` and `\r` characters from the end of a string. */
function trimTrailingNewlines(input: string): string {
	let end = input.length;
	while (end > 0 && (input.charCodeAt(end - 1) === 10 || input.charCodeAt(end - 1) === 13)) {
		end -= 1;
	}
	return end === input.length ? input : input.slice(0, end);
}

/** Splits Shiki-highlighted HTML into per-line content, unwrapping `<span class="line">` wrappers. */
function splitHighlightedHtmlIntoLines(html: string): string[] {
	const normalizedHtml = trimTrailingNewlines(html).replaceAll("\r\n", "\n").replaceAll("\r", "\n");
	const shikiLines = normalizedHtml.split("\n");
	const linePrefix = '<span class="line">';
	const lineSuffix = "</span>";

	for (let i = 0; i < shikiLines.length; i++) {
		const line = shikiLines[i] ?? "";
		if (line.startsWith(linePrefix) && line.endsWith(lineSuffix)) {
			shikiLines[i] = line.slice(linePrefix.length, line.length - lineSuffix.length);
		}
	}

	return shikiLines;
}

/**
 * Encodes public fold IDs for safe HTML attribute storage and for the
 * runtime's space-separated region sets. Built-in strategies use numeric
 * strings, but custom strategies may use descriptive IDs with spaces or
 * quotes.
 */
function encodeFoldRegionId(id: string): string {
	return encodeURIComponent(id);
}

/** Input for {@link decorateHighlightedHtml}. */
type DecorateHighlightedHtmlInput = {
	/**
	 * Optional list of foldable ranges, typically produced by
	 * {@link import("./compute-json-fold-ranges.js").computeJsonFoldRanges}.
	 *
	 * When non-empty, every line gets a fold gutter slot; opener lines render a
	 * semantic `<button>` toggle, descendant content lines carry
	 * `data-fold-regions` so the runtime can hide them in O(region size) on
	 * collapse.
	 */
	foldableRanges?: FoldableRange[] | undefined;
	highlightLines?: (LineRange | number)[] | undefined;
	html: string;
	lineNumberStart?: number | undefined;
	/**
	 * @deprecated It has no effect. `CodeBlock.Code` shows line numbers from its
	 * `data-mantle-line-numbers`, and `mantle.css` counts the lines with a CSS
	 * counter.
	 */
	showLineNumbers?: boolean | undefined;
};

/**
 * Wraps each line of Shiki-highlighted HTML in Mantle's line, fold, and
 * line-highlight markup, producing the final HTML rendered by `CodeBlock.Code`.
 */
function decorateHighlightedHtml({
	foldableRanges,
	highlightLines,
	html,
	lineNumberStart = 1,
}: DecorateHighlightedHtmlInput): string {
	const highlightedLineNumbers = resolveLineNumbers(...(highlightLines ?? []));
	const lines = splitHighlightedHtmlIntoLines(html);

	// Build per-line fold metadata so each line can announce its parent fold
	// regions and opener lines can render a toggle. Indexing up front keeps
	// the per-line loop O(1) for fold lookups, even on 1000+ line inputs.
	// Fold ranges are *buffer-relative* (1-indexed positions in the original
	// code), independent of `lineNumberStart` which only affects display.
	const openerIdByBufferLine = new Map<number, string>();
	const regionsByBufferLine = new Map<number, string[]>();
	// Why: a folded line is `display: none`, and CSS counts no such line. The
	// line that closes a fold sets the line counter again, so the numbers after
	// a fold stay right. Why from the `<pre>`'s start: the first line counts
	// from it too, so the two never disagree.
	const closerBufferLines = new Set<number>();
	const hasFolds = foldableRanges != null && foldableRanges.length > 0;

	if (hasFolds && foldableRanges != null) {
		for (const range of foldableRanges) {
			const encodedId = encodeFoldRegionId(range.id);
			openerIdByBufferLine.set(range.startLine, encodedId);
			closerBufferLines.add(range.endLine);
			for (let bufferLine = range.startLine + 1; bufferLine < range.endLine; bufferLine += 1) {
				let regions = regionsByBufferLine.get(bufferLine);
				if (regions == null) {
					regions = [];
					regionsByBufferLine.set(bufferLine, regions);
				}
				regions.push(encodedId);
			}
		}
	}

	let output = "";
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";
		const bufferLineNumber = i + 1;
		const displayedLineNumber = lineNumberStart + i;
		// In a fold-enabled block, CSS reserves the gutter column on every line's
		// content by default and resets it on opener lines (whose toggle button
		// already occupies the gutter). Tagging the *opener* lines (which are
		// sparse) instead of probing each line with a relational `:has()` keeps
		// gutter alignment a flat class match whose cost does not scale with line
		// count, and adds near-zero markup (see mantle.css). `openerId` is only set
		// when folding is active, so the tag never appears in non-fold blocks.
		const openerId = hasFolds ? openerIdByBufferLine.get(bufferLineNumber) : undefined;
		// Why `clsx`: these are mantle class names, not Tailwind utilities, so the
		// Tailwind merge engine in `cx` has nothing to resolve and only adds bundle weight.
		const lineClassName = clsx(
			"mantle-code-line",
			highlightedLineNumbers.has(displayedLineNumber) && "mantle-code-line-highlighted",
			openerId != null && "mantle-code-line-opener",
		);

		// Why no number element: `mantle.css` draws the number from a CSS
		// counter in a pseudo-element, so the digits stay out of the text that
		// copy, find, screen readers, and crawlers read.
		let foldGutterHtml = "";
		let foldRegionsAttribute = "";
		if (hasFolds) {
			// Opener lines render a real semantic <button> in the gutter.
			// Non-opener lines reserve gutter space via CSS (opener lines are
			// tagged `mantle-code-line-opener` above so the rule can reset theirs).
			// Skipping per-line spacer markup is what keeps HTML overhead near zero
			// for large JSON blocks.
			if (openerId != null) {
				// Why no inline caret or ellipsis: `mantle.css` draws both, so each
				// opener line carries no SVG and the `⋯` stays out of the text.
				foldGutterHtml = `<button type="button" class="mantle-code-fold-toggle" data-fold-line="${openerId}" aria-expanded="true" aria-label="Toggle code folding"></button>`;
			}

			const regions = regionsByBufferLine.get(bufferLineNumber);
			if (regions != null && regions.length > 0) {
				foldRegionsAttribute = ` data-fold-regions="${regions.join(" ")}"`;
			}
		}

		const contentHtml = `<span class="mantle-code-line-content">${line}</span>`;

		// Why a newline between lines: lines break by CSS, so without it
		// `textContent` (what crawlers and HTML-to-text tools read) runs every
		// line together. `mantle.css` makes `<code>` a flex column, and a flex
		// container renders no text run that is only white space, so the newline
		// adds no line box, no element, and nothing to copied text.
		if (i > 0) {
			output += "\n";
		}
		const counterStyle = closerBufferLines.has(bufferLineNumber)
			? ` style="counter-set:mantle-line calc(var(--mantle-line-number-start,1) + ${i})"`
			: "";
		output += `<span class="${lineClassName}" data-line-number="${displayedLineNumber}"${foldRegionsAttribute}${counterStyle}>${foldGutterHtml}${contentHtml}</span>`;
	}
	return output;
}

export { decorateHighlightedHtml };
export type { DecorateHighlightedHtmlInput };
