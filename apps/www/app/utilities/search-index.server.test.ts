import { describe, expect, it } from "vitest";

import { buildSearchEntries, keywordsFrom } from "./search-index.server";

describe("keywordsFrom", () => {
	it("tokenizes punctuation, drops short tokens, dedupes, and sorts", () => {
		expect(keywordsFrom("Data-table, data_table! AI v2 Kbd", "ARIA role=dialog data")).toEqual([
			"aria",
			"data",
			"dialog",
			"kbd",
			"role",
			"table",
		]);
	});
});

const manifests = {
	components: {
		components: [
			{
				name: "Zed",
				slug: "components/preview/zed",
				kind: "component",
				category: "Forms",
				status: "preview",
				importPath: "@ngrok/mantle/zed",
				docsUrl: "https://mantle.ngrok.com/components/preview/zed",
				markdownUrl: "https://mantle.ngrok.com/components/preview/zed.md",
				jsdoc: "Fallback component summary.",
			},
			{
				name: "Alpha",
				slug: "components/forms/alpha",
				kind: "component",
				category: "Forms",
				status: "stable",
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
} satisfies Parameters<typeof buildSearchEntries>[0];

describe("buildSearchEntries", () => {
	const entries = buildSearchEntries(manifests);

	it("sorts entries by name across all three manifests", () => {
		expect(entries.map((entry) => entry.name)).toEqual(["Alpha", "Beta", "Gamma", "Zed"]);
	});

	it("prefers the frontmatter summary over jsdoc", () => {
		expect(entries.find((entry) => entry.name === "Alpha")).toMatchObject({
			kind: "component",
			summary: "Frontmatter summary wins.",
			keywords: expect.arrayContaining(["alpha", "frontmatter", "jsdoc"]),
		});
	});

	it("falls back to jsdoc when the component has no summary", () => {
		expect(entries.find((entry) => entry.name === "Zed")).toMatchObject({
			kind: "component",
			summary: "Fallback component summary.",
			keywords: expect.arrayContaining(["components", "fallback", "zed"]),
		});
	});

	it("stamps hook and utility entries with their kind and import path", () => {
		expect(entries.find((entry) => entry.name === "Beta")).toMatchObject({
			kind: "hook",
			importPath: "@ngrok/mantle/hooks",
			keywords: ["beta", "hook", "summary"],
		});
		expect(entries.find((entry) => entry.name === "Gamma")).toMatchObject({
			kind: "utility",
			importPath: "@ngrok/mantle/utils",
			keywords: ["gamma", "summary", "utility"],
		});
	});
});
