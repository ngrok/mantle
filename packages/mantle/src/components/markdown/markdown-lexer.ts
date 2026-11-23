/**
 * POC: a Markdown lexer for model answers, in place of marked's. It emits
 * marked's token shapes, so `Markdown` renders its output unchanged. It reads
 * CommonMark blocks and inlines plus the GitHub extensions an answer uses:
 * tables, task items, strikethrough, and autolink literals. Block and inline
 * extensions use marked's `{ level, start, tokenizer }` shape.
 */
import type { Token, Tokens, TokensList } from "marked";

type Links = TokensList["links"];
/** A marked tokenizer extension. The lexer is not marked's, so a tokenizer gets no `this.lexer`. */
type MarkdownTokenizer = {
	level: "block" | "inline";
	start?: (source: string) => number | undefined;
	tokenizer: (source: string, tokens: Token[]) => Tokens.Generic | undefined;
};
type Context = {
	links: Links;
	block: MarkdownTokenizer[];
	inline: MarkdownTokenizer[];
	jobs: (() => void)[];
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
const DEF =
	/^ {0,3}\[((?:\\.|[^[\]\\])+)\]:[ \t]*(<[^<>\n]*>|[^\s<]\S*)(?:[ \t]+("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|\((?:\\.|[^()\\\n])*\)))?[ \t]*$/;
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
const ESCAPABLE = /[!-/:-@[-`{-~]/;
const PUNCTUATION = /[\p{P}\p{S}]/u;
const SPACE = /\s/u;

const normalizeLabel = (label: string) => label.trim().replace(/\s+/g, " ").toLowerCase();
const unescape = (text: string) => text.replace(/\\([!-/:-@[-`{-~])/g, "$1");
const isBlank = (line: string) => line.trim() === "";
const indentOf = (line: string) => line.length - line.trimStart().length;
const textToken = (text: string): Tok => ({ type: "text", raw: text, text, escaped: false }) as Tok;

/** Expands the tabs in the indent of `line` to stops of 4 columns. */
function expandTabs(line: string): string {
	if (!line.startsWith("\t") && !/^ *\t/.test(line)) {
		return line;
	}
	let indent = "";
	let index = 0;
	for (; line[index] === " " || line[index] === "\t"; index += 1) {
		indent += line[index] === " " ? " " : " ".repeat(4 - (indent.length % 4));
	}
	return indent + line.slice(index);
}

/** Whether `line` opens a code fence. */
function isFence(line: string): boolean {
	const fence = FENCE.exec(line);
	return fence != null && !(fence[2]?.startsWith("`") === true && fence[3]?.includes("`") === true);
}

/** Whether `line` starts a block that ends a paragraph. */
function interrupts(line: string): boolean {
	if (
		HEADING.test(line) ||
		HR.test(line) ||
		QUOTE.test(line) ||
		isFence(line) ||
		HTML_BLOCK.test(line) ||
		HTML_RAW.some(([start]) => start.test(line))
	) {
		return true;
	}
	const item = LIST.exec(line);
	return (
		item != null && !isBlank(line.slice(item[0].length)) && (item[3] == null || item[3] === "1")
	);
}

/** Splits a table row into its cells, without the outer pipes. */
function cells(row: string, count?: number): string[] {
	const trimmed = row.trim().replace(/^\|/, "");
	const out: string[] = [];
	let cell = "";
	for (let index = 0; index < trimmed.length; index += 1) {
		const char = trimmed[index];
		if (char === "\\" && trimmed[index + 1] === "|") {
			cell += "|";
			index += 1;
		} else if (char === "|") {
			out.push(cell.trim());
			cell = "";
		} else {
			cell += char;
		}
	}
	if (cell.trim() !== "" || !trimmed.endsWith("|")) {
		out.push(cell.trim());
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
	const out = { ...token, tokens: [] as Tok[] };
	context.jobs.push(() => {
		out.tokens = lexInline(out.text, context);
	});
	return out;
}

/** Lexes the blocks of `source`. `top` is false inside a list item, where a paragraph is a `text` token. */
function lexBlocks(source: string, context: Context, { top }: { top: boolean }): Tok[] {
	const tokens: Tok[] = [];
	const lines: string[] = [];
	const starts: number[] = [];
	for (let start = 0; start < source.length;) {
		const newline = source.indexOf("\n", start);
		starts.push(start);
		lines.push(expandTabs(source.slice(start, newline === -1 ? source.length : newline)));
		start = newline === -1 ? source.length : newline + 1;
	}
	starts.push(source.length);
	const raw = (from: number, to: number) => source.slice(starts[from], starts[to]);
	const lineAt = (at: number) => lines[at] ?? "";
	let index = 0;

	blocks: while (index < lines.length) {
		const line = lineAt(index);

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

		if (isFence(line)) {
			const [, indent = "", marker = "", info = ""] = FENCE.exec(line) ?? [];
			const body: string[] = [];
			let end = index + 1;
			for (; end < lines.length; end += 1) {
				const close = FENCE_CLOSE.exec(lineAt(end));
				if (close?.[1]?.[0] === marker[0] && (close?.[1]?.length ?? 0) >= marker.length) {
					end += 1;
					break;
				}
				body.push(lineAt(end).slice(Math.min(indent.length, indentOf(lineAt(end)))));
			}
			tokens.push({
				type: "code",
				raw: raw(index, end),
				lang: unescape(info.trim()),
				text: body.join("\n"),
			} as Tok);
			index = end;
			continue;
		}

		if (indentOf(line) >= 4) {
			let end = index + 1;
			let last = index + 1;
			for (; end < lines.length && (isBlank(lineAt(end)) || indentOf(lineAt(end)) >= 4); end += 1) {
				if (!isBlank(lineAt(end))) {
					last = end + 1;
				}
			}
			const text = lines
				.slice(index, last)
				.map((current) => current.slice(Math.min(4, indentOf(current))))
				.join("\n");
			tokens.push({ type: "code", raw: raw(index, last), codeBlockStyle: "indented", text } as Tok);
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

		if (QUOTE.test(line)) {
			const inner: string[] = [];
			let end = index;
			let lazy = false;
			for (; end < lines.length; end += 1) {
				const current = lineAt(end);
				if (QUOTE.test(current)) {
					const content = current.replace(/^ {0,3}> ?/, "");
					inner.push(content);
					lazy = !isBlank(content) && !isFence(content) && indentOf(content) < 4;
				} else if (lazy && !isBlank(current) && !interrupts(current)) {
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
				tokens: lexBlocks(text, context, { top: true }),
			} as Tok);
			index = end;
			continue;
		}

		if (LIST.test(line) && !HR.test(line)) {
			index = lexList({ lines, raw, context }, index, tokens);
			continue;
		}

		const rawHtml = HTML_RAW.find(([start]) => start.test(line));
		if (rawHtml != null || HTML_BLOCK.test(line) || HTML_TAG_LINE.test(line)) {
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

		const def = DEF.exec(line);
		if (def != null) {
			const tag = normalizeLabel(def[1] ?? "");
			const href = unescape((def[2] ?? "").replace(/^<|>$/g, ""));
			const title = def[3] == null ? undefined : unescape(def[3].slice(1, -1));
			if (!(tag in context.links)) {
				context.links[tag] = { href, title: title ?? "" };
			}
			tokens.push({ type: "def", raw: raw(index, index + 1), tag, href, title } as Tok);
			index += 1;
			continue;
		}

		if (line.includes("|") && DELIMITER_ROW.test(lineAt(index + 1))) {
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
					rows: lines.slice(index + 2, end).map((row) => cells(row, header.length).map(bodyCell)),
				} as Tok);
				index = end;
				continue;
			}
		}

		// A paragraph, or a setext heading when an underline ends it.
		let end = index + 1;
		let depth = 0;
		for (; end < lines.length; end += 1) {
			const current = lineAt(end);
			const underline = SETEXT.exec(current);
			if (underline != null) {
				depth = underline[1]?.startsWith("=") === true ? 1 : 2;
				end += 1;
				break;
			}
			if (
				isBlank(current) ||
				interrupts(current) ||
				(current.includes("|") && DELIMITER_ROW.test(lineAt(end + 1))) ||
				context.block.some((extension) => extension.start?.(current) === 0)
			) {
				break;
			}
		}
		const text = lines
			.slice(index, depth > 0 ? end - 1 : end)
			.map((current) => current.trimStart())
			.join("\n")
			.trimEnd();
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
	lines: readonly string[];
	raw: (from: number, to: number) => string;
	context: Context;
};

/** Lexes the list that starts at line `start`, pushes it to `tokens`, and returns the line after it. */
function lexList({ lines, raw, context }: Lines, start: number, tokens: Tok[]): number {
	const first = LIST.exec(lines[start] ?? "");
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

	while (index < lines.length) {
		const line = lines[index] ?? "";
		const match = itemOf(line);
		if (match == null) {
			break;
		}
		const rest = line.slice(match[0].length);
		const width =
			isBlank(rest) || (match[5]?.length ?? 0) > 4
				? (match[1]?.length ?? 0) + (match[2]?.length ?? 0) + 1
				: match[0].length;
		const content = [line.slice(Math.min(width, line.length))];
		let end = index + 1;
		let lazy = !isBlank(rest);
		for (; end < lines.length; end += 1) {
			const current = lines[end] ?? "";
			if (isBlank(current)) {
				lazy = false;
				content.push("");
			} else if (indentOf(current) >= width) {
				content.push(current.slice(width));
				lazy = !isFence(current.slice(width));
			} else if (lazy && !interrupts(current) && !LIST.test(current)) {
				content.push(current);
			} else {
				break;
			}
		}
		// Blank lines after an item belong to the list only when another item follows.
		let itemEnd = end;
		while (itemEnd > index + 1 && isBlank(lines[itemEnd - 1] ?? "")) {
			itemEnd -= 1;
			content.pop();
		}
		let text = content.join("\n");
		const task = /^\[[ xX]\][ \t]+(?=\S)/.exec(text);
		if (task != null) {
			text = text.slice(task[0].length);
		}
		const checked = task == null ? undefined : task[0][1] !== " ";
		const itemTokens = lexBlocks(text, context, { top: false });
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
		if (itemOf(lines[end] ?? "") == null) {
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

type Delimiter = {
	char: string;
	count: number;
	length: number;
	canOpen: boolean;
	canClose: boolean;
};
type Bracket = { bracket: true; image: boolean; active: boolean; index: number };
type Node = Tok | Delimiter | Bracket;

const isDelimiter = (node: Node | undefined): node is Delimiter =>
	node != null && "canOpen" in node;
const isBracket = (node: Node | undefined): node is Bracket => node != null && "bracket" in node;
const isSpace = (char: string | undefined) => char === undefined || SPACE.test(char);
const isPunctuation = (char: string | undefined) => char !== undefined && PUNCTUATION.test(char);
const isPlainText = (node: Node | undefined): node is Tok =>
	node != null &&
	!isDelimiter(node) &&
	!isBracket(node) &&
	node.type === "text" &&
	node.keep !== true;
const countOf = (text: string, part: string) => text.split(part).length - 1;

/** The text of inline tokens, for an image's alt text. */
function plainText(tokens: readonly Tok[]): string {
	return tokens
		.map((token) => (token.tokens == null ? (token.text ?? "") : plainText(token.tokens)))
		.join("");
}

/** Skips spaces, tabs, and at most one line break from `index`. */
function skipSpace(source: string, index: number): number {
	let at = index;
	while (source[at] === " " || source[at] === "\t" || source[at] === "\n") {
		at += 1;
	}
	return at;
}

/** Parses a link destination and title after the `(` that ends at `start`. */
function inlineLink(
	source: string,
	start: number,
): { href: string; title: string | null; end: number } | undefined {
	let index = skipSpace(source, start);
	let href: string;
	if (source[index] === "<") {
		const close = source.indexOf(">", index);
		if (close === -1 || source.slice(index, close).includes("\n")) {
			return undefined;
		}
		href = source.slice(index + 1, close);
		index = close + 1;
	} else {
		let depth = 0;
		const from = index;
		for (; index < source.length; index += 1) {
			const char = source[index] ?? "";
			if (char === "\\") {
				index += 1;
			} else if (char === "(") {
				depth += 1;
			} else if (char === ")") {
				if (depth === 0) {
					break;
				}
				depth -= 1;
			} else if (SPACE.test(char)) {
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
		const closeChar = open === "(" ? ")" : open;
		let close = index + 1;
		for (; close < source.length && source[close] !== closeChar; close += 1) {
			if (source[close] === "\\") {
				close += 1;
			}
		}
		if (close >= source.length) {
			return undefined;
		}
		title = unescape(source.slice(index + 1, close));
		index = skipSpace(source, close + 1);
	}
	return source[index] === ")" ? { href: unescape(href), title, end: index + 1 } : undefined;
}

/** Lexes inline Markdown into marked's inline tokens. */
function lexInline(source: string, context: Context): Tok[] {
	const nodes: Node[] = [];
	let text = "";
	const flush = () => {
		if (text === "") {
			return;
		}
		const previous = nodes.at(-1);
		if (isPlainText(previous)) {
			previous.raw += text;
			previous.text += text;
		} else {
			nodes.push(textToken(text));
		}
		text = "";
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

	let index = 0;
	scan: while (index < source.length) {
		for (let at = 0; at < context.inline.length; at += 1) {
			const extension = context.inline[at];
			const next = nextExtension[at] ?? -1;
			if (extension == null || next === -1 || next > index) {
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
			for (let close = source.indexOf("`", runEnd); close !== -1;) {
				let closeEnd = close;
				while (source[closeEnd] === "`") {
					closeEnd += 1;
				}
				if (closeEnd - close === length) {
					let code = source.slice(runEnd, close).replace(/\n/g, " ");
					if (code.length > 1 && code.startsWith(" ") && code.endsWith(" ") && code.trim() !== "") {
						code = code.slice(1, -1);
					}
					push({ type: "codespan", raw: source.slice(index, closeEnd), text: code } as Tok);
					index = closeEnd;
					continue scan;
				}
				close = source.indexOf("`", closeEnd);
			}
			text += source.slice(index, runEnd);
			index = runEnd;
			continue;
		} else if (char === "<") {
			const rest = source.slice(index);
			const url = /^<([a-zA-Z][a-zA-Z\d+.-]{1,31}:[^\s<>]*)>/.exec(rest);
			const email =
				url == null
					? /^<([\w.!#$%&'*+/=?^`{|}~-]+@[a-zA-Z\d](?:[a-zA-Z\d-]*[a-zA-Z\d])?(?:\.[a-zA-Z\d](?:[a-zA-Z\d-]*[a-zA-Z\d])?)*)>/.exec(
							rest,
						)
					: null;
			const link = url ?? email;
			if (link != null) {
				const label = link[1] ?? "";
				push({
					type: "link",
					raw: link[0],
					text: label,
					href: email == null ? label : `mailto:${label}`,
					title: null,
					tokens: [textToken(label)],
				} as Tok);
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
			push({ bracket: true, image, active: true, index });
			// Why `keep`: the label's text must stay its own node after the bracket.
			nodes.push({ ...textToken(image ? "![" : "["), keep: true } as Tok);
			index += image ? 2 : 1;
			continue;
		} else if (char === "]") {
			flush();
			let opener = nodes.length - 1;
			while (opener >= 0 && !isBracket(nodes[opener])) {
				opener -= 1;
			}
			const bracket = nodes[opener];
			if (isBracket(bracket)) {
				let target =
					bracket.active && source[index + 1] === "(" ? inlineLink(source, index + 2) : undefined;
				const label = plainRaw(nodes.slice(opener + 2));
				if (target == null && bracket.active) {
					const reference = /^\[((?:\\.|[^[\]\\])*)\]/.exec(source.slice(index + 1));
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
					// Why: a link cannot hold a link, so an autolink literal in its text stays text.
					const children = finish(nodes.splice(opener + 2)).map((child) =>
						child.type === "link" && child.raw === child.text && !child.raw.startsWith("<")
							? textToken(child.raw)
							: child,
					);
					nodes.length = opener;
					const linkRaw = source.slice(bracket.index, target.end);
					if (bracket.image) {
						nodes.push({
							type: "image",
							raw: linkRaw,
							href: target.href,
							title: target.title,
							text: plainText(children),
							tokens: children,
						} as Tok);
					} else {
						nodes.push({
							type: "link",
							raw: linkRaw,
							href: target.href,
							title: target.title,
							text: label,
							tokens: children,
						} as Tok);
						for (const node of nodes) {
							if (isBracket(node) && !node.image) {
								node.active = false;
							}
						}
					}
					index = target.end;
					continue;
				}
				nodes.splice(opener, 1);
			}
		} else if (char === "*" || char === "_" || char === "~") {
			let runEnd = index;
			while (source[runEnd] === char) {
				runEnd += 1;
			}
			const length = runEnd - index;
			if (char !== "~" || length === 2) {
				const before = source[index - 1];
				const after = source[runEnd];
				const left =
					!isSpace(after) && (!isPunctuation(after) || isSpace(before) || isPunctuation(before));
				const right =
					!isSpace(before) && (!isPunctuation(before) || isSpace(after) || isPunctuation(after));
				const canOpen = char === "_" ? left && (!right || isPunctuation(before)) : left;
				const canClose = char === "_" ? right && (!left || isPunctuation(after)) : right;
				if (canOpen || canClose) {
					push({ char, count: length, length, canOpen, canClose });
				} else {
					text += source.slice(index, runEnd);
				}
			} else {
				text += source.slice(index, runEnd);
			}
			index = runEnd;
			continue;
		} else if (char === "\n") {
			const spaces = text.length - text.trimEnd().length;
			text = text.trimEnd();
			push(spaces >= 2 ? ({ type: "br", raw: "  \n" } as Tok) : textToken("\n"));
			index = index + 1;
			while (source[index] === " " || source[index] === "\t") {
				index += 1;
			}
			continue;
		} else if (char === "@") {
			const local = /(?:mailto:|xmpp:)?[\w.+-]+$/.exec(text);
			const domain = /^@[a-zA-Z\d_-]+(?:\.[a-zA-Z\d_-]+)+/.exec(source.slice(index));
			if (local != null && domain != null && !/[-_]$/.test(domain[0])) {
				text = text.slice(0, -local[0].length);
				const address = local[0] + domain[0];
				push({
					type: "link",
					raw: address,
					text: address,
					href: /^(?:mailto|xmpp):/.test(address) ? address : `mailto:${address}`,
					title: null,
					tokens: [textToken(address)],
				} as Tok);
				index += domain[0].length;
				continue;
			}
		} else if ((char === "h" || char === "w") && !/\w/.test(source[index - 1] ?? "")) {
			const url = /^(?:https?:\/\/[\w-]|www\.[\w-]+\.[\w-])(?:[^\s<]*[^\s<?!.,:*_~'"])?/.exec(
				source.slice(index),
			);
			if (url != null) {
				let value = url[0];
				while (value.endsWith(")") && countOf(value, "(") < countOf(value, ")")) {
					value = value.slice(0, -1);
				}
				push({
					type: "link",
					raw: value,
					text: value,
					href: value.startsWith("www.") ? `http://${value}` : value,
					title: null,
					tokens: [textToken(value)],
				} as Tok);
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

/** The source text of inline nodes, for a link's `text`. */
function plainRaw(nodes: readonly Node[]): string {
	return nodes
		.map((node) => {
			if (isDelimiter(node)) {
				return node.char.repeat(node.count);
			}
			return isBracket(node) ? "" : (node.raw ?? "");
		})
		.join("");
}

const EMPHASIS = ["", "em", "strong"] as const;

/** Pairs the delimiter runs of `nodes` into emphasis, by CommonMark's rules, and returns the tokens. */
function finish(nodes: Node[]): Tok[] {
	for (let closer = 0; closer < nodes.length; closer += 1) {
		const close = nodes[closer];
		if (!isDelimiter(close) || !close.canClose) {
			continue;
		}
		let opener = closer - 1;
		for (; opener >= 0; opener -= 1) {
			const open = nodes[opener];
			if (
				isDelimiter(open) &&
				open.char === close.char &&
				open.canOpen &&
				!(
					(open.canClose || close.canOpen) &&
					(open.length + close.length) % 3 === 0 &&
					(open.length % 3 !== 0 || close.length % 3 !== 0)
				)
			) {
				break;
			}
		}
		const open = nodes[opener];
		if (!isDelimiter(open)) {
			continue;
		}
		const use = close.char === "~" || (open.count >= 2 && close.count >= 2) ? 2 : 1;
		const children = toTokens(nodes.slice(opener + 1, closer));
		const marker = close.char.repeat(use);
		const inner = children.map((token) => token.raw).join("");
		const token = {
			type: close.char === "~" ? "del" : EMPHASIS[use],
			raw: marker + inner + marker,
			text: inner,
			tokens: children,
		} as Tok;
		open.count -= use;
		close.count -= use;
		const replacement: Node[] = [
			...(open.count > 0 ? [open] : []),
			token,
			...(close.count > 0 ? [close] : []),
		];
		nodes.splice(opener, closer - opener + 1, ...replacement);
		// Why back up: a closer with count left can close another opener before the new token.
		closer = opener + replacement.length - (close.count > 0 ? 2 : 1);
	}
	return toTokens(nodes);
}

/** Turns leftover delimiters and brackets into text, and merges adjacent text. */
function toTokens(nodes: readonly Node[]): Tok[] {
	const out: Tok[] = [];
	for (const node of nodes) {
		if (isBracket(node)) {
			continue;
		}
		const token = isDelimiter(node) ? textToken(node.char.repeat(node.count)) : node;
		const previous = out.at(-1);
		if (
			token.type === "text" &&
			token.tokens == null &&
			previous?.type === "text" &&
			previous.tokens == null
		) {
			out[out.length - 1] = textToken(previous.text + token.text);
		} else {
			out.push(token.keep === true ? textToken(token.text) : token);
		}
	}
	return out;
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
	};
	const tokens = lexBlocks(source.replace(/\r\n?/g, "\n"), context, { top: true });
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
