/**
 * Closes the unfinished syntax at the end of a streamed Markdown answer, so
 * the text renders now as it will once the rest arrives. It never shows a
 * marker, such as `**` or `[`, that the finished answer will not show.
 *
 * Only the end changes, so each finished block keeps its source text:
 * - closes open emphasis, strikethrough, and code spans: `**bo` → `**bo**`
 * - shows an incomplete link as its text: `[the gu` and `[guide](https://n` → `the gu`, `guide`
 * - drops an incomplete image, footnote reference, HTML tag, autolink, or entity: `![al`, `[^1`, `<spa`, `&am`
 * - drops a marker that has no content yet: `Some **`, a lone `-`, `#`, `1.`, `- [ ]`, or `[label]:` line
 * - drops a line of only `[^label]`, which can still become a footnote
 * - drops a setext underline that has no line break yet, which can still be a list item
 * - hides a table header until its delimiter row starts, and completes a partial delimiter row
 * - closes an open `$$` block when `math` is set
 *
 * An open code fence stays open: the lexer reads an unclosed fence to the end.
 *
 * One pass over the lines finds the last paragraph, and one pass over its
 * characters finds the open markers. The cost grows with the length of the
 * last paragraph, not of the answer.
 *
 * @example
 * closeMarkdown("Read **the [guide](https://ngr", { math: false }); // "Read **the guide**"
 */
function closeMarkdown(text: string, { math }: { math: boolean }): string {
	const blocks = scanBlocks(text, { math });
	const lastLine = lineContent(text.slice(blocks.lastLineStart)).trim();
	if (blocks.inFence) {
		// Why: a partial closer such as ``` `` ``` would show as a code line until its last character arrives.
		return /^(?:`+|~+)$/.test(lastLine) ? text.slice(0, blocks.lastLineStart) : text;
	}
	if (blocks.inIndentedCode) {
		return text;
	}
	if (blocks.inMath) {
		// Why the cut: a partial `$` closer would show as math. Why the prefix: a closer in a quote keeps its `>`.
		let body = lastLine === "$" ? text.slice(0, blocks.lastLineStart) : text;
		// A `$` at the end of a line with content is half of the closer too, as in `$$E = mc^2$`.
		if (body === text && text.endsWith("$")) {
			body = text.slice(0, -1);
		}
		const line =
			body === text && !text.endsWith("\n") ? blocks.lastLineStart : blocks.previousLineStart;
		const prefix = QUOTE_PREFIX.exec(text.slice(Math.max(line, 0)))?.[0] ?? "";
		return `${body}${body.endsWith("\n") ? "" : "\n"}${prefix}$$`;
	}
	const lines = closeLastLines(text, blocks);
	return (
		lines.text.slice(0, lines.regionStart) +
		closeInline(lines.text.slice(lines.regionStart), { math })
	);
}

type BlockScan = {
	/** Whether the text ends inside a code fence. */
	inFence: boolean;
	/** Whether the text ends inside indented code. */
	inIndentedCode: boolean;
	/** Whether the text ends inside a `$$` block. */
	inMath: boolean;
	/** Where the last run of lines that can share inline markup starts. */
	regionStart: number;
	/** Where the last line starts. */
	lastLineStart: number;
	/** Where the line before the last starts, or -1. */
	previousLineStart: number;
};

const LIST_MARKER = /^(?:[-*+]|\d{1,9}[.)])(?: |$)/;
const HEADING = /^#{1,6}(?: |$)/;
const THEMATIC_BREAK = /^([-*_])(?: *\1){2,} *$/;
const FENCE = /^(`{3,}|~{3,})(.*)$/;
/** An unfinished character reference that runs to the end. Why sticky: a test at each `&` reads only its run. */
const ENTITY_TAIL = /&#?[a-z0-9]*$/iy;
/** The list markers at the start of a line's content, such as `- ` or `1. - `. */
const LIST_MARKERS = /^(?:(?:[-*+]|\d{1,9}[.)])[ \t]+(?: {0,3}> ?)*)+/;

/** The columns of a line's indent, with a tab to the next multiple of 4. */
function indentOf(line: string): number {
	let columns = 0;
	for (let index = 0; ; index += 1) {
		const code = line.charCodeAt(index);
		if (code === 32) {
			columns += 1;
		} else if (code === 9) {
			columns += 4 - (columns % 4);
		} else {
			return columns;
		}
	}
}

/** The columns of a line's indent after its blockquote markers, each with its one optional space. */
function indentAfterQuotes(line: string): number {
	let index = 0;
	for (;;) {
		let spaces = 0;
		while (spaces < 3 && line.charCodeAt(index + spaces) === 32) {
			spaces += 1;
		}
		if (line.charCodeAt(index + spaces) !== 62) {
			return indentOf(line.slice(index));
		}
		index += spaces + 1;
		if (line.charCodeAt(index) === 32) {
			index += 1;
		}
	}
}

/**
 * The inline HTML tags that an answer may use, from GitHub's sanitize schema.
 * Each other tag shows as text, so a placeholder such as `<your-domain>` stays
 * in a command.
 */
const INLINE_TAGS = new Set([
	"b",
	"del",
	"em",
	"i",
	"ins",
	"kbd",
	"q",
	"s",
	"samp",
	"strike",
	"strong",
	"sub",
	"sup",
	"tt",
	"var",
]);
/** An opening or closing tag, with its slash and name. */
const TAG = /^<(\/?)([a-z][a-z0-9]*)(?:\s[^>]*)?>$/i;
const MARKER = /^(?:[-*+]|\d{1,9}[.)])/;

