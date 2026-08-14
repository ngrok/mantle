// Docs MDX files are route modules, and the generated route types import
// them. A compiled doc exports its default component plus `handle`, the one
// non-component export React Router's Fast Refresh runtime accept-lists, so
// an edited page hot-swaps in place. Frontmatter and toc ship inside
// `handle`; `useMatches()` reads it on the client and loaders read it off
// the module through `~/utilities/docs`.
declare module "*.mdx" {
	import type { ReactNode } from "react";
	import type { DocHandle } from "../vite-plugins/rehype-mdx-doc-handle";
	export const handle: DocHandle;
	function MdxContent(props: Record<string, unknown>): ReactNode;
	export default MdxContent;
}
