import { describe, expect, test } from "vitest";
import { renderMdxToMarkdown } from "./render-mdx-to-markdown.server";

describe("renderMdxToMarkdown", () => {
	test("hoists the code fence out of a CodeExample and drops the preview panel", () => {
		const result = renderMdxToMarkdown(
			[
				"<CodeExample.Root>",
				'\t<CodeExample.Preview className="h-150">',
				"\t\t<MyDemo />",
				"\t</CodeExample.Preview>",
				"\t<CodeExample.Code>",
				"",
				"```tsx",
				"const answer = 42;",
				"```",
				"",
				"\t</CodeExample.Code>",
				"</CodeExample.Root>",
			].join("\n"),
		);

		expect(result).toContain("```tsx");
		expect(result).toContain("const answer = 42;");
		expect(result).not.toContain("CodeExample");
		expect(result).not.toContain("MyDemo");
		expect(result).not.toContain("omitted in markdown output");
	});

	test("drops Example previews without a trail comment", () => {
		const result = renderMdxToMarkdown("<Example>\n\t<MyDemo />\n</Example>\n\nAfter.");

		expect(result).not.toContain("Example");
		expect(result).not.toContain("MyDemo");
		expect(result).toContain("After.");
	});

	test("replaces unhandled components with an omission comment", () => {
		const result = renderMdxToMarkdown("<Mystery />");

		expect(result).toContain("<!-- <Mystery /> omitted in markdown output -->");
	});
});
