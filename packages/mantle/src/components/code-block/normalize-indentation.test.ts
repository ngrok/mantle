import { describe, expect, test } from "vitest";
import { normalizeIndentation } from "./normalize-indentation.js";

describe("normalizeIndentation", () => {
	test("given empty string, returns empty string", () => {
		const value = "";
		const expected = "";
		expect(normalizeIndentation(value)).toBe(expected);
		expect(normalizeIndentation(value, { indentation: "tabs" })).toBe(expected);
		expect(normalizeIndentation(value, { indentation: "spaces" })).toBe(expected);
	});

	test("given a single line string, returns the string", () => {
		const value = "SELECT * FROM users";
		const expected = "SELECT * FROM users";
		expect(normalizeIndentation(value)).toBe(expected);
		expect(normalizeIndentation(value, { indentation: "tabs" })).toBe(expected);
		expect(normalizeIndentation(value, { indentation: "spaces" })).toBe(expected);
	});

	test("given a multiline string with no indentation, returns the string", () => {
		const value = `
const foo = {};
const bar = {};
foo.bar = bar;
bar.foo =					foo;
`;
		let result = normalizeIndentation(value);
		expect(result).toMatchInlineSnapshot(`
			"const foo = {};
			const bar = {};
			foo.bar = bar;
			bar.foo =					foo;"
		`);

		result = normalizeIndentation(value, { indentation: "spaces" });
		expect(result).toMatchInlineSnapshot(`
			"const foo = {};
			const bar = {};
			foo.bar = bar;
			bar.foo =					foo;"
		`);
		result = normalizeIndentation(value, { indentation: "tabs" });
		expect(result).toMatchInlineSnapshot(`
			"const foo = {};
			const bar = {};
			foo.bar = bar;
			bar.foo =					foo;"
		`);
	});

	test("given a multiline string where all non-empty lines are indented equally, strips shared indentation", () => {
		const value = "\n\t\tconst foo = {};\n\t\tconst bar = {};\n\t\tfoo.bar = bar;\n\t\t";

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

	test("given a component code example with tabs, returns the string with tabs replaced with spaces", () => {
		const value = `
<Alert intent="danger">
	<AlertIcon />
	<AlertContent>
		<AlertTitle>Danger</AlertTitle>
		<AlertDescription>This is a danger Alert.</AlertDescription>
	</AlertContent>
</Alert>
		`;

		let result = normalizeIndentation(value);
		expect(result).toMatchInlineSnapshot(`
			"<Alert intent="danger">
			  <AlertIcon />
			  <AlertContent>
			    <AlertTitle>Danger</AlertTitle>
			    <AlertDescription>This is a danger Alert.</AlertDescription>
			  </AlertContent>
			</Alert>"
		`);

		result = normalizeIndentation(value, { indentation: "spaces" });
		expect(result).toMatchInlineSnapshot(`
			"<Alert intent="danger">
			  <AlertIcon />
			  <AlertContent>
			    <AlertTitle>Danger</AlertTitle>
			    <AlertDescription>This is a danger Alert.</AlertDescription>
			  </AlertContent>
			</Alert>"
		`);

		result = normalizeIndentation(value, { indentation: "tabs" });
		expect(result).toMatchInlineSnapshot(`
			"<Alert intent="danger">
				<AlertIcon />
				<AlertContent>
					<AlertTitle>Danger</AlertTitle>
					<AlertDescription>This is a danger Alert.</AlertDescription>
				</AlertContent>
			</Alert>"
		`);
	});

	test("normalizes CRLF line endings without leaving carriage returns in the output", () => {
		const value = "\r\n\tconst foo = {};\r\n\t\tconst bar = {};\r\n";

		expect(normalizeIndentation(value)).toBe("const foo = {};\n  const bar = {};");
		expect(normalizeIndentation(value, { indentation: "tabs" })).toBe(
			"const foo = {};\n\tconst bar = {};",
		);
		expect(normalizeIndentation(value)).not.toContain("\r");
	});
});