/**
 * The content column of the list item whose marker line starts indented
 * code, or -1. Why: 5 or more columns of space after a marker start code at
 * 1 column past the marker. `column` is where `content` starts.
 */
function itemCodeColumn(content: string, column: number): number {
	let index = 0;
	let at = column;
	for (;;) {
		const marker = MARKER.exec(content.slice(index))?.[0];
		if (marker == null) {
			return -1;
		}
		index += marker.length;
		at += marker.length;
		const markerEnd = at;
		while (content[index] === " " || content[index] === "\t") {
			at += content[index] === "\t" ? 4 - (at % 4) : 1;
			index += 1;
		}
		if (index === content.length || at === markerEnd) {
			return -1;
		}
		if (at - markerEnd >= 5) {
			return markerEnd + 1;
		}
	}
}
/** A list marker and the spaces after it. */
const LIST_MARKER_WIDTH = /^(?:[-*+]|\d{1,9}[.)])[ \t]*/;

/** The count of blockquote markers at the start of a line. */
function quoteDepth(line: string): number {
	return (QUOTE_PREFIX.exec(line)?.[0].split(">").length ?? 1) - 1;
}

/** The blockquote markers at the start of a line, each with its indent and one optional space. */
const QUOTE_PREFIX = /^(?: {0,3}> ?)*/;

/** The content of a line after its indent and blockquote markers. */
function lineContent(line: string): string {
	let index = 0;
	for (;;) {
		while (line.charCodeAt(index) === 32 || line.charCodeAt(index) === 9) {
			index += 1;
		}
		if (line.charCodeAt(index) !== 62) {
			return line.slice(index);
		}
		index += 1;
	}
}

