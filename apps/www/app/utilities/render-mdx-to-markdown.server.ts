import type { Root, RootContent } from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

/**
 * Transform a raw MDX source string into markdown-only output for `.md`
 * requests. JSX elements are routed through a small handler registry so
 * that each component produces sensible markdown (or is dropped) rather
 * than being blindly rendered to a wall of HTML. Content inside fenced
 * code blocks is always preserved because it parses as `code` nodes.
 *
 * Handlers that need to render a component to HTML can lazily import the
 * `virtual:mdx-doc-component-imports` module on demand — we intentionally
 * do not import it here so the server bundle does not pull in the entire
 * set of doc-only React components for every `.md` request.
 */
export function renderMdxToMarkdown(rawMdx: string): string {
	const tree = unified()
		.use(remarkParse)
		.use(remarkFrontmatter, ["yaml", "toml"])
		.use(remarkGfm)
		.use(remarkMdx)
		.parse(rawMdx) as Root;

	transform(tree);

	const output = unified()
		.use(remarkStringify, {
			bullet: "-",
			fences: true,
			listItemIndent: "one",
			rule: "-",
		})
		.use(remarkFrontmatter, ["yaml", "toml"])
		.use(remarkGfm)
		.stringify(tree);

	return String(output);
}

type MdxJsxAttribute = {
	type: "mdxJsxAttribute";
	name: string;
	value: string | null | { type: "mdxJsxAttributeValueExpression"; value: string };
};

type MdxJsxAttributeLike = MdxJsxAttribute | { type: "mdxJsxExpressionAttribute" };

type MdxJsxElement = {
	type: "mdxJsxFlowElement" | "mdxJsxTextElement";
	name: string | null;
	attributes: MdxJsxAttributeLike[];
	children: RootContent[];
};

type HandlerResult =
	| { kind: "drop" }
	| { kind: "unwrap" }
	| { kind: "replace"; nodes: RootContent[] }
	| { kind: "html"; html: string };

type Handler = (node: MdxJsxElement) => HandlerResult;

/**
 * Per-component handlers. Each handler decides how a JSX element should be
 * represented in the plain markdown output. Anything not listed here falls
 * through to {@link defaultHandler}.
 */
const handlers: Record<string, Handler> = {
	// `<Example>` wraps a live preview of a component, and is always followed
	// by a fenced code block that contains the same code in textual form.
	// Dropping it removes a wall of rendered DOM without losing information.
	Example: () => ({ kind: "drop" }),
};

/**
 * Fallback for JSX tags without a registered handler. We drop the element
 * silently but leave a trail comment so readers (especially LLMs) know
 * something was intentionally omitted rather than missing.
 */
function defaultHandler(node: MdxJsxElement): HandlerResult {
	const name = node.name ?? "Fragment";
	return {
		kind: "replace",
		nodes: [{ type: "html", value: `<!-- <${name} /> omitted in markdown output -->` }],
	};
}

function isMdxJsxElement(node: unknown): node is MdxJsxElement {
	if (!node || typeof node !== "object") {
		return false;
	}
	const type = (node as { type?: unknown }).type;
	return type === "mdxJsxFlowElement" || type === "mdxJsxTextElement";
}

function transform(root: Root): void {
	walk(root);
}

function walk(parent: { children?: unknown }): void {
	const children = parent.children;
	if (!Array.isArray(children)) {
		return;
	}

	for (let i = 0; i < children.length; i++) {
		const node = children[i];
		if (!node || typeof node !== "object") {
			continue;
		}

		const type = (node as { type?: string }).type;

		if (type === "mdxjsEsm") {
			children.splice(i, 1);
			i--;
			continue;
		}

		if (isMdxJsxElement(node)) {
			const handler = (node.name && handlers[node.name.split(".")[0] ?? ""]) || defaultHandler;
			const result = handler(node);

			switch (result.kind) {
				case "drop": {
					children.splice(i, 1);
					i--;
					continue;
				}
				case "unwrap": {
					children.splice(i, 1, ...node.children);
					i--;
					continue;
				}
				case "replace": {
					children.splice(i, 1, ...result.nodes);
					i += result.nodes.length - 1;
					continue;
				}
				case "html": {
					children.splice(i, 1, { type: "html", value: result.html });
					continue;
				}
			}
		}

		walk(node as { children?: unknown });
	}
}
