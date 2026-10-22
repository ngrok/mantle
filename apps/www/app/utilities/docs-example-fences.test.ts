import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Nodes, Parent } from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { describe, expect, it } from "vitest";

/**
 * Every live `<Example>` on a docs page is followed at once by the code block
 * that renders it (COMPONENT_SPEC.md §7.3). A reader who sees a demo looks
 * directly below it for the code. A paragraph, a heading, or nothing at all
 * between the two breaks that.
 *
 * If this fails, move the code block up to the line after `</Example>`, or
 * write the missing one. Put a note about the demo above the `<Example>`.
 */
const DOCS_ROOT = new URL("../docs/", import.meta.url);

/** Every `.mdx` page under `app/docs`, as a path relative to that folder. */
function docsPages(): ReadonlyArray<string> {
	return readdirSync(fileURLToPath(DOCS_ROOT), { recursive: true, encoding: "utf8" })
		.filter((path) => path.endsWith(".mdx"))
		.toSorted();
}

const parser = unified().use(remarkParse).use(remarkFrontmatter).use(remarkGfm).use(remarkMdx);

function isParent(node: Nodes): node is Nodes & Parent {
	return "children" in node;
}

/**
 * The line of each `<Example>` whose next sibling is not a code block. Nested
 * examples count too: the rule holds inside any parent element.
 */
function examplesWithoutCode(source: string): ReadonlyArray<number> {
	const lines: Array<number> = [];
	const visit = (node: Nodes) => {
		if (!isParent(node)) {
			return;
		}
		node.children.forEach((child, index) => {
			if (child.type === "mdxJsxFlowElement" && child.name === "Example") {
				const next = node.children[index + 1];
				if (next?.type !== "code") {
					lines.push(child.position?.start.line ?? 0);
				}
			}
			visit(child);
		});
	};
	visit(parser.parse(source));
	return lines;
}

describe("docs examples", () => {
	it.for(docsPages())("%s follows each <Example> with its code block", (page) => {
		const source = readFileSync(fileURLToPath(new URL(page, DOCS_ROOT)), "utf8");
		expect(examplesWithoutCode(source)).toEqual([]);
	});
});