/** Finds the open fence or `$$` block at the end, and where the last paragraph starts. */
function scanBlocks(text: string, { math }: { math: boolean }): BlockScan {
	let fence: { char: string; length: number; column: number; quotes: number } | undefined;
	let inMath = false;
	let inIndentedCode = false;
	// Why: indented code cannot start inside a paragraph, and in a list it starts 4 columns past the item's content.
	let inParagraph = false;
	let inList = false;
	let listColumn = 0;
	let codeColumn = 0;
	let regionStart = 0;
	let afterSingleLineBlock = false;
	let lineStart = 0;
	let previousLineStart = -1;
	let lastLineStart = -1;
	for (;;) {
		const newline = text.indexOf("\n", lineStart);
		const lineEnd = newline === -1 ? text.length : newline;
		const content = lineContent(text.slice(lineStart, lineEnd));
		const nextStart = lineEnd + 1;
		previousLineStart = lastLineStart;
		lastLineStart = lineStart;

		// Why: a line in fewer quotes than an open fence ends the quote, and the fence with it.
		if (fence != null && quoteDepth(text.slice(lineStart, lineEnd)) < fence.quotes) {
			fence = undefined;
			regionStart = lineStart;
		}
		if (fence != null) {
			const line = text.slice(lineStart, lineEnd);
			const close = FENCE.exec(content);
			// Why the column and the quotes: a fence-like line indented 4 or more past the fence's container, or
			// in another quote, is code.
			if (
				quoteDepth(line) === fence.quotes &&
				indentAfterQuotes(line) < fence.column + 4 &&
				close?.[1]?.[0] === fence.char &&
				close[1].length >= fence.length &&
				close[2]?.trim() === ""
			) {
				fence = undefined;
				regionStart = nextStart;
			}
		} else if (inMath) {
			if (content.trimEnd().endsWith("$$")) {
				inMath = false;
				regionStart = nextStart;
			}
		} else if (
			inIndentedCode &&
			(content.trim() === "" || indentAfterQuotes(text.slice(lineStart, lineEnd)) >= codeColumn)
		) {
			// The indented code goes on.
		} else {
			inIndentedCode = false;
			const indent = indentAfterQuotes(text.slice(lineStart, lineEnd));
			// Why without the list markers: a fence can start on the line of its item's marker.
			const afterMarkers = content.replace(LIST_MARKERS, "");
			const open = FENCE.exec(afterMarkers);
			const marker = open?.[1];
			const itemColumn = itemCodeColumn(content, indent);
			if (content.trim() !== "" && indent >= (inList ? listColumn : 0) + 4 && !inParagraph) {
				inIndentedCode = true;
				codeColumn = (inList ? listColumn : 0) + 4;
				regionStart = nextStart;
			} else if (itemColumn !== -1 && !THEMATIC_BREAK.test(content)) {
				// Indented code that starts on its item's marker line.
				inList = true;
				listColumn = itemColumn;
				inIndentedCode = true;
				codeColumn = listColumn + 4;
				regionStart = nextStart;
			} else if (marker != null && !(marker.startsWith("`") && open?.[2]?.includes("`"))) {
				// The column of the fence's container: the content of its item, or the left edge.
				let column = inList && indent >= listColumn ? listColumn : 0;
				if (afterMarkers !== content) {
					column = indent + content.length - afterMarkers.length;
				}
				fence = {
					char: marker.slice(0, 1),
					length: marker.length,
					column,
					// Why the markers too: a fence in `- > ` sits in a quote that the list item holds.
					quotes:
						quoteDepth(text.slice(lineStart, lineEnd)) +
						content.slice(0, content.length - afterMarkers.length).split(">").length -
						1,
				};
			} else if (math && content.startsWith("$$") && !content.slice(2).includes("$$")) {
				inMath = true;
			} else if (content.trim() === "") {
				// Why only a whole line: a line break at the very end does not end the paragraph yet.
				if (newline !== -1) {
					regionStart = nextStart;
					afterSingleLineBlock = false;
				}
			} else if (HEADING.test(content) || THEMATIC_BREAK.test(content)) {
				regionStart = lineStart;
				afterSingleLineBlock = true;
			} else if (afterSingleLineBlock || LIST_MARKER.test(content) || content.startsWith("|")) {
				// Why a new region: a list item and a table row each hold their own inline markup.
				regionStart = lineStart;
				afterSingleLineBlock = false;
			}
			if (!inIndentedCode) {
				inParagraph =
					content.trim() !== "" &&
					fence == null &&
					!inMath &&
					!HEADING.test(content) &&
					!THEMATIC_BREAK.test(content);
				if (LIST_MARKER.test(content)) {
					inList = true;
					listColumn = indent + (LIST_MARKER_WIDTH.exec(content)?.[0].length ?? 0);
				} else if (indent === 0 && content.trim() !== "") {
					inList = false;
				}
			}
		}
		if (newline === -1) {
			break;
		}
		lineStart = nextStart;
	}
	return {
		inFence: fence != null,
		inIndentedCode,
		inMath,
		regionStart: Math.min(regionStart, text.length),
		lastLineStart,
		previousLineStart,
	};
}

