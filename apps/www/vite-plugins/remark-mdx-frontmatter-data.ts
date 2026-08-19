import type { Root } from "mdast";
import { parse as parseYaml } from "yaml";

/**
 * Remark plugin that parses the YAML frontmatter block into `file.data`, so
 * later pipeline stages (the `rehypeMdxDocHandle` plugin) can read it after
 * the block itself is gone from the tree.
 *
 * Throws when the block parses to something other than a YAML map. Every
 * consumer types frontmatter as an object; a scalar or a sequence would ride
 * into `handle.frontmatter` and degrade `llms.txt` and the component
 * manifest silently. When the YAML does not parse, the plugin rethrows the
 * parser's error with the file path: a `YAMLParseError` names a line but not
 * a file.
 *
 * Why not `remark-mdx-frontmatter`: docs MDX files are route modules. That
 * plugin's named export breaks React Fast Refresh, and its `namespace` mode
 * assigns to `MDXContent`, a binding the React Router route-module transform
 * removes when it wraps the default export. The frontmatter ships in the
 * `handle` route export instead.
 *
 * @example
 * // in vite.config.ts, after remarkFrontmatter:
 * mdx({ remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatterData] })
 */
export function remarkMdxFrontmatterData() {
	return (tree: Root, file: { data: Record<string, unknown>; path?: string }) => {
		const node = tree.children.find((child) => child.type === "yaml");
		if (!node) {
			return;
		}
		const fileLabel = file.path ?? "this MDX file";
		let frontmatter: unknown;
		try {
			frontmatter = parseYaml(node.value);
		} catch (error) {
			throw new Error(
				`Fix the YAML frontmatter in ${fileLabel}: ${error instanceof Error ? error.message : String(error)}`,
				{ cause: error },
			);
		}
		if (frontmatter == null) {
			return;
		}
		if (typeof frontmatter !== "object" || Array.isArray(frontmatter)) {
			throw new Error(
				`Rewrite the frontmatter in ${fileLabel} as a YAML map of keys to values: it parses to ${Array.isArray(frontmatter) ? "a sequence" : `a ${typeof frontmatter}`}.`,
			);
		}
		file.data.frontmatter = frontmatter;
	};
}
