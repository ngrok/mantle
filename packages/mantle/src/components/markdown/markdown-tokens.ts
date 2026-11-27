/**
 * The tokens that the Markdown lexer emits. Their shapes are marked's, minus
 * the fields that the lexer never sets.
 */

/** The alignment of a table column, from its delimiter row. */
type MarkdownAlign = "center" | "left" | "right" | null;

/**
 * A token of an extension, such as `markdownMath()`. Its other fields are the
 * extension's own.
 */
type MarkdownExtensionToken = {
	type: string;
	raw: string;
	/** The inline tokens of its content, when it has some. */
	tokens?: MarkdownToken[];
	// oxlint-disable-next-line typescript/no-explicit-any -- Why: each extension adds its own fields, and a read of one must type-check as it did with marked.
	[field: string]: any;
};

type BlockquoteToken = { type: "blockquote"; raw: string; text: string; tokens: MarkdownToken[] };
type BrToken = { type: "br"; raw: string };
type CheckboxToken = { type: "checkbox"; raw: string; checked: boolean };
type CodeToken = {
	type: "code";
	raw: string;
	/** `"indented"` for an indented block. A fence leaves it unset. */
	codeBlockStyle?: "indented";
	/** The info string of a fence, such as `"ts"`. */
	lang?: string;
	text: string;
};
type CodespanToken = { type: "codespan"; raw: string; text: string };
type DefToken = { type: "def"; raw: string; tag: string; href: string; title: string };
type DelToken = { type: "del"; raw: string; text: string; tokens: MarkdownToken[] };
type EmToken = { type: "em"; raw: string; text: string; tokens: MarkdownToken[] };
type EscapeToken = { type: "escape"; raw: string; text: string };
/** A GFM footnote definition, `[^label]: text`. It renders in the footnote list at the end, not in place. */
type FootnoteToken = {
	type: "footnote";
	raw: string;
	/** The normalized label, such as `"1"` or `"NOTE"`. */
	label: string;
	/** The blocks of the note. */
	tokens: MarkdownToken[];
};
/** A reference to a footnote, `[^label]`. */
type FootnoteRefToken = {
	type: "footnoteRef";
	raw: string;
	/** The normalized label. */
	label: string;
	/** The footnote's number: the order of its first reference in the answer, from 1. */
	number: number;
	/** Which reference to this footnote it is, from 1. */
	occurrence: number;
};
type HeadingToken = {
	type: "heading";
	raw: string;
	depth: number;
	text: string;
	tokens: MarkdownToken[];
};
type HrToken = { type: "hr"; raw: string };
/** Raw HTML: a block, or one inline tag. `Markdown` shows it as text, except a short list of inline tags. */
type HtmlToken =
	| { type: "html"; raw: string; text: string; block: true; pre: boolean }
	| { type: "html"; raw: string; text: string; block: false; inLink: boolean; inRawBlock: boolean };
type ImageToken = {
	type: "image";
	raw: string;
	href: string;
	title: string | null;
	/** The label as plain text, with no Markdown syntax. Its tokens keep the formatting, such as `strong`. */
	text: string;
	tokens: MarkdownToken[];
};
type LinkToken = {
	type: "link";
	raw: string;
	href: string;
	title?: string | null;
	text: string;
	tokens: MarkdownToken[];
};
type ListItemToken = {
	type: "list_item";
	raw: string;
	/** Whether the item is a task, `- [ ]` or `- [x]`. */
	task: boolean;
	checked?: boolean;
	loose: boolean;
	text: string;
	tokens: MarkdownToken[];
};
type ListToken = {
	type: "list";
	raw: string;
	ordered: boolean;
	/** The number of the first item of an ordered list, or `""`. */
	start: number | "";
	loose: boolean;
	items: ListItemToken[];
};
type ParagraphToken = { type: "paragraph"; raw: string; text: string; tokens: MarkdownToken[] };
type SpaceToken = { type: "space"; raw: string };
type StrongToken = { type: "strong"; raw: string; text: string; tokens: MarkdownToken[] };
type TableCellToken = {
	text: string;
	tokens: MarkdownToken[];
	header: boolean;
	align: MarkdownAlign;
};
type TableToken = {
	type: "table";
	raw: string;
	align: MarkdownAlign[];
	header: TableCellToken[];
	rows: TableCellToken[][];
};
type TextToken = {
	type: "text";
	raw: string;
	text: string;
	/** The inline tokens of a list item's text. */
	tokens?: MarkdownToken[];
	escaped?: boolean;
};

/** A token of the Markdown: a built-in kind, or a token of an extension. */
type MarkdownToken =
	| BlockquoteToken
	| BrToken
	| CheckboxToken
	| CodeToken
	| CodespanToken
	| DefToken
	| DelToken
	| EmToken
	| EscapeToken
	| FootnoteToken
	| FootnoteRefToken
	| HeadingToken
	| HrToken
	| HtmlToken
	| ImageToken
	| LinkToken
	| ListToken
	| ListItemToken
	| ParagraphToken
	| SpaceToken
	| StrongToken
	| TableToken
	| TextToken
	| MarkdownExtensionToken;

/** The reference definitions of an answer, by normalized label. */
type MarkdownLinks = Record<string, { href: string; title: string | null }>;

/** The footnotes of an answer, by normalized label. */
type MarkdownFootnotes = {
	/** The definition of each label. The first definition of a label wins. */
	definitions: Record<string, FootnoteToken>;
	/** For each label with a reference: its number, and how many references it has. */
	references: Record<string, { number: number; count: number }>;
};

export type {
	//,
	BlockquoteToken,
	BrToken,
	CheckboxToken,
	CodeToken,
	CodespanToken,
	DefToken,
	DelToken,
	EmToken,
	EscapeToken,
	FootnoteRefToken,
	FootnoteToken,
	HeadingToken,
	HrToken,
	HtmlToken,
	ImageToken,
	LinkToken,
	ListItemToken,
	ListToken,
	MarkdownAlign,
	MarkdownExtensionToken,
	MarkdownFootnotes,
	MarkdownLinks,
	MarkdownToken,
	ParagraphToken,
	SpaceToken,
	StrongToken,
	TableCellToken,
	TableToken,
	TextToken,
};