const DELIMITER_ROW = /^\|?[\s:|-]*$/;

/** The cells of a table row, without its outer pipes. */
function cellCount(row: string): number {
	let count = 1;
	const trimmed = row
		.trim()
		.replace(/^\|/, "")
		.replace(/(?<!\\)\|$/, "");
	for (let index = 0; index < trimmed.length; index += 1) {
		if (trimmed[index] === "\\") {
			index += 1;
		} else if (trimmed[index] === "|") {
			count += 1;
		}
	}
	return count;
}

/** Whether the row at `start` can head a table: a row that starts with a pipe and is not under another row. */
function isTableHeader(text: string, start: number, row: string): boolean {
	if (start === -1 || !row.startsWith("|")) {
		return false;
	}
	const lineBefore =
		start === 0 ? "" : text.slice(text.lastIndexOf("\n", start - 2) + 1, start - 1);
	return !lineContent(lineBefore).startsWith("|");
}

/** A delimiter row with the cells typed so far, each made valid, and `count` cells. */
function delimiterRow(typed: string, count: number): string {
	const cells = typed
		.trim()
		.replace(/^\|/, "")
		.split("|")
		.map((cell) => cell.trim())
		.filter((cell, index, all) => cell !== "" || index < all.length - 1)
		.slice(0, count)
		// Why `-` alone is enough: a cell with no dash yet, such as `:`, is not a delimiter cell.
		.map((cell) => (cell.includes("-") ? cell : `${cell.startsWith(":") ? ":" : ""}-`));
	while (cells.length < count) {
		cells.push("---");
	}
	return `| ${cells.join(" | ")} |`;
}

/**
 * Drops or completes the last line when it is a block marker with no content
 * yet, so a half-typed line never renders as a different block.
 */
function closeLastLines(
	text: string,
	{ regionStart, lastLineStart, previousLineStart }: BlockScan,
): { text: string; regionStart: number } {
	const lastLine = text.slice(lastLineStart);
	const content = lineContent(lastLine);
	const previous =
		previousLineStart === -1 ? "" : lineContent(text.slice(previousLineStart, lastLineStart - 1));

	// Why not only a row with a pipe: GFM allows a delimiter row without its leading pipe, such as `--- | ---`.
	if (
		(content.startsWith("|") ||
			(previous.startsWith("|") && (content.includes("-") || content.startsWith(":")))) &&
		DELIMITER_ROW.test(content)
	) {
		if (isTableHeader(text, previousLineStart, previous)) {
			const row = delimiterRow(content, cellCount(previous));
			// Why the prefix: a row in a quote keeps its `>` markers.
			return {
				text:
					text.slice(0, lastLineStart) + lastLine.slice(0, lastLine.length - content.length) + row,
				regionStart: Math.min(regionStart, lastLineStart),
			};
		}
		if (/^\|\s*$/.test(content)) {
			// Why dropped: a row with no cell yet renders as a stray pipe.
			return {
				text: text.slice(0, lastLineStart),
				regionStart: Math.min(regionStart, lastLineStart),
			};
		}
	} else if (content.startsWith("|") && isTableHeader(text, lastLineStart, content)) {
		// Why hidden: a header row renders as a paragraph of pipes until its delimiter row arrives.
		return { text: text.slice(0, lastLineStart), regionStart: lastLineStart };
	} else if (
		content === "" &&
		previous.startsWith("|") &&
		isTableHeader(text, previousLineStart, previous)
	) {
		return { text: text.slice(0, previousLineStart), regionStart: previousLineStart };
	}
	const isMarkerOnly =
		/^(?:(?:[-*+]|\d{1,9}[.)])(?: +\[(?:[ xX]\]?)?)?|#{1,6}|\d{1,9}) *$/.test(content) ||
		/^\[(?:[^\]]+\]: *|\^[^\s\]]*\]?)$/.test(content);
	const isUnderline = /^(?:-+|=+) *$/.test(content) && previous.trim() !== "";
	if (isMarkerOnly || isUnderline) {
		const start = Math.min(regionStart, lastLineStart);
		return { text: text.slice(0, lastLineStart), regionStart: start };
	}
	return { text, regionStart };
}

