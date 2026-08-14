import type { Root } from "mdast";
import { expect, test } from "vitest";
import { remarkMdxFrontmatterData } from "./remark-mdx-frontmatter-data";

function treeWithYaml(value: string): Root {
	return { type: "root", children: [{ type: "yaml", value }] };
}

test("parses the YAML map into `file.data.frontmatter`", () => {
	const file: { data: Record<string, unknown> } = { data: {} };

	remarkMdxFrontmatterData()(treeWithYaml("title: Button\ndescription: A themed button."), file);

	expect(file.data.frontmatter).toEqual({ title: "Button", description: "A themed button." });
});

test("rethrows a YAML parse error with the file path", () => {
	const file = { data: {}, path: "docs/example.mdx" };

	// The parser's own error names a line but not a file.
	expect(() => remarkMdxFrontmatterData()(treeWithYaml("title: [unclosed"), file)).toThrow(
		/docs\/example\.mdx/,
	);
});

test("throws with the file path when the frontmatter is a scalar", () => {
	const file = { data: {}, path: "docs/example.mdx" };

	expect(() => remarkMdxFrontmatterData()(treeWithYaml("just a string"), file)).toThrow(
		/docs\/example\.mdx.*a string/,
	);
});

test("throws with the file path when the frontmatter is a sequence", () => {
	const file = { data: {}, path: "docs/example.mdx" };

	expect(() => remarkMdxFrontmatterData()(treeWithYaml("- one\n- two"), file)).toThrow(
		/docs\/example\.mdx.*a sequence/,
	);
});

test("leaves `file.data` alone when the frontmatter block is empty", () => {
	const file: { data: Record<string, unknown> } = { data: {} };

	remarkMdxFrontmatterData()(treeWithYaml(""), file);

	expect("frontmatter" in file.data).toBe(false);
});
