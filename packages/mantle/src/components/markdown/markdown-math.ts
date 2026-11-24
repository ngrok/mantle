import type { Tokens } from "marked";
import { closesMath, type MarkdownExtension } from "./markdown-parser.js";

/** A formula in the Markdown: its TeX source, and whether it shows as its own block. */
type MarkdownMathToken = Tokens.Generic & {
	type: "math";
	raw: string;
	/** The TeX source, without its delimiters. */
	text: string;
	/** `true` for `$$…$$` and `\[…\]`, `false` for `$…$` and `\(…\)`. */
	display: boolean;
};

/** `$$…$$` or `\[…\]` at the start of a block, over one or more lines. */
const BLOCK_MATH = /^ {0,3}(?:\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\])[ \t]*(?:\n|$)/;
/** `$$…$$` or `\(…\)` inside a line. */
const INLINE_DISPLAY_OR_PAREN = /^(?:\$\$([^\n]+?)\$\$|\\\(([^\n]+?)\\\))/;
/**
 * `$…$` inside a line, by Pandoc's rule: the opening `$` has no space after
 * it, and the closing `$` has no space before it and no digit after it. So
 * `$5 and $10` stays text, and `$x^2$` is math.
 */
const INLINE_DOLLAR = /^\$(?![\s$])((?:\\\$|[^$\n])*?[^\s\\])\$(?!\d)/;

function blockMath(source: string): MarkdownMathToken | undefined {
	const match = BLOCK_MATH.exec(source);
	if (match == null) {
		return undefined;
	}
	return { type: "math", raw: match[0], text: (match[1] ?? match[2] ?? "").trim(), display: true };
}

function inlineMath(source: string): MarkdownMathToken | undefined {
	const display = INLINE_DISPLAY_OR_PAREN.exec(source);
	if (display != null) {
		const isDollars = display[1] != null;
		return {
			type: "math",
			raw: display[0],
			text: (display[1] ?? display[2] ?? "").trim(),
			display: isDollars,
		};
	}
	const dollar = INLINE_DOLLAR.exec(source);
	if (dollar != null) {
		return { type: "math", raw: dollar[0], text: dollar[1] ?? "", display: false };
	}
	return undefined;
}

/**
 * Reads TeX math in Markdown as `math` tokens: `$$…$$` and `\[…\]` as display
 * math, and `$…$` and `\(…\)` as inline math. Code spans and fences stay code.
 * A `$` that reads as a price, such as in `$5 and $10`, stays text.
 *
 * Pass it to `Markdown` in `extensions`, and render each formula with
 * `components.math`, such as with KaTeX. Without a `math` component, a
 * formula shows its TeX source as code. While the answer streams, an open
 * `$$` block closes at the end of the text.
 *
 * @example
 * ```tsx
 * const extensions = [markdownMath()];
 * const components = {
 *   math: ({ token }) => <Katex tex={token.text} display={token.display} />,
 * };
 *
 * <Markdown extensions={extensions} components={components}>
 *   {"The area is $\\pi r^2$."}
 * </Markdown>
 * ```
 */
function markdownMath(): MarkdownExtension {
	return {
		[closesMath]: true,
		extensions: [
			{
				name: "blockMath",
				level: "block",
				start: (source) => source.match(/^ {0,3}(?:\$\$|\\\[)/m)?.index,
				tokenizer: blockMath,
			},
			{
				name: "inlineMath",
				level: "inline",
				start: (source) => source.match(/\$|\\\(/)?.index,
				tokenizer: inlineMath,
			},
		],
	};
}

export {
	//,
	markdownMath,
};

export type {
	//,
	MarkdownMathToken,
};
