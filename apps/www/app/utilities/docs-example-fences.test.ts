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
 * Every live example on a docs page is one `CodeExample.Root` that holds its
 * preview frame and its code (COMPONENT_SPEC.md §7.3). The reader toggles
 * between the two, and the preview renders in its own document with the
 * viewport switch and the reload button.
 *
 * If this fails, put the code block inside the example's `CodeExample.Code`,
 * or move an inline demo into the page's examples module and frame it with
 * `CodeExample.PreviewFrame`.
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

/** Whether a node is the JSX element of that name. */
function isElement(node: Nodes | undefined, name: string): boolean {
	return node?.type === "mdxJsxFlowElement" && node.name === name;
}

/** Whether a preview frame shows a page example, `<page>/<name>`, not a registry demo. */
function isPageExample(node: Nodes): boolean {
	return (
		node.type === "mdxJsxFlowElement" &&
		node.attributes.some(
			(attr) =>
				attr.type === "mdxJsxAttribute" &&
				attr.name === "example" &&
				typeof attr.value === "string" &&
				attr.value.includes("/"),
		)
	);
}

/**
 * The line of each example that is not framed and paired with its code: a
 * `CodeExample.Root` without a `CodeExample.PreviewFrame`, a page example
 * without a `CodeExample.Code` that holds a code block, and a JSX demo that sits right
 * above a bare code block. Nested elements count too.
 */
function unframedExamples(source: string): ReadonlyArray<number> {
	const lines: Array<number> = [];
	const visit = (node: Nodes) => {
		if (!isParent(node)) {
			return;
		}
		node.children.forEach((child, index) => {
			const line = child.position?.start.line ?? 0;
			if (isElement(child, "CodeExample.Root") && isParent(child)) {
				const code = child.children.find((part) => isElement(part, "CodeExample.Code"));
				const preview = child.children.find((part) => isElement(part, "CodeExample.PreviewFrame"));
				const hasFence =
					code != null && isParent(code) && code.children.some((part) => part.type === "code");
				// Why only page examples need the Code tab: a registry shell demo publishes
				// its whole source in /llms-full.txt, and its page can explain it in parts.
				if (preview == null || (isPageExample(preview) && !hasFence)) {
					lines.push(line);
				}
			} else if (child.type === "mdxJsxFlowElement" && node.children[index + 1]?.type === "code") {
				lines.push(line);
			}
			visit(child);
		});
	};
	visit(parser.parse(source));
	return lines;
}

describe("docs examples", () => {
	it.for(docsPages())("%s gives each CodeExample its preview and its code", (page) => {
		const source = readFileSync(fileURLToPath(new URL(page, DOCS_ROOT)), "utf8");
		expect(unframedExamples(source)).toEqual([]);
	});
});

/** Each component page: one `.mdx` directly under `components/<category>/`. */
function componentPages(): ReadonlyArray<string> {
	return docsPages().filter((page) => /^components\/[^/]+\/[^/]+\.mdx$/.test(page));
}

/** A `# Title`, or a `<PageHeader>` (on one line, MDX parses it inside a paragraph). */
function isPageTitle(node: Nodes): boolean {
	if (node.type === "heading") {
		return node.depth === 1;
	}
	const [only, ...rest] = node.type === "paragraph" ? node.children : [node];
	return rest.length === 0 && "name" in only && only.name === "PageHeader";
}

/**
 * The pages under the server-render exception (COMPONENT_SPEC.md §7.3): a live
 * example cannot render, so a code block is the primary example.
 */
const CODE_PRIMARY_PAGES: ReadonlySet<string> = new Set(["components/primitives/main.mdx"]);

/**
 * What is wrong with the top of a component page (COMPONENT_SPEC.md §7.2
 * items 3–6), or `undefined` when it is correct. The title comes first, then a
 * lead paragraph, then the primary example and its code block, then
 * `## When to use`.
 */