type Opener = { char: number; count: number; index: number };
/** A whole footnote reference, as the lexer reads it. */
const FOOTNOTE_REF = /^\[\^[^\s[\]]{1,999}\]/;
type Bracket = { image: boolean; index: number };

const BACKTICK = 96;
const TILDE = 126;
const STAR = 42;
const UNDERSCORE = 95;
const PUNCTUATION = /[\p{P}\p{S}]/u;

function isSpace(char: string | undefined): boolean {
	return char === undefined || char === " " || char === "\n" || char === "\t" || char === "\r";
}

function isPunctuation(char: string | undefined): boolean {
	return char !== undefined && PUNCTUATION.test(char);
}

/** Whether the `[` at `index` opens a task marker, such as the `[ ]` of `- [ ] Task`. */
function isTaskMarker(text: string, index: number): boolean {
	const lineStart = text.lastIndexOf("\n", index - 1) + 1;
	return (
		LIST_MARKER.test(lineContent(text.slice(lineStart, index))) &&
		/^\[[ xX]\]$/.test(text.slice(index, index + 3))
	);
}

/** The index after the `)` that closes a link destination at `start`, or -1 when it is open. */
function destinationEnd(text: string, start: number): number {
	let depth = 0;
	for (let index = start; index < text.length; index += 1) {
		const char = text[index];
		if (char === "\\") {
			index += 1;
		} else if (char === "\n" && text[index + 1] === "\n") {
			return -1;
		} else if (char === "(") {
			depth += 1;
		} else if (char === ")") {
			if (depth === 0) {
				return index + 1;
			}
			depth -= 1;
		}
	}
	return -1;
}

/** The index of the next run of exactly `length` backticks at or after `start`, or -1. */
function closingBackticks(text: string, start: number, length: number): number {
	let index = text.indexOf("`", start);
	while (index !== -1) {
		let end = index;
		while (text.charCodeAt(end) === BACKTICK) {
			end += 1;
		}
		if (end - index === length) {
			return index;
		}
		index = text.indexOf("`", end);
	}
	return -1;
}

/**
 * Closes the open inline markers of one paragraph. Follows the CommonMark
 * delimiter rules for `*`, `_`, and `~~`, and pairs each closer with the
 * nearest opener of its character.
 */
