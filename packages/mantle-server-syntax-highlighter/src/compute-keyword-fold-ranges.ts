import {
	finalizeFoldRanges,
	type FoldableRange,
	type FoldLine,
} from "@ngrok/mantle/highlight-utils";

/**
 * Keyword-pair fold computer for languages whose blocks are delimited by
 * keywords rather than punctuation.
 *
 * VS Code models this with `foldingStartMarker` / `foldingStopMarker`
 * declarations in each language's `language-configuration.json`. We mirror
 * that behavior with linear marker predicates, evaluated against the
 * *visible* (non-string, non-comment) portion of each line — the Shiki tokens
 * carry scope information that lets us strip those out reliably.
 *
 * The stack is untyped — every closer pops the most recent opener, regardless
 * of which keyword opened it. Real source code nests properly, so this stays
 * correct without per-keyword tracking, and matches VS Code's marker-based
 * behavior.
 *
 * @see https://github.com/microsoft/vscode/blob/main/extensions/ruby/language-configuration.json
 * @see https://github.com/microsoft/vscode/blob/main/extensions/shellscript/language-configuration.json
 */

/** Languages this computer knows how to fold. */
type KeywordFoldLanguage = "ruby" | "rb" | "bash" | "sh" | "shell";

/**
 * Per-line opener/closer marker pair. The predicates intentionally match the
 * *visible* line content (after string and comment scopes are filtered out)
 * — interpolated `do … end` markers inside a string don't trigger folds.
 */
type KeywordPattern = {
	/** Returns true when this line opens a foldable block. */
	startsFold: (visible: string) => boolean;
	/** Returns true when this line closes a foldable block. */
	endsFold: (visible: string) => boolean;
};

const RUBY_START_KEYWORDS: readonly string[] = [
	"def",
	"class",
	"module",
	"begin",
	"if",
	"unless",
	"while",
	"until",
	"for",
	"case",
];
const BASH_START_KEYWORDS: readonly string[] = ["if", "while", "for", "case", "until", "select"];
const BASH_END_KEYWORDS: readonly string[] = ["fi", "esac", "done"];

/**
 * Ruby keyword folds modeled after VS Code's grammar. Covers:
 *
 * - Definition keywords at the start of a line: `def`, `class`, `module`, `begin`.
 * - Control-flow openers at the start of a line: `if`, `unless`, `while`,
 *   `until`, `for`, `case` — Ruby's flagship multi-line constructs.
 * - Trailing `do` / `do |args|` for blocks attached to a method call.
 *
 * `end` always closes; mid-block keywords (`else`, `elsif`, `when`, `rescue`,
 * `ensure`) deliberately don't, so a single `if … else … end` becomes one
 * fold, not three.
 */
const RUBY_PATTERN: KeywordPattern = {
	startsFold: rubyStartsFold,
	endsFold: (visible) => startsWithAnyWordAfterWhitespace(visible, ["end"]),
};

/**
 * Bash / Shell keyword folds modeled after VS Code's grammar.
 *
 * - Opener keywords at the start of a line — `if`, `while`, `for`, `case`,
 *   `until`, `select` — that aren't closed by a same-line command marker.
 * - Lines ending with an unmatched `{` (function bodies, brace groups).
 * - Lines ending with `do` (the `for x in y; do` / `while cond; do` form).
 *
 * The end predicate matches `}` only when it leads its line — that lets us
 * close brace groups while ignoring `${VAR}` parameter expansions, which
 * are never line-leading.
 */
const BASH_PATTERN: KeywordPattern = {
	startsFold: bashStartsFold,
	endsFold: bashEndsFold,
};

/** Returns true for ASCII identifier characters used by shell/Ruby keywords. */
function isWordChar(character: number): boolean {
	return (
		(character >= 48 && character <= 57) ||
		(character >= 65 && character <= 90) ||
		(character >= 97 && character <= 122) ||
		character === 95
	);
}

/** Returns true for whitespace characters accepted around language markers. */
function isWhitespaceChar(character: number): boolean {
	return (
		character === 9 ||
		character === 10 ||
		character === 11 ||
		character === 12 ||
		character === 13 ||
		character === 32
	);
}

/** Returns the index of the first non-whitespace character in `text`. */
function firstNonWhitespaceIndex(text: string): number {
	let index = 0;
	while (index < text.length && isWhitespaceChar(text.charCodeAt(index))) {
		index += 1;
	}
	return index;
}

