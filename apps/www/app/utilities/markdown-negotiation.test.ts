import { describe, expect, it } from "vitest";
import {
	hasMarkdownVariant,
	markdownTwinPath,
	negotiatedMarkdownResponse,
} from "./markdown-negotiation";

const markdownRequest = (path: string, accept = "text/markdown") =>
	new Request(`https://mantle.ngrok.com${path}`, { headers: { Accept: accept } });

describe("negotiatedMarkdownResponse", () => {
	it("answers a docs page with its markdown and Vary: Accept", async () => {
		const response = negotiatedMarkdownResponse(markdownRequest("/components/actions/button"));

		expect(response?.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
		expect(response?.headers.get("Vary")).toBe("Accept");
		expect(await response?.text()).not.toBe("");
	});

	it("returns null for a browser or a path with no markdown", () => {
		expect(
			negotiatedMarkdownResponse(
				markdownRequest("/components/actions/button", "text/html,*/*;q=0.8"),
			),
		).toBeNull();
		expect(negotiatedMarkdownResponse(markdownRequest("/no-such-page"))).toBeNull();
	});
});

describe("hasMarkdownVariant", () => {
	it("is true for a docs page and false for a path with no markdown", () => {
		expect(hasMarkdownVariant("/components/actions/button")).toBe(true);
		expect(hasMarkdownVariant("/no-such-page")).toBe(false);
	});
});

describe("markdownTwinPath", () => {
	it("is the .md route of a docs page, and undefined for a path with no markdown", () => {
		expect(markdownTwinPath("/components/actions/button")).toBe("/components/actions/button.md");
		expect(markdownTwinPath("/")).toBe("/index.md");
		expect(markdownTwinPath("/no-such-page")).toBeUndefined();
	});
});
