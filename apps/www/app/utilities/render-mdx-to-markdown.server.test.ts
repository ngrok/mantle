import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { renderMdxToMarkdown } from "./render-mdx-to-markdown.server";

describe("renderMdxToMarkdown", () => {
	test("keeps a page example's code fence and drops its frame", () => {
		const result = renderMdxToMarkdown(
			[
				'<Example name="layouts/app-layout/my-demo" title="MyDemo">',
				"",
				"```tsx",
				"const answer = 42;",
				"```",
				"",
				"</Example>",
			].join("\n"),
		);

		expect(result).toContain("```tsx");
		expect(result).toContain("const answer = 42;");
		expect(result).not.toContain("Example");
		expect(result).not.toContain("MyDemo");
		expect(result).not.toContain("omitted in markdown output");
	});

	test("keeps a routed demo's code fence and points at no published source", () => {
		const result = renderMdxToMarkdown(
			[
				'<Example path="/preview/breadcrumbs-from-routes/endpoints" title="Breadcrumbs demo">',
				"",
				"```ts",
				"const answer = 42;",
				"```",
				"",
				"</Example>",
			].join("\n"),
		);

		expect(result).toContain("const answer = 42;");
		expect(result).not.toContain("<Example");
		expect(result).not.toContain("llms-full.txt");
	});

	test("puts a source pointer before a shell demo's code fence", () => {
		// The page's fence is a hand-written excerpt of the framed demo, so a reader
		// of the `.md` twin gets the preview's name and where its full source lives
		// (issue #1399) instead of a silently dropped element.
		const result = renderMdxToMarkdown(
			[
				'<Example name="centered-layout" title="Centered layout demo">',
				"",
				"```tsx",
				"const answer = 42;",
				"```",
				"",
				"</Example>",
			].join("\n"),
		);

		expect(result).toContain("const answer = 42;");
		expect(result).not.toContain("<Example");
		expect(result).toContain(
			'<!-- framed preview /preview/centered-layout: full source in /llms-full.txt under "# Framed preview sources" -->',
		);
		expect(result).not.toContain("omitted in markdown output");
	});

	test("names no preview when the example carries no name", () => {
		const result = renderMdxToMarkdown("<Example />\n\nAfter.");

		expect(result).toContain(
			'<!-- framed preview: full source in /llms-full.txt under "# Framed preview sources" -->',
		);
		expect(result).toContain("After.");
		expect(result).not.toContain("/preview/");
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
	// Why real pages: a fence nested inside an `Example` must land in the
	// `.md` output as a code block, not vanish with the wrapper.
	// Why these two rows: both reach page `Example` -> unwrap; app-layout.mdx adds a
	// shell-demo `Example` -> pointer and unwrap.
	const pages = ["../docs/components/navigation/sidebar.mdx", "../docs/layouts/app-layout.mdx"];

	for (const page of pages) {
		test(`preserves every code fence in ${page.split("/").pop()}`, () => {
			const source = readFileSync(fileURLToPath(new URL(page, import.meta.url)), "utf8");
			const output = renderMdxToMarkdown(source);

			// The openers are the languages these two pages fence; an opener no page
			// uses asserts 0 === 0.
			for (const opener of ["```tsx", "```text", "```css"]) {
				expect(countFences(output, opener)).toBe(countFences(source, opener));
			}

			// JSX wrappers must not leak into the markdown output as raw tags.
			expect(output).not.toContain("<Example");
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
