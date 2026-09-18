import { describe, expect, test } from "vitest";
import { parseLanguage } from "./supported-languages.js";

describe("parseLanguage", () => {
	test("given undefined, returns 'text'", () => {
		const lang = parseLanguage(undefined);
		expect(lang).toEqual("text");
	});

	test('given "", returns "text"', () => {
		const lang = parseLanguage("");
		expect(lang).toEqual("text");
	});

	test("trims surrounding whitespace before parsing", () => {
		const lang = parseLanguage("  language-tsx  ");
		expect(lang).toEqual("tsx");
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
});
