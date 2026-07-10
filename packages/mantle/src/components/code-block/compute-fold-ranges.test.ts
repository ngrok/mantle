import { describe, expect, test } from "vitest";
import { computeFoldRanges, foldStrategyFor, type FoldLine } from "./compute-fold-ranges.js";

/**
 * Builds a single token with the given content and (optionally nested) scope
 * names. Scope chains read outermost-to-innermost — the last entry is what
 * the strategy filter checks.
 */
function token(content: string, ...scopeNames: string[]) {
	return {
		content,
		explanation: [
			{
				content,
				scopes: scopeNames.map((scopeName) => ({ scopeName })),
			},
		],
	};
}

/** Builds a token whose explanation content differs from the raw token text. */
function tokenWithExplanation(
	content: string,
	explanationContent: string,
	...scopeNames: string[]
) {
	return {
		content,
		explanation: [
			{
				content: explanationContent,
				scopes: scopeNames.map((scopeName) => ({ scopeName })),
			},
		],
	};
}

/**
 * Builds a tokenized line from a list of [content, ...scopeNames] tuples.
 * Each tuple becomes one token; the line itself is a flat array.
 */
function line(...parts: (string | [string, ...string[]])[]): FoldLine {
	return parts.map((part) => {
		if (typeof part === "string") {
			return token(part);
		}
		const [content, ...scopes] = part;
		return token(content, ...scopes);
	});
}

describe("foldStrategyFor", () => {
	test("returns 'bracket' for C-family languages", () => {
		expect(foldStrategyFor("javascript")).toBe("bracket");
		expect(foldStrategyFor("typescript")).toBe("bracket");
		expect(foldStrategyFor("tsx")).toBe("bracket");
		expect(foldStrategyFor("jsx")).toBe("bracket");
		expect(foldStrategyFor("go")).toBe("bracket");
		expect(foldStrategyFor("rust")).toBe("bracket");
		expect(foldStrategyFor("java")).toBe("bracket");
		expect(foldStrategyFor("csharp")).toBe("bracket");
		expect(foldStrategyFor("css")).toBe("bracket");
		expect(foldStrategyFor("json")).toBe("bracket");
	});

	test("returns 'indentation' for whitespace-significant languages", () => {
		expect(foldStrategyFor("python")).toBe("indentation");
		expect(foldStrategyFor("py")).toBe("indentation");
		expect(foldStrategyFor("yaml")).toBe("indentation");
		expect(foldStrategyFor("yml")).toBe("indentation");
	});

	test("returns 'tag' for markup languages", () => {
		expect(foldStrategyFor("html")).toBe("tag");
		expect(foldStrategyFor("xml")).toBe("tag");
	});

	test("returns 'none' for plain text and shell languages", () => {
		expect(foldStrategyFor("plain")).toBe("none");
		expect(foldStrategyFor("plaintext")).toBe("none");
		expect(foldStrategyFor("text")).toBe("none");
		expect(foldStrategyFor("txt")).toBe("none");
		expect(foldStrategyFor("bash")).toBe("none");
		expect(foldStrategyFor("sh")).toBe("none");
		expect(foldStrategyFor("shell")).toBe("none");
	});
});

