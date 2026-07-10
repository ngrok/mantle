import type { FoldLine } from "@ngrok/mantle/highlight-utils";
import { describe, expect, test } from "vitest";
import { computeKeywordFoldRanges } from "./compute-keyword-fold-ranges.js";

/**
 * Builds a token with the given content and (optionally nested) scope names.
 * The last scope is the innermost — what the inert-scope filter checks.
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

/** Builds a tokenized line from a list of [content, ...scopeNames] tuples. */
function line(...parts: (string | [string, ...string[]])[]): FoldLine {
	return parts.map((part) => {
		if (typeof part === "string") {
			return token(part);
		}
		const [content, ...scopes] = part;
		return token(content, ...scopes);
	});
}

describe("computeKeywordFoldRanges (ruby)", () => {
	test("returns no ranges for empty input", () => {
		expect(computeKeywordFoldRanges({ language: "ruby", tokens: [] })).toEqual([]);
	});

	test("folds a def block", () => {
		const tokens: FoldLine[] = [line(["def greet(name)"]), line(["  puts name"]), line(["end"])];
		expect(computeKeywordFoldRanges({ language: "ruby", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("folds a class with nested def", () => {
		const tokens: FoldLine[] = [
			line(["class Greeter"]),
			line(["  def greet(name)"]),
			line(["    puts name"]),
			line(["  end"]),
			line(["end"]),
		];
		expect(computeKeywordFoldRanges({ language: "ruby", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 5 },
			{ id: "2", startLine: 2, endLine: 4 },
		]);
	});

	test("folds a do/end block", () => {
		const tokens: FoldLine[] = [line(["[1, 2, 3].each do |n|"]), line(["  puts n"]), line(["end"])];
		expect(computeKeywordFoldRanges({ language: "ruby", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("folds a begin/rescue/end block as one fold", () => {
		const tokens: FoldLine[] = [
			line(["begin"]),
			line(["  do_thing"]),
			line(["rescue StandardError => e"]),
			line(["  puts e"]),
			line(["end"]),
		];
		// `rescue` does not pop the stack — the begin..end is a single fold.
		expect(computeKeywordFoldRanges({ language: "ruby", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 5 },
		]);
	});

	test("ignores keyword-like text inside strings", () => {
		const tokens: FoldLine[] = [
			line(["def foo"]),
			line(
				["  ", "source.ruby"],
				['"', "string.quoted.double.ruby", "punctuation.definition.string.begin.ruby"],
				["do something or end", "string.quoted.double.ruby"],
				['"', "string.quoted.double.ruby", "punctuation.definition.string.end.ruby"],
			),
			line(["end"]),
		];
		expect(computeKeywordFoldRanges({ language: "ruby", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("ignores keyword-like text inside comments", () => {
		const tokens: FoldLine[] = [
			line(["def foo"]),
			line(["  ", "source.ruby"], ["# do this; end", "comment.line.number-sign.ruby"]),
			line(["end"]),
		];
		expect(computeKeywordFoldRanges({ language: "ruby", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("does not fold a single-line construct", () => {
		const tokens: FoldLine[] = [line(["def foo; end"])];
		expect(computeKeywordFoldRanges({ language: "ruby", tokens })).toEqual([]);
	});

	test("does not fold a modifier-if statement", () => {
		// `x = 1 if condition` is a one-liner; `if` is mid-line and shouldn't fold.
		const tokens: FoldLine[] = [line(["puts x if condition"]), line(["other"])];
		expect(computeKeywordFoldRanges({ language: "ruby", tokens })).toEqual([]);
	});
});

describe("computeKeywordFoldRanges (bash)", () => {
	test("folds an if/fi block", () => {
		const tokens: FoldLine[] = [line(["if [ -f foo ]; then"]), line(["  echo hi"]), line(["fi"])];
		expect(computeKeywordFoldRanges({ language: "bash", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("folds a for/do/done block", () => {
		const tokens: FoldLine[] = [line(["for i in 1 2 3; do"]), line(["  echo $i"]), line(["done"])];
		expect(computeKeywordFoldRanges({ language: "bash", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("folds a case/esac block", () => {
		const tokens: FoldLine[] = [
			line(["case $x in"]),
			line(["  a) echo a ;;"]),
			line(["  b) echo b ;;"]),
			line(["esac"]),
		];
		expect(computeKeywordFoldRanges({ language: "bash", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 4 },
		]);
	});

	test("does not treat end keywords in shell arguments as same-line closers", () => {
		const tokens: FoldLine[] = [
			line(["case $done in"]),
			line(["  done) echo yes ;;"]),
			line(["esac"]),
		];
		expect(computeKeywordFoldRanges({ language: "bash", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("does not treat end keywords in shell command arguments as same-line closers", () => {
		const tokens: FoldLine[] = [line(["if echo done; then"]), line(["  echo yes"]), line(["fi"])];
		expect(computeKeywordFoldRanges({ language: "bash", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("folds a function with `function` keyword", () => {
		const tokens: FoldLine[] = [line(["function foo() {"]), line(["  echo hi"]), line(["}"])];
		expect(computeKeywordFoldRanges({ language: "bash", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("folds a function without `function` keyword", () => {
		const tokens: FoldLine[] = [line(["foo() {"]), line(["  echo hi"]), line(["}"])];
		expect(computeKeywordFoldRanges({ language: "bash", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("does not fold an if that closes on the same line", () => {
		// `if x; then echo hi; fi` matches end-on-same-line; no fold.
		const tokens: FoldLine[] = [line(["if x; then echo hi; fi"])];
		expect(computeKeywordFoldRanges({ language: "bash", tokens })).toEqual([]);
	});

	test("ignores `}` inside parameter expansion", () => {
		// `${VAR}` is param expansion; the `}` is mid-line, not at start of line.
		const tokens: FoldLine[] = [line(["function f() {"]), line(["  echo ${VAR}"]), line(["}"])];
		expect(computeKeywordFoldRanges({ language: "bash", tokens })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});
});
