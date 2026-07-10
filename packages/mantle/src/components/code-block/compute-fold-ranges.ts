import { finalizeFoldRanges, type FoldableRange } from "./fold-range-utils.js";
import type { SupportedLanguage } from "./supported-languages.js";

/**
 * A single TextMate scope name attached to part of a {@link FoldToken}.
 *
 * Mirrors the shape produced by Shiki's `includeExplanation: 'scopeName'`
 * option without taking a runtime dependency on Shiki, so this module can be
 * unit-tested with hand-written fixtures.
 */
type FoldScope = {
	scopeName: string;
};

/**
 * One sub-explanation within a {@link FoldToken}. A single Shiki token may
 * cover content with several scope sets — for example an interpolation
 * boundary inside a template literal — so its `explanation` is an array.
 */
type FoldExplanation = {
	content: string;
	scopes: FoldScope[];
};

/**
 * Minimal token shape consumed by {@link computeFoldRanges}. Compatible with
 * `ThemedToken` from `@shikijs/types` when `includeExplanation: 'scopeName'`
 * is enabled.
 */
type FoldToken = {
	content: string;
	explanation?: FoldExplanation[];
};

/**
 * One line of {@link FoldToken}s, as returned by Shiki's
 * `codeToTokens`/`tokens` transformer hook.
 */
type FoldLine = FoldToken[];

/**
 * Folding strategy applied to a language. Picked by {@link foldStrategyFor}
 * based on how the language naturally delimits blocks:
 *
 * - `bracket` — `{}`/`[]` pairs (C-family, JSON, CSS, Rust, Go, …).
 * - `indentation` — significant whitespace (Python, YAML).
 * - `tag` — element open/close tags (HTML, XML).
 * - `none` — plain text and other languages without a useful folding model.
 */
type FoldStrategy = "bracket" | "indentation" | "tag" | "none";

/** Returns the {@link FoldStrategy} used for the given supported language. */
function foldStrategyFor(language: SupportedLanguage): FoldStrategy {
	switch (language) {
		case "python":
		case "py":
		case "yaml":
		case "yml":
			return "indentation";
		case "html":
		case "xml":
			return "tag";
		case "bash":
		case "sh":
		case "shell":
		case "plain":
		case "plaintext":
		case "text":
		case "txt":
			// Shell languages use keyword pairs (`if … fi`, `do … done`, etc.)
			// rather than brackets; folding `{}` would catch only brace
			// expansions, which aren't useful blocks. Until we model the
			// keyword pairs, opt out so we don't pay the per-token scope cost.
			return "none";
		default:
			return "bracket";
	}
}

/** Input for {@link computeFoldRanges}. */
type ComputeFoldRangesInput = {
	/** Resolved supported language; controls which strategy runs. */
	language: SupportedLanguage;
	/**
	 * Tokens produced by Shiki for the same code that will be rendered.
	 * Must include scope explanations (i.e. tokenized with
	 * `includeExplanation: 'scopeName'` or `true`) so string and comment
	 * regions can be ignored.
	 */
	tokens: FoldLine[];
};

/**
 * Computes foldable ranges for a tokenized code block. Dispatches to the
 * right strategy for the given language, so callers don't need to know how
 * a particular grammar models block boundaries.
 *
 * The bracket strategy uses TextMate scopes to distinguish real punctuation
 * from `{`/`[` characters that appear inside strings, comments, or regular
 * expressions — this is what lets one parser cover JS, TS, Go, Rust, JSON,
 * CSS, and friends without per-language string/comment logic.
 *
 * Returns ranges sorted by `startLine` ascending; at most one range per
 * opener line survives so the gutter renders a single toggle even when
 * multiple constructs open on the same line (`{"a":[`).
 */
function computeFoldRanges({ language, tokens }: ComputeFoldRangesInput): FoldableRange[] {
	const strategy = foldStrategyFor(language);
	switch (strategy) {
		case "bracket":
			return computeBracketFoldRanges(tokens);
		case "indentation":
			return computeIndentationFoldRanges(tokens);
		case "tag":
			return computeTagFoldRanges(tokens);
		case "none":
			return [];
	}
}

