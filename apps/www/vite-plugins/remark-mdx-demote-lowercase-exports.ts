import type { Root } from "mdast";
import { visit } from "unist-util-visit";

/**
 * The lowercase route-module exports React Router reads without an import.
 * The demote plugin keeps them exported, so demotion never silently discards
 * route behavior. `rehypeMdxDocHandle` then throws on every author-written
 * one, so a docs page cannot define route behavior by accident.
 */
export const ROUTE_MODULE_EXPORTS = new Set([
	"action",
	"clientAction",
	"clientLoader",
	"clientMiddleware",
	"handle",
	"headers",
	"links",
	"loader",
	"meta",
	"middleware",
	"shouldRevalidate",
]);

/**
 * Remark plugin that rewrites a lowercase-named `export` in an MDX doc into a
 * plain module-local declaration.
 *
 * Why: MDX only accepts `import`/`export` statements at the top level, so a
 * doc that needs a local value (demo data, a zod schema, a seeded generator)
 * must write `export const`. Docs MDX files are route modules, and React Fast
 * Refresh only hot-swaps a module whose exports are all components or
 * accept-listed route exports. A re-created non-component export changes
 * identity on every evaluation and demotes each edit to a full page reload.
 * Beyond React Router's own route exports, nothing consumes a named export
 * from a docs MDX module, so the export wrapper is safe to drop after parse:
 * the MDX syntax constraint applies to the source, not to the ESTree the
 * compiler serializes.
 *
 * A declaration keeps its export when any declared name starts with an
 * uppercase letter (a component), when any declared name is a route-module
 * export React Router reads (`meta`, `loader`, `handle`, …), when the
 * statement re-exports from another module, or when it binds through a
 * destructuring pattern. An all-caps constant (`CHART_DATA`) reads as a
 * component by this test and keeps its export; Fast Refresh then falls back
 * to a full reload when that doc is edited.
 *
 * @example
 * // in vite.config.ts, after remark-mdx-frontmatter-data:
 * mdx({ remarkPlugins: [remarkMdxDemoteLowercaseExports] })
 * // `export const invoices = [...]` compiles as `const invoices = [...]`;
 * // `export function ExampleTable() {...}` keeps its export.
 */
export function remarkMdxDemoteLowercaseExports() {
	return (tree: Root) => {
		visit(tree, "mdxjsEsm", (node) => {
			const estree = node.data?.estree;
			if (!estree) {
				return;
			}
			estree.body = estree.body.map((statement) => {
				if (statement.type !== "ExportNamedDeclaration") {
					return statement;
				}
				const { declaration } = statement;
				if (!declaration || statement.specifiers.length > 0 || statement.source != null) {
					return statement;
				}
				const names: string[] = [];
				if (declaration.type === "VariableDeclaration") {
					for (const declarator of declaration.declarations) {
						if (declarator.id.type !== "Identifier") {
							return statement;
						}
						names.push(declarator.id.name);
					}
				} else if (
					declaration.type === "FunctionDeclaration" ||
					declaration.type === "ClassDeclaration"
				) {
					names.push(declaration.id.name);
				} else {
					return statement;
				}
				// Not-uppercase-first rather than lowercase-first: `_rows` and `$rows`
				// are not components either. A kept export breaks Fast Refresh.
				const allDemotable = names.every(
					(name) => !/^[A-Z]/.test(name) && !ROUTE_MODULE_EXPORTS.has(name),
				);
				if (!allDemotable) {
					return statement;
				}
				return declaration;
			});
		});
	};
}
