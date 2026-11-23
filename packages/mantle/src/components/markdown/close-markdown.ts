/**
 * Closes the unfinished syntax at the end of a streamed Markdown answer, so
 * the text renders now as it will once the rest arrives. It never shows a
 * marker, such as `**` or `[`, that the finished answer will not show.
 *
 * Only the end changes, so each finished block keeps its source text:
 * - closes open emphasis, strikethrough, and code spans: `**bo` → `**bo**`
 * - shows an incomplete link as its text: `[the gu` and `[guide](https://n` → `the gu`, `guide`
 * - drops an incomplete image, HTML tag, autolink, or entity: `![al`, `<spa`, `&am`
 * - drops a marker that has no content yet: `Some **`, a lone `-`, `#`, `1.`, `- [ ]`, or `[label]:` line
 * - drops a setext underline that has no line break yet, which can still be a list item
 * - hides a table header until its delimiter row starts, and completes a partial delimiter row
 * - closes an open `$$` block when `math` is set
 *
 * An open code fence stays open: marked renders an unclosed fence to the end.
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
	if (blocks.inFence) {
		return text;
	}
	if (blocks.inMath) {
		return `${text}${text.endsWith("\n") ? "" : "\n"}$$`;
	}
	const lines = closeLastLines(text, blocks);
	return lines.text.slice(0, lines.regionStart) + closeInline(lines.text.slice(lines.regionStart));
}

type BlockScan = {
	/** Whether the text ends inside a code fence. */
	inFence: boolean;
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
	let fence: { char: string; length: number } | undefined;
	let inMath = false;
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

		if (fence != null) {
			const close = FENCE.exec(content);
			if (
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
		} else {
			const open = FENCE.exec(content);
			const marker = open?.[1];
			if (marker != null && !(marker.startsWith("`") && open?.[2]?.includes("`"))) {
				fence = { char: marker.slice(0, 1), length: marker.length };
			} else if (math && content.startsWith("$$") && !content.slice(2).includes("$$")) {
				inMath = true;
			} else if (content.trim() === "") {
				regionStart = nextStart;
				afterSingleLineBlock = false;
			} else if (HEADING.test(content) || THEMATIC_BREAK.test(content)) {
				regionStart = lineStart;
				afterSingleLineBlock = true;
			} else if (afterSingleLineBlock || LIST_MARKER.test(content) || content.startsWith("|")) {
				// Why a new region: a list item and a table row each hold their own inline markup.
				regionStart = lineStart;
				afterSingleLineBlock = false;
			}
		}
		if (newline === -1) {
			break;
		}
		lineStart = nextStart;
	}
	return {
		inFence: fence != null,
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

	if (content.startsWith("|") && DELIMITER_ROW.test(content)) {
		if (isTableHeader(text, previousLineStart, previous)) {
			const row = delimiterRow(content, cellCount(previous));
			return {
				text: text.slice(0, lastLineStart) + row,
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
		/^(?:(?:[-*+]|\d{1,9}[.)])(?: +\[[ xX]\])?|#{1,6}) *$/.test(content) ||
		/^\[[^\]]+\]: *$/.test(content);
	const isUnderline = /^(?:-+|=+) *$/.test(content) && previous.trim() !== "";
	if (isMarkerOnly || isUnderline) {
		const start = Math.min(regionStart, lastLineStart);
		return { text: text.slice(0, lastLineStart), regionStart: start };
	}
	return { text, regionStart };
}

type Opener = { char: number; count: number; index: number };
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
function closeInline(region: string): string {
	const openers: Opener[] = [];
	const brackets: Bracket[] = [];
	let end = region.length;
	let suffix = "";
	let index = 0;

	scan: while (index < region.length) {
		const code = region.charCodeAt(index);
		const char = region[index];
		if (char === "\\") {
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
			const close = region.indexOf(">", index);
			const newline = region.indexOf("\n", index);
			if (close !== -1 && (newline === -1 || close < newline)) {
				index = close + 1;
				continue;
			}
			if (/^<(?:[a-z/!]|$)/i.test(region.slice(index, index + 2)) && newline === -1) {
				end = index;
				break;
			}
			index += 1;
			continue;
		}
		if (char === "&") {
			if (/^&#?[a-z0-9]*$/i.test(region.slice(index))) {
				end = index;
				break;
			}
			index += 1;
			continue;
		}
		if (char === "[" || (char === "!" && region[index + 1] === "[")) {
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

			if (canClose) {
				for (let open = openers.length - 1; open >= 0 && count > 0; open -= 1) {
					const opener = openers[open];
					if (opener?.char !== code) {
						continue;
					}
					const used = Math.min(opener.count, count);
					opener.count -= used;
					count -= used;
					// Why the cut: an opener between a pair can no longer close, per CommonMark.
					openers.length = opener.count === 0 ? open : open + 1;
					break;
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
				openers.push({ char: code, count, index });
			}
			index = runEnd;
			continue;
		}
		index += 1;
	}

	// An unclosed `[` shows its text, and an unclosed `![` shows nothing. Why: it is a link until a `]` proves it is not.
	const unclosed = brackets.filter((bracket) => bracket.index < end);
	if (unclosed.length > 0) {
		let stripped = "";
		let from = 0;
		for (const bracket of unclosed) {
			stripped += region.slice(from, bracket.index);
			if (bracket.image) {
				return closeInline(stripped);
			}
			from = bracket.index + 1;
		}
		return closeInline(stripped + region.slice(from));
	}

	const body = region.slice(0, end);
	const trimmed = suffix === "" ? body.trimEnd() : body;
	let closers = "";
	for (let open = openers.length - 1; open >= 0; open -= 1) {
		const opener = openers[open];
		if (opener == null || opener.index >= trimmed.length) {
			continue;
		}
		closers += String.fromCharCode(opener.char).repeat(opener.char === TILDE ? 2 : opener.count);
	}
	return trimmed + suffix + closers + (suffix === "" ? body.slice(trimmed.length) : "");
}

export {
	//,
	closeMarkdown,
};