/**
 * Returns true when a token's innermost scope means it represents inert
 * content — string body, comment body, regex body, or character escape —
 * and therefore any `{`/`[`/`<` characters inside it should be ignored.
 *
 * Checking the innermost scope (last entry) keeps template-literal
 * interpolations foldable: `${ ... }` punctuation lives under
 * `punctuation.definition.template-expression.*`, not `string.*`, so the
 * embedded expression isn't filtered out even though `string.template`
 * appears earlier in the scope chain.
 */
function isInertScope(scopes: FoldScope[]): boolean {
	if (scopes.length === 0) {
		return false;
	}
	const innermost = scopes[scopes.length - 1]?.scopeName ?? "";
	return (
		innermost === "string" ||
		innermost === "comment" ||
		innermost.startsWith("string.") ||
		innermost.startsWith("comment.") ||
		innermost.startsWith("constant.character.escape")
	);
}

/**
 * Yields explanation pieces of a token, or one fallback piece with no
 * scopes when the token wasn't tokenized with `includeExplanation`.
 */
function explanationsOf(token: FoldToken): readonly FoldExplanation[] {
	if (token.explanation != null && token.explanation.length > 0) {
		return token.explanation;
	}
	return [{ content: token.content, scopes: [] }];
}

/**
 * Reconstructs non-inert line text without losing Shiki-owned whitespace.
 * Explanation pieces can omit leading spaces, so use the full token content
 * whenever every explanation piece is visible.
 */
function visibleTextForLine(line: FoldLine): string {
	let visible = "";
	for (const token of line) {
		const explanations = explanationsOf(token);
		let hasInert = false;
		for (const explanation of explanations) {
			if (isInertScope(explanation.scopes)) {
				hasInert = true;
				break;
			}
		}
		if (!hasInert) {
			visible += token.content;
			continue;
		}
		for (const explanation of explanations) {
			if (isInertScope(explanation.scopes)) {
				continue;
			}
			visible += explanation.content;
		}
	}
	return visible;
}

/**
 * Returns the count of leading whitespace characters on a line, or `-1`
 * for blank lines. Reads only the first token's content — Shiki emits
 * leading whitespace as its own token, so a full-line concat is wasted
 * work for the indentation strategy.
 */
function leadingIndentOfLine(line: FoldLine | undefined): number {
	if (line == null || line.length === 0) {
		return -1;
	}
	let column = 0;
	for (const token of line) {
		const content = token.content;
		for (let charIndex = 0; charIndex < content.length; charIndex += 1) {
			const character = content.charCodeAt(charIndex);
			if (character === 32 || character === 9) {
				column += 1;
				continue;
			}
			return column;
		}
	}
	return -1;
}

/**
 * Bracket-pair folding strategy. Walks every token, skips inert (string,
 * comment, escape) regions, and pairs `{`/`[` openers with `}`/`]` closers
 * via a single stack pass.
 *
 * Parens (`(`/`)`) are intentionally not folded — function call argument
 * lists are usually short and folding them creates more noise than value.
 */
function computeBracketFoldRanges(tokens: FoldLine[]): FoldableRange[] {
	const stack: number[] = [];
	const ranges: FoldableRange[] = [];

	for (let lineIndex = 0; lineIndex < tokens.length; lineIndex += 1) {
		const line = tokens[lineIndex];
		if (line == null) {
			continue;
		}
		const lineNumber = lineIndex + 1;

		for (const token of line) {
			if (!hasBracketChar(token.content)) {
				continue;
			}
			for (const explanation of explanationsOf(token)) {
				if (isInertScope(explanation.scopes)) {
					continue;
				}
				const content = explanation.content;
				for (let charIndex = 0; charIndex < content.length; charIndex += 1) {
					const character = content.charCodeAt(charIndex);
					if (character === 123 || character === 91) {
						stack.push(lineNumber);
					} else if (character === 125 || character === 93) {
						const startLine = stack.pop();
						if (startLine != null && startLine !== lineNumber) {
							ranges.push({ id: String(startLine), startLine, endLine: lineNumber });
						}
					}
				}
			}
		}
	}

	return finalizeFoldRanges(ranges);
}

