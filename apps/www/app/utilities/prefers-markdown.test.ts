import { describe, expect, test } from "vitest";
import { prefersMarkdown } from "./prefers-markdown";

describe("prefersMarkdown", () => {
	test.each([
		["text/markdown", true],
		["text/markdown, text/html;q=0.9", true],
		["text/html, text/markdown", true],
		["text/markdown;q=0.9, text/html;q=0, */*;q=1", true],
		["TEXT/Markdown", true],
		["text/html, text/markdown;q=0", false],
		["text/markdown;q=0.5, text/html", false],
		["text/markdown;q=0.5, text/*;q=0.8, */*;q=0.1", false],
		["text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", false],
		["", false],
		[null, false],
		[undefined, false],
	])("answers %j with %s", (accept, expected) => {
		expect(prefersMarkdown(accept)).toBe(expected);
	});
});
