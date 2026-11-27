/**
 * Re-exports for the Code Block component.
 *
 * @see https://mantle.ngrok.com/components/data-display/code-block
 */

import * as CodeBlockParts from "./code-block-parts.js";

/**
 * Shiki-powered code blocks with build-time syntax highlighting and zero browser bundle.
 *
 * Use `mantleCodeBlockPlugins()` to enable pre-rendering at build time.
 *
 * @useWhen Show a block of code with syntax highlighting and a copy button.
 *
 * @siblings
 * - `Code`: the code is a short fragment inside a sentence.
 * - `TruncatedText`: one long opaque value must stay on one line.
 *
 * @see https://mantle.ngrok.com/components/data-display/code-block
 *
 * @example
 * Composition:
 * ```
 * # Standard
 * CodeBlock.Root
 * ├── CodeBlock.Header
 * │   ├── CodeBlock.Icon
 * │   └── CodeBlock.Title
 * ├── CodeBlock.Body
 * │   ├── CodeBlock.CopyButton
 * │   └── CodeBlock.Code
 * └── CodeBlock.ExpanderButton
 *
 * # Tabbed
 * CodeBlock.Root
 * ├── CodeBlock.Header
 * │   └── CodeBlock.TabList
 * │       └── CodeBlock.TabTrigger
 * ├── CodeBlock.Body
 * │   ├── CodeBlock.CopyButton
 * │   └── CodeBlock.TabContent
 * │       └── CodeBlock.Code
 * └── CodeBlock.ExpanderButton
 *
 * # Diff
 * CodeBlock.Root
 * ├── CodeBlock.CopyButton
 * ├── CodeBlock.Header
 * │   ├── CodeBlock.Icon
 * │   └── CodeBlock.Title
 * └── CodeBlock.Diff
 *     └── CodeBlock.DiffCallout
 * ```
 *
 * @example
 * ```tsx
 * <CodeBlock.Root>
 *   <CodeBlock.Header>
 *     <CodeBlock.Icon preset="file" />
 *     <CodeBlock.Title>example.ts</CodeBlock.Title>
 *   </CodeBlock.Header>
 *   <CodeBlock.Body>
 *     <CodeBlock.CopyButton />
 *     <CodeBlock.Code value={mantleCode("typescript")`const x = "hello";`} />
 *   </CodeBlock.Body>
 *   <CodeBlock.ExpanderButton />
 * </CodeBlock.Root>
 *
 * // Server-highlighted HTML fetched via an action route + React Query mutation
 * const highlightMutation = useMutation({
 *   mutationFn: async () => {
 *     const response = await fetch("/api/shiki-highlight", {
 *       method: "POST",
 *       headers: { "Content-Type": "application/json" },
 *       body: JSON.stringify({ code: source, language: "typescript" }),
 *     });
 *     return response.json();
 *   },
 * });
 *
 * // The HTML holds no line numbers, so pass the result's number settings too.
 * const serverValue = createMantleCodeBlockValue({
 *   language: "typescript",
 *   code: source,
 *   preHtml: highlightMutation.data?.html,
 *   showLineNumbers: highlightMutation.data?.showLineNumbers,
 *   lineNumberStart: highlightMutation.data?.lineNumberStart,
 * });
 * ```
 */
const CodeBlock = CodeBlockParts;

export {
	//,
	CodeBlock,
};

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
	useCodeBlockStream,
} from "./use-code-block-stream.js";

export type {
	//,
	UseCodeBlockStreamOptions,
} from "./use-code-block-stream.js";

export type {
	//,
	CodeLine,
	CodeToken,
} from "./line-tokenizer.js";

export type {
	//,
	CodeBlockDiffLine,
} from "./code-block-diff.js";

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
