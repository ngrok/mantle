import { supportedLanguages } from "@ngrok/mantle/highlight-utils";
import { describe, expect, test } from "vitest";
import { getMantleShikiHighlighter, highlightWithMantleShiki } from "./engine.js";

describe("getMantleShikiHighlighter", () => {
	test("loads a grammar for every supported language outside the plain-text family", async () => {
		const highlighter = await getMantleShikiHighlighter();
		const loadedLanguages = highlighter.getLoadedLanguages();
		// Why the exclusion: Shiki special-cases the plain-text ids and never
		// registers a grammar for them. Every other supported language must
		// appear in the loaded list — grammar names and their aliases both
		// register, so a missing entry in `mantleShikiLanguageGrammarIds`
		// turns this red.
		const plainTextFamily = new Set(["plain", "plaintext", "text", "txt"]);
		for (const language of supportedLanguages) {
			if (plainTextFamily.has(language)) {
				continue;
			}
			expect(loadedLanguages).toContain(language);
		}
	});
});

describe("highlightWithMantleShiki", () => {
	test("highlights Terraform tokens through the `tf` alias", async () => {
		const result = await highlightWithMantleShiki({
			code: 'resource "ngrok_domain" "api" {\n  domain = "api.example.com"\n}',
			language: "tf",
		});
		expect(result.language).toEqual("tf");
		expect(result.html).toContain("--shiki-token-");
	});

	test("folds a multi-line Terraform block with the bracket strategy", async () => {
		const result = await highlightWithMantleShiki({
			code: 'resource "ngrok_domain" "api" {\n  domain      = "api.example.com"\n  description = "Production API"\n}',
			language: "terraform",
		});
		expect(result.html).toContain('data-slot="fold-toggle"');
	});
});
