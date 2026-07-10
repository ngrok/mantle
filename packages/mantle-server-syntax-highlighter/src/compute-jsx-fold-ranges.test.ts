import type * as OxcParserModule from "oxc-parser";
import { describe, expect, test } from "vitest";
import { computeJsxFoldRanges, createOxcParserLoader } from "./compute-jsx-fold-ranges.js";

type OxcParser = typeof OxcParserModule;

describe("createOxcParserLoader", () => {
	test("caches load failures", () => {
		let calls = 0;
		const load = createOxcParserLoader(() => {
			calls += 1;
			throw new Error("missing native binding");
		});

		expect(load()).toBeUndefined();
		expect(load()).toBeUndefined();
		expect(calls).toBe(1);
	});

	test("caches successful loads", () => {
		let calls = 0;
		const parser = {} as OxcParser;
		const load = createOxcParserLoader(() => {
			calls += 1;
			return parser;
		});

		expect(load()).toBe(parser);
		expect(load()).toBe(parser);
		expect(calls).toBe(1);
	});
});

describe("computeJsxFoldRanges", () => {
	test("returns no ranges for empty input", () => {
		expect(computeJsxFoldRanges({ code: "", language: "tsx" })).toEqual([]);
	});

	test("folds a multi-line object literal", () => {
		const code = ["const x = {", "  a: 1,", "  b: 2,", "};"].join("\n");
		expect(computeJsxFoldRanges({ code, language: "javascript" })).toEqual([
			{ id: "1", startLine: 1, endLine: 4 },
		]);
	});

	test("folds a multi-line array literal", () => {
		const code = ["const xs = [", "  1,", "  2,", "];"].join("\n");
		expect(computeJsxFoldRanges({ code, language: "javascript" })).toEqual([
			{ id: "1", startLine: 1, endLine: 4 },
		]);
	});

	test("folds a function body BlockStatement", () => {
		const code = ["function greet(name) {", "  return name;", "}"].join("\n");
		expect(computeJsxFoldRanges({ code, language: "javascript" })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("emits nested ranges for nested objects", () => {
		const code = ["const x = {", "  a: {", "    b: 1", "  },", "};"].join("\n");
		expect(computeJsxFoldRanges({ code, language: "javascript" })).toEqual([
			{ id: "1", startLine: 1, endLine: 5 },
			{ id: "2", startLine: 2, endLine: 4 },
		]);
	});

	test("only keeps the outermost fold when several open on the same line", () => {
		// `{ [` both open on line 1; only the outermost (largest) fold survives.
		const code = ["[{", "  a: 1", "}]"].join("\n");
		expect(computeJsxFoldRanges({ code, language: "javascript" })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("does not fold parenthesized argument lists", () => {
		const code = ["fn(", "  a,", "  b,", ");"].join("\n");
		// Parenthesized expressions aren't in our foldable set, matching VS Code.
		expect(computeJsxFoldRanges({ code, language: "javascript" })).toEqual([]);
	});

	test("ignores braces inside string literals", () => {
		const code = ["const x = {", '  s: "{ braces in string }",', "};"].join("\n");
		expect(computeJsxFoldRanges({ code, language: "javascript" })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("ignores braces inside line comments", () => {
		const code = ["const x = {", "  // { not a real opener", "};"].join("\n");
		expect(computeJsxFoldRanges({ code, language: "javascript" })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	describe("JSX elements", () => {
		test("folds a multi-line element", () => {
			const code = ["<Foo>", "  <Bar />", "</Foo>"].join("\n");
			expect(computeJsxFoldRanges({ code, language: "tsx" })).toEqual([
				{ id: "1", startLine: 1, endLine: 3 },
			]);
		});

		test("folds a JSX fragment", () => {
			const code = ["<>", "  <Foo />", "</>"].join("\n");
			expect(computeJsxFoldRanges({ code, language: "tsx" })).toEqual([
				{ id: "1", startLine: 1, endLine: 3 },
			]);
		});

		test("folds a multi-line self-closing element on its attribute list", () => {
			// Self-closing tags with multi-line attribute lists fold even though
			// VS Code's stock TS folder leaves them alone — this matches what
			// JSX authors expect for long prop lists.
			const code = ["<Foo", "  a={1}", "  b={2}", "/>"].join("\n");
			expect(computeJsxFoldRanges({ code, language: "tsx" })).toEqual([
				{ id: "1", startLine: 1, endLine: 4 },
			]);
		});

		test("does not fold a single-line self-closing element", () => {
			const code = "<Foo a={1} />";
			expect(computeJsxFoldRanges({ code, language: "tsx" })).toEqual([]);
		});

		test("folds a multi-line opening tag for an element with children", () => {
			const code = ["<Foo", '  a="x"', '  b="y"', ">", "  hi", "</Foo>"].join("\n");
			// Both the element body (1→6) and the open tag (1→4) share opener
			// line 1; finalizeFoldRanges keeps the larger span.
			expect(computeJsxFoldRanges({ code, language: "tsx" })).toEqual([
				{ id: "1", startLine: 1, endLine: 6 },
			]);
		});

		test("folds member-expression element names", () => {
			const code = ["<Foo.Bar>", "  hello", "</Foo.Bar>"].join("\n");
			expect(computeJsxFoldRanges({ code, language: "tsx" })).toEqual([
				{ id: "1", startLine: 1, endLine: 3 },
			]);
		});

		test("emits nested ranges for nested elements", () => {
			const code = ["<Outer>", "  <Inner>", "    text", "  </Inner>", "</Outer>"].join("\n");
			expect(computeJsxFoldRanges({ code, language: "tsx" })).toEqual([
				{ id: "1", startLine: 1, endLine: 5 },
				{ id: "2", startLine: 2, endLine: 4 },
			]);
		});

		test("does not fold an inline element", () => {
			const code = "<p>hello <span>world</span></p>";
			expect(computeJsxFoldRanges({ code, language: "tsx" })).toEqual([]);
		});

		test("folds JSX inside a function body without duplicating the body fold", () => {
			const code = [
				"function Card() {",
				"  return (",
				"    <div>",
				"      hi",
				"    </div>",
				"  );",
				"}",
			].join("\n");
			const ranges = computeJsxFoldRanges({ code, language: "tsx" });
			expect(ranges).toEqual([
				{ id: "1", startLine: 1, endLine: 7 },
				{ id: "3", startLine: 3, endLine: 5 },
			]);
		});
	});

	describe("template literals", () => {
		test("folds a multi-line template literal", () => {
			const code = ["const x = `hello", "world", "foo`;"].join("\n");
			expect(computeJsxFoldRanges({ code, language: "javascript" })).toEqual([
				{ id: "1", startLine: 1, endLine: 3 },
			]);
		});

		test("folds a tagged template literal", () => {
			const code = ["const x = tag`a", "b", "c`;"].join("\n");
			expect(computeJsxFoldRanges({ code, language: "javascript" })).toEqual([
				{ id: "1", startLine: 1, endLine: 3 },
			]);
		});

		test("does not fold a single-line template", () => {
			const code = "const x = `hello world`;";
			expect(computeJsxFoldRanges({ code, language: "javascript" })).toEqual([]);
		});
	});

	describe("TypeScript constructs", () => {
		test("folds a generic arrow function in plain TypeScript mode", () => {
			const code = ["const identity = <T>(value: T) => {", "  return value;", "};"].join("\n");
			expect(computeJsxFoldRanges({ code, language: "typescript" })).toEqual([
				{ id: "1", startLine: 1, endLine: 3 },
			]);
		});

		test("folds an interface body", () => {
			const code = ["interface User {", "  id: string;", "  email: string;", "}"].join("\n");
			expect(computeJsxFoldRanges({ code, language: "typescript" })).toEqual([
				{ id: "1", startLine: 1, endLine: 4 },
			]);
		});

		test("folds a type literal", () => {
			const code = ["type User = {", "  id: string;", "  email: string;", "};"].join("\n");
			expect(computeJsxFoldRanges({ code, language: "typescript" })).toEqual([
				{ id: "1", startLine: 1, endLine: 4 },
			]);
		});

		test("folds an enum declaration", () => {
			const code = ["enum Status {", "  Open,", "  Closed,", "}"].join("\n");
			expect(computeJsxFoldRanges({ code, language: "typescript" })).toEqual([
				{ id: "1", startLine: 1, endLine: 4 },
			]);
		});
	});

	describe("class bodies", () => {
		test("folds a class body and method bodies inside it", () => {
			const code = ["class Greeter {", "  greet(name) {", "    return name;", "  }", "}"].join(
				"\n",
			);
			expect(computeJsxFoldRanges({ code, language: "javascript" })).toEqual([
				{ id: "1", startLine: 1, endLine: 5 },
				{ id: "2", startLine: 2, endLine: 4 },
			]);
		});
	});

	describe("malformed sources", () => {
		test("tolerates a syntax error and emits folds for the parts that did parse", () => {
			// `oxc-parser` recovers from many errors and still returns a partial
			// AST. We don't crash on partial input.
			const code = ["function broken( {", "  a: 1", "}"].join("\n");
			expect(() => computeJsxFoldRanges({ code, language: "javascript" })).not.toThrow();
		});
	});
});
