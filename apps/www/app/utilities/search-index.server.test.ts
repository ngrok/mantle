import { describe, expect, it } from "vitest";

import { buildSearchEntries, keywordsFrom } from "./search-index.server";

describe("keywordsFrom", () => {
	it("tokenizes punctuation, drops short tokens, dedupes, and sorts", () => {
		expect(keywordsFrom("Data-table, data_table! AI v2", "ARIA role=dialog data")).toEqual([
			"aria",
			"data",
			"dialog",
			"role",
			"table",
		]);
	});
});

describe("buildSearchEntries", () => {
	it("uses summary fallbacks and returns stable sorted entries", () => {
		const entries = buildSearchEntries({
			components: {
				components: [
					{
						name: "Zed",
						slug: "components/preview/zed",
						kind: "component" as const,
						category: "Forms" as const,
						status: "preview" as const,
						importPath: "@ngrok/mantle/zed",
						docsUrl: "https://mantle.ngrok.com/components/preview/zed",
						markdownUrl: "https://mantle.ngrok.com/components/preview/zed.md",
						jsdoc: "Fallback component summary.",
					},
					{
						name: "Alpha",
						slug: "components/forms/alpha",
						kind: "component" as const,
						category: "Forms" as const,
						status: "stable" as const,
						importPath: "@ngrok/mantle/alpha",
						docsUrl: "https://mantle.ngrok.com/components/forms/alpha",
						markdownUrl: "https://mantle.ngrok.com/components/forms/alpha.md",
						summary: "Frontmatter summary wins.",
						jsdoc: "JSDoc fallback should not win.",
					},
				],
			},
			hooks: {
				hooks: [
					{
						name: "Beta",
						importPath: "@ngrok/mantle/hooks",
						docsUrl: "https://mantle.ngrok.com/hooks",
						markdownUrl: "https://mantle.ngrok.com/hooks.md",
						summary: "Beta hook summary.",
					},
				],
			},
			utilities: {
				utilities: [
					{
						name: "Gamma",
						importPath: "@ngrok/mantle/utils",
						docsUrl: "https://mantle.ngrok.com/utils/gamma",
						markdownUrl: "https://mantle.ngrok.com/utils/gamma.md",
						summary: "Gamma utility summary.",
					},
				],
			},
		});

		expect(entries.map((entry) => entry.name)).toEqual(["Alpha", "Beta", "Gamma", "Zed"]);
		expect(entries.find((entry) => entry.name === "Alpha")).toMatchObject({
			kind: "component",
			summary: "Frontmatter summary wins.",
			keywords: expect.arrayContaining(["alpha", "frontmatter", "jsdoc"]),
		});
		expect(entries.find((entry) => entry.name === "Zed")).toMatchObject({
			kind: "component",
			summary: "Fallback component summary.",
			keywords: expect.arrayContaining(["components", "fallback", "zed"]),
		});
		expect(entries.every((entry) => entry.importPath && entry.keywords.length > 0)).toBe(true);
	});
});
