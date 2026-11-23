/**
 * POC: a Markdown lexer for model answers, in place of marked's. It emits
 * marked's token shapes, so `Markdown` renders its output unchanged. It reads
 * CommonMark blocks and inlines plus the GitHub extensions an answer uses:
 * tables, task items, strikethrough, and autolink literals. Block and inline
 * extensions use marked's `{ level, start, tokenizer }` shape.
 */
import type { Token, Tokens, TokensList } from "marked";
import { decodeEntities } from "./decode-entities.js";

type Links = TokensList["links"];
/**
 * A tokenizer that reads one more kind of token, in marked's `{ name, level,
 * start, tokenizer }` shape. The lexer is not marked's, so a tokenizer gets
 * no `this.lexer`.
 */
type MarkdownTokenizer = {
	/** The token kind, such as `"math"`. */
	name: string;
	/** `"block"` for a token that starts a line, `"inline"` for one inside a line. */
	level: "block" | "inline";
	/** The index in `source` where the token can start next, or `undefined` for none. */
	start?: (source: string) => number | undefined;
	tokenizer: (source: string, tokens: Token[]) => Tokens.Generic | undefined;
};
type Context = {
	links: Links;
	block: MarkdownTokenizer[];
	inline: MarkdownTokenizer[];
	jobs: (() => void)[];
	/** How many quotes and list items hold the blocks that lex now. */
	depth: number;
};
// oxlint-disable-next-line typescript/no-explicit-any -- POC: tokens are marked's loose shapes.
type Tok = Token & Record<string, any>;