/** Returns the exclusive index after the last non-whitespace character. */
function endTrimmedIndex(text: string): number {
	let index = text.length;
	while (index > 0 && isWhitespaceChar(text.charCodeAt(index - 1))) {
		index -= 1;
	}
	return index;
}

/** Returns true if `word` appears at `index` with word boundaries. */
function isWordAt(text: string, index: number, word: string, end = text.length): boolean {
	if (index < 0 || index + word.length > end) {
		return false;
	}
	if (text.slice(index, index + word.length) !== word) {
		return false;
	}
	const beforeIsBoundary = index === 0 || !isWordChar(text.charCodeAt(index - 1));
	const afterIndex = index + word.length;
	const afterIsBoundary = afterIndex >= end || !isWordChar(text.charCodeAt(afterIndex));
	return beforeIsBoundary && afterIsBoundary;
}

/** Returns true when a line begins with one of the given keywords. */
function startsWithAnyWordAfterWhitespace(text: string, words: readonly string[]): boolean {
	const index = firstNonWhitespaceIndex(text);
	for (const word of words) {
		if (isWordAt(text, index, word)) {
			return true;
		}
	}
	return false;
}

/**
 * Returns true when `index` is positioned where the shell can begin another
 * command word on the same physical line. This intentionally ignores ordinary
 * arguments and variables like `$done`, so `case $done in` still opens a fold.
 */
function isShellCommandBoundary(text: string, index: number): boolean {
	let cursor = index - 1;
	while (cursor >= 0 && isWhitespaceChar(text.charCodeAt(cursor))) {
		cursor -= 1;
	}
	if (cursor < 0) {
		return true;
	}
	const previous = text.charCodeAt(cursor);
	return previous === 38 || previous === 40 || previous === 59 || previous === 124;
}

/**
 * Returns true when a Bash closer appears as a same-line command marker, e.g.
 * `if ok; then echo hi; fi`. A single linear scan is cheaper than running one
 * regex per marker and keeps shell variables / arguments named `done`, `fi`,
 * or `esac` from suppressing valid opener folds.
 */
function hasShellSameLineEndKeyword(text: string): boolean {
	for (let index = 0; index < text.length; index += 1) {
		const character = text.charCodeAt(index);
		if (!isWordChar(character)) {
			continue;
		}
		for (const word of BASH_END_KEYWORDS) {
			if (isWordAt(text, index, word) && isShellCommandBoundary(text, index)) {
				return true;
			}
		}
		while (index + 1 < text.length && isWordChar(text.charCodeAt(index + 1))) {
			index += 1;
		}
	}
	return false;
}

/**
 * Returns true when a line starts with a shell closer command. `done)` and
 * similar case labels are deliberately excluded; `)` is not a command
 * separator, so those labels should not pop the fold stack.
 */
function startsWithShellEndKeyword(text: string): boolean {
	const index = firstNonWhitespaceIndex(text);
	for (const word of BASH_END_KEYWORDS) {
		if (!isWordAt(text, index, word)) {
			continue;
		}
		const next = text.charCodeAt(index + word.length);
		return (
			Number.isNaN(next) || isWhitespaceChar(next) || next === 38 || next === 59 || next === 124
		);
	}
	return false;
}

/** Returns true when a line ends with `word`, ignoring trailing whitespace. */
function endsWithWord(text: string, word: string): boolean {
	const end = endTrimmedIndex(text);
	return isWordAt(text, end - word.length, word, end);
}

/** Returns true for trailing Ruby `do` / `do |args|` block openers. */
function endsWithRubyDoBlock(text: string): boolean {
	let end = endTrimmedIndex(text);
	if (end <= 0) {
		return false;
	}
	if (text.charCodeAt(end - 1) === 124) {
		const paramsStart = text.lastIndexOf("|", end - 2);
		if (paramsStart === -1) {
			return false;
		}
		end = paramsStart;
		while (end > 0 && isWhitespaceChar(text.charCodeAt(end - 1))) {
			end -= 1;
		}
	}
	return isWordAt(text, end - 2, "do", end);
}

/** Returns true when a Ruby line opens a keyword-paired block. */
function rubyStartsFold(visible: string): boolean {
	return (
		startsWithAnyWordAfterWhitespace(visible, RUBY_START_KEYWORDS) || endsWithRubyDoBlock(visible)
	);
}

/** Returns true when a shell line has a `{` with no later `}` on the same line. */
function endsWithOpenBrace(visible: string): boolean {
	return visible.lastIndexOf("{") > visible.lastIndexOf("}");
}

