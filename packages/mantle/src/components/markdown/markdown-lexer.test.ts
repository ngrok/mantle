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
		[
			"a task item's text as a paragraph",
			"- [x] # a",
			"list_item",
			{ tokens: [{ type: "checkbox" }, { type: "text", text: "# a" }] },
		],
		[
			"a URL before trailing punctuation and parentheses",
			"https://a.io/!)))",
			"link",
			{ href: "https://a.io/" },
		],
		["a URL with an uppercase scheme", "HTTPS://a.io", "link", { href: "HTTPS://a.io" }],
		["a definition that ends in `>`", "[r]: /x>\n\n[r]", "link", { href: "/x>" }],
		["an escaped `<` in a definition in `<…>`", "[r]: <a\\<b>\n\n[r]", "link", { href: "a<b" }],
		["a link after many `(`", `${"(".repeat(40)}[x](a(b)c)`, "link", { href: "a(b)c" }],
		["a fence that ends in a blank line", "```\na\n\n```", "code", { text: "a\n\n" }],
		[
			"an image's text across a hard break",
			"![first  \nsecond](/x)",
			"image",
			{ text: "first\nsecond" },
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

	test("ends a quoted table at an unquoted line", () => {
		const tokens = lexMarkdown(
			"> | Name | Value |\n> | --- | --- |\n> | a | 1 |\nThe result is ready.",
		);
		expect(tokens.map((token) => token.type)).toEqual(["blockquote", "paragraph"]);
		expect(flatten(tokens).find((token) => token.type === "table")).toMatchObject({
			rows: [[{ text: "a" }, { text: "1" }]],
		});
	});

	test("ends a table at indented code", () => {
		expect(lexMarkdown("| a | b |\n| --- | --- |\n    code").map((token) => token.type)).toEqual([
			"table",
			"code",
		]);
	});

	test("ends a quote's HTML block, not a paragraph, at a lazy line", () => {
		expect(lexMarkdown("> <div>\n> text\noutside").map((token) => token.type)).toEqual([
			"blockquote",
			"paragraph",
		]);
	});

	test("keeps no image in an image", () => {
		const tokens = lexMarkdown(`${"![".repeat(50)}x${"](/u)".repeat(50)}`);
		expect(flatten(tokens).filter((token) => token.type === "image")).toHaveLength(1);
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
		for (const source of [`[r]: ${href}\n\n[r]`, `[r]:\n${href}\n\n[r]`]) {
			expect(flatten(lexMarkdown(source)).find((token) => token.type === "link")).toMatchObject({
				href,
			});
		}
		expect(types(lexMarkdown("[r]: /a(b\n\n[r]"))).not.toContain("link");
	});

	test("keeps a block extension's token only when it ends at a line end, with the line break after it", () => {
		const note = {
			name: "note",
			level: "block" as const,
			tokenizer: (source: string) =>
				source.startsWith(":::") ? { type: "note", raw: ":::" } : undefined,
		};
		const line = {
			...note,
			tokenizer: (source: string) =>
				source.startsWith("::\n") ? { type: "note", raw: "::\n" } : undefined,
		};
		for (const source of ["::: keep this\n\n:::\n# title", "::\n\nnext"]) {
			expect(
				lexMarkdown(source, { extensions: [note, line] })
					.map((token) => token.raw)
					.join(""),
			).toBe(source);
		}
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
		[
			"many references to many definitions",
			`${Array.from({ length: 8000 }, (_, at) => `[r${at}]: /u\n`).join("")}\n${"[r0]\n\n".repeat(8000)}`,
		],
		["a URL that ends in many entities", `https://a.io/${"&amp;".repeat(16_000)}`],
		["spaces after a definition label", `[r]:${" ".repeat(40_000)}`],
		["spaces after a heading", `# title${" ".repeat(40_000)}`],
		["spaces after a delimiter row", `a | b\n- | -${" ".repeat(40_000)}x`],
		["many `@` with no email", " @b.io".repeat(40_000)],
		["a paragraph of lines that end in a space", "a \n".repeat(80_000)],
		["adjacent links with a URL as text", "[https://a.io](/u)".repeat(16_000)],
	])("lexes %s in linear time", (_, source) => {
		const start = performance.now();
		const tokens = lexMarkdown(source);
		expect(performance.now() - start).toBeLessThan(1000);
		expect(tokens.length).toBeGreaterThan(0);
	});
});