describe("computeFoldRanges (bracket strategy)", () => {
	test("returns no ranges for empty input", () => {
		expect(computeFoldRanges({ language: "javascript", tokens: [] })).toEqual([]);
	});

	test("folds a multi-line object literal", () => {
		const tokens: FoldLine[] = [
			line(["const x = ", "source.js"], ["{", "punctuation.section.block.begin.js"]),
			line(["  a: 1,", "source.js"]),
			line(["}", "punctuation.section.block.end.js"]),
		];
		expect(computeFoldRanges({ language: "javascript", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("folds a multi-line array literal", () => {
		const tokens: FoldLine[] = [
			line(["[", "punctuation.definition.array.begin"]),
			line(["  1,"]),
			line(["  2"]),
			line(["]", "punctuation.definition.array.end"]),
		];
		expect(computeFoldRanges({ language: "json", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 4 },
		]);
	});

	test("emits nested ranges for nested structures", () => {
		const tokens: FoldLine[] = [
			line(["{"]),
			line(["  a: {"]),
			line(["    b: 1"]),
			line(["  }"]),
			line(["}"]),
		];
		expect(computeFoldRanges({ language: "javascript", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 5 },
			{ id: "2", startLine: 2, endLine: 4 },
		]);
	});

	test("ignores brackets inside string literals via scope filter", () => {
		const tokens: FoldLine[] = [
			line(["{"]),
			line(
				["  msg: ", "source.js"],
				['"', "string.quoted.double.js", "punctuation.definition.string.begin.js"],
				["text with [ and ] and { and }", "string.quoted.double.js"],
				['"', "string.quoted.double.js", "punctuation.definition.string.end.js"],
			),
			line(["}"]),
		];
		expect(computeFoldRanges({ language: "javascript", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("ignores brackets inside comments via scope filter", () => {
		const tokens: FoldLine[] = [
			line(["{"]),
			line(["  // ignore [ and { and }", "comment.line.double-slash.js"]),
			line(["}"]),
		];
		expect(computeFoldRanges({ language: "javascript", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("does not fold parenthesized argument lists", () => {
		const tokens: FoldLine[] = [line(["fn("]), line(["  a,"]), line(["  b"]), line([")"])];
		expect(computeFoldRanges({ language: "javascript", tokens })).toEqual([]);
	});

	test("only keeps the outermost fold when several brackets open on the same line", () => {
		const tokens: FoldLine[] = [
			line(["{"], ["[", "punctuation.section.array.begin"]),
			line(["  1,"]),
			line(["  2"]),
			line(["]"], ["}"]),
		];
		expect(computeFoldRanges({ language: "json", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 4 },
		]);
	});

	test("tolerates unmatched brackets without throwing", () => {
		const tokens: FoldLine[] = [line(["{"]), line(["  a:"])];
		expect(computeFoldRanges({ language: "javascript", tokens })).toEqual([]);
	});

	test("tolerates extra closers without throwing", () => {
		const tokens: FoldLine[] = [line(["}"]), line(["]"])];
		expect(computeFoldRanges({ language: "javascript", tokens })).toEqual([]);
	});

	test("handles tokens without explanation arrays", () => {
		const tokens: FoldLine[] = [[{ content: "{" }], [{ content: "  body" }], [{ content: "}" }]];
		expect(computeFoldRanges({ language: "javascript", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});
});

describe("computeFoldRanges (indentation strategy)", () => {
	test("folds a Python def block", () => {
		const tokens: FoldLine[] = [
			line(["def greet(name):"]),
			line(["    print('hi')"]),
			line(["    return None"]),
			line(["greet('world')"]),
		];
		expect(computeFoldRanges({ language: "python", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 4 },
		]);
	});

	test("emits nested ranges for nested indentation", () => {
		const tokens: FoldLine[] = [
			line(["class A:"]),
			line(["    def m(self):"]),
			line(["        return 1"]),
			line(["    def n(self):"]),
			line(["        return 2"]),
		];
		const ranges = computeFoldRanges({ language: "python", tokens });
		expect(ranges).toEqual([
			{ id: "1", startLine: 1, endLine: 6 },
			{ id: "2", startLine: 2, endLine: 4 },
			{ id: "4", startLine: 4, endLine: 6 },
		]);
	});

	test("includes blank lines inside the block", () => {
		const tokens: FoldLine[] = [
			line(["def f():"]),
			line(["    a = 1"]),
			line([""]),
			line(["    b = 2"]),
		];
		expect(computeFoldRanges({ language: "python", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 5 },
		]);
	});

	test("does not fold a single-line block", () => {
		const tokens: FoldLine[] = [line(["def f(): return 1"]), line(["other = 2"])];
		expect(computeFoldRanges({ language: "python", tokens })).toEqual([]);
	});

	test("folds a YAML mapping", () => {
		const tokens: FoldLine[] = [
			line(["server:"]),
			line(["  host: localhost"]),
			line(["  port: 8080"]),
			line(["client: foo"]),
		];
		expect(computeFoldRanges({ language: "yaml", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 4 },
		]);
	});

	test("treats tabs as one column", () => {
		const tokens: FoldLine[] = [line(["root:"]), line(["\tchild: 1"]), line(["\tother: 2"])];
		expect(computeFoldRanges({ language: "yaml", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 4 },
		]);
	});
});

describe("computeFoldRanges (tag strategy)", () => {
	test("folds a multi-line element", () => {
		const tokens: FoldLine[] = [line(["<div>"]), line(["  hello"]), line(["</div>"])];
		expect(computeFoldRanges({ language: "html", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("emits nested ranges", () => {
		const tokens: FoldLine[] = [
			line(["<section>"]),
			line(["  <p>"]),
			line(["    text"]),
			line(["  </p>"]),
			line(["</section>"]),
		];
		expect(computeFoldRanges({ language: "html", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 5 },
			{ id: "2", startLine: 2, endLine: 4 },
		]);
	});

	test("treats void elements as non-openers", () => {
		const tokens: FoldLine[] = [
			line(["<div>"]),
			line(["  <br>"]),
			line(['  <img src="x.png">']),
			line(["</div>"]),
		];
		expect(computeFoldRanges({ language: "html", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 4 },
		]);
	});

	test("treats self-closing tags as non-openers", () => {
		const tokens: FoldLine[] = [
			line(["<root>"]),
			line(["  <node/>"]),
			line(["  <other />"]),
			line(["</root>"]),
		];
		expect(computeFoldRanges({ language: "xml", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 4 },
		]);
	});

	test("preserves token whitespace when matching tag names", () => {
		const tokens: FoldLine[] = [
			[token("<div"), tokenWithExplanation(' class="x">', 'class="x">')],
			line(["  <span>"]),
			line(["  </span>"]),
			line(["</div>"]),
		];
		expect(computeFoldRanges({ language: "html", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 4 },
			{ id: "2", startLine: 2, endLine: 3 },
		]);
	});

	test("ignores angle brackets inside quoted attributes", () => {
		const tokens: FoldLine[] = [
			line(['<div data-label="1 > 0">']),
			line(["  hello"]),
			line(["</div>"]),
		];
		expect(computeFoldRanges({ language: "html", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("ignores tag-like text inside comments and strings", () => {
		const tokens: FoldLine[] = [
			line(["<div>"]),
			line("  ", ["<!-- <span> -->", "comment.block.html"]),
			line(["</div>"]),
		];
		expect(computeFoldRanges({ language: "html", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("does not fold an inline element", () => {
		const tokens: FoldLine[] = [line(["<p>hello <span>world</span></p>"])];
		expect(computeFoldRanges({ language: "html", tokens })).toEqual([]);
	});

	test("tolerates mismatched closers", () => {
		const tokens: FoldLine[] = [line(["<div>"]), line(["</span>"])];
		expect(computeFoldRanges({ language: "html", tokens })).toEqual([]);
	});
});

describe("computeFoldRanges (none strategy)", () => {
	test("returns no ranges for plain text", () => {
		const tokens: FoldLine[] = [line(["{"]), line(["}"])];
		expect(computeFoldRanges({ language: "plain", tokens })).toEqual([]);
		expect(computeFoldRanges({ language: "text", tokens })).toEqual([]);
	});
});