function pageTopProblem(page: string, source: string): string | undefined {
	const nodes = parser
		.parse(source)
		.children.filter(
			(node) =>
				node.type !== "yaml" && node.type !== "mdxjsEsm" && node.type !== "mdxFlowExpression",
		);
	const [title] = nodes;
	if (title === undefined || !isPageTitle(title)) {
		return `a ${title?.type ?? "page end"} before the page title`;
	}
	let index = 1;
	let paragraphs = 0;
	while (nodes[index]?.type === "paragraph") {
		paragraphs += 1;
		index += 1;
	}
	if (paragraphs === 0) {
		return "no lead between the title and the primary example";
	}
	const primary = nodes[index];
	if (primary?.type === "code") {
		if (!CODE_PRIMARY_PAGES.has(page)) {
			return "a code block as the primary example; show a live example above its code";
		}
		// A second paragraph says why nothing renders the fence.
		if (paragraphs > 2) {
			return `${paragraphs} paragraphs before the primary code block; keep the lead and the reason`;
		}
	} else if (primary?.type === "mdxJsxFlowElement") {
		if (paragraphs > 1) {
			return `${paragraphs} paragraphs before the primary example; keep a lead of one or two sentences`;
		}
		if (primary.name !== "CodeExample.Root") {
			return "a primary example outside a CodeExample; frame it and put its code in the Code tab";
		}
	} else {
		return `a ${primary?.type ?? "page end"} before the primary example`;
	}
	const next = nodes[index + 1];
	const isWhenToUse =
		next?.type === "heading" &&
		next.depth === 2 &&
		next.children[0]?.type === "text" &&
		next.children[0].value === "When to use";
	return isWhenToUse ? undefined : "no `## When to use` directly after the primary example";
}

describe("component docs pages", () => {
	it.for(componentPages())(
		"%s opens with the title, a lead, the example, and When to use",
		(page) => {
			const source = readFileSync(fileURLToPath(new URL(page, DOCS_ROOT)), "utf8");
			expect(pageTopProblem(page, source)).toBeUndefined();
		},
	);

	// A primary example in the shape COMPONENT_SPEC.md §7.3 asks for.
	const codeExample =
		'<CodeExample.Root>\n\t<CodeExample.PreviewFrame example="components/forms/button/overview" title="Button example" />\n\t<CodeExample.Code>\n\n```tsx\nx\n```\n\n\t</CodeExample.Code>\n</CodeExample.Root>';

	it.each([
		["content before the title", `Intro.\n\n# Button\n\nLead.\n\n${codeExample}\n\n## When to use`],
		["no lead", `# Button\n\n${codeExample}\n\n## When to use`],
		[
			"an unframed demo as the primary",
			"# Button\n\nLead.\n\n<ButtonDemo />\n\n```tsx\nx\n```\n\n## When to use",
		],
		["no primary code block", "# Button\n\nLead.\n\n<ButtonDemo />\n\n## When to use"],
		["a code block as the primary", "# Button\n\nLead.\n\n```tsx\nx\n```\n\n## When to use"],
	])("rejects a page with %s", (_, source) => {
		expect(pageTopProblem("components/forms/button.mdx", source)).toBeDefined();
	});

	it("accepts a page in the expected shape", () => {
		const source = `---\ntitle: Button\n---\n\n# Button\n\nLead.\n\n${codeExample}\n\n## When to use`;
		expect(pageTopProblem("components/forms/button.mdx", source)).toBeUndefined();
	});
});

/** A root-level node that renders a live example: a `CodeExample.Root`. */
function isLiveExample(node: Nodes): boolean {
	return isElement(node, "CodeExample.Root");
}

/**
 * The heading text of each section that holds two or more live examples
 * (COMPONENT_SPEC.md §7.2 item 7). A section runs from a heading of any depth
 * to the next heading; the page title starts the first one.
 */
function sectionsWithManyExamples(source: string): ReadonlyArray<string> {
	const nodes = parser.parse(source).children;
	const crowded = new Set<string>();
	let section = "(page title)";
	let examples = 0;
	nodes.forEach((node) => {
		if (node.type === "heading") {
			section = node.children.map((child) => ("value" in child ? child.value : "")).join("");
			examples = 0;
		} else if (isLiveExample(node)) {
			examples += 1;
			if (examples > 1) {
				crowded.add(section);
			}
		}
	});
	return [...crowded];
}

describe("component docs sections", () => {
	it.for(componentPages())("%s holds one live example in each section", (page) => {
		const source = readFileSync(fileURLToPath(new URL(page, DOCS_ROOT)), "utf8");
		expect(sectionsWithManyExamples(source)).toEqual([]);
	});
});