/** Returns true when a Bash/Shell line opens a keyword-paired block. */
function bashStartsFold(visible: string): boolean {
	if (
		startsWithAnyWordAfterWhitespace(visible, BASH_START_KEYWORDS) &&
		!hasShellSameLineEndKeyword(visible)
	) {
		return true;
	}
	return endsWithOpenBrace(visible) || endsWithWord(visible, "do");
}

/** Returns true when a Bash/Shell line closes a keyword-paired block. */
function bashEndsFold(visible: string): boolean {
	const firstContent = firstNonWhitespaceIndex(visible);
	return visible.charCodeAt(firstContent) === 125 || startsWithShellEndKeyword(visible);
}

/** Resolves the keyword pattern for a given language. */
function patternFor(language: KeywordFoldLanguage): KeywordPattern {
	switch (language) {
		case "ruby":
		case "rb":
			return RUBY_PATTERN;
		case "bash":
		case "sh":
		case "shell":
			return BASH_PATTERN;
	}
}

/**
 * TextMate scope prefixes that mark a token as inert content (string body,
 * comment body, character escape). Mirrors the filter used by
 * `computeFoldRanges` for the bracket strategy so behaviors stay consistent.
 */
const INERT_SCOPE_PREFIXES: readonly string[] = [
	"string.",
	"comment.",
	"constant.character.escape",
];

/** Returns true when the innermost scope of a token marks it inert. */
function isInertScope(scopes: readonly { scopeName: string }[]): boolean {
	if (scopes.length === 0) {
		return false;
	}
	const innermost = scopes[scopes.length - 1]?.scopeName ?? "";
	if (innermost === "string" || innermost === "comment") {
		return true;
	}
	for (const prefix of INERT_SCOPE_PREFIXES) {
		if (innermost.startsWith(prefix)) {
			return true;
		}
	}
	return false;
}

/**
 * Reconstructs the visible (non-string, non-comment) text of a single
 * tokenized line.
 *
 * Subtlety: Shiki keeps leading whitespace inside `token.content` but strips
 * it from every `explanation.content` piece — so `" HttpListener"` (token)
 * decomposes into `[{ content: "HttpListener", scopes: […] }]`. Iterating
 * explanations alone collapses adjacent identifiers (`class HttpListener`
 * becomes `classHttpListener`), which breaks every word-boundary keyword
 * regex. We use `token.content` whenever no explanation piece is inert and
 * only fall back to per-explanation iteration for mixed-scope tokens.
 */
function visibleTextForLine(line: FoldLine): string {
	let visible = "";
	for (const token of line) {
		const explanations = token.explanation;
		if (explanations == null || explanations.length === 0) {
			visible += token.content;
			continue;
		}
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
 * Computes foldable ranges from tokenized source lines using the language's
 * keyword opener/closer regex pair.
 *
 * The same line can both open and close a block (`if foo; end` in Ruby).
 * Such lines push and pop on the stack but their start/end coincide, so the
 * range gets discarded by the `endLine > startLine` filter — matching how
 * the bracket strategy treats single-line `{}` constructs.
 *
 * @example
 * // tokens: [["def f"], ["  pass"], ["end"]]
 * computeKeywordFoldRanges({ language: "ruby", tokens });
 * // => [{ id: "1", startLine: 1, endLine: 3 }]
 */
function computeKeywordFoldRanges({
	language,
	tokens,
}: {
	/** Resolved Mantle language; controls which keyword pattern to use. */
	language: KeywordFoldLanguage;
	/** Shiki-tokenized lines, with scope explanations populated. */
	tokens: FoldLine[];
}): FoldableRange[] {
	const pattern = patternFor(language);
	const stack: number[] = [];
	const ranges: FoldableRange[] = [];

	for (let lineIndex = 0; lineIndex < tokens.length; lineIndex += 1) {
		const line = tokens[lineIndex];
		if (line == null) {
			continue;
		}
		const visible = visibleTextForLine(line);
		if (visible.length === 0) {
			continue;
		}
		const lineNumber = lineIndex + 1;

		// Closers come first: `end` on the same line as a `do` (e.g. `loop do
		// end` written across two lines but both `do` and `end` are on different
		// lines) shouldn't first push then pop on the same iteration.
		if (pattern.endsFold(visible)) {
			const startLine = stack.pop();
			if (startLine != null && startLine < lineNumber) {
				ranges.push({ id: String(startLine), startLine, endLine: lineNumber });
			}
		}
		if (pattern.startsFold(visible)) {
			stack.push(lineNumber);
		}
	}

	return finalizeFoldRanges(ranges);
}

export { computeKeywordFoldRanges };
export type { KeywordFoldLanguage };
