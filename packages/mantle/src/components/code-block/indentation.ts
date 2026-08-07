import type { SupportedLanguage } from "./supported-languages.js";

const indentations = ["tabs", "spaces"] as const;
type Indentation = (typeof indentations)[number];

/**
 * Type Predicate: checks if the given value is a valid indentation type.
 */
function isIndentation(input: unknown): input is Indentation {
	return indentations.includes(input as Indentation);
}

/**
 * Infers the indentation type based on the language and preferred indentation.
 *
 * @param language - The language to check.
 * @param preferredIndentation - The preferred indentation type (overrides what is detected).
 */
function inferIndentation(
	language: SupportedLanguage,
	preferredIndentation: Indentation | undefined,
) {
	// if the user has a preferred indentation, use that regardless of the language
	if (preferredIndentation) {
		return preferredIndentation;
	}

	if (isTabIndentedLanguage(language)) {
		return "tabs";
	}

	if (isSpaceIndentedLanguage(language)) {
		return "spaces";
	}

	return "spaces";
}

export {
	//,
	indentations,
	inferIndentation,
	isIndentation,
};

export type {
	//,
	Indentation,
};

/**
 * Languages that require or strongly prefer tabs
 */
const tabIndentedLanguages = [
	"csharp",
	"css",
	"go",
	"html",
	"java",
	"javascript",
	"js",
	"jsx",
	"ts",
	"tsx",
	"typescript",
	"xml",
] as const satisfies SupportedLanguage[];

const tabIndentedLanguageSet = new Set<string>(tabIndentedLanguages);

/**
 * Languages that require or strongly prefer spaces
 */
const spaceIndentedLanguages = [
	"python",
	"py",
	"yaml",
	"yml",
	"ruby",
	"rb",
	"terraform",
	"tf",
] as const satisfies SupportedLanguage[];

const spaceIndentedLanguageSet = new Set<string>(spaceIndentedLanguages);

type TabIndentedLanguage = (typeof tabIndentedLanguages)[number];
type SpaceIndentedLanguage = (typeof spaceIndentedLanguages)[number];

/**
 * Type Predicate: checks if the given value is a required/preferred tab-indented language.
 */
function isTabIndentedLanguage(value: SupportedLanguage): value is TabIndentedLanguage {
	return tabIndentedLanguageSet.has(value);
}

/**
 * Type Predicate: checks if the given value is a required/preferred space-indented language.
 */
function isSpaceIndentedLanguage(value: SupportedLanguage): value is SpaceIndentedLanguage {
	return spaceIndentedLanguageSet.has(value);
}
