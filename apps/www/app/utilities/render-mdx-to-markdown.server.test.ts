import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
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

/**
 * Count occurrences of a fence opener at column 0 (e.g. "```tsx"). Fence
 * openers only ever start a line, so a line-anchored match counts blocks.
 */
function countFences(source: string, opener: string): number {
	return source.split("\n").filter((line) => line.startsWith(opener)).length;
}

describe("renderMdxToMarkdown on real doc pages", () => {
	// Regression: fences nested inside JSX wrappers (CodeExample.Code) must
	// come out as real markdown code blocks in the agent-facing .md output —
	// not collapse into dropped/unrendered JSX.
	const pages = [
		"../docs/components/navigation/breadcrumb.mdx",
		"../docs/components/forms/theme-switcher.mdx",
		"../docs/layouts/centered-layout.mdx",
	];

	for (const page of pages) {
		test(`preserves every code fence in ${page.split("/").pop()}`, () => {
			const source = readFileSync(fileURLToPath(new URL(page, import.meta.url)), "utf8");
			const output = renderMdxToMarkdown(source);

			for (const opener of ["```tsx", "```text", "```jsx", "```sh"]) {
				expect(countFences(output, opener)).toBe(countFences(source, opener));
			}

			// JSX wrappers must not leak into the markdown output as raw tags.
			expect(output).not.toContain("<CodeExample");
			expect(output).not.toContain("<Example>");
		});
	}

	test("the centered-layout Landmarks fence survives with its full composition", () => {
		const source = readFileSync(
			fileURLToPath(new URL("../docs/layouts/centered-layout.mdx", import.meta.url)),
			"utf8",
		);
		const output = renderMdxToMarkdown(source);

		expect(output).toContain("<SkipToMainLink />");
		expect(output).toContain("<PlanPicker />");
		expect(output).toContain("<SignInCard />");
	});
});