/**
 * Pre-filter: returns true if `content` contains any of `{`, `}`, `[`, `]`.
 * Most tokens in non-JSON code are identifiers/whitespace/operators that
 * never participate in bracket folding, so this collapses ~95% of the per-
 * character scan to a single `String.prototype.indexOf` per token.
 */
function hasBracketChar(content: string): boolean {
	for (let i = 0; i < content.length; i += 1) {
		const character = content.charCodeAt(i);
		if (character === 123 || character === 125 || character === 91 || character === 93) {
			return true;
		}
	}
	return false;
}

/**
 * Indentation-based folding strategy for languages where blocks are defined
 * by leading whitespace (Python, YAML).
 *
 * For each non-blank line, finds the maximal run of following lines that are
 * either blank or more deeply indented than the opener. The opener stays
 * visible; descendant lines collapse. The "closer" line (`endLine`) is the
 * first line at or below the opener's indent — purely a sentinel so the
 * decorator's `startLine + 1 .. endLine - 1` hide loop covers the body.
 *
 * A tab is treated as one column. Mixed tabs/spaces compare consistently
 * because we compare the count of leading whitespace characters; if a file
 * mixes the two within a single block, indent comparisons may misfire, but
 * neither Python nor YAML idiomatically mixes them.
 */
function computeIndentationFoldRanges(tokens: FoldLine[]): FoldableRange[] {
	const indents: number[] = Array.from({ length: tokens.length });
	for (let i = 0; i < tokens.length; i += 1) {
		indents[i] = leadingIndentOfLine(tokens[i]);
	}

	const ranges: FoldableRange[] = [];
	for (let openerIndex = 0; openerIndex < indents.length; openerIndex += 1) {
		const indent = indents[openerIndex] ?? -1;
		if (indent < 0) {
			continue;
		}
		let lastChild = -1;
		let scan = openerIndex + 1;
		while (scan < indents.length) {
			const next = indents[scan] ?? -1;
			if (next < 0) {
				scan += 1;
				continue;
			}
			if (next > indent) {
				lastChild = scan;
				scan += 1;
				continue;
			}
			break;
		}
		if (lastChild > openerIndex) {
			// endLine plays the role of the "closer": the first line that is
			// not folded. `lastChild + 2` converts the 0-indexed last child
			// to a 1-indexed sentinel one past it.
			ranges.push({
				id: String(openerIndex + 1),
				startLine: openerIndex + 1,
				endLine: lastChild + 2,
			});
		}
	}

	return finalizeFoldRanges(ranges);
}

/**
 * Tag-pair folding strategy for HTML and XML.
 *
 * Reconstructs each line's visible text from non-inert tokens, then scans
 * tag patterns with a small linear scanner. Self-closing tags (`<br/>`, `<img />`)
 * and known void HTML elements (`<br>`, `<img>`, `<input>`, …) don't push
 * onto the stack. Stack-based matching emits one range per line with an
 * unmatched opener and a matching closer on a later line.
 *
 * Multi-line tags (an opener whose `>` is on a different line than the
 * `<`) are deliberately not folded in v1 — they're rare and would require
 * cross-line state.
 */
function computeTagFoldRanges(tokens: FoldLine[]): FoldableRange[] {
	const stack: { name: string; line: number }[] = [];
	const ranges: FoldableRange[] = [];

	for (let lineIndex = 0; lineIndex < tokens.length; lineIndex += 1) {
		const line = tokens[lineIndex];
		if (line == null) {
			continue;
		}
		const lineNumber = lineIndex + 1;
		const visible = visibleTextForLine(line);

		const matches = extractTagMatches(visible);
		for (const match of matches) {
			if (match.kind === "open") {
				stack.push({ name: match.name, line: lineNumber });
			} else {
				const top = stack.length > 0 ? stack[stack.length - 1] : undefined;
				if (top != null && top.name.toLowerCase() === match.name.toLowerCase()) {
					stack.pop();
					if (top.line !== lineNumber) {
						ranges.push({
							id: String(top.line),
							startLine: top.line,
							endLine: lineNumber,
						});
					}
				}
			}
		}
	}

	return finalizeFoldRanges(ranges);
}

