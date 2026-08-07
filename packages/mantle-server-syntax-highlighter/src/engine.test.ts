import { supportedLanguages } from "@ngrok/mantle/highlight-utils";
import { describe, expect, test } from "vitest";
import { highlightWithMantleShiki } from "./engine.js";

describe("highlightWithMantleShiki", () => {
	test("resolves every supported language to its own grammar, never the text fallback", async () => {
		for (const language of supportedLanguages) {
			const result = await highlightWithMantleShiki({ code: "x", language });
			expect(result.language).toEqual(language);
		}
	});

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
