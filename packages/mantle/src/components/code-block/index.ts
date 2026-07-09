/**
 * Re-exports for the Code Block component.
 *
 * @see https://mantle.ngrok.com/components/data-display/code-block
 */

export {
	//,
	CodeBlock,
} from "./code-block.js";

export {
	//,
	createMantleCodeBlockValue,
	mantleCode,
} from "./mantle-code.js";

export type {
	//,
	MantleCodeBlockValue,
	MantleCodeOptions,
} from "./mantle-code.js";

export {
	//,
	jsonCodeBlockValue,
	jsonToShikiHtml,
} from "./json-highlight.js";

export type {
	//,
	JsonCodeBlockValueOptions,
} from "./json-highlight.js";

export {
	//,
	decorateHighlightedHtml,
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
	escapeHtml,
} from "./escape-html.js";

export {
	//,
	hasMoreThanNLines,
} from "./has-more-than-n-lines.js";

export {
	//,
	inferIndentation,
	isIndentation,
} from "./indentation.js";

export type {
	//,
	Indentation,
} from "./indentation.js";

export {
	//,
	normalizeIndentation,
} from "./normalize-indentation.js";

export {
	//,
	defaultMeta,
	normalizeValue,
	parseMetastring,
	resolvePreRenderedCodeBlockProps,
	tokenizeMetastring,
} from "./resolve-pre-rendered-props.js";

export {
	//,
	parseCodeBlockHighlightLines,
	parseCodeBlockLineNumberStart,
	parseCodeBlockShowLineNumbers,
} from "./parse-line-options.js";

export type {
	//,
	CodeBlockPreElementInput,
	DefaultMeta,
	Meta,
	MetaInput,
	Mode,
	ResolvePreRenderedCodeBlockPropsInput,
	ResolvePreRenderedCodeBlockPropsResult,
	ResolvedPreRenderedCodeBlockProps,
} from "./resolve-pre-rendered-props.js";

export {
	//,
	isSupportedLanguage,
	parseLanguage,
	supportedLanguages,
} from "./supported-languages.js";

export type {
	//,
	LineRange,
} from "./line-numbers.js";

export type {
	//,
	SupportedLanguage,
} from "./supported-languages.js";
