import { valueToEstree } from "estree-util-value-to-estree";
import type { ElementContent, Root } from "hast";

/** A heading entry collected for a doc page's table of contents. */
export type TocEntry = {
	/** The heading's `id` attribute (set upstream by rehype-slug). */
	id: string;
	/** The visible text content of the heading. */
	text: string;
	/** The heading level — 1, 2, or 3. */
	level: 1 | 2 | 3;
};

const HEADING_LEVELS: Record<string, 1 | 2 | 3> = {
	h1: 1,
	h2: 2,
	h3: 3,
};

/** Recursively concatenate text nodes inside an element. */
function getElementText(nodes: Array<ElementContent>): string {
	let text = "";
	for (const node of nodes) {
		if (node.type === "text") {
			text += node.value;
		} else if (node.type === "element") {
			text += getElementText(node.children);
		}
	}
	return text;
}

/**
 * Rehype plugin that collects top-level h1/h2/h3 headings from a compiled MDX
 * document and emits an `export const toc = [...]` named export on the module.
 *
 * Must run after `rehype-slug` so headings have their `id` attribute. The
 * exported entries match the ids in the rendered HTML, allowing the TOC
 * sidebar to be rendered during SSR without scanning the DOM client-side.
 */
export function rehypeMdxToc() {
	return (tree: Root) => {
		const entries: Array<TocEntry> = [];

		for (const node of tree.children) {
			if (node.type !== "element") {
				continue;
			}
			const level = HEADING_LEVELS[node.tagName];
			if (level == null) {
				continue;
			}
			const id = node.properties?.id;
			if (typeof id !== "string" || !id) {
				continue;
			}
			const text = getElementText(node.children).trim();
			if (!text) {
				continue;
			}
			entries.push({ id, text, level });
		}

		tree.children.unshift({
			type: "mdxjsEsm",
			value: "",
			data: {
				estree: {
					type: "Program",
					sourceType: "module",
					body: [
						{
							type: "ExportNamedDeclaration",
							specifiers: [],
							attributes: [],
							source: null,
							declaration: {
								type: "VariableDeclaration",
								kind: "const",
								declarations: [
									{
										type: "VariableDeclarator",
										id: { type: "Identifier", name: "toc" },
										init: valueToEstree(entries),
									},
								],
							},
						},
					],
				},
			},
		});
	};
}
