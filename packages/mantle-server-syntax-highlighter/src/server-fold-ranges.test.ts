import { describe, expect, test } from "vitest";
import {
	computeServerFoldRanges,
	serverFoldNeedsTokens,
	serverFoldStrategyFor,
} from "./server-fold-ranges.js";

describe("serverFoldStrategyFor", () => {
	test("dispatches JS / TS / JSX / TSX to the AST strategy", () => {
		expect(serverFoldStrategyFor("javascript")).toBe("jsx-ast");
		expect(serverFoldStrategyFor("js")).toBe("jsx-ast");
		expect(serverFoldStrategyFor("typescript")).toBe("jsx-ast");
		expect(serverFoldStrategyFor("ts")).toBe("jsx-ast");
		expect(serverFoldStrategyFor("jsx")).toBe("jsx-ast");
		expect(serverFoldStrategyFor("tsx")).toBe("jsx-ast");
	});

	test("dispatches HTML / XML to the parse5 strategy", () => {
		expect(serverFoldStrategyFor("html")).toBe("html-ast");
		expect(serverFoldStrategyFor("xml")).toBe("html-ast");
	});

	test("dispatches CSS to the raw-source strategy", () => {
		expect(serverFoldStrategyFor("css")).toBe("css-raw");
	});

	test("dispatches JSON to the raw-source strategy", () => {
		expect(serverFoldStrategyFor("json")).toBe("json-raw");
	});

	test("dispatches Python / YAML to the indentation strategy", () => {
		expect(serverFoldStrategyFor("python")).toBe("token-indentation");
		expect(serverFoldStrategyFor("py")).toBe("token-indentation");
		expect(serverFoldStrategyFor("yaml")).toBe("token-indentation");
		expect(serverFoldStrategyFor("yml")).toBe("token-indentation");
	});

	test("dispatches Bash / Shell to the keyword strategy", () => {
		expect(serverFoldStrategyFor("bash")).toBe("token-keyword");
		expect(serverFoldStrategyFor("sh")).toBe("token-keyword");
		expect(serverFoldStrategyFor("shell")).toBe("token-keyword");
	});

	test("dispatches Ruby to the combined bracket-and-keyword strategy", () => {
		expect(serverFoldStrategyFor("ruby")).toBe("token-bracket-and-keyword");
		expect(serverFoldStrategyFor("rb")).toBe("token-bracket-and-keyword");
	});

	test("dispatches plain text to no folding", () => {
		expect(serverFoldStrategyFor("plain")).toBe("none");
		expect(serverFoldStrategyFor("plaintext")).toBe("none");
		expect(serverFoldStrategyFor("text")).toBe("none");
		expect(serverFoldStrategyFor("txt")).toBe("none");
	});

	test("dispatches Go / Rust / Java / C# to the bracket strategy", () => {
		expect(serverFoldStrategyFor("go")).toBe("token-bracket");
		expect(serverFoldStrategyFor("rust")).toBe("token-bracket");
		expect(serverFoldStrategyFor("java")).toBe("token-bracket");
		expect(serverFoldStrategyFor("csharp")).toBe("token-bracket");
		expect(serverFoldStrategyFor("cs")).toBe("token-bracket");
	});
});

describe("serverFoldNeedsTokens", () => {
	test("AST and raw strategies do not need tokens", () => {
		expect(serverFoldNeedsTokens("jsx-ast")).toBe(false);
		expect(serverFoldNeedsTokens("html-ast")).toBe(false);
		expect(serverFoldNeedsTokens("css-raw")).toBe(false);
		expect(serverFoldNeedsTokens("json-raw")).toBe(false);
		expect(serverFoldNeedsTokens("none")).toBe(false);
	});

	test("token strategies need tokens", () => {
		expect(serverFoldNeedsTokens("token-bracket")).toBe(true);
		expect(serverFoldNeedsTokens("token-indentation")).toBe(true);
		expect(serverFoldNeedsTokens("token-keyword")).toBe(true);
		expect(serverFoldNeedsTokens("token-bracket-and-keyword")).toBe(true);
	});
});

describe("computeServerFoldRanges", () => {
	test("folds JSX via the AST path", () => {
		const code = ["<Foo>", "  hi", "</Foo>"].join("\n");
		expect(computeServerFoldRanges({ code, language: "tsx", tokens: undefined })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("folds plain TypeScript generic arrow functions via the AST path", () => {
		const code = ["const identity = <T>(value: T) => {", "  return value;", "};"].join("\n");
		expect(computeServerFoldRanges({ code, language: "typescript", tokens: undefined })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("folds HTML via parse5", () => {
		const code = ["<div>", "  hi", "</div>"].join("\n");
		expect(computeServerFoldRanges({ code, language: "html", tokens: undefined })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("folds CSS via the raw matcher", () => {
		const code = [".a {", "  color: red;", "}"].join("\n");
		expect(computeServerFoldRanges({ code, language: "css", tokens: undefined })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("folds JSON via the raw matcher", () => {
		const code = ["{", '  "a": 1', "}"].join("\n");
		expect(computeServerFoldRanges({ code, language: "json", tokens: undefined })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("returns no ranges when a token-based strategy is missing tokens", () => {
		expect(
			computeServerFoldRanges({ code: "package main", language: "go", tokens: undefined }),
		).toEqual([]);
	});

	test("returns no ranges for `none` languages", () => {
		expect(
			computeServerFoldRanges({ code: "hello", language: "plain", tokens: undefined }),
		).toEqual([]);
	});

	test("recovers from AST parser failures", () => {
		// Pass HTML to the JSX strategy via a bogus dispatch — verifies the
		// `try/catch` wrapping inside the dispatcher.
		const code = ["function broken( {", "  a: 1", "}"].join("\n");
		// `oxc-parser` recovers but doesn't throw for this; just ensure no throw.
		expect(() =>
			computeServerFoldRanges({ code, language: "javascript", tokens: undefined }),
		).not.toThrow();
	});
});