/** HTML elements whose tags don't have a closing counterpart. */
const VOID_HTML_ELEMENTS = new Set<string>([
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr",
]);

/**
 * Extracts open/close tag matches from a single line's visible text.
 *
 * Only tags that both open and close on this line are considered; we skip
 * partial tags (an unmatched `<` with no `>`) so multi-line tags don't
 * register as openers.
 */
function extractTagMatches(line: string): { name: string; kind: "open" | "close" }[] {
	const matches: { name: string; kind: "open" | "close" }[] = [];
	let index = 0;

	while (index < line.length) {
		const tagStart = line.indexOf("<", index);
		if (tagStart === -1) {
			break;
		}

		let cursor = skipHtmlWhitespace(line, tagStart + 1);
		const isClose = line.charCodeAt(cursor) === 47;
		if (isClose) {
			cursor = skipHtmlWhitespace(line, cursor + 1);
		}

		if (!isTagNameStart(line.charCodeAt(cursor))) {
			index = tagStart + 1;
			continue;
		}

		const nameStart = cursor;
		cursor += 1;
		while (cursor < line.length && isTagNameContinue(line.charCodeAt(cursor))) {
			cursor += 1;
		}
		const name = line.slice(nameStart, cursor);
		const tagEnd = findTagEnd(line, cursor);
		if (tagEnd === -1) {
			index = tagStart + 1;
			continue;
		}

		if (isClose) {
			matches.push({ name, kind: "close" });
			index = tagEnd + 1;
			continue;
		}
		const selfClosing = tagEndsSelfClosing(line, tagEnd);
		if (selfClosing || VOID_HTML_ELEMENTS.has(name.toLowerCase())) {
			index = tagEnd + 1;
			continue;
		}
		matches.push({ name, kind: "open" });
		index = tagEnd + 1;
	}
	return matches;
}

/** Returns true for whitespace accepted inside a tag opener. */
function isHtmlWhitespace(character: number): boolean {
	return (
		character === 9 ||
		character === 10 ||
		character === 11 ||
		character === 12 ||
		character === 13 ||
		character === 32
	);
}

/** Skips HTML whitespace starting at `index`. */
function skipHtmlWhitespace(line: string, index: number): number {
	let cursor = index;
	while (cursor < line.length && isHtmlWhitespace(line.charCodeAt(cursor))) {
		cursor += 1;
	}
	return cursor;
}

/** Returns true when `character` can start an HTML/XML tag name. */
function isTagNameStart(character: number): boolean {
	return (character >= 65 && character <= 90) || (character >= 97 && character <= 122);
}

/** Returns true when `character` can continue an HTML/XML tag name. */
function isTagNameContinue(character: number): boolean {
	return (
		isTagNameStart(character) ||
		(character >= 48 && character <= 57) ||
		character === 45 ||
		character === 58 ||
		character === 95
	);
}

/** Finds the closing `>` for a tag, ignoring `>` inside quoted attributes. */
function findTagEnd(line: string, index: number): number {
	let quote: number | undefined;
	for (let cursor = index; cursor < line.length; cursor += 1) {
		const character = line.charCodeAt(cursor);
		if (quote != null) {
			if (character === quote) {
				quote = undefined;
			}
			continue;
		}
		if (character === 34 || character === 39) {
			quote = character;
			continue;
		}
		if (character === 62) {
			return cursor;
		}
	}
	return -1;
}

/** Returns true when the tag ending at `tagEnd` has a trailing `/`. */
function tagEndsSelfClosing(line: string, tagEnd: number): boolean {
	let cursor = tagEnd - 1;
	while (cursor >= 0 && isHtmlWhitespace(line.charCodeAt(cursor))) {
		cursor -= 1;
	}
	return cursor >= 0 && line.charCodeAt(cursor) === 47;
}

export {
	//,
	computeFoldRanges,
	foldStrategyFor,
};

export type {
	//,
	ComputeFoldRangesInput,
	FoldExplanation,
	FoldLine,
	FoldScope,
	FoldStrategy,
	FoldToken,
};