function closeInline(region: string, { math }: { math: boolean }): string {
	// The open runs of each marker. Why apart: a closer finds the nearest run of its own marker in one step.
	const openers: Record<number, Opener[]> = { [STAR]: [], [UNDERSCORE]: [], [TILDE]: [] };
	const brackets: Bracket[] = [];
	// The inline tags still open. Why: an open `<kbd>` shows as text until its closer arrives.
	const tags: { name: string; index: number }[] = [];
	let end = region.length;
	let suffix = "";
	let index = 0;
	// The next `>` and line break, or -1 for none. Why cached: a search for each `<` is quadratic.
	let nextClose = -2;
	let nextNewline = -2;

	scan: while (index < region.length) {
		const code = region.charCodeAt(index);
		const char = region[index];
		if (char === "\\") {
			// Why `\(` with math: its text is math, so it holds no emphasis, and an open one closes at the end.
			// A `$` is not closed: in prose it is a price far more often than math.
			if (math && region[index + 1] === "(") {
				const close = region.indexOf("\\)", index + 2);
				const newline = region.indexOf("\n", index + 2);
				if (close !== -1 && (newline === -1 || close < newline)) {
					index = close + 2;
					continue;
				}
				if (close === -1 && newline === -1) {
					if (region.slice(index + 2).trim() === "") {
						end = index;
					} else {
						suffix = "\\)";
					}
					break;
				}
			}
			index += 2;
			continue;
		}
		if (code === BACKTICK) {
			let runEnd = index;
			while (region.charCodeAt(runEnd) === BACKTICK) {
				runEnd += 1;
			}
			const length = runEnd - index;
			const close = closingBackticks(region, runEnd, length);
			if (close !== -1) {
				index = close + length;
				continue;
			}
			if (region.slice(runEnd).trim() === "") {
				end = index;
			} else {
				// Why the space: a closer right after a backtick would join it into a longer run.
				suffix = (region.endsWith("`") ? " " : "") + "`".repeat(length);
			}
			break;
		}
		if (char === "<") {
			if (nextClose !== -1 && nextClose < index) {
				nextClose = region.indexOf(">", index);
			}
			if (nextNewline !== -1 && nextNewline < index) {
				nextNewline = region.indexOf("\n", index);
			}
			if (nextClose !== -1 && (nextNewline === -1 || nextClose < nextNewline)) {
				const tag = TAG.exec(region.slice(index, nextClose + 1));
				const name = tag?.[2]?.toLowerCase();
				if (name != null && INLINE_TAGS.has(name)) {
					if (tag?.[1] === "") {
						tags.push({ name, index });
					} else if (tags.at(-1)?.name === name) {
						tags.pop();
					}
				}
				index = nextClose + 1;
				continue;
			}
			if (/^<(?:[a-z/!]|$)/i.test(region.slice(index, index + 2)) && nextNewline === -1) {
				end = index;
				break;
			}
			index += 1;
			continue;
		}
		if (char === "&") {
			ENTITY_TAIL.lastIndex = index;
			if (ENTITY_TAIL.test(region)) {
				end = index;
				break;
			}
			index += 1;
			continue;
		}
		// Why whole: a `[^label]` is a footnote reference, so its label holds no markup, and a `(` after it is text.
		const note =
			char === "[" && region[index + 1] === "^"
				? FOOTNOTE_REF.exec(region.slice(index, index + 1003))
				: null;
		if (note != null) {
			index += note[0].length;
			continue;
		}
		// Why not before `[^`: `![^1]` is a `!` and a footnote reference.
		if (char === "[" || (char === "!" && region[index + 1] === "[" && region[index + 2] !== "^")) {
			const image = char === "!";
			brackets.push({ image, index });
			index += image ? 2 : 1;
			continue;
		}
		if (char === "]") {
			const bracket = brackets.pop();
			index += 1;
			if (bracket == null) {
				continue;
			}
			const next = region[index];
			let close = index;
			if (next === "(") {
				close = destinationEnd(region, index + 1);
			} else if (next === "[") {
				const labelEnd = region.indexOf("]", index + 1);
				close = labelEnd === -1 ? -1 : labelEnd + 1;
			}
			if (close === index && index === region.length && !isTaskMarker(region, bracket.index)) {
				// A label at the very end: its `(` can still arrive, so show the text only.
				close = -1;
			}
			if (close !== -1) {
				index = close;
				continue;
			}
			// An incomplete destination or label: show the text only, or nothing for an image.
			const label = region.slice(bracket.index + (bracket.image ? 2 : 1), index - 1);
			end = bracket.index;
			suffix = bracket.image ? "" : label;
			brackets.length = 0;
			break;
		}
		if (code === STAR || code === UNDERSCORE || code === TILDE) {
			let runEnd = index;
			while (region.charCodeAt(runEnd) === code) {
				runEnd += 1;
			}
			let count = runEnd - index;
			if (code === TILDE) {
				if (count === 1 && runEnd === region.length) {
					// A lone trailing `~` can be half of a `~~` closer.
					end = index;
					break;
				}
				if (count !== 2) {
					index = runEnd;
					continue;
				}
				count = 1;
			}
			const before = index === 0 ? undefined : region[index - 1];
			const after = region[runEnd];
			const left =
				!isSpace(after) && (!isPunctuation(after) || isSpace(before) || isPunctuation(before));
			const right =
				!isSpace(before) && (!isPunctuation(before) || isSpace(after) || isPunctuation(after));
			// Why no intraword `*` opener: `a*b` in prose is a product far more often than emphasis.
			const intraword = left && right && !isPunctuation(before) && !isPunctuation(after);
			const canOpen =
				code === UNDERSCORE ? left && (!right || isPunctuation(before)) : left && !intraword;
			const canClose = code === UNDERSCORE ? right && (!left || isPunctuation(after)) : right;

			// Why a loop: one run such as `***` can close `*` and then `**`.
			for (
				let opener = canClose ? openers[code]?.at(-1) : undefined;
				opener != null && count > 0;
				opener = openers[code]?.at(-1)
			) {
				const used = Math.min(opener.count, count);
				opener.count -= used;
				count -= used;
				// Why the cut: an opener between a pair can no longer close, per CommonMark.
				for (const runs of Object.values(openers)) {
					while ((runs.at(-1)?.index ?? -1) > opener.index) {
						runs.pop();
					}
				}
				if (opener.count === 0) {
					openers[code]?.pop();
				}
			}
			if (
				runEnd === region.length &&
				count > 0 &&
				(isSpace(before) || isPunctuation(before) || canOpen)
			) {
				// A trailing run with nothing after it yet: it can only open, so it shows nothing until its content arrives.
				end = index;
				break scan;
			}
			if (count > 0 && canOpen) {
				openers[code]?.push({ char: code, count, index });
			}
			index = runEnd;
			continue;
		}
		index += 1;
	}

	// An unclosed `[` shows its text, and an unclosed `![` or `[^label` shows nothing. Why: it is a link or a
	// footnote reference until a `]` or a space proves it is not.
	const unclosed = brackets.filter((bracket) => bracket.index < end);
	if (unclosed.length > 0) {
		let stripped = "";
		let from = 0;
		for (const bracket of unclosed) {
			stripped += region.slice(from, bracket.index);
			if (
				bracket.image ||
				(region[bracket.index + 1] === "^" && !/\s/.test(region.slice(bracket.index + 2)))
			) {
				return closeInline(stripped, { math });
			}
			from = bracket.index + 1;
		}
		return closeInline(stripped + region.slice(from), { math });
	}

	const body = region.slice(0, end);
	const trimmed = suffix === "" ? body.trimEnd() : body;
	let closers = "";
	const open = [
		...(openers[STAR] ?? []),
		...(openers[UNDERSCORE] ?? []),
		...(openers[TILDE] ?? []),
	];
	// Why no closers past 32 open delimiters: each closer nests one more element. No answer holds that many.
	const depth = open.reduce((sum, opener) => sum + opener.count, 0);
	const pending = [...(depth > 32 ? [] : open), ...tags].toSorted((a, b) => b.index - a.index);
	for (const item of pending) {
		if (item.index >= trimmed.length) {
			continue;
		}
		closers +=
			"name" in item
				? `</${item.name}>`
				: String.fromCharCode(item.char).repeat(item.char === TILDE ? 2 : item.count);
	}
	return trimmed + suffix + closers + (suffix === "" ? body.slice(trimmed.length) : "");
}

export {
	//,
	closeMarkdown,
	INLINE_TAGS,
};