const HR = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})$/;
const HEADING = /^ {0,3}(#{1,6})(?=[ \t]|$)(.*)$/;
const FENCE = /^( {0,3})(`{3,}|~{3,})(.*)$/;
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;
const SETEXT = /^ {0,3}(=+|-+)[ \t]*$/;
const LIST = /^( {0,3})([*+-]|(\d{1,9})([.)]))([ \t]+|$)/;
const QUOTE = /^ {0,3}>/;
const DELIMITER_ROW = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;
/**
 * A link reference definition, which can span lines: the label, the
 * destination, and an optional title on the same line or the next one.
 */
const DEF = (title: boolean) =>
	new RegExp(
		String.raw`^ {0,3}\[((?:\\.|[^[\]\\]){1,999})\]:[ \t]*\n?[ \t]*(<[^<>\n]*>|[^\s<]\S*)` +
			(title
				? String.raw`(?:[ \t]+|[ \t]*\n[ \t]*)("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^()\\])*\))`
				: "") +
			String.raw`[ \t]*(?:\n|$)`,
	);
const DEF_WITH_TITLE = DEF(true);
const DEF_WITHOUT_TITLE = DEF(false);
/** The HTML blocks that end at a marker, not at a blank line: each start and its end. */
const HTML_RAW: readonly (readonly [RegExp, RegExp])[] = [
	[/^ {0,3}<(?:script|pre|style|textarea)(?:\s|>|$)/i, /<\/(?:script|pre|style|textarea)>/i],
	[/^ {0,3}<!--/, /-->/],
	[/^ {0,3}<\?/, /\?>/],
	[/^ {0,3}<![a-zA-Z]/, />/],
	[/^ {0,3}<!\[CDATA\[/, /\]\]>/],
];
const HTML_BLOCK =
	/^ {0,3}<(?:\/?(?:address|article|aside|base|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|nav|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:[\s/>]|$))/i;
const OPEN_TAG = String.raw`<[a-zA-Z][\w-]*(?:\s+[a-zA-Z_:][\w.:-]*(?:\s*=\s*(?:[^\s"'=<>\x60]+|'[^']*'|"[^"]*"))?)*\s*\/?>`;
const CLOSE_TAG = String.raw`<\/[a-zA-Z][\w-]*\s*>`;
/** A line that holds one whole tag, which starts an HTML block that cannot interrupt a paragraph. */
const HTML_TAG_LINE = new RegExp(String.raw`^ {0,3}(?:${OPEN_TAG}|${CLOSE_TAG})[ \t]*$`);
const HTML_TAG = new RegExp(
	String.raw`^(?:${OPEN_TAG}|${CLOSE_TAG}|<!-->|<!--->|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<![a-zA-Z][^>]*>|<!\[CDATA\[[\s\S]*?\]\]>)`,
);
/** The first characters of a line that only continues a paragraph, by char code. */
const PLAIN_START = new Uint8Array(128);
for (let code = 33; code < 128; code += 1) {
	PLAIN_START[code] = "#*+-_>`~<=|0123456789".includes(String.fromCharCode(code)) ? 0 : 1;
}
/** The first characters of a block that can end a paragraph. Why: a quick test skips most lines. */
const BLOCK_START = /^ {0,3}[#*+\-_>`~<\d]/;
const NOT_SPACE = /\S/;
const LITERAL = /\\([!-/:-@[-`{-~])|&(?:#\d{1,7}|#[xX][\da-fA-F]{1,6}|[a-zA-Z\d]+);/g;
/** The indent and markers of a line, up to its last tab. */
const LEADING_TAB = /^(?:[ \t]|>|(?:[*+-]|\d{1,9}[.)])(?=[ \t]))*\t/;
/** A quote marker or a list marker at the start of a line. */
const NESTED_MARKER = /^ {0,3}(?:>[ \t]?|(?:[*+-]|\d{1,9}[.)])(?:[ \t]|$))/;
const BLANK_LINE = /\n[ \t]*\n/;
const ESCAPABLE = /[!-/:-@[-`{-~]/;
const PUNCTUATION = /[\p{P}\p{S}]/u;
const SPACE = /\s/u;

// Why lower then upper case: CommonMark folds case, so `ẞ` matches `SS`.
const normalizeLabel = (label: string) => {
	const spaced = /\s\s|[\t\n]/.test(label) ? label.replace(/\s+/g, " ") : label;
	const trimmed = spaced.trim();
	// Why the ASCII test: only other scripts need the lower-case step to fold case.
	return /[\u0080-\uffff]/.test(trimmed)
		? trimmed.toLowerCase().toUpperCase()
		: trimmed.toUpperCase();
};
/**
 * A destination, title, or info string as its characters: without its
 * backslash escapes, and with its character references decoded.
 */
const literal = (text: string) =>
	!text.includes("\\") && !text.includes("&")
		? text
		: text.replace(LITERAL, (match, escaped?: string) => escaped ?? decodeEntities(match));
/** The index of the first character of `line` that is not a space or a tab, or its length. */
const indentOf = (line: string) => {
	let at = 0;
	for (let code = line.charCodeAt(0); code === 32 || code === 9; code = line.charCodeAt(at)) {
		at += 1;
	}
	return at;
};
const isBlank = (line: string) => indentOf(line) === line.length;
const textToken = (text: string): Tok => ({ type: "text", raw: text, text, escaped: false }) as Tok;

/**
 * Expands the tabs in the indent of `line`, and after its quote and list
 * markers, to stops of 4 columns. Why: the columns decide the structure.
 */
function expandTabs(line: string, column = 0): string {
	if (!line.includes("\t")) {
		return line;
	}
	const prefix = LEADING_TAB.exec(line)?.[0];
	if (prefix == null) {
		return line;
	}
	let out = "";
	for (const char of prefix) {
		out += char === "\t" ? " ".repeat(4 - ((column + out.length) % 4)) : char;
	}
	return out + line.slice(prefix.length);
}

/**
 * Removes `columns` columns of indent from `line`, which starts at column
 * `start`, with tabs to stops of 4. The rest of a tab that the cut splits
 * stays as spaces, and other tabs stay.
 */
function stripColumns(line: string, columns: number, start = 0): string {
	let column = start;
	let index = 0;
	for (; column < start + columns && (line[index] === " " || line[index] === "\t"); index += 1) {
		column += line[index] === " " ? 1 : 4 - (column % 4);
	}
	return " ".repeat(Math.max(0, column - start - columns)) + line.slice(index);
}

/** Removes the `>` of a quote and the one space after it. A tab after it counts as its columns. */
function stripQuoteMarker(line: string, column: number): string {
	const marker = /^ {0,3}>/.exec(line)?.[0] ?? "";
	const rest = line.slice(marker.length);
	if (rest.startsWith("\t")) {
		return " ".repeat(3 - ((column + marker.length) % 4)) + rest.slice(1);
	}
	return rest.startsWith(" ") ? rest.slice(1) : rest;
}

/** Whether `line` starts with `<` after at most 3 spaces. Why: it skips the HTML tests for most lines. */
function startsWithTag(line: string): boolean {
	const at = indentOf(line);
	return at < 4 && line.charCodeAt(at) === 60;
}

/** The indent, marker, and info string of `line` when it opens a code fence. */
function fenceOf(line: string): RegExpExecArray | undefined {
	const fence = FENCE.exec(line);
	return fence == null || (fence[2]?.startsWith("`") === true && fence[3]?.includes("`") === true)
		? undefined
		: fence;
}

/** Whether `line` opens a code fence. */
const isFence = (line: string) => fenceOf(line) != null;

/** Whether `line` starts a block that ends a paragraph. */
function interrupts(line: string): boolean {
	if (!BLOCK_START.test(line)) {
		return false;
	}
	if (
		HEADING.test(line) ||
		HR.test(line) ||
		QUOTE.test(line) ||
		isFence(line) ||
		(startsWithTag(line) && (HTML_BLOCK.test(line) || HTML_RAW.some(([start]) => start.test(line))))
	) {
		return true;
	}
	const item = LIST.exec(line);
	return (
		item != null && !isBlank(line.slice(item[0].length)) && (item[3] == null || item[3] === "1")
	);
}

/**
 * Follows the lines of a quote or a list item, and tells whether the last
 * one leaves a paragraph open. Why: only an open paragraph takes a lazy line,
 * a line without the `>` or the indent. A fence, a heading, or HTML does not.
 */
function createLazyTracker(column: number): {
	read: (line: string) => void;
	continues: (line: string) => boolean;
} {
	let fence: string | undefined;
	let open = false;
	return {
		read(line) {
			const content = expandTabs(line, column);
			if (fence != null) {
				const close = FENCE_CLOSE.exec(content)?.[1];
				if (close?.startsWith(fence[0] ?? "") === true && close.length >= fence.length) {
					fence = undefined;
				}
				open = false;
			} else if (open && SETEXT.test(content)) {
				// A setext underline ends the paragraph as a heading.
				open = false;
			} else if (!BLOCK_START.test(content)) {
				// Plain text, or an indented line that continues an open paragraph.
				open = NOT_SPACE.test(content) && (open || indentOf(content) < 4);
			} else if (isFence(content)) {
				fence = FENCE.exec(content)?.[2];
				open = false;
			} else if (open && !interrupts(content)) {
				// A line that cannot interrupt the paragraph, such as an empty item, continues it.
			} else {
				// Why strip the markers: the paragraph that stays open is the one in the deepest quote or item.
				let inner = content;
				for (
					let marker = NESTED_MARKER.exec(inner);
					marker != null;
					marker = NESTED_MARKER.exec(inner)
				) {
					inner = inner.slice(marker[0].length);
				}
				open =
					NOT_SPACE.test(inner) &&
					indentOf(inner) < 4 &&
					!isFence(inner) &&
					!HEADING.test(inner) &&
					!HR.test(inner) &&
					!(
						startsWithTag(inner) &&
						(HTML_BLOCK.test(inner) ||
							HTML_TAG_LINE.test(inner) ||
							HTML_RAW.some(([start]) => start.test(inner)))
					);
			}
		},
		// A lazy line continues the open paragraph unless it starts a block of its own, such as a list.
		continues: (line) => open && NOT_SPACE.test(line) && !interrupts(line) && !LIST.test(line),
	};
}

/**
 * The lines of a block that continue a paragraph lazily, by index. A lazy
 * line is paragraph text at each depth: a lazy `===` does not underline the
 * paragraph as a heading, and an indented `# a` is not a heading in an item.
 */
type LazyLines = ReadonlySet<number> | undefined;

/** Adds line `at` of the block to `lazy`, and returns `lazy`. */
const markLazy = (lazy: Set<number> | undefined, at: number) => (lazy ?? new Set()).add(at);

/** Whether `line` and `next` start a table: a row of cells and a delimiter row with as many. */
function startsTable(line: string, next: string): boolean {
	// Why a pipe in the delimiter row: without one, `---` under a line is a setext heading.
	return (
		line.includes("|") &&
		next.includes("|") &&
		DELIMITER_ROW.test(next) &&
		cells(line).length === cells(next).length
	);
}

/** Splits a table row into its cells, without the outer pipes. */
function cells(row: string, count?: number): string[] {
	const whole = row.trim();
	const trimmed = whole.startsWith("|") ? whole.slice(1) : whole;
	const out: string[] = [];
	let cell = "";
	let from = 0;
	for (let at = trimmed.indexOf("|"); at !== -1; at = trimmed.indexOf("|", at + 1)) {
		if (trimmed.charCodeAt(at - 1) === 92) {
			// An escaped pipe stays in the cell, without its backslash.
			cell += `${trimmed.slice(from, at - 1)}|`;
		} else {
			out.push((cell + trimmed.slice(from, at)).trim());
			cell = "";
		}
		from = at + 1;
	}
	const last = cell + trimmed.slice(from);
	if (last.trim() !== "" || !trimmed.endsWith("|")) {
		out.push(last.trim());
	}
	if (count != null) {
		while (out.length < count) {
			out.push("");
		}
		out.length = count;
	}
	return out;
}

/** Adds the inline tokens of a block's `text` once every definition is known. */
function withInline<T extends { text: string }>(token: T, context: Context): T & { tokens: Tok[] } {
	const out: T & { tokens: Tok[] } = Object.assign(token, { tokens: [] as Tok[] });
	context.jobs.push(() => {
		out.tokens = lexInline(out.text, context);
	});
	return out;
}

/**
 * The deepest quote or list that the lexer reads. Deeper markers stay text.
 * Why: each level lexes its content once more, and deep recursion overflows
 * the stack. No answer nests this deep.
 */
const MAX_NESTING = 32;

/** Lexes the blocks inside a quote or a list item, one level deeper. */
function lexNested(
	source: string,
	context: Context,
	options: { top: boolean; column: number; lazy: LazyLines },
): Tok[] {
	// Why the fast path: most items are one line of text, and a line that starts with a plain character is a
	// paragraph. A `[` starts a definition only before a `]:`.
	const first = source.charCodeAt(0);
	if (
		context.block.length === 0 &&
		(first > 127 || (first > 32 && PLAIN_START[first] === 1)) &&
		!source.includes("\n") &&
		!(first === 91 && source.includes("]:"))
	) {
		const text = source.trimEnd();
		return [withInline({ type: options.top ? "paragraph" : "text", raw: source, text }, context)];
	}
	context.depth += 1;
	const tokens = lexBlocks(source, context, options);
	context.depth -= 1;
	return tokens;
}

/** Lexes the blocks of `source`. `top` is false inside a list item, where a paragraph is a `text` token. */
function lexBlocks(
	source: string,
	context: Context,
	{ top, column = 0, lazy }: { top: boolean; column?: number; lazy?: LazyLines },
): Tok[] {
	const tokens: Tok[] = [];
	// Each line is read two ways, both on first use: `lineAt` expands the tabs of the indent to read the
	// structure, and `rawLineAt` keeps them for code. Why on first use: most lines of a fence are never read.
	const starts: number[] = [];
	for (let start = 0; start < source.length;) {
		const newline = source.indexOf("\n", start);
		starts.push(start);
		start = newline === -1 ? source.length : newline + 1;
	}
	starts.push(source.length);
	const lines = { length: starts.length - 1 };
	const lineEnd = (at: number) => {
		const next = starts[at + 1] ?? source.length;
		return next > (starts[at] ?? 0) && source.charCodeAt(next - 1) === 10 ? next - 1 : next;
	};
	const rawCache: (string | undefined)[] = [];
	const expanded: (string | undefined)[] = [];
	const rawLineAt = (at: number) => (rawCache[at] ??= source.slice(starts[at], lineEnd(at)));
	const lineAt = (at: number) => (expanded[at] ??= expandTabs(rawLineAt(at), column));
	const interruptsParagraph = (line: string) =>
		interrupts(line) || context.block.some((extension) => extension.start?.(line) === 0);
	const rawLines = (from: number, to: number) => {
		const out: string[] = [];
		for (let at = from; at < to; at += 1) {
			out.push(rawLineAt(at));
		}
		return out;
	};
	const raw = (from: number, to: number) => source.slice(starts[from], starts[to]);
	// The index of the next `|`, -1 for none, or -2 before the first search.
	let nextPipe = -2;
	// The line after the last definition. Why: a definition is a paragraph, so an indented line or a list that
	// cannot interrupt a paragraph continues it there.
	let afterDefinition = -1;
	let index = 0;

	blocks: while (index < lines.length) {
		const line = lineAt(index);
		// A line that continues a paragraph: a lazy line, or a line after a definition that cannot interrupt it.
		const plain =
			lazy?.has(index) === true ||
			(index === afterDefinition && !isBlank(line) && !interruptsParagraph(line));

		if (!plain) {
			for (const extension of context.block) {
				const token = extension.tokenizer(source.slice(starts[index]), []);
				if (token != null) {
					tokens.push(token);
					const end = (starts[index] ?? 0) + token.raw.length;
					while (index < lines.length && (starts[index] ?? 0) < end) {
						index += 1;
					}
					continue blocks;
				}
			}

			if (isBlank(line)) {
				let end = index + 1;
				while (end < lines.length && isBlank(lineAt(end))) {
					end += 1;
				}
				tokens.push({ type: "space", raw: raw(index, end) } as Tok);
				index = end;
				continue;
			}

			const fence = fenceOf(line);
			if (fence != null) {
				const [, indent = "", marker = "", info = ""] = fence;
				let end = index + 1;
				let closed = false;
				for (; end < lines.length; end += 1) {
					// Why the source: a closing fence starts within 3 spaces, so most lines fail on one character.
					const from = starts[end] ?? 0;
					let at = 0;
					while (at < 4 && source.charCodeAt(from + at) === 32) {
						at += 1;
					}
					const close =
						at < 4 && source[from + at] === marker[0]
							? FENCE_CLOSE.exec(rawLineAt(end))?.[1]
							: undefined;
					if (close != null && close.length >= marker.length) {
						closed = true;
						break;
					}
				}
				// Why a slice without an indent: the body is the source as it is, so it needs no copy of each line.
				const body =
					indent === ""
						? source.slice(
								starts[index + 1] ?? source.length,
								end > index + 1 ? lineEnd(end - 1) : 0,
							)
						: rawLines(index + 1, end)
								.map((current, at) =>
									stripColumns(
										current,
										Math.min(indent.length, indentOf(lineAt(index + 1 + at))),
										column,
									),
								)
								.join("\n");
				const after = closed ? end + 1 : end;
				tokens.push({
					type: "code",
					raw: raw(index, after),
					lang: literal(info.trim()),
					text: body,
				} as Tok);
				index = after;
				continue;
			}

			if (indentOf(line) >= 4) {
				let end = index + 1;
				let last = index + 1;
				for (
					;
					end < lines.length && (isBlank(lineAt(end)) || indentOf(lineAt(end)) >= 4);
					end += 1
				) {
					if (!isBlank(lineAt(end))) {
						last = end + 1;
					}
				}
				const text = rawLines(index, last)
					.map((current) => stripColumns(current, 4, column))
					.join("\n");
				tokens.push({
					type: "code",
					raw: raw(index, last),
					codeBlockStyle: "indented",
					text,
				} as Tok);
				index = last;
				continue;
			}

			const heading = HEADING.exec(line);
			if (heading != null) {
				const text = (heading[2] ?? "").replace(/(?:^|[ \t]+)#+[ \t]*$/, "").trim();
				tokens.push(
					withInline(
						{ type: "heading", raw: raw(index, index + 1), depth: heading[1]?.length, text },
						context,
					),
				);
				index += 1;
				continue;
			}

			if (HR.test(line)) {
				tokens.push({ type: "hr", raw: raw(index, index + 1) } as Tok);
				index += 1;
				continue;
			}

			const nests = context.depth < MAX_NESTING;
			if (nests && QUOTE.test(line)) {
				const inner: string[] = [];
				// The column where the content of the quote starts, after `> `.
				const inside = column + (/^ {0,3}>/.exec(line)?.[0].length ?? 1) + 1;
				const tracker = createLazyTracker(inside);
				let innerLazy: Set<number> | undefined;
				let end = index;
				for (; end < lines.length; end += 1) {
					const current = lineAt(end);
					if (QUOTE.test(current)) {
						const content = stripQuoteMarker(rawLineAt(end), column);
						if (lazy?.has(end) === true) {
							innerLazy = markLazy(innerLazy, inner.length);
						}
						inner.push(content);
						tracker.read(content);
					} else if (lazy?.has(end) === true || tracker.continues(current)) {
						innerLazy = markLazy(innerLazy, inner.length);
						inner.push(current);
					} else {
						break;
					}
				}
				const text = inner.join("\n");
				tokens.push({
					type: "blockquote",
					raw: raw(index, end),
					text,
					tokens: lexNested(text, context, { top: true, column: inside, lazy: innerLazy }),
				} as Tok);
				index = end;
				continue;
			}

			if (nests && LIST.test(line) && !HR.test(line)) {
				index = lexList(
					{ count: lines.length, column, lineAt, rawLineAt, raw, context, lazy },
					index,
					tokens,
				);
				continue;
			}

			const tag = startsWithTag(line);
			const rawHtml = tag ? HTML_RAW.find(([start]) => start.test(line)) : undefined;
			if (tag && (rawHtml != null || HTML_BLOCK.test(line) || HTML_TAG_LINE.test(line))) {
				let end = index;
				if (rawHtml == null) {
					while (end < lines.length && !isBlank(lineAt(end))) {
						end += 1;
					}
				} else {
					while (end < lines.length && !rawHtml[1].test(lineAt(end))) {
						end += 1;
					}
					end = Math.min(end + 1, lines.length);
				}
				const html = raw(index, end);
				tokens.push({ type: "html", raw: html, block: true, pre: false, text: html } as Tok);
				index = end;
				continue;
			}
		}

		// Why from the first character: a paragraph line, as a definition is, drops its indent.
		const from = (starts[index] ?? 0) + indentOf(rawLineAt(index));
		const rest =
			(!plain || index === afterDefinition) && source.charCodeAt(from) === 91
				? source.slice(from, from + 4096)
				: "";
		let def = rest === "" ? null : DEF_WITH_TITLE.exec(rest);
		if (rest !== "" && (def == null || BLANK_LINE.test(def[3] ?? ""))) {
			def = DEF_WITHOUT_TITLE.exec(rest);
		}
		if (def != null && NOT_SPACE.test(def[1] ?? "") && !BLANK_LINE.test(def[1] ?? "")) {
			const tag = normalizeLabel(def[1] ?? "");
			const href = literal((def[2] ?? "").replace(/^<|>$/g, ""));
			const title = def[3] == null ? undefined : literal(def[3].slice(1, -1));
			if (!(tag in context.links)) {
				context.links[tag] = { href, title: title ?? "" };
			}
			const end = from + def[0].length;
			let next = index + 1;
			while (next < lines.length && (starts[next] ?? 0) < end) {
				next += 1;
			}
			tokens.push({ type: "def", raw: raw(index, next), tag, href, title } as Tok);
			index = next;
			afterDefinition = next;
			continue;
		}

		if (!plain && startsTable(line, lineAt(index + 1))) {
			const header = cells(line);
			const align = cells(lineAt(index + 1)).map((cell) => {
				const left = cell.startsWith(":");
				const right = cell.endsWith(":");
				if (left && right) {
					return "center";
				}
				if (right) {
					return "right";
				}
				return left ? "left" : null;
			});
			if (header.length === align.length) {
				let end = index + 2;
				while (end < lines.length && !isBlank(lineAt(end)) && !interrupts(lineAt(end))) {
					end += 1;
				}
				const headerCell = (text: string, column: number) =>
					withInline({ text, header: true, align: align[column] ?? null }, context);
				const bodyCell = (text: string, column: number) =>
					withInline({ text, header: false, align: align[column] ?? null }, context);
				tokens.push({
					type: "table",
					raw: raw(index, end),
					header: header.map(headerCell),
					align,
					rows: rawLines(index + 2, end).map((row) => cells(row, header.length).map(bodyCell)),
				} as Tok);
				index = end;
				continue;
			}
		}

		// A paragraph, or a setext heading when an underline ends it.
		let end = index + 1;
		let depth = 0;
		let indented = indentOf(rawLineAt(index)) > 0;
		for (; end < lines.length; end += 1) {
			// Why the fast path: a line that starts with a plain character and has no `|` only continues the paragraph.
			const from = starts[end] ?? 0;
			let at = 0;
			for (
				let code = source.charCodeAt(from);
				code === 32 || code === 9;
				code = source.charCodeAt(from + at)
			) {
				at += 1;
			}
			const first = source.charCodeAt(from + at);
			if (nextPipe !== -1 && nextPipe < from) {
				nextPipe = source.indexOf("|", from);
			}
			indented ||= at > 0;
			if (
				context.block.length === 0 &&
				first > 32 &&
				first < 128 &&
				PLAIN_START[first] === 1 &&
				at < 4 &&
				(nextPipe === -1 || nextPipe >= lineEnd(end))
			) {
				continue;
			}
			if (lazy?.has(end) === true) {
				continue;
			}
			const current = lineAt(end);
			const underline =
				current.includes("=") || current.includes("-") ? SETEXT.exec(current) : null;
			if (underline != null) {
				depth = underline[1]?.startsWith("=") === true ? 1 : 2;
				end += 1;
				break;
			}
			if (
				isBlank(current) ||
				interruptsParagraph(current) ||
				startsTable(current, lineAt(end + 1))
			) {
				break;
			}
		}
		const last = depth > 0 ? end - 1 : end;
		let text = source.slice(starts[index], lineEnd(last - 1));
		if (indented) {
			text = rawLineAt(index).trimStart();
			for (let at = index + 1; at < last; at += 1) {
				text += `\n${rawLineAt(at).trimStart()}`;
			}
		}
		text = text.trimEnd();
		const previous = tokens.at(-1);
		if (depth > 0) {
			tokens.push(withInline({ type: "heading", raw: raw(index, end), depth, text }, context));
		} else if (!top && previous?.type === "text") {
			previous.raw += raw(index, end);
			previous.text += `\n${text}`;
		} else {
			tokens.push(
				withInline({ type: top ? "paragraph" : "text", raw: raw(index, end), text }, context),
			);
		}
		index = end;
	}
	// Why: marked gives the line break before a blank line to the `space` token, and the parser keys on `raw`.
	for (let at = 1; at < tokens.length; at += 1) {
		const previous = tokens[at - 1];
		const token = tokens[at];
		if (token?.type === "space" && previous != null && previous.raw.endsWith("\n")) {
			previous.raw = previous.raw.slice(0, -1);
			token.raw = `\n${token.raw}`;
		}
	}
	return tokens;
}

/** The lines of a block and the source of a range of them. */
type Lines = {
	count: number;
	/** The column where each line starts. */
	column: number;
	lineAt: (at: number) => string;
	rawLineAt: (at: number) => string;
	raw: (from: number, to: number) => string;
	context: Context;
	lazy: LazyLines;
};

/** Lexes the list that starts at line `start`, pushes it to `tokens`, and returns the line after it. */
function lexList(
	{ count, column, lineAt, rawLineAt, raw, context, lazy }: Lines,
	start: number,
	tokens: Tok[],
): number {
	const lines = { length: count };
	const first = LIST.exec(lineAt(start));
	const ordered = first?.[3] != null;
	const marker = ordered ? first?.[4] : first?.[2];
	/** The item marker of `line` when it continues this list. */
	const itemOf = (line: string) => {
		const match = LIST.exec(line);
		const sameMarker = match != null && (ordered ? match[4] : match[2]) === marker;
		return sameMarker && (match[3] != null) === ordered && !HR.test(line) ? match : undefined;
	};
	const items: Tok[] = [];
	const contents: Tok[][] = [];
	let index = start;
	let loose = false;
	// Why `first`: the caller checks that the line starts an item.
	let match: RegExpExecArray | null | undefined = first;

	while (match != null) {
		const line = lineAt(index);
		const rest = line.slice(match[0].length);
		const width =
			isBlank(rest) || (match[5]?.length ?? 0) > 4
				? (match[1]?.length ?? 0) + (match[2]?.length ?? 0) + 1
				: match[0].length;
		// Why the expanded line: the first line starts with the marker, and its tabs only space the content out.
		const content = [line.slice(Math.min(width, line.length))];
		let end = index + 1;
		const tracker = createLazyTracker(column + width);
		tracker.read(content[0] ?? "");
		let innerLazy: Set<number> | undefined;
		// Why: an item that starts with a blank line ends at a second blank line.
		const empty = isBlank(rest) && isBlank(lineAt(index + 1));
		for (; end < lines.length; end += 1) {
			const current = lineAt(end);
			if (isBlank(current)) {
				tracker.read("");
				content.push("");
			} else if (!empty && indentOf(current) >= width) {
				const inner = stripColumns(rawLineAt(end), width, column);
				if (lazy?.has(end) === true) {
					innerLazy = markLazy(innerLazy, content.length);
				}
				content.push(inner);
				tracker.read(inner);
			} else if (lazy?.has(end) === true || tracker.continues(current)) {
				innerLazy = markLazy(innerLazy, content.length);
				content.push(current);
			} else {
				break;
			}
		}
		// Blank lines after an item belong to the list only when another item follows.
		let itemEnd = end;
		while (itemEnd > index + 1 && isBlank(lineAt(itemEnd - 1))) {
			itemEnd -= 1;
			content.pop();
		}
		let text = content.join("\n");
		const task = /^\[[ xX]\][ \t]+(?=\S)/.exec(text);
		if (task != null) {
			text = text.slice(task[0].length);
		}
		const checked = task == null ? undefined : task[0][1] !== " ";
		const itemTokens = lexNested(text, context, {
			top: false,
			column: column + width,
			lazy: innerLazy,
		});
		// Why the tokens: a blank line inside a nested block, such as a fence or a sublist, does not make the item loose.
		loose ||= itemTokens.some(
			(token, at) => token.type === "space" && at > 0 && at < itemTokens.length - 1,
		);
		contents.push(itemTokens);
		items.push({
			type: "list_item",
			raw: raw(index, itemEnd),
			task: task != null,
			checked,
			loose: false,
			text,
			tokens:
				task == null ? itemTokens : [{ type: "checkbox", raw: task[0], checked }, ...itemTokens],
		} as Tok);
		match = itemOf(lineAt(end));
		if (match == null) {
			index = itemEnd;
			break;
		}
		loose ||= itemEnd < end;
		index = end;
	}
	if (loose) {
		for (const item of items) {
			item.loose = true;
		}
		for (const token of contents.flat()) {
			if (token.type === "text") {
				token.type = "paragraph";
			}
		}
	}
	tokens.push({
		type: "list",
		raw: raw(start, index),
		ordered,
		start: ordered ? Number(first?.[3]) : "",
		loose,
		items,
	} as Tok);
	return index;
}

/** A run of `*`, `_`, or `~~` that can open or close emphasis. */
type Delimiter = {
	type: typeof DELIMITER;
	char: string;
	/** The characters of the run that no emphasis took. */
	count: number;
	/** The length of the run as written, for the rule of 3. */
	length: number;
	canOpen: boolean;
	canClose: boolean;
	/** The marker length of each emphasis that this run opens, in the order they paired. */
	opens: number[];
	/** The marker length of each emphasis that this run closes, in the order they paired. */
	closes: number[];
};
/** An open `[` or `![`, by the index of its text node. */
type Bracket = { node: number; image: boolean; index: number };
type Node = Tok | Delimiter;

const DELIMITER = "\0delimiter";
const LOCAL_PART = /[\w.+-]/;
const TRAILING_ENTITY = /&[a-zA-Z\d]+;$/;
/**
 * The next character that can start inline syntax. Why one regex: plain text
 * between two of them is copied as one slice, not one character at a time.
 */
const SPECIAL = /[\\`<[\]*_~@!]/g;
/** A line break after a space or a tab. Why apart from `SPECIAL`: a line break after text is plain text. */
const SPACED_BREAK = /[ \t]\n/g;

/** The index of the next character that can start inline syntax, or -1. Why `test`: it allocates no match. */
function nextSpecialFrom(source: string, from: number): number {
	SPECIAL.lastIndex = from;
	return SPECIAL.test(source) ? SPECIAL.lastIndex - 1 : -1;
}
/** Where a URL literal can start. Why apart from `SPECIAL`: a lookbehind slows each search, so this one runs once for each URL. */
const URL_START = /(?<![a-zA-Z\d])https?:\/\/|(?<![^\s*_~(])www\./g;
const AUTOLINK = /^<([a-zA-Z][a-zA-Z\d+.-]{1,31}:[^\s<>]*)>/;
const EMAIL_AUTOLINK =
	/^<([\w.!#$%&'*+/=?^`{|}~-]+@[a-zA-Z\d](?:[a-zA-Z\d-]*[a-zA-Z\d])?(?:\.[a-zA-Z\d](?:[a-zA-Z\d-]*[a-zA-Z\d])?)*)>/;
const URL_LITERAL = /^(?:https?:\/\/[\w-]|www\.[\w-]+\.[\w-])(?:[^\s<]*[^\s<?!.,:*_~'"])?/;
/** CommonMark's limit on parentheses nested in a link destination. Why: it bounds each scan. */
const MAX_DESTINATION_PARENS = 32;
const EMPHASIS = ["", "em", "strong"] as const;

const isDelimiter = (node: Node): node is Delimiter => node.type === DELIMITER;
const isSpace = (char: string | undefined) => char === undefined || SPACE.test(char);
const isPunctuation = (char: string | undefined) => char !== undefined && PUNCTUATION.test(char);
const countOf = (text: string, part: string) => text.split(part).length - 1;
const autolinkToken = (raw: string, label: string, href: string): Tok =>
	({ type: "link", raw, text: label, href, title: null, tokens: [textToken(label)] }) as Tok;

/** The text of inline tokens, for an image's alt text. Why a loop: nested images can be deep. */
function plainText(tokens: readonly Tok[]): string {
	let out = "";
	const stack: Tok[] = tokens.toReversed();
	for (let token = stack.pop(); token != null; token = stack.pop()) {
		if (token.tokens == null) {
			out += token.text ?? "";
		} else {
			for (let at = token.tokens.length - 1; at >= 0; at -= 1) {
				stack.push(token.tokens[at]);
			}
		}
	}
	return out;
}

/** Skips spaces, tabs, and line breaks from `index`. */
function skipSpace(source: string, index: number): number {
	let at = index;
	while (source[at] === " " || source[at] === "\t" || source[at] === "\n") {
		at += 1;
	}
	return at;
}

/**
 * Finds the next unescaped `char` from an index, and remembers the answer.
 * Why: a link opener scans for its title's end. Without the memory, many
 * openers with no end scan the rest of the text each, which is quadratic.
 */
function createFinder(source: string): (char: string, from: number) => number {
	let found: Map<string, { from: number; at: number }> | undefined;
	return (char, from) => {
		found ??= new Map();
		const known = found.get(char);
		if (known != null && from >= known.from && (known.at === -1 || from <= known.at)) {
			return known.at;
		}
		let at = source.indexOf(char, from);
		while (at !== -1) {
			let slashes = 0;
			while (source[at - 1 - slashes] === "\\") {
				slashes += 1;
			}
			if (slashes % 2 === 0) {
				break;
			}
			at = source.indexOf(char, at + 1);
		}
		found.set(char, { from, at });
		return at;
	};
}

/**
 * Pairs each `(` of `source` with its `)` within a link destination, on first
 * use. A `(` with no `)` before the next space, or nested deeper than
 * CommonMark's limit, pairs with -1.
 */
function createParens(source: string): (open: number) => number {
	let close: Int32Array | undefined;
	return (open) => {
		if (close == null) {
			close = new Int32Array(source.length).fill(-1);
			const stack: number[] = [];
			for (let at = 0; at < source.length; at += 1) {
				const code = source.charCodeAt(at);
				if (code === 92) {
					at += 1;
				} else if (code <= 32) {
					stack.length = 0;
				} else if (code === 40) {
					stack.push(at);
				} else if (code === 41 && stack.length > 0) {
					const depth = stack.length;
					const opener = stack.pop() ?? 0;
					if (depth <= MAX_DESTINATION_PARENS) {
						close[opener] = at;
					}
				}
			}
		}
		return close[open] ?? -1;
	};
}

/** Parses a link destination and title after the `(` that ends at `start`. */
function inlineLink(
	source: string,
	start: number,
	{
		find,
		closeOf,
	}: { find: (char: string, from: number) => number; closeOf: (open: number) => number },
): { href: string; title: string | null; end: number } | undefined {
	let index = skipSpace(source, start);
	let href: string;
	if (source[index] === "<") {
		const close = find(">", index + 1);
		if (
			close === -1 ||
			source.slice(index, close).includes("\n") ||
			source.slice(index + 1, close).includes("<")
		) {
			return undefined;
		}
		href = source.slice(index + 1, close);
		index = close + 1;
	} else {
		const from = index;
		for (; index < source.length; index += 1) {
			const code = source.charCodeAt(index);
			if (code === 92) {
				index += 1;
			} else if (code === 40) {
				// Why a jump: `closeOf` pairs each `(` once, so no scan reads a group twice.
				const close = closeOf(index);
				if (close === -1) {
					return undefined;
				}
				index = close;
			} else if (code === 41 || code <= 32) {
				break;
			}
		}
		href = source.slice(from, index);
	}
	let title: string | null = null;
	const afterHref = index;
	index = skipSpace(source, index);
	const open = source[index];
	if (index > afterHref && (open === '"' || open === "'" || open === "(")) {
		const close = find(open === "(" ? ")" : open, index + 1);
		if (close === -1) {
			return undefined;
		}
		title = literal(source.slice(index + 1, close));
		index = skipSpace(source, close + 1);
	}
	return source[index] === ")" ? { href: literal(href), title, end: index + 1 } : undefined;
}

/** Lexes inline Markdown into marked's inline tokens. */
function lexInline(source: string, context: Context): Tok[] {
	const nodes: Node[] = [];
	const brackets: Bracket[] = [];
	// Why a floor: a link deactivates each `[` before it, and a floor does that in one step.
	let activeFloor = 0;
	const find = createFinder(source);
	const scanner = { find, closeOf: createParens(source) };
	// Each backtick run length that has no closing run after the last search. Why: it keeps code spans linear.
	let noCloser: Set<number> | undefined;
	let text = "";
	const flush = () => {
		if (text !== "") {
			nodes.push(textToken(text));
			text = "";
		}
	};
	const push = (node: Node) => {
		flush();
		nodes.push(node);
	};
	// The next index where each inline extension can start, or -1.
	const startAt = (extension: MarkdownTokenizer, from: number) => {
		if (extension.start == null) {
			return from;
		}
		const next = extension.start(source.slice(from));
		return next == null || next < 0 ? -1 : from + next;
	};
	const nextExtension = context.inline.map((extension) => startAt(extension, 0));
	// The index of the next special character and of the next URL literal, -1 for none, or -2 before the first search.
	// Why remember them: a search that runs to the end of the text again for each stop is quadratic.
	let nextSpecial = -2;
	let nextBreak = -2;
	// Why the includes: most text has no URL, and they skip the slower search.
	let nextUrl = source.includes("://") || source.includes("www.") ? -2 : -1;

	let index = 0;
	scan: while (index < source.length) {
		let stop = source.length;
		for (let at = 0; at < context.inline.length; at += 1) {
			const extension = context.inline[at];
			const next = nextExtension[at] ?? -1;
			if (extension == null || next === -1) {
				continue;
			}
			if (next > index) {
				stop = Math.min(stop, next);
				continue;
			}
			const token = extension.tokenizer(source.slice(index), []);
			if (token != null) {
				push(token);
				index += token.raw.length;
				nextExtension[at] = startAt(extension, index);
				continue scan;
			}
			nextExtension[at] = startAt(extension, index + 1);
			stop = Math.min(stop, nextExtension[at] === -1 ? source.length : (nextExtension[at] ?? stop));
		}
		if (nextUrl !== -1 && nextUrl < index) {
			URL_START.lastIndex = index;
			nextUrl = URL_START.exec(source)?.index ?? -1;
		}
		if (nextSpecial !== -1 && nextSpecial < index) {
			nextSpecial = nextSpecialFrom(source, index);
		}
		if (nextBreak !== -1 && nextBreak < index) {
			SPACED_BREAK.lastIndex = Math.max(0, index - 1);
			nextBreak = SPACED_BREAK.test(source) ? SPACED_BREAK.lastIndex - 1 : -1;
		}
		stop = Math.min(
			stop,
			nextSpecial === -1 ? source.length : nextSpecial,
			nextUrl === -1 ? source.length : nextUrl,
			nextBreak === -1 ? source.length : nextBreak,
		);
		if (stop > index) {
			text += source.slice(index, stop);
			index = stop;
			continue;
		}

		const char = source[index] ?? "";
		if (char === "\\") {
			const next = source[index + 1];
			if (next === "\n") {
				push({ type: "br", raw: "\\\n" } as Tok);
				index += 2;
				continue;
			}
			if (next != null && ESCAPABLE.test(next)) {
				push({ type: "escape", raw: `\\${next}`, text: next } as Tok);
				index += 2;
				continue;
			}
		} else if (char === "`") {
			let runEnd = index;
			while (source[runEnd] === "`") {
				runEnd += 1;
			}
			const length = runEnd - index;
			if (noCloser?.has(length) !== true) {
				for (let close = source.indexOf("`", runEnd); close !== -1;) {
					let closeEnd = close;
					while (source[closeEnd] === "`") {
						closeEnd += 1;
					}
					if (closeEnd - close === length) {
						let code = source.slice(runEnd, close).replace(/\n/g, " ");
						if (
							code.length > 1 &&
							code.startsWith(" ") &&
							code.endsWith(" ") &&
							code.trim() !== ""
						) {
							code = code.slice(1, -1);
						}
						push({ type: "codespan", raw: source.slice(index, closeEnd), text: code } as Tok);
						index = closeEnd;
						continue scan;
					}
					close = source.indexOf("`", closeEnd);
				}
				noCloser ??= new Set();
				noCloser.add(length);
			}
			text += source.slice(index, runEnd);
			index = runEnd;
			continue;
		} else if (char === "<") {
			const rest = source.slice(index);
			const url = AUTOLINK.exec(rest);
			const email = url == null ? EMAIL_AUTOLINK.exec(rest) : null;
			const link = url ?? email;
			if (link != null) {
				const label = link[1] ?? "";
				push(autolinkToken(link[0], label, email == null ? label : `mailto:${label}`));
				index += link[0].length;
				continue;
			}
			const html = HTML_TAG.exec(rest);
			if (html != null) {
				push({
					type: "html",
					raw: html[0],
					text: html[0],
					inLink: false,
					inRawBlock: false,
					block: false,
				} as Tok);
				index += html[0].length;
				continue;
			}
		} else if (char === "[" || (char === "!" && source[index + 1] === "[")) {
			const image = char === "!";
			const raw = image ? "![" : "[";
			push(textToken(raw));
			brackets.push({ node: nodes.length - 1, image, index });
			index += raw.length;
			continue;
		} else if (char === "]") {
			const bracket = brackets.pop();
			if (bracket != null) {
				const active = bracket.image || brackets.length >= activeFloor;
				activeFloor = Math.min(activeFloor, brackets.length);
				const labelStart = bracket.index + (bracket.image ? 2 : 1);
				const label = source.slice(labelStart, index);
				let target =
					active && source[index + 1] === "(" ? inlineLink(source, index + 2, scanner) : undefined;
				if (target == null && active) {
					const reference = /^\[((?:\\.|[^[\]\\]){0,999})\]/.exec(
						source.slice(index + 1, index + 1002),
					);
					const key = normalizeLabel(reference?.[1] || label);
					const definition = key === "" ? undefined : context.links[key];
					if (definition != null) {
						target = {
							href: definition.href,
							title: definition.title || null,
							end: index + 1 + (reference?.[0].length ?? 0),
						};
					}
				}
				if (target != null) {
					flush();
					// Why: a link cannot hold a link, so an autolink literal in its text stays text.
					const children = finish(nodes.splice(bracket.node + 1)).map((child) =>
						child.type === "link" && child.raw === child.text && !child.raw.startsWith("<")
							? textToken(child.raw)
							: child,
					);
					const linkRaw = source.slice(bracket.index, target.end);
					nodes[bracket.node] = {
						type: bracket.image ? "image" : "link",
						raw: linkRaw,
						href: target.href,
						title: target.title,
						text: bracket.image ? plainText(children) : label,
						tokens: children,
					} as Tok;
					if (!bracket.image) {
						activeFloor = brackets.length;
					}
					index = target.end;
					continue;
				}
			}
		} else if (char === "*" || char === "_" || char === "~") {
			let runEnd = index;
			while (source[runEnd] === char) {
				runEnd += 1;
			}
			const length = runEnd - index;
			const before = source[index - 1];
			const after = source[runEnd];
			const left =
				!isSpace(after) && (!isPunctuation(after) || isSpace(before) || isPunctuation(before));
			const right =
				!isSpace(before) && (!isPunctuation(before) || isSpace(after) || isPunctuation(after));
			const canOpen = char === "_" ? left && (!right || isPunctuation(before)) : left;
			const canClose = char === "_" ? right && (!left || isPunctuation(after)) : right;
			if ((char !== "~" || length === 2) && (canOpen || canClose)) {
				push({
					type: DELIMITER,
					char,
					count: length,
					length,
					canOpen,
					canClose,
					opens: [],
					closes: [],
				});
			} else {
				text += source.slice(index, runEnd);
			}
			index = runEnd;
			continue;
		} else if (char === "\n") {
			// The spaces before a line break end `text`: two or more spaces make a hard break, and fewer drop out.
			let spaces = 0;
			while (
				(source[index - 1 - spaces] === " " || source[index - 1 - spaces] === "\t") &&
				spaces < text.length
			) {
				spaces += 1;
			}
			if (spaces > 0) {
				text = text.slice(0, -spaces);
			}
			if (source[index - 1] === " " && source[index - 2] === " ") {
				push({ type: "br", raw: "  \n" } as Tok);
			} else {
				text += "\n";
			}
			index += 1;
			while (source[index] === " " || source[index] === "\t") {
				index += 1;
			}
			continue;
		} else if (char === "@") {
			let start = text.length;
			while (start > 0 && start > text.length - 256 && LOCAL_PART.test(text[start - 1] ?? "")) {
				start -= 1;
			}
			const scheme = /(?:mailto|xmpp):$/.exec(text.slice(Math.max(0, start - 7), start))?.[0] ?? "";
			const local = start < text.length ? scheme + text.slice(start) : null;
			const domain = /^@[a-zA-Z\d_-]+(?:\.[a-zA-Z\d_-]+)+/.exec(source.slice(index, index + 256));
			if (local != null && domain != null && !/[-_]$/.test(domain[0])) {
				text = text.slice(0, -local.length);
				const resource = local.startsWith("xmpp:")
					? (/^\/[\w@.+-]*[\w@+-]/.exec(
							source.slice(index + domain[0].length, index + domain[0].length + 256),
						)?.[0] ?? "")
					: "";
				const address = local + domain[0] + resource;
				push(
					autolinkToken(
						address,
						address,
						/^(?:mailto|xmpp):/.test(address) ? address : `mailto:${address}`,
					),
				);
				index += domain[0].length + resource.length;
				continue;
			}
		} else if (index === nextUrl) {
			const url = URL_LITERAL.exec(source.slice(index));
			if (url != null) {
				let value = url[0];
				// Why: GFM ends a URL before a trailing entity such as `&hl;` and before an unpaired `)`.
				for (let trail = TRAILING_ENTITY.exec(value); ; trail = TRAILING_ENTITY.exec(value)) {
					if (trail != null) {
						value = value.slice(0, trail.index);
					} else if (
						value.endsWith("(") ||
						(value.endsWith(")") && countOf(value, "(") < countOf(value, ")"))
					) {
						value = value.slice(0, -1);
					} else {
						break;
					}
				}
				push(autolinkToken(value, value, value.startsWith("www.") ? `http://${value}` : value));
				index += value.length;
				continue;
			}
		}
		text += char;
		index += 1;
	}
	flush();
	return finish(nodes);
}

/** Merges each run of adjacent text tokens into one. */
function mergeText(tokens: readonly Tok[]): Tok[] {
	const out: Tok[] = [];
	for (const token of tokens) {
		const last = out.at(-1);
		if (
			token.type === "text" &&
			token.tokens == null &&
			last?.type === "text" &&
			last.tokens == null
		) {
			out[out.length - 1] = textToken(last.text + token.text);
		} else {
			out.push(token);
		}
	}
	return out;
}

/**
 * Pairs the delimiter runs of `nodes` into emphasis by CommonMark's
 * algorithm, then builds the tokens. Why a linked list of delimiters and a
 * floor for each kind of closer: each closer then searches only openers that
 * can still match, so the pairing stays linear.
 */
function finish(nodes: readonly Node[]): Tok[] {
	const delimiters = nodes.filter(isDelimiter);
	if (delimiters.length === 0) {
		return mergeText(nodes.filter((node): node is Tok => !isDelimiter(node)));
	}
	const previous = delimiters.map((_, at) => at - 1);
	const next = delimiters.map((_, at) => (at + 1 < delimiters.length ? at + 1 : -1));
	const unlink = (at: number) => {
		const before = previous[at] ?? -1;
		const after = next[at] ?? -1;
		if (before !== -1) {
			next[before] = after;
		}
		if (after !== -1) {
			previous[after] = before;
		}
	};
	const floors = new Map<string, number>();
	let closer = delimiters.length > 0 ? 0 : -1;
	while (closer !== -1) {
		const close = delimiters[closer];
		if (close == null || !close.canClose || close.count === 0) {
			closer = next[closer] ?? -1;
			continue;
		}
		const kind = `${close.char}${close.canOpen ? 1 : 0}${close.length % 3}`;
		const floor = floors.get(kind) ?? -1;
		let opener = previous[closer] ?? -1;
		for (; opener > floor; opener = previous[opener] ?? -1) {
			const open = delimiters[opener];
			if (
				open != null &&
				open.char === close.char &&
				open.canOpen &&
				open.count > 0 &&
				!(
					(open.canClose || close.canOpen) &&
					close.length % 3 !== 0 &&
					(open.length + close.length) % 3 === 0
				)
			) {
				break;
			}
		}
		const open = opener > floor ? delimiters[opener] : undefined;
		if (open == null) {
			floors.set(kind, previous[closer] ?? -1);
			const after = next[closer] ?? -1;
			if (!close.canOpen) {
				unlink(closer);
			}
			closer = after;
			continue;
		}
		const use = close.char === "~" || (open.count >= 2 && close.count >= 2) ? 2 : 1;
		open.count -= use;
		close.count -= use;
		open.opens.push(use);
		close.closes.push(use);
		// The delimiters between the pair can no longer pair, so they leave the list and stay text.
		next[opener] = closer;
		previous[closer] = opener;
		if (open.count === 0) {
			unlink(opener);
		}
		if (close.count === 0) {
			const after = next[closer] ?? -1;
			unlink(closer);
			closer = after;
		}
	}

	type Frame = { tokens: Tok[]; char: string; use: number };
	const stack: Frame[] = [{ tokens: [], char: "", use: 0 }];
	const append = (token: Tok) => {
		const tokens = stack.at(-1)?.tokens ?? [];
		const last = tokens.at(-1);
		if (
			token.type === "text" &&
			token.tokens == null &&
			last?.type === "text" &&
			last.tokens == null
		) {
			tokens[tokens.length - 1] = textToken(last.text + token.text);
		} else {
			tokens.push(token);
		}
	};
	for (const node of nodes) {
		if (!isDelimiter(node)) {
			append(node);
			continue;
		}
		for (const use of node.closes) {
			const frame = stack.length > 1 ? stack.pop() : undefined;
			if (frame == null) {
				break;
			}
			const marker = node.char.repeat(use);
			const inner = frame.tokens.map((token) => token.raw).join("");
			append({
				type: node.char === "~" ? "del" : (EMPHASIS[use] ?? "em"),
				raw: marker + inner + marker,
				text: inner,
				tokens: frame.tokens,
			});
		}
		if (node.count > 0) {
			append(textToken(node.char.repeat(node.count)));
		}
		for (let at = node.opens.length - 1; at >= 0; at -= 1) {
			stack.push({ tokens: [], char: node.char, use: node.opens[at] ?? 1 });
		}
	}
	return stack[0]?.tokens ?? [];
}

/**
 * Lexes Markdown into marked's tokens. `links` seeds the reference
 * definitions, and the result's `links` holds each one it read.
 */
function lexMarkdown(
	source: string,
	{ links, extensions = [] }: { links?: Links; extensions?: readonly MarkdownTokenizer[] } = {},
): TokensList {
	const context: Context = {
		// Why no prototype: a label such as `__proto__` must stay a plain key.
		links: Object.assign(Object.create(null), links),
		block: extensions.filter((extension) => extension.level === "block"),
		inline: extensions.filter((extension) => extension.level === "inline"),
		jobs: [],
		depth: 0,
	};
	const normalized = source.includes("\r") ? source.replace(/\r\n?/g, "\n") : source;
	const tokens = lexBlocks(normalized, context, { top: true });
	for (const job of context.jobs) {
		job();
	}
	return Object.assign(tokens, { links: context.links });
}

export {
	//,
	lexMarkdown,
};

export type {
	//,
	MarkdownTokenizer,
};
