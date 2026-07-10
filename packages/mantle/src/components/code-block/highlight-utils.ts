/**
 * React-free highlighting utilities for use in build tools, server-side
 * rendering, and Web Workers. This module intentionally avoids importing
 * any React or DOM-dependent code so it can run in non-browser contexts.
 */

export {
	//,
	decorateHighlightedHtml,
} from "./decorate-highlighted-html.js";

export type {
	//,
	DecorateHighlightedHtmlInput,
} from "./decorate-highlighted-html.js";

export {
	//,
	computeJsonFoldRanges,
} from "./compute-json-fold-ranges.js";

export {
	//,
	finalizeFoldRanges,
} from "./fold-range-utils.js";

export type {
	//,
	FoldableRange,
} from "./compute-json-fold-ranges.js";

export {
	//,
	computeFoldRanges,
	foldStrategyFor,
} from "./compute-fold-ranges.js";

export type {
	//,
	ComputeFoldRangesInput,
	FoldExplanation,
	FoldLine,
	FoldScope,
	FoldStrategy,
	FoldToken,
} from "./compute-fold-ranges.js";

export {
	//,
	inferIndentation,
	isIndentation,
} from "./indentation.js";

export type {
	//,
	Indentation,
} from "./indentation.js";

export type {
	//,
	LineRange,
} from "./line-numbers.js";

export {
	//,
	normalizeIndentation,
} from "./normalize-indentation.js";

export {
	//,
	defaultShowLineNumbers,
} from "./mantle-code.js";

export {
	//,
	isSupportedLanguage,
	parseLanguage,
	supportedLanguages,
} from "./supported-languages.js";

export type {
	//,
	SupportedLanguage,
} from "./supported-languages.js";

export {
	//,
	parseCodeBlockHighlightLines,
	parseCodeBlockLineNumberStart,
	parseCodeBlockShowLineNumbers,
} from "./parse-line-options.js";

export {
	//,
	normalizeValue,
	tokenizeMetastring,
} from "./resolve-pre-rendered-props.js";
