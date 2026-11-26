import { createHash } from "node:crypto";
import type { createHighlighter, ShikiTransformer } from "shiki";
import {
	decorateHighlightedHtml,
	inferIndentation,
	isSupportedLanguage,
	mantleShikiThemeName,
	mantleShikiTokenColors,
	normalizeIndentation,
	parseLanguage,
	type FoldLine,
	type Indentation,
	type LineRange,
	type SupportedLanguage,
	tokenClassForColor,
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
	"dotenv",
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
	"terraform",
	"tsx",
	"typescript",
	"xml",
	"yaml",
] as const satisfies SupportedLanguage[];

/**
 * Shared Shiki theme name used across Mantle highlighting.
 */
const mantleHighlightCacheMaxEntries = 1000;

/**
 * The most bytes of code and highlighted HTML that the cache holds, counted
 * as 2 bytes for each UTF-16 code unit. One result larger than this alone
 * stays cached until the next highlight. Why a byte bound: 200 results of a
 * 300-line block held 41 MB of heap, so 1,000 such results, the entry bound,
 * would hold about 200 MB.
 */
const mantleHighlightCacheMaxBytes = 32 * 1024 * 1024;

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

/**
 * Replaces each token's inline `style="color:…"` with a short class from
 * `mantle.css`, and unwraps runs in the inherited foreground color. The colors
 * stay the same; the markup shrinks.
 */
const tokenClassTransformer: ShikiTransformer = {
	name: "mantle:token-classes",
	line(node) {
		node.children = node.children.flatMap((child) => {
			const style = child.type === "element" ? child.properties.style : undefined;
			if (child.type !== "element" || typeof style !== "string" || !style.startsWith("color:")) {
				return [child];
			}
			const tokenClass = tokenClassForColor(style.slice("color:".length));
			if (tokenClass == null) {
				return [child];
			}
			if (tokenClass === "") {
				return child.children;
			}
			child.properties = { class: tokenClass };
			return [child];
		});
	},
};

let highlighterPromise: Promise<ShikiHighlighter> | undefined;
const mantleHighlightCache = createLruCache<string, Promise<MantleHighlightResult>>(
	mantleHighlightCacheMaxEntries,
	{ maxBytes: mantleHighlightCacheMaxBytes },
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

		// Why after Shiki's own scopes: a more specific scope wins over its group.
		cssVarsTheme.tokenColors = [...(cssVarsTheme.tokenColors ?? []), ...mantleShikiTokenColors];

		return createHighlighter({
			themes: [cssVarsTheme],
			langs: [...mantleShikiLanguageGrammarIds],
		});
	})().catch((error: unknown) => {
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
						tokenClassTransformer,
						{
							name: "mantle:capture-tokens",
							tokens(tokens) {
								capturedTokens = tokens;
							},
						},
					]
				: [tokenClassTransformer],
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
		});

		return {
			code: normalizedCode,
			html,
			language: resolvedLanguage,
			showLineNumbers,
			highlightLines,
			lineNumberStart,
		};
	})();

	mantleHighlightCache.set(cacheKey, promise, normalizedCode.length * 2);
	// Why the identity checks: an eviction can drop this entry, and a newer
	// call can then store another promise for the same key. Why `resize` on
	// success: the size of the HTML is known only then, and the entry keeps
	// the recency of its request.
	void promise.then(
		({ html }) => {
			if (mantleHighlightCache.peek(cacheKey) === promise) {
				mantleHighlightCache.resize(cacheKey, (normalizedCode.length + html.length) * 2);
			}
			return undefined;
		},
		() => {
			if (mantleHighlightCache.peek(cacheKey) === promise) {
				mantleHighlightCache.delete(cacheKey);
			}
		},
	);
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
	mantleHighlightCacheMaxBytes,
	mantleHighlightCacheMaxEntries,
	mantleShikiLanguageGrammarIds,
	mantleShikiThemeName,
};
export type {
	//,
	MantleHighlightInput,
	MantleHighlightResult,
	MantleServerHighlighter,
};
