import { describe, expect, test } from "vitest";
import { prefersMarkdown } from "./prefers-markdown";

function requestWithAccept(accept?: string): Request {
	return new Request("https://mantle.ngrok.com/components/button", {
		headers: accept == null ? undefined : { Accept: accept },
	});
}

describe("prefersMarkdown", () => {
	test.each([
		["text/markdown", true],
		["text/markdown, text/html;q=0.8", true],
		["text/markdown;q=0.5", true],
		["Text/Markdown", true],
		["text/markdown;q=0", false],
		["text/markdown; q=0, text/html", false],
		["text/html,application/xhtml+xml,*/*;q=0.8", false],
	])("answers %j with %s", (accept, expected) => {
		expect(prefersMarkdown(requestWithAccept(accept))).toBe(expected);
	});

	test("a missing Accept header does not match", () => {
		expect(prefersMarkdown(requestWithAccept())).toBe(false);
	});
});
