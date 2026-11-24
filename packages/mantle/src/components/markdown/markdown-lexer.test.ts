import type { Token } from "marked";
import { describe, expect, test } from "vitest";
import { lexMarkdown } from "./markdown-lexer.js";

/** Each token in `tokens` and in their children, depth first. */
function flatten(tokens: readonly Token[]): Token[] {
	return tokens.flatMap((token) => [
		token,
		...("tokens" in token && token.tokens != null ? flatten(token.tokens) : []),
		...(token.type === "list" ? flatten(token.items) : []),
	]);
}

const types = (tokens: readonly Token[]) => flatten(tokens).map((token) => token.type);

describe("lexMarkdown", () => {
	test("keeps the tabs of a code block", () => {
		const [code] = lexMarkdown("```go\nfunc main() {\n\tfmt.Println(1)\n}\n```");
		expect(code).toMatchObject({
			type: "code",
			lang: "go",
			text: "func main() {\n\tfmt.Println(1)\n}",
		});
	});

	test("keeps a lazy `===` in a list item as text, also in a code span", () => {
		const tokens = lexMarkdown("- `a\n===`");
		expect(types(tokens)).not.toContain("heading");
		expect(flatten(tokens).find((token) => token.type === "codespan")).toMatchObject({
			text: "a ===",
		});
	});

	test("continues a definition's paragraph with a list that cannot interrupt it", () => {
		const tokens = lexMarkdown("[a]: /u\n2) b");
		expect(types(tokens)).toEqual(["def", "paragraph", "text"]);
	});

	test.each([
		["a URL as a link's text", "[https://ngrok.com](/ok)", "link", { href: "/ok" }],
		[
			"an email in emphasis in a link",
			"[**a@b.com**](/ok)",
			"strong",
			{ tokens: [{ type: "text" }] },
		],
		["a single-column table", "Name\n| --- |\nvalue", "table", { rows: [[{ text: "value" }]] }],
		["emphasis after an emoji", "🎉_done_", "em", { text: "done" }],
		["an escaped `<` in a destination in `<…>`", "[a](<b\\<c>)", "link", { href: "b<c" }],
		[
			"an entity in an autolink's URL",
			"<https://a.io/?x=1&amp;y=2>",
			"link",
			{ href: "https://a.io/?x=1&y=2" },
		],
	])("reads %s", (...[, source, type, expected]) => {
		expect(flatten(lexMarkdown(source)).find((token) => token.type === type)).toMatchObject(
			expected,
		);
	});

	test("keeps an autolink in a link's text as text", () => {
		const links = flatten(lexMarkdown("[<https://a.io> and <a@b.io>](/ok)")).filter(
			(token) => token.type === "link",
		);
		expect(links).toMatchObject([{ href: "/ok", text: "<https://a.io> and <a@b.io>" }]);
	});

	test("keeps emphasis past the nesting limit as text", () => {
		const depth = (tokens: readonly Token[]): number =>
			Math.max(
				0,
				...tokens.map((token) => ("tokens" in token && token.tokens ? 1 + depth(token.tokens) : 0)),
			);
		const tokens = lexMarkdown(`${"*".repeat(200)}x${"*".repeat(200)}`);
		expect(depth(tokens)).toBeLessThan(40);
		expect(tokens.map((token) => token.raw).join("")).toBe(`${"*".repeat(200)}x${"*".repeat(200)}`);
	});

	test("splits a table cell at a pipe after an even run of backslashes", () => {
		const [table] = lexMarkdown("| a | b |\n| - | - |\n| x\\\\| y |");
		expect(table).toMatchObject({ rows: [[{ text: "x\\\\" }, { text: "y" }]] });
	});

	test("ends a fence in a nested quote with the quote", () => {
		expect(lexMarkdown("> > ```\n> > code\noutside").map((token) => token.type)).toEqual([
			"blockquote",
			"paragraph",
		]);
	});

	test("reads a definition with a URL longer than 4,096 characters, and not one with unpaired parentheses", () => {
		const href = `https://ngrok.com/${"x".repeat(5000)}`;
		expect(
			flatten(lexMarkdown(`[r]: ${href}\n\n[r]`)).find((token) => token.type === "link"),
		).toMatchObject({ href });
		expect(types(lexMarkdown("[r]: /a(b\n\n[r]"))).not.toContain("link");
	});

	test("keeps a block extension's token only when it ends at a line end", () => {
		const note = {
			name: "note",
			level: "block" as const,
			tokenizer: (source: string) =>
				source.startsWith(":::") ? { type: "note", raw: ":::" } : undefined,
		};
		const source = "::: keep this\n\nnext";
		expect(
			lexMarkdown(source, { extensions: [note] })
				.map((token) => token.raw)
				.join(""),
		).toBe(source);
	});

	// Why 20,000: a parser that is quadratic in these inputs takes seconds, and a linear one a few milliseconds.
	test.each([
		["unclosed emphasis", "_a*".repeat(20_000)],
		["unclosed strong", "a**".repeat(20_000)],
		["unclosed link destinations", "[a](".repeat(20_000)],
		["deep quotes", "> ".repeat(20_000)],
		["deep lists", "1. ".repeat(20_000)],
		["a URL that ends in many `)`", `https://ngrok.com/${")".repeat(20_000)}`],
		["nested brackets", `${"[".repeat(40_000)}x${"]".repeat(40_000)}`],
		[
			"backtick runs of each length",
			Array.from({ length: 1500 }, (_, at) => `${"`".repeat(at + 1)}a`).join(""),
		],
		["unclosed comments", `x ${"<!--".repeat(40_000)}`],
		["nested images", `${"![".repeat(20_000)}x${"](/u)".repeat(20_000)}`],
	])("lexes %s in linear time", (_, source) => {
		const start = performance.now();
		const tokens = lexMarkdown(source);
		expect(performance.now() - start).toBeLessThan(1000);
		expect(tokens.length).toBeGreaterThan(0);
	});
});
