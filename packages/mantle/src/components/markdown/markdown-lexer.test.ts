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

	// Why 20,000: a parser that is quadratic in these inputs takes seconds, and a linear one a few milliseconds.
	test.each([
		["unclosed emphasis", "_a*".repeat(20_000)],
		["unclosed strong", "a**".repeat(20_000)],
		["unclosed link destinations", "[a](".repeat(20_000)],
		["deep quotes", "> ".repeat(20_000)],
		["deep lists", "1. ".repeat(20_000)],
	])("lexes %s in linear time", (_, source) => {
		const start = performance.now();
		const tokens = lexMarkdown(source);
		expect(performance.now() - start).toBeLessThan(1000);
		expect(tokens.length).toBeGreaterThan(0);
	});
});
