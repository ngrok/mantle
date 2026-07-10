import { createHash } from "node:crypto";
import type { createHighlighter } from "shiki";
import {
	decorateHighlightedHtml,
	inferIndentation,
	isSupportedLanguage,
	normalizeIndentation,
	parseLanguage,
	type FoldLine,
	type Indentation,
	type LineRange,
	type SupportedLanguage,
} from "@ngrok/mantle/highlight-utils";
import { createLruCache } from "./lru-cache.js";
import {
	computeServerFoldRanges,
	serverFoldNeedsTokens,
	serverFoldStrategyFor,
} from "./server-fold-ranges.js";

/**
 * Shiki grammar IDs preloaded by Mantle's highlighting engine.
 * This list is shared by both Vite plugins and server-side highlighting routes.
 */
const mantleShikiLanguageGrammarIds = [
	"bash",
	"csharp",
	"css",
	"go",
	"html",
	"java",
	"javascript",
	"json",
	"jsx",
	"python",
	"ruby",
	"rust",
	"shell",
	"tsx",
	"typescript",
	"xml",
	"yaml",
] as const satisfies SupportedLanguage[];

/**
 * Shared Shiki theme name used across Mantle highlighting.
 */
const mantleShikiThemeName = "mantle-css-variables" as const;
const mantleHighlightCacheMaxEntries = 1000;

type ShikiHighlighter = Awaited<ReturnType<typeof createHighlighter>>;

type MantleHighlightInput = {
	/**
	 * Raw code string to highlight.
	 */
	code: string;
	/**
	 * Language hint. Accepts supported language aliases and markdown-style values.
	 */
	language: SupportedLanguage | (string & {});
	/**
	 * Optional indentation preference. Defaults to language-inferred indentation.
	 */
	indentation?: Indentation;
	/**
	 * Whether to render line numbers into the returned HTML.
	 * @default true
	 */
	showLineNumbers?: boolean;
	/**
	 * Optional list of highlighted line numbers/ranges to render into the returned HTML.
	 * @default []
	 */
	highlightLines?: (LineRange | number)[];
	/**
	 * Start line number for rendered line numbers.
	 * @default 1
	 */
	lineNumberStart?: number;
};

type MantleHighlightResult = {
	/**
	 * Normalized source code used as the highlight input.
	 */
	code: string;
	/**
	 * Highlighted HTML extracted from Shiki's `<code>...</code>`.
	 */
	html: string;
	/**
	 * Resolved supported language used for highlighting.
	 */
	language: SupportedLanguage;
	/**
	 * Whether returned HTML includes line numbers.
	 */
	showLineNumbers: boolean;
	/**
	 * Highlighted line numbers/ranges applied to the returned HTML.
	 */
	highlightLines: (LineRange | number)[];
	/**
	 * Start line number used for rendered line numbers.
	 */
	lineNumberStart: number;
};

type MantleServerHighlighter = {
	/**
	 * Highlight a code snippet and return normalized code + highlighted HTML.
	 */
	highlight: (input: MantleHighlightInput) => Promise<MantleHighlightResult>;
};

let highlighterPromise: Promise<ShikiHighlighter> | undefined;
const mantleHighlightCache = createLruCache<string, Promise<MantleHighlightResult>>(
	mantleHighlightCacheMaxEntries,
);

/**
 * Creates (and caches) Mantle's shared Shiki highlighter instance.
 */
function getMantleShikiHighlighter(): Promise<ShikiHighlighter> {
	if (highlighterPromise != null) {
		return highlighterPromise;
	}

	highlighterPromise = (async () => {
		const { createCssVariablesTheme, createHighlighter } = await import("shiki");
		const cssVarsTheme = createCssVariablesTheme({ name: mantleShikiThemeName });

		// Append more granular token scope → CSS variable mappings.
		// More specific scopes override the defaults from createCssVariablesTheme.
		// Each uses a fallback to the original grouping variable for backwards compat.
		cssVarsTheme.tokenColors = [
			...(cssVarsTheme.tokenColors ?? []),
			{
				scope: ["entity.name.type", "entity.name.class", "support.type", "support.class"],
				settings: { foreground: "var(--shiki-token-type, var(--shiki-token-function))" },
			},
			{
				scope: ["variable", "variable.parameter", "variable.other"],
				settings: { foreground: "var(--shiki-token-variable, var(--shiki-foreground))" },
			},
			{
				scope: ["keyword.operator", "keyword.operator.assignment", "keyword.operator.comparison"],
				settings: { foreground: "var(--shiki-token-operator, var(--shiki-token-keyword))" },
			},
			{
				scope: ["entity.other.attribute-name"],
				settings: { foreground: "var(--shiki-token-attribute, var(--shiki-token-constant))" },
			},
			{
				scope: ["meta.object-literal.key", "support.type.property-name", "entity.name.tag.yaml"],
				settings: { foreground: "var(--shiki-token-property, var(--shiki-token-function))" },
			},
			{
				scope: ["constant.character.escape"],
				settings: { foreground: "var(--shiki-token-escape, var(--shiki-token-constant))" },
			},
			{
				scope: ["string.unquoted.plain.out.yaml", "string.unquoted.plain.in.yaml"],
				settings: { foreground: "var(--shiki-token-variable, var(--shiki-foreground))" },
			},
			{
				scope: ["punctuation.definition.block.sequence.item.yaml"],
				settings: { foreground: "var(--shiki-token-variable, var(--shiki-foreground))" },
			},
		];

		return createHighlighter({
			themes: [cssVarsTheme],
			langs: [...mantleShikiLanguageGrammarIds],
		});
	})().catch((error) => {
		highlighterPromise = undefined;
		throw error;
	});

	return highlighterPromise;
}

