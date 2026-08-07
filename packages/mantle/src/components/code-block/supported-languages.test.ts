import { describe, expect, test } from "vitest";
import { parseLanguage, supportedLanguages } from "./supported-languages.js";

describe("parseLanguage", () => {
	test("given undefined, returns 'text'", () => {
		const lang = parseLanguage(undefined);
		expect(lang).toEqual("text");
	});

	test('given "", returns "text"', () => {
		const lang = parseLanguage("");
		expect(lang).toEqual("text");
	});

	test("given '  \t\n\r  ', returns 'text'", () => {
		const lang = parseLanguage("  \t\n\r  ");
		expect(lang).toEqual("text");
	});

	test("given invalid languages, returns 'text'", () => {
		const langs = ["fake", "language-fake", "lang-fake", "lang-", "language-"];
		for (const lang of langs) {
			const result = parseLanguage(lang);
			expect(result).toEqual("text");
		}
	});

	test("given 'lang-tsx', returns 'tsx'", () => {
		const lang = parseLanguage("lang-tsx");
		expect(lang).toEqual("tsx");
	});

	test("given 'language-tsx', returns 'tsx'", () => {
		const lang = parseLanguage("language-tsx");
		expect(lang).toEqual("tsx");
	});

	test("given terraform language classes, returns the terraform languages", () => {
		expect(parseLanguage("language-terraform")).toEqual("terraform");
		expect(parseLanguage("lang-tf")).toEqual("tf");
	});

	test("given `language-${supportedLanguage}`, returns that language", () => {
		for (const lang of supportedLanguages) {
			const className = `language-${lang}` as const;
			const result = parseLanguage(className);
			expect(result).toEqual(lang);
		}
	});
});
