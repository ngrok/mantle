/**
 * List of supported languages for syntax highlighting.
 * @private
 */
export const supportedLanguages = [
	"bash",
	"cs",
	"csharp",
	"css",
	"go",
	"html",
	"java",
	"javascript",
	"js",
	"json",
	"jsx",
	"plain",
	"plaintext",
	"py",
	"python",
	"rb",
	"ruby",
	"rust",
	"sh",
	"shell",
	"terraform",
	"text",
	"tf",
	"ts",
	"tsx",
	"txt",
	"typescript",
	"xml",
	"yaml",
	"yml",
] as const;

/**
 * Supported languages for syntax highlighting.
 */
type SupportedLanguage = (typeof supportedLanguages)[number];
const supportedLanguageSet = new Set<SupportedLanguage>(supportedLanguages);
const defaultLanguage = "text" satisfies SupportedLanguage;

/**
 * Parses a markdown code block (```) language class into a SupportedLanguage.
 * Defaults to "text" if no supported language is found.
 */
function parseLanguage(
	value: `language-${string}` | `lang-${string}` | (string & {}) | undefined,
): SupportedLanguage {
	const trimmed = value?.trim() ?? "";
	if (!trimmed) {
		return defaultLanguage;
	}

	// remove leading "language-" and "lang-" prefixes
	// find first '-' and slice from there
	const prefixSeparatorIndex = trimmed.indexOf("-");
	const maybeLanguage =
		prefixSeparatorIndex === -1 ? trimmed : trimmed.slice(prefixSeparatorIndex + 1);

	return isSupportedLanguage(maybeLanguage) ? maybeLanguage : defaultLanguage;
}

/**
 * Type Predicate: checks if an arbitrary value is a supported syntax highlighting language.
 */
const isSupportedLanguage = (value: unknown): value is SupportedLanguage => {
	return typeof value === "string" && supportedLanguageSet.has(value as SupportedLanguage);
};

export {
	//,
	isSupportedLanguage,
	parseLanguage,
};

export type { SupportedLanguage };