/**
 * Extracts the inner HTML from a Shiki `<code>...</code>` wrapper.
 */
function extractHighlightedCodeInnerHtml(fullHtml: string): string | undefined {
	return fullHtml.match(/<code[^>]*>([\s\S]*?)<\/code>/)?.[1];
}

/**
 * Highlights code with Mantle's shared Shiki engine and normalization defaults.
 */
async function highlightWithMantleShiki(
	input: MantleHighlightInput,
): Promise<MantleHighlightResult> {
	const resolvedLanguage = isSupportedLanguage(input.language)
		? input.language
		: parseLanguage(input.language);
	const indentation = input.indentation ?? inferIndentation(resolvedLanguage, undefined);
	const normalizedCode = normalizeIndentation(input.code, {
		indentation,
	});
	const showLineNumbers = input.showLineNumbers ?? true;
	const highlightLines = input.highlightLines ?? [];
	const lineNumberStart = input.lineNumberStart ?? 1;
	const cacheKey = createHash("sha1")
		.update(normalizedCode)
		.update(
			`\0${resolvedLanguage}\0${showLineNumbers}\0${lineNumberStart}\0${JSON.stringify(highlightLines)}`,
		)
		.digest("hex");
	const cached = mantleHighlightCache.get(cacheKey);
	if (cached != null) {
		return cached;
	}

	const promise = (async () => {
		const highlighter = await getMantleShikiHighlighter();
		// AST and raw-source fold strategies don't need token explanations, so
		// we skip the `includeExplanation` cost on the JS/TS/HTML/CSS hot path.
		// Token-based strategies (Python, Ruby, Go, …) still pay for it.
		const foldStrategy = serverFoldStrategyFor(resolvedLanguage);
		const wantsTokens = serverFoldNeedsTokens(foldStrategy);
		let capturedTokens: FoldLine[] | undefined;
		const fullHtml = highlighter.codeToHtml(normalizedCode, {
			lang: resolvedLanguage,
			theme: mantleShikiThemeName,
			includeExplanation: wantsTokens ? "scopeName" : false,
			transformers: wantsTokens
				? [
						{
							name: "mantle:capture-tokens",
							tokens(tokens) {
								capturedTokens = tokens;
							},
						},
					]
				: undefined,
		});
		const baseHtml = extractHighlightedCodeInnerHtml(fullHtml);

		if (baseHtml == null) {
			throw new Error("Failed to extract highlighted HTML from Shiki output");
		}
		const foldableRanges =
			foldStrategy === "none"
				? undefined
				: computeServerFoldRanges({
						code: normalizedCode,
						language: resolvedLanguage,
						tokens: capturedTokens,
					});
		const html = decorateHighlightedHtml({
			foldableRanges,
			highlightLines,
			html: baseHtml,
			lineNumberStart,
			showLineNumbers,
		});

		return {
			code: normalizedCode,
			html,
			language: resolvedLanguage,
			showLineNumbers,
			highlightLines,
			lineNumberStart,
		};
	})().catch((error) => {
		mantleHighlightCache.delete(cacheKey);
		throw error;
	});

	mantleHighlightCache.set(cacheKey, promise);
	return promise;
}

/**
 * Creates a reusable Mantle server highlighter facade for API routes.
 */
function createMantleServerSyntaxHighlighter(): MantleServerHighlighter {
	return {
		highlight: highlightWithMantleShiki,
	};
}

export {
	createMantleServerSyntaxHighlighter,
	extractHighlightedCodeInnerHtml,
	getMantleShikiHighlighter,
	highlightWithMantleShiki,
	mantleHighlightCacheMaxEntries,
	mantleShikiLanguageGrammarIds,
	mantleShikiThemeName,
};
export type { MantleHighlightInput, MantleHighlightResult, MantleServerHighlighter };
