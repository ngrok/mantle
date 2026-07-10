import {
	computeFoldRanges,
	computeJsonFoldRanges,
	finalizeFoldRanges,
	type FoldableRange,
	type FoldLine,
	type SupportedLanguage,
} from "@ngrok/mantle/highlight-utils";
import { computeCssFoldRanges } from "./compute-css-fold-ranges.js";
import { computeHtmlFoldRanges, type HtmlFoldLanguage } from "./compute-html-fold-ranges.js";
import { computeJsxFoldRanges, type JsxFoldLanguage } from "./compute-jsx-fold-ranges.js";
import {
	computeKeywordFoldRanges,
	type KeywordFoldLanguage,
} from "./compute-keyword-fold-ranges.js";

/**
 * Server-side folding strategy applied to a language. This is a richer
 * dispatch than `@ngrok/mantle/highlight-utils`'s `foldStrategyFor`:
 *
 * - `jsx-ast` parses JS / TS / JSX / TSX with `oxc-parser`.
 * - `html-ast` parses HTML / XML with `parse5`.
 * - `css-raw` runs a CSS-aware single-pass brace matcher.
 * - `json-raw` reuses the existing `computeJsonFoldRanges` (raw, scope-free).
 * - `token-bracket` / `token-indentation` are the existing token-based
 *   strategies for languages without a heavier parser (Go, Rust, Java, C#,
 *   Python, YAML).
 * - `token-keyword` matches keyword openers / closers against tokenized line
 *   text (Bash / Shell).
 * - `token-bracket-and-keyword` runs the bracket pass *and* the keyword pass
 *   and merges them — Ruby uses brace-style blocks (`{ |x| … }`) plus
 *   keyword blocks (`def … end`).
 * - `none` opts out for plain text and unknown languages.
 *
 * Strategies suffixed `-ast` or `-raw` need only the raw source string;
 * `token-*` strategies need Shiki-tokenized lines with scope explanations.
 */
type ServerFoldStrategy =
	| "jsx-ast"
	| "html-ast"
	| "css-raw"
	| "json-raw"
	| "token-bracket"
	| "token-indentation"
	| "token-keyword"
	| "token-bracket-and-keyword"
	| "none";

/** Returns the server fold strategy for the given supported language. */
function serverFoldStrategyFor(language: SupportedLanguage): ServerFoldStrategy {
	switch (language) {
		case "javascript":
		case "js":
		case "typescript":
		case "ts":
		case "jsx":
		case "tsx":
			return "jsx-ast";
		case "html":
		case "xml":
			return "html-ast";
		case "css":
			return "css-raw";
		case "json":
			return "json-raw";
		case "python":
		case "py":
		case "yaml":
		case "yml":
			return "token-indentation";
		case "ruby":
		case "rb":
			return "token-bracket-and-keyword";
		case "bash":
		case "sh":
		case "shell":
			return "token-keyword";
		case "plain":
		case "plaintext":
		case "text":
		case "txt":
			return "none";
		default:
			return "token-bracket";
	}
}

/**
 * Returns true when the strategy needs Shiki-tokenized lines (with scope
 * explanations) to run. AST and raw-source strategies operate on the source
 * string directly and let us skip the `includeExplanation: 'scopeName'`
 * Shiki option, saving meaningful work on JS/TS/HTML/CSS hot paths.
 */
function serverFoldNeedsTokens(strategy: ServerFoldStrategy): boolean {
	switch (strategy) {
		case "token-bracket":
		case "token-indentation":
		case "token-keyword":
		case "token-bracket-and-keyword":
			return true;
		case "jsx-ast":
		case "html-ast":
		case "css-raw":
		case "json-raw":
		case "none":
			return false;
	}
}

/** Type guard: narrows `SupportedLanguage` to languages handled by the JSX strategy. */
function isJsxFoldLanguage(language: SupportedLanguage): language is JsxFoldLanguage {
	return (
		language === "javascript" ||
		language === "js" ||
		language === "typescript" ||
		language === "ts" ||
		language === "jsx" ||
		language === "tsx"
	);
}

/** Type guard: narrows `SupportedLanguage` to languages handled by the HTML strategy. */
function isHtmlFoldLanguage(language: SupportedLanguage): language is HtmlFoldLanguage {
	return language === "html" || language === "xml";
}

/** Type guard: narrows `SupportedLanguage` to languages handled by the keyword strategy. */
function isKeywordFoldLanguage(language: SupportedLanguage): language is KeywordFoldLanguage {
	return (
		language === "ruby" ||
		language === "rb" ||
		language === "bash" ||
		language === "sh" ||
		language === "shell"
	);
}

/**
 * Computes foldable ranges for a single highlighted code block, dispatching
 * to the appropriate strategy. Every supported language flows through here,
 * including the legacy token-based ones, so the engine has a single decision
 * point.
 *
 * Caller contract:
 * - For token-needing strategies, `tokens` must be the lines produced by
 *   Shiki with `includeExplanation: 'scopeName'`. Pass `undefined` and the
 *   strategy returns `[]`.
 * - For raw / AST strategies, `tokens` is ignored; only `code` matters.
 *
 * Errors raised by underlying parsers are caught and converted into "no
 * folds" — Shiki still gets to render the highlighted code, the gutter just
 * skips the toggle. We log nothing here because the engine is the wrong
 * layer to surface diagnostics.
 */
function computeServerFoldRanges({
	code,
	language,
	tokens,
}: {
	/** Normalized source code (post-`normalizeIndentation`). */
	code: string;
	/** Resolved Mantle supported language. */
	language: SupportedLanguage;
	/** Shiki-tokenized lines, when the strategy needs them. */
	tokens: FoldLine[] | undefined;
}): FoldableRange[] {
	const strategy = serverFoldStrategyFor(language);
	try {
		switch (strategy) {
			case "jsx-ast":
				if (!isJsxFoldLanguage(language)) {
					return [];
				}
				return computeJsxFoldRanges({ code, language });
			case "html-ast":
				if (!isHtmlFoldLanguage(language)) {
					return [];
				}
				return computeHtmlFoldRanges({ code, language });
			case "css-raw":
				return computeCssFoldRanges({ code });
			case "json-raw":
				return computeJsonFoldRanges(code);
			case "token-bracket":
			case "token-indentation":
				if (tokens == null) {
					return [];
				}
				return computeFoldRanges({ language, tokens });
			case "token-keyword":
				if (tokens == null || !isKeywordFoldLanguage(language)) {
					return [];
				}
				return computeKeywordFoldRanges({ language, tokens });
			case "token-bracket-and-keyword":
				if (tokens == null || !isKeywordFoldLanguage(language)) {
					return [];
				}
				return finalizeFoldRanges([
					...computeFoldRanges({ language, tokens }),
					...computeKeywordFoldRanges({ language, tokens }),
				]);
			case "none":
				return [];
		}
	} catch {
		// AST parsers throw on malformed input; falling back to no folds keeps
		// the rest of the highlight pipeline alive.
		return [];
	}
}

export {
	//,
	computeServerFoldRanges,
	serverFoldNeedsTokens,
	serverFoldStrategyFor,
};
export type { ServerFoldStrategy };
