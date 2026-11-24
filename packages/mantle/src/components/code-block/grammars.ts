import type { LanguageRegistration } from "@shikijs/core";
import type { SupportedLanguage } from "./supported-languages.js";

/** The ID of a grammar that a browser can highlight. `line-tokenizer.ts` loads each one. */
type GrammarId =
	| "bash"
	| "csharp"
	| "css"
	| "dotenv"
	| "go"
	| "html"
	| "java"
	| "javascript"
	| "json"
	| "jsx"
	| "python"
	| "ruby"
	| "rust"
	| "terraform"
	| "tsx"
	| "typescript"
	| "xml"
	| "yaml";

/**
 * The grammar for each supported language, or `undefined` for plain text.
 * Why a full record: a new supported language fails typecheck until it names its grammar.
 */
const grammarByLanguage = {
	bash: "bash",
	cs: "csharp",
	csharp: "csharp",
	css: "css",
	dotenv: "dotenv",
	go: "go",
	html: "html",
	java: "java",
	javascript: "javascript",
	js: "javascript",
	json: "json",
	jsx: "jsx",
	plain: undefined,
	plaintext: undefined,
	py: "python",
	python: "python",
	rb: "ruby",
	ruby: "ruby",
	rust: "rust",
	sh: "bash",
	shell: "bash",
	terraform: "terraform",
	text: undefined,
	tf: "terraform",
	ts: "typescript",
	tsx: "tsx",
	txt: undefined,
	typescript: "typescript",
	xml: "xml",
	yaml: "yaml",
	yml: "yaml",
} as const satisfies Record<SupportedLanguage, GrammarId | undefined>;

/**
 * Returns the grammar that highlights `language`, or `undefined` when the
 * language renders as plain text.
 *
 * @example
 * grammarForLanguage("ts"); // "typescript"
 * grammarForLanguage("text"); // undefined
 */
function grammarForLanguage(language: SupportedLanguage): GrammarId | undefined {
	return grammarByLanguage[language];
}

/**
 * Loads each grammar's registrations: the grammar and each grammar it embeds.
 * Each import is its own chunk, so a page loads only the grammars of the
 * blocks it shows. Why JSON grammars: each module holds one `JSON.parse` call,
 * which parses fast, and the plain objects can go to a worker in a message.
 */
const grammarLoaders = {
	bash: () => import("@shikijs/langs/bash"),
	csharp: () => import("@shikijs/langs/csharp"),
	css: () => import("@shikijs/langs/css"),
	dotenv: () => import("@shikijs/langs/dotenv"),
	go: () => import("@shikijs/langs/go"),
	html: () => import("@shikijs/langs/html"),
	java: () => import("@shikijs/langs/java"),
	javascript: () => import("@shikijs/langs/javascript"),
	json: () => import("@shikijs/langs/json"),
	jsx: () => import("@shikijs/langs/jsx"),
	python: () => import("@shikijs/langs/python"),
	ruby: () => import("@shikijs/langs/ruby"),
	rust: () => import("@shikijs/langs/rust"),
	terraform: () => import("@shikijs/langs/terraform"),
	tsx: () => import("@shikijs/langs/tsx"),
	typescript: () => import("@shikijs/langs/typescript"),
	xml: () => import("@shikijs/langs/xml"),
	yaml: () => import("@shikijs/langs/yaml"),
} satisfies Record<GrammarId, () => Promise<{ default: LanguageRegistration[] }>>;

/**
 * Loads the registrations of `grammar`.
 *
 * @example
 * const registrations = await loadGrammar("yaml"); // [{ name: "yaml", scopeName: "source.yaml", … }]
 */
async function loadGrammar(grammar: GrammarId): Promise<LanguageRegistration[]> {
	const module = await grammarLoaders[grammar]();
	return module.default;
}

export {
	//,
	grammarForLanguage,
	loadGrammar,
};

export type {
	//,
	GrammarId,
};
