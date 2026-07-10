import type { LineRange } from "./line-numbers.js";
import { resolveLineNumbers } from "./line-numbers.js";
import { cx } from "../../utils/cx/cx.js";
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

/** Inline caret SVG used by the fold toggle button. Mirrors `CaretDown` from Phosphor at a small size. */
const FOLD_CARET_SVG =
	'<svg class="mantle-code-fold-caret" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" fill-rule="evenodd" d="M3.22 5.97a.75.75 0 0 1 1.06 0L8 9.69l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L3.22 7.03a.75.75 0 0 1 0-1.06Z"/></svg>';

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
	showLineNumbers?: boolean | undefined;
};

/**
 * Wraps each line of Shiki-highlighted HTML in Mantle's line-number, fold,
 * and line-highlight markup, producing the final HTML rendered by `CodeBlock.Code`.
 */
function decorateHighlightedHtml({
	foldableRanges,
	highlightLines,
	html,
	lineNumberStart = 1,
	showLineNumbers = false,
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
	const hasFolds = foldableRanges != null && foldableRanges.length > 0;

	if (hasFolds && foldableRanges != null) {
		for (const range of foldableRanges) {
			const encodedId = encodeFoldRegionId(range.id);
			openerIdByBufferLine.set(range.startLine, encodedId);
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
		// already occupies the gutter). Tagging the *opener* lines — which are
		// sparse — instead of probing each line with a relational `:has()` keeps
		// gutter alignment a flat class match whose cost does not scale with line
		// count, and adds near-zero markup (see mantle.css). `openerId` is only set
		// when folding is active, so the tag never appears in non-fold blocks.
		const openerId = hasFolds ? openerIdByBufferLine.get(bufferLineNumber) : undefined;
		const lineClassName = cx(
			"mantle-code-line",
			highlightedLineNumbers.has(displayedLineNumber) && "mantle-code-line-highlighted",
			openerId != null && "mantle-code-line-opener",
		);

		const lineNumberHtml = showLineNumbers
			? `<span class="mantle-code-line-number" data-slot="line-number">${displayedLineNumber}</span>`
			: "";

		let foldGutterHtml = "";
		let foldRegionsAttribute = "";
		let trailingEllipsisHtml = "";
		if (hasFolds) {
			// Opener lines render a real semantic <button> in the gutter.
			// Non-opener lines reserve gutter space via CSS (opener lines are
			// tagged `mantle-code-line-opener` above so the rule can reset theirs).
			// Skipping per-line spacer markup is what keeps HTML overhead near zero
			// for large JSON blocks.
			if (openerId != null) {
				foldGutterHtml = `<button type="button" class="mantle-code-fold-toggle" data-slot="fold-toggle" data-fold-line="${openerId}" aria-expanded="true" aria-label="Toggle code folding">${FOLD_CARET_SVG}</button>`;
				trailingEllipsisHtml =
					'<span class="mantle-code-fold-ellipsis" data-slot="fold-ellipsis" aria-hidden="true">⋯</span>';
			}

			const regions = regionsByBufferLine.get(bufferLineNumber);
			if (regions != null && regions.length > 0) {
				foldRegionsAttribute = ` data-fold-regions="${regions.join(" ")}"`;
			}
		}

		const renderedContent = line === "" ? " " : line;
		const contentHtml = `<span class="mantle-code-line-content" data-slot="line-content">${renderedContent}${trailingEllipsisHtml}</span>`;

		output += `<span class="${lineClassName}" data-line-number="${displayedLineNumber}"${foldRegionsAttribute}>${lineNumberHtml}${foldGutterHtml}${contentHtml}</span>`;
	}
	return output;
}

export { decorateHighlightedHtml };
export type { DecorateHighlightedHtmlInput };
