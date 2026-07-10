export {
	createMantleServerSyntaxHighlighter,
	getMantleShikiHighlighter,
	highlightWithMantleShiki,
	mantleHighlightCacheMaxEntries,
	mantleShikiLanguageGrammarIds,
	mantleShikiThemeName,
} from "./engine.js";

export type {
	MantleHighlightInput,
	MantleHighlightResult,
	MantleServerHighlighter,
} from "./engine.js";

export {
	//,
	computeServerFoldRanges,
	serverFoldNeedsTokens,
	serverFoldStrategyFor,
} from "./server-fold-ranges.js";

export type {
	//,
	ServerFoldStrategy,
} from "./server-fold-ranges.js";

export {
	//,
	computeJsxFoldRanges,
} from "./compute-jsx-fold-ranges.js";

export type {
	//,
	JsxFoldLanguage,
} from "./compute-jsx-fold-ranges.js";

export {
	//,
	computeHtmlFoldRanges,
} from "./compute-html-fold-ranges.js";

export type {
	//,
	HtmlFoldLanguage,
} from "./compute-html-fold-ranges.js";

export {
	//,
	computeCssFoldRanges,
} from "./compute-css-fold-ranges.js";

export {
	//,
	computeKeywordFoldRanges,
} from "./compute-keyword-fold-ranges.js";

export type {
	//,
	KeywordFoldLanguage,
} from "./compute-keyword-fold-ranges.js";
