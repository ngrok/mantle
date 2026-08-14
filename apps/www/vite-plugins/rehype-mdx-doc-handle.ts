import { valueToEstree } from "estree-util-value-to-estree";
import type { ElementContent, Root } from "hast";
import { ROUTE_MODULE_EXPORTS } from "./remark-mdx-demote-lowercase-exports";

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

type MdxjsEsmNode = Extract<Root["children"][number], { type: "mdxjsEsm" }>;
type EsmProgram = NonNullable<NonNullable<MdxjsEsmNode["data"]>["estree"]>;
type EsmStatement = EsmProgram["body"][number];
type EsmDeclaration = NonNullable<
	Extract<EsmStatement, { type: "ExportNamedDeclaration" }>["declaration"]
>;
type EsmPattern = Extract<
	EsmDeclaration,
	{ type: "VariableDeclaration" }
>["declarations"][number]["id"];

/** Collect every name a binding pattern declares, through nested destructuring. */
function collectPatternNames(pattern: EsmPattern, names: Set<string>): void {
	switch (pattern.type) {
		case "Identifier":
			names.add(pattern.name);
			break;
		case "ObjectPattern":
			for (const property of pattern.properties) {
				collectPatternNames(
					property.type === "Property" ? property.value : property.argument,
					names,
				);
			}
			break;
		case "ArrayPattern":
			for (const element of pattern.elements) {
				if (element != null) {
					collectPatternNames(element, names);
				}
			}
			break;
		case "AssignmentPattern":
			collectPatternNames(pattern.left, names);
			break;
		case "RestElement":
			collectPatternNames(pattern.argument, names);
			break;
		default:
			// A MemberExpression cannot appear in a declaration pattern.
			break;
	}
}

/** Add every name a variable, function, or class declaration declares. */
function addDeclarationNames(declaration: EsmStatement | EsmDeclaration, names: Set<string>): void {
	if (declaration.type === "VariableDeclaration") {
		for (const declarator of declaration.declarations) {
			collectPatternNames(declarator.id, names);
		}
	} else if (
		(declaration.type === "FunctionDeclaration" || declaration.type === "ClassDeclaration") &&
		declaration.id
	) {
		names.add(declaration.id.name);
	}
}

type EsmNames = {
	/** Top-level names the program binds: imports, declarations, and demoted exports. */
	bindings: Set<string>;
	/** Names the program exports: declaration, specifier, and namespace re-exports. */
	exported: Set<string>;
};

/** Collect the top-level bound and exported names across a tree's mdxjsEsm nodes. */
function collectEsmNames(tree: Root): EsmNames {
	const bindings = new Set<string>();
	const exported = new Set<string>();
	for (const node of tree.children) {
		if (node.type !== "mdxjsEsm") {
			continue;
		}
		const estree = node.data?.estree;
		if (!estree) {
			continue;
		}
		for (const statement of estree.body) {
			if (statement.type === "ImportDeclaration") {
				for (const specifier of statement.specifiers) {
					bindings.add(specifier.local.name);
				}
			} else if (statement.type === "ExportAllDeclaration") {
				if (statement.exported) {
					exported.add(
						statement.exported.type === "Identifier"
							? statement.exported.name
							: String(statement.exported.value),
					);
				}
			} else if (statement.type === "ExportNamedDeclaration") {
				for (const specifier of statement.specifiers) {
					exported.add(
						specifier.exported.type === "Identifier"
							? specifier.exported.name
							: String(specifier.exported.value),
					);
				}
				if (statement.declaration) {
					const declared = new Set<string>();
					addDeclarationNames(statement.declaration, declared);
					for (const name of declared) {
						bindings.add(name);
						exported.add(name);
					}
				}
			} else {
				// A demoted author export compiles to a plain top-level declaration.
				addDeclarationNames(statement, bindings);
			}
		}
	}
	return { bindings, exported };
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
 * Throws when the doc already binds or exports `handle` (in any form: a
 * declaration, a destructuring pattern, a specifier, or a namespace
 * re-export): the injected export would collide with it, and the resulting
 * duplicate-declaration parse error points at compiled output instead of the
 * source file. Also throws when the doc exports any other route-module
 * export (`meta`, `loader`, `links`, …): React Router would read it as route
 * behavior. An escaped code fence would otherwise hijack the page's loader
 * or meta silently.
 *
 * @example
 * // in vite.config.ts, after rehype-slug:
 * mdx({ rehypePlugins: [rehypeSlug, rehypeMdxDocHandle] })
 */
export function rehypeMdxDocHandle() {
	return (tree: Root, file: { data: Record<string, unknown>; path?: string }) => {
		const { bindings, exported } = collectEsmNames(tree);
		const fileLabel = file.path ?? "this MDX file";
		if (bindings.has("handle") || exported.has("handle")) {
			throw new Error(
				`Rename the "handle" binding in ${fileLabel}: the docs pipeline injects \`export const handle\` with the doc's frontmatter and toc.`,
			);
		}
		for (const name of exported) {
			if (ROUTE_MODULE_EXPORTS.has(name)) {
				throw new Error(
					`Move the \`${name}\` export in ${fileLabel} into a code fence or rename it: a docs MDX file is a route module, and React Router reads an exported \`${name}\` as route behavior.`,
				);
			}
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
