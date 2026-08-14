import type { Root } from "mdast";
import { visit } from "unist-util-visit";

// React Router reads these lowercase route-module exports without an import,
// so demoting one would silently discard route behavior. `handle` stays here
// too: the docs pipeline injects its own, and `rehypeMdxDocHandle` reports an
// author-written one with a clear error instead of a dead local binding.
const ROUTE_MODULE_EXPORTS = new Set([
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
 * destructuring pattern.
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
				const allDemotable = names.every(
					(name) => /^[a-z]/.test(name) && !ROUTE_MODULE_EXPORTS.has(name),
				);
				if (!allDemotable) {
					return statement;
				}
				return declaration;
			});
		});
	};
}
