import { describe, expect, test } from "vitest";
import { normalizeIndentation } from "./normalize-indentation.js";

describe("normalizeIndentation", () => {
	test("given empty string, returns empty string", () => {
		const value = "";
		const expected = "";
		expect(normalizeIndentation(value)).toBe(expected);
	});

	test("given a single line string, returns the string", () => {
		const value = "SELECT * FROM users";
		const expected = "SELECT * FROM users";
		expect(normalizeIndentation(value)).toBe(expected);
	});

	test("given a multiline string with no indentation, returns the string", () => {
		const value = `
const foo = {};
const bar = {};
foo.bar = bar;
bar.foo =					foo;
`;
		const result = normalizeIndentation(value);
		expect(result).toMatchInlineSnapshot(`
			"const foo = {};
			const bar = {};
			foo.bar = bar;
			bar.foo =					foo;"
		`);
	});

	test("given a multiline string where all non-empty lines are indented equally, strips shared indentation", () => {
		const value = "\n\t\tconst foo = {};\n\t\tconst bar = {};\n\t\tfoo.bar = bar;\n\t\t";

		const result = normalizeIndentation(value);
		expect(result).toMatchInlineSnapshot(`
			"const foo = {};
			const bar = {};
			foo.bar = bar;"
		`);
	});

	test("given a multiline string with indentation, returns the string with indentation removed", () => {
		const value = `
const foo = {};
	const bar = {};
		foo.bar = bar;
	`;
		let result = normalizeIndentation(value);
		expect(result).toMatchInlineSnapshot(`
			"const foo = {};
			  const bar = {};
			    foo.bar = bar;"
		`);

		result = normalizeIndentation(value, { indentation: "spaces" });
		expect(result).toMatchInlineSnapshot(`
			"const foo = {};
			  const bar = {};
			    foo.bar = bar;"
		`);

		result = normalizeIndentation(value, { indentation: "tabs" });
		expect(result).toMatchInlineSnapshot(`
			"const foo = {};
				const bar = {};
					foo.bar = bar;"
		`);
	});

	test("given space-indented lines and indentation tabs, converts each two leading spaces to a tab", () => {
		const value = "\nconst foo = {};\n  const bar = {};\n    foo.bar = bar;\n";
		expect(normalizeIndentation(value, { indentation: "tabs" })).toBe(
			"const foo = {};\n\tconst bar = {};\n\t\tfoo.bar = bar;",
		);
	});

	test("given an interior whitespace-only line, leaves that line unchanged", () => {
		const value = "\nconst foo = {};\n\t\n\tconst bar = {};\n";
		expect(normalizeIndentation(value)).toBe("const foo = {};\n\t\n  const bar = {};");
	});

	test("given a space-indented string, converts each pair of leading spaces to a tab", () => {
		const value = "function f() {\n    return 1;\n}";

		expect(normalizeIndentation(value, { indentation: "tabs" })).toBe(
			"function f() {\n\t\treturn 1;\n}",
		);
		// "spaces" is the default and leaves space indentation untouched.
		expect(normalizeIndentation(value, { indentation: "spaces" })).toBe(value);
		expect(normalizeIndentation(value)).toBe(value);
	});

	test("given an odd number of leading spaces, leaves the trailing single space", () => {
		expect(normalizeIndentation("a\n   b", { indentation: "tabs" })).toBe("a\n\t b");
	});

	test("given mixed leading tabs and spaces, only converts adjacent space pairs", () => {
		expect(normalizeIndentation("a\n \t  b", { indentation: "tabs" })).toBe("a\n \t\tb");
		expect(normalizeIndentation("a\n \t  b", { indentation: "spaces" })).toBe("a\n     b");
	});

	test("only the leading indentation is rewritten, not interior whitespace", () => {
		expect(normalizeIndentation("a\n  b  c", { indentation: "tabs" })).toBe("a\n\tb  c");
	});

	test("normalizes CRLF line endings without leaving carriage returns in the output", () => {
		const value = "\r\n\tconst foo = {};\r\n\t\tconst bar = {};\r\n";

		expect(normalizeIndentation(value)).toBe("const foo = {};\n  const bar = {};");
		expect(normalizeIndentation(value, { indentation: "tabs" })).toBe(
			"const foo = {};\n\tconst bar = {};",
		);
	});
});
