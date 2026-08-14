import type { Root } from "mdast";
import { parse as parseYaml } from "yaml";

/**
 * Remark plugin that parses the YAML frontmatter block into `file.data`, so
 * later pipeline stages (the `rehypeMdxDocHandle` plugin) can read it after
 * the block itself is gone from the tree.
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
	return (tree: Root, file: { data: Record<string, unknown> }) => {
		const node = tree.children.find((child) => child.type === "yaml");
		if (!node) {
			return;
		}
		const frontmatter: unknown = parseYaml(node.value);
		file.data.frontmatter = frontmatter;
	};
}
