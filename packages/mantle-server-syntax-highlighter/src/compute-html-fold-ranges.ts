import { finalizeFoldRanges, type FoldableRange } from "@ngrok/mantle/highlight-utils";
import { html, parse, parseFragment } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

/**
 * AST-based fold computer for HTML and XML.
 *
 * Uses `parse5` with `sourceCodeLocationInfo: true` so each element node carries
 * the line numbers of its open and close tags. Walking the tree gives us:
 *
 * - One fold per multi-line element (`<div>…</div>`).
 * - One fold per multi-line opening tag (`<div\n  class="x"\n>` — the
 *   attribute list collapses).
 * - Correct void-element handling — parse5 already knows that `<br>`, `<img>`,
 *   etc. don't open folds.
 * - Template content traversal — parse5 stores `<template>` descendants on a
 *   separate `content` fragment, not on `childNodes`.
 * - String/comment scope filtering — angle brackets in `<!-- … -->` or
 *   inside `"…"` attribute values aren't mistaken for tag openings.
 *
 * @see https://parse5.js.org/
 */

type HtmlFoldLanguage = "html" | "xml";

type Element = DefaultTreeAdapterMap["element"];
type Node = DefaultTreeAdapterMap["node"];

/**
 * SVG-namespace URI used as a fragment context when parsing XML.
 *
 * In SVG context, `parse5` switches its tokenizer into "foreign content"
 * mode, which is much closer to XML semantics:
 *
 * - Self-closing `<foo/>` is honored.
 * - Element names are case-preserved.
 * - HTML-only void elements (`<br>`, `<img>`) are not auto-closed.
 *
 * That makes it acceptable as a stand-in XML parser for code blocks. The
 * caveat is that a few SVG-recognized names (`<title>`, `<desc>`, `<script>`,
 * `<style>`, `<foreignObject>`) revert to HTML rules inside their bodies; in
 * practice that's rare in user XML and yields conservative folding (still
 * correct, just sometimes more flat than VS Code's XML folder).
 */
const SVG_NAMESPACE = html.NS.SVG;

/**
 * Synthetic SVG fragment context shared across XML parses. Only the namespace
 * matters for the foreign-content tokenizer mode; the rest of the fields
 * satisfy parse5's tree-adapter shape.
 */
const xmlFragmentContext = {
	nodeName: "svg",
	tagName: "svg",
	namespaceURI: SVG_NAMESPACE,
	attrs: [],
	childNodes: [],
	parentNode: null,
} as unknown as DefaultTreeAdapterMap["parentNode"];

/**
 * Returns true when a parse5 tree node has element-style `tagName` and child
 * nodes — i.e. it's an `Element` we should consider folding. Comments,
 * doctypes, text nodes, and the document root all fail this check.
 */
function isElement(node: Node): node is Element {
	return (
		"tagName" in node &&
		typeof (node as { tagName?: unknown }).tagName === "string" &&
		"childNodes" in node
	);
}

/**
 * Traverses `root` depth-first and pushes a {@link FoldableRange} for every
 * element whose source span covers more than one line.
 *
 * Multi-line *elements* fold from the opening tag's start line to the closing
 * tag's end line (or to the element end when `endTag` info is unavailable —
 * parse5 sometimes synthesizes elements without a real closer when handling
 * malformed input).
 *
 * Multi-line *opening tags* (e.g. `<div\n  class="x">`) fold from the start
 * of the tag to its `>` so the attribute list collapses into the tag name.
 * VS Code emits this as a separate "tag" fold marker; we mirror that.
 */
function collectRanges(root: Node, ranges: FoldableRange[]): void {
	const stack: Node[] = [root];
	while (stack.length > 0) {
		const node = stack.pop();
		if (node == null) {
			continue;
		}
		if (isElement(node)) {
			pushRangesForElement(node, ranges);
		}
		pushChildNodes(node, stack);

		// parse5 models `<template>` descendants inside `node.content`, a
		// DocumentFragment, while `node.childNodes` stays empty. Include that
		// fragment so nested HTML in templates gets the same folds as normal
		// element children without recursing or re-walking the tree.
		if ("content" in node && typeof node.content === "object" && node.content != null) {
			pushChildNodes(node.content, stack);
		}
	}
}

