import { describe, expect, test } from "vitest";
import { computeCssFoldRanges } from "./compute-css-fold-ranges.js";

describe("computeCssFoldRanges", () => {
	test("returns no ranges for empty input", () => {
		expect(computeCssFoldRanges({ code: "" })).toEqual([]);
	});

	test("folds a single multi-line rule", () => {
		const code = [".a {", "  color: red;", "}"].join("\n");
		expect(computeCssFoldRanges({ code })).toEqual([{ id: "1", startLine: 1, endLine: 3 }]);
	});

	test("emits nested ranges for nested rules", () => {
		const code = [
			".button {",
			"  padding: 1rem;",
			"  &:hover {",
			"    background: blue;",
			"  }",
			"}",
		].join("\n");
		expect(computeCssFoldRanges({ code })).toEqual([
			{ id: "1", startLine: 1, endLine: 6 },
			{ id: "3", startLine: 3, endLine: 5 },
		]);
	});

	test("folds @media at-rules", () => {
		const code = ["@media (min-width: 600px) {", "  .a {", "    color: blue;", "  }", "}"].join(
			"\n",
		);
		expect(computeCssFoldRanges({ code })).toEqual([
			{ id: "1", startLine: 1, endLine: 5 },
			{ id: "2", startLine: 2, endLine: 4 },
		]);
	});

	test("ignores braces inside string values", () => {
		const code = [".a {", '  content: "{ not a real opener }";', "}"].join("\n");
		expect(computeCssFoldRanges({ code })).toEqual([{ id: "1", startLine: 1, endLine: 3 }]);
	});

	test("ignores braces inside block comments", () => {
		const code = [".a {", "  /* { ignore } */", "}"].join("\n");
		expect(computeCssFoldRanges({ code })).toEqual([{ id: "1", startLine: 1, endLine: 3 }]);
	});

	test("ignores brace-like punctuation inside escaped string contents", () => {
		const code = [".a {", '  content: "\\{ \\}";', "}"].join("\n");
		expect(computeCssFoldRanges({ code })).toEqual([{ id: "1", startLine: 1, endLine: 3 }]);
	});

	test("only keeps the outermost fold when several open on the same line", () => {
		const code = [".a { .b {", "  color: red;", "} }"].join("\n");
		// Both `{` open on line 1; only one fold survives at startLine 1.
		expect(computeCssFoldRanges({ code })).toEqual([{ id: "1", startLine: 1, endLine: 3 }]);
	});

	test("does not fold a single-line rule", () => {
		const code = ".a { color: red; }";
		expect(computeCssFoldRanges({ code })).toEqual([]);
	});

	test("tolerates unmatched braces", () => {
		const code = [".a {", "  color: red;"].join("\n");
		expect(computeCssFoldRanges({ code })).toEqual([]);
	});

	test("tolerates extra closers", () => {
		const code = ["}"].join("\n");
		expect(computeCssFoldRanges({ code })).toEqual([]);
	});

	test("treats CRLF line endings consistently", () => {
		const code = [".a {", "  color: red;", "}"].join("\r\n");
		expect(computeCssFoldRanges({ code })).toEqual([{ id: "1", startLine: 1, endLine: 3 }]);
	});

	test("counts multi-line block comments as advancing the line counter", () => {
		const code = ["/*", "  multi", "  line", "*/", ".a {", "  color: red;", "}"].join("\n");
		expect(computeCssFoldRanges({ code })).toEqual([{ id: "5", startLine: 5, endLine: 7 }]);
	});
});
