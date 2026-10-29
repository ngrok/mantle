import { describe, expect, test } from "vitest";
import { acceptsMarkdown, markdownTwinPath } from "./markdown-rewrite.ts";

const markdownPaths = new Set(["/index.md", "/components/actions/button.md"]);

describe("markdownTwinPath", () => {
	test("maps a page path to its prerendered markdown file", () => {
		expect(markdownTwinPath("/components/actions/button", markdownPaths)).toBe(
			"/components/actions/button.md",
		);
	});

	test("ignores the trailing slash that the static middleware redirects to", () => {
		expect(markdownTwinPath("/components/actions/button/", markdownPaths)).toBe(
			"/components/actions/button.md",
		);
	});

	test("maps the root path to the index page", () => {
		expect(markdownTwinPath("/", markdownPaths)).toBe("/index.md");
	});

	test("returns undefined for a path with no markdown twin", () => {
		expect(markdownTwinPath("/llms.txt", markdownPaths)).toBeUndefined();
	});
});

describe("acceptsMarkdown", () => {
	test("matches markdown anywhere in the header", () => {
		expect(acceptsMarkdown("text/html;q=0.9, text/markdown")).toBe(true);
	});

	test("rejects a header without markdown", () => {
		expect(acceptsMarkdown("text/html")).toBe(false);
	});

	test("rejects a missing header", () => {
		expect(acceptsMarkdown(undefined)).toBe(false);
	});
});
