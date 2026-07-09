import { readFileSync } from "node:fs";
import path from "node:path";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { globSync } from "tinyglobby";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import type { Plugin } from "vite";

type ImportBinding = {
	/** The name as it appears in source (or "default" / "*"). */
	imported: string;
	/** The local binding name used in the MDX module scope. */
	local: string;
};

type ParsedImport = {
	source: string;
	bindings: ImportBinding[];
};

function parseMdxImports(raw: string): ParsedImport[] {
	const tree = unified().use(remarkParse).use(remarkFrontmatter).use(remarkMdx).parse(raw);

	const imports: ParsedImport[] = [];
	visit(tree, "mdxjsEsm", (node) => {
		const estree = node.data?.estree;
		if (!estree) {
			return;
		}
		for (const stmt of estree.body) {
			if (stmt.type !== "ImportDeclaration") {
				continue;
			}
			const source = String(stmt.source.value);
			const bindings: ImportBinding[] = [];
			for (const spec of stmt.specifiers) {
				if (spec.type === "ImportSpecifier") {
					const importedName =
						spec.imported.type === "Identifier" ? spec.imported.name : spec.imported.value;
					bindings.push({ imported: String(importedName), local: spec.local.name });
				} else if (spec.type === "ImportDefaultSpecifier") {
					bindings.push({ imported: "default", local: spec.local.name });
				} else if (spec.type === "ImportNamespaceSpecifier") {
					bindings.push({ imported: "*", local: spec.local.name });
				}
			}
			imports.push({ source, bindings });
		}
	});
	return imports;
}

function buildImportStatement(
	source: string,
	bindings: ImportBinding[],
	aliasPrefix: string,
): { statement: string; map: string[] } {
	if (bindings.length === 0) {
		return { statement: "", map: [] };
	}

	const map: string[] = [];
	const namedSpecs: string[] = [];
	let defaultAlias: string | null = null;
	let namespaceAlias: string | null = null;

	for (const binding of bindings) {
		const alias = `${aliasPrefix}${binding.local}`;
		map.push(`${JSON.stringify(binding.local)}: ${alias}`);
		if (binding.imported === "default") {
			defaultAlias = alias;
		} else if (binding.imported === "*") {
			namespaceAlias = alias;
		} else {
			namedSpecs.push(`${binding.imported} as ${alias}`);
		}
	}

	const parts: string[] = [];
	if (defaultAlias) {
		parts.push(defaultAlias);
	}
	if (namespaceAlias) {
		parts.push(`* as ${namespaceAlias}`);
	}
	if (namedSpecs.length > 0) {
		parts.push(`{ ${namedSpecs.join(", ")} }`);
	}

	const statement = `import ${parts.join(", ")} from ${JSON.stringify(source)};`;
	return { statement, map };
}

/**
 * Vite plugin that exposes the set of named bindings imported by each MDX
 * doc file. This lets server code that transforms MDX source-to-markdown
 * look up the actual React component referenced by a JSX element like
 * `<BreakpointsLiveDemo />`.
 *
 * Emits a virtual module with shape:
 *
 *   export default {
 *     "../docs/base/breakpoints.mdx": {
 *       BreakpointsLiveDemo: <actual component>,
 *     },
 *     ...
 *   };
 */
function mdxDocComponentImports(docsDir: string): Plugin {
	const virtualModuleId = "virtual:mdx-doc-component-imports";
	const resolvedId = "\0" + virtualModuleId;

	return {
		name: "mdx-doc-component-imports",
		resolveId(id) {
			if (id === virtualModuleId) {
				return resolvedId;
			}
		},
		load(id) {
			if (id !== resolvedId) {
				return;
			}

			const files = globSync("**/*.mdx", { cwd: docsDir });
			const importLines: string[] = [];
			const mapEntries: string[] = [];

			files.forEach((file, fileIdx) => {
				const fullPath = path.join(docsDir, file);
				const raw = readFileSync(fullPath, "utf-8");
				const imports = parseMdxImports(raw);
				const aliasPrefix = `_m${fileIdx}_`;
				const bindingMap: string[] = [];

				for (const { source, bindings } of imports) {
					// Resolve relative imports against the MDX file's directory so
					// the virtual module (which has no real location) can still
					// reach them.
					const resolvedSource = source.startsWith(".")
						? path.resolve(path.dirname(fullPath), source)
						: source;
					const { statement, map } = buildImportStatement(resolvedSource, bindings, aliasPrefix);
					if (statement) {
						importLines.push(statement);
					}
					bindingMap.push(...map);
				}

				const key = `../docs/${file}`;
				mapEntries.push(`${JSON.stringify(key)}: { ${bindingMap.join(", ")} }`);
			});

			return `${importLines.join("\n")}\n\nexport default {\n\t${mapEntries.join(",\n\t")},\n};\n`;
		},
		handleHotUpdate({ file, server }) {
			if (file.startsWith(docsDir) && file.endsWith(".mdx")) {
				const mod = server.moduleGraph.getModuleById(resolvedId);
				if (mod) {
					server.moduleGraph.invalidateModule(mod);
				}
			}
		},
	};
}

export { mdxDocComponentImports };