/** Pushes parse5 child nodes onto the DFS stack in source order. */
function pushChildNodes(parent: unknown, stack: Node[]): void {
	if (typeof parent !== "object" || parent == null || !("childNodes" in parent)) {
		return;
	}
	const childNodes = parent.childNodes;
	if (!Array.isArray(childNodes)) {
		return;
	}
	for (let index = childNodes.length - 1; index >= 0; index -= 1) {
		const child = childNodes[index];
		if (child != null) {
			stack.push(child as Node);
		}
	}
}

/**
 * Emits up to two fold ranges for a single element: one for the element's
 * full body and one for its multi-line opening tag.
 */
function pushRangesForElement(element: Element, ranges: FoldableRange[]): void {
	const location = element.sourceCodeLocation;
	if (location == null) {
		// Implicit/synthetic elements (e.g. `<html>`/`<body>` parse5 fabricates
		// for fragment input) don't appear in the source. Skip them so we
		// don't emit folds without a real opener.
		return;
	}

	const startTag = location.startTag;
	const endTag = location.endTag;

	// The element is a self-closing or void tag (no close tag in the source).
	// `<br>` HTML void elements and `<foo/>` XML self-closing tags both land
	// here; neither opens a fold.
	if (endTag == null) {
		// A multi-line single-tag element (`<input\n  type="text"\n/>`) still
		// gets the attribute-list fold below.
		pushTagFoldIfMultiline(startTag, ranges);
		return;
	}

	const startLine = location.startLine;
	const endLine = location.endLine;
	if (endLine > startLine) {
		ranges.push({ id: String(startLine), startLine, endLine });
	}
	pushTagFoldIfMultiline(startTag, ranges);
}

/**
 * Pushes a fold range for an opening tag (`startTag`) when its `<` and `>`
 * sit on different lines. Conservative: contributes nothing for single-line
 * tags so we don't fight `pushRangesForElement` for the same opener.
 */
function pushTagFoldIfMultiline(
	startTag: { startLine: number; endLine: number } | undefined,
	ranges: FoldableRange[],
): void {
	if (startTag == null) {
		return;
	}
	if (startTag.endLine > startTag.startLine) {
		ranges.push({
			id: String(startTag.startLine),
			startLine: startTag.startLine,
			endLine: startTag.endLine,
		});
	}
}

/**
 * Computes foldable ranges for an HTML or XML source string.
 *
 * - HTML: uses `parse5.parse` so explicit `<html>`/`<head>`/`<body>` are
 *   honored as foldable openers. Implicit wrappers parse5 fabricates for
 *   fragment input have no `sourceCodeLocation` and are skipped.
 * - XML: uses `parse5.parseFragment` rooted in an SVG fragment context so the
 *   tokenizer applies foreign-content (XML-like) rules — self-closing `<foo/>`
 *   is respected, void HTML elements aren't special-cased.
 *
 * @example
 * computeHtmlFoldRanges({ code: "<div>\n  <p>hi</p>\n</div>", language: "html" });
 * // => [{ id: "1", startLine: 1, endLine: 3 }]
 */
function computeHtmlFoldRanges({
	code,
	language,
}: {
	/** Raw source code to parse. */
	code: string;
	/** Resolved Mantle language; selects HTML vs. XML parsing rules. */
	language: HtmlFoldLanguage;
}): FoldableRange[] {
	if (code.length === 0) {
		return [];
	}

	const document =
		language === "xml"
			? parseFragment(xmlFragmentContext, code, { sourceCodeLocationInfo: true })
			: parse(code, { sourceCodeLocationInfo: true });

	const ranges: FoldableRange[] = [];
	collectRanges(document, ranges);
	return finalizeFoldRanges(ranges);
}

export { computeHtmlFoldRanges };
export type { HtmlFoldLanguage };
