import { valueToEstree } from "estree-util-value-to-estree";
import type { ElementContent, Root } from "hast";

/** A heading entry collected for a doc page's table of contents. */
export type TocEntry = {
	/** The heading's `id` attribute (set upstream by rehype-slug). */
	id: string;
	/** The visible text content of the heading. */
	text: string;
	/** The heading level: 1, 2, or 3. */
	level: 1 | 2 | 3;
};

/** The route `handle` the docs pipeline injects into every compiled MDX module. */
export type DocHandle = {
	/** The doc's parsed YAML frontmatter; an empty object when the file has none. */
	frontmatter: Record<string, unknown>;
	/** Table-of-contents entries for the doc's top-level h1/h2/h3 headings. */
	toc: Array<TocEntry>;
};

/** Collect every top-level name an mdxjsEsm program binds. */
function collectTopLevelBindings(tree: Root): Set<string> {
	const names = new Set<string>();
	for (const node of tree.children) {
		if (node.type !== "mdxjsEsm") {
			continue;
		}
		const estree = node.data?.estree;
		if (!estree) {
			continue;
		}
		for (const statement of estree.body) {
			const declaration =
				statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
			if (declaration?.type === "VariableDeclaration") {
				for (const declarator of declaration.declarations) {
					if (declarator.id.type === "Identifier") {
						names.add(declarator.id.name);
					}
				}
			} else if (
				declaration?.type === "FunctionDeclaration" ||
				declaration?.type === "ClassDeclaration"
			) {
				if (declaration.id) {
					names.add(declaration.id.name);
				}
			} else if (statement.type === "ImportDeclaration") {
				for (const specifier of statement.specifiers) {
					names.add(specifier.local.name);
				}
			}
		}
	}
	return names;
}

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
 * Rehype plugin that emits `export const handle = { frontmatter, toc }` on
 * every compiled MDX module: the frontmatter parsed upstream by
 * `remarkMdxFrontmatterData`, and the toc collected from the document's
 * top-level h1/h2/h3 headings.
 *
 * Must run after `rehype-slug` so headings have their `id` attribute. The
 * toc entries match the ids in the rendered HTML, so the TOC sidebar renders
 * during SSR without scanning the DOM client-side.
 *
 * Why `handle`: docs MDX files are route modules, and React Fast Refresh
 * only hot-swaps a module whose exports are all components or accept-listed
 * route exports (`handle` is accept-listed). The data also travels with the
 * matched route, so `useMatches()` reads it with no loader roundtrip, and
 * server code reads it off the module.
 *
 * Throws when the doc already binds `handle`: the injected export would
 * collide with it, and the resulting duplicate-declaration parse error
 * points at compiled output instead of the source file.
 *
 * @example
 * // in vite.config.ts, after rehype-slug:
 * mdx({ rehypePlugins: [rehypeSlug, rehypeMdxDocHandle] })
 */
export function rehypeMdxDocHandle() {
	return (tree: Root, file: { data: Record<string, unknown>; path?: string }) => {
		if (collectTopLevelBindings(tree).has("handle")) {
			throw new Error(
				`Rename the "handle" binding in ${file.path ?? "this MDX file"}: the docs pipeline injects \`export const handle\` with the doc's frontmatter and toc.`,
			);
		}

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

		const frontmatter = file.data.frontmatter ?? {};

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
										id: { type: "Identifier", name: "handle" },
										init: valueToEstree({ frontmatter, toc: entries }),
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
