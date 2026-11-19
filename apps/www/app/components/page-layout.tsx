import type { ComponentProps, ReactNode } from "react";
import { useMatches } from "react-router";
import { PageContainer } from "./page-container";
import { TableOfContents } from "./table-of-contents";
import { cx } from "@ngrok/mantle/cx";
import { Main } from "@ngrok/mantle/main";
import type { DocHandle, TocEntry } from "~/utilities/docs";

/** The route `handle` of a section layout route. */
export type SectionHandle = {
	/** The sidebar navigation of the section. The desktop sidebar column and the mobile drawer render it. */
	sidebar: ReactNode;
};

/** True for a route `handle` with a sidebar. Each section layout route exports one. */
function hasSidebar(handle: unknown): handle is SectionHandle {
	return typeof handle === "object" && handle != null && "sidebar" in handle;
}

/**
 * The sidebar from the first match whose route `handle` carries one, or
 * `undefined` on a page outside a section, such as `/mcp` or the 404 page.
 *
 * @example
 * const sidebar = sidebarFromMatches(useMatches());
 * // under docs-layout.tsx: <DocsNavigation />
 * // on /mcp: undefined
 */
export function sidebarFromMatches(matches: Array<{ handle?: unknown } | undefined>): ReactNode {
	for (const match of matches) {
		if (hasSidebar(match?.handle)) {
			return match.handle.sidebar;
		}
	}
	return undefined;
}

/**
 * True for a route `handle` with a toc. Why no schema: the build writes each
 * doc `handle` (see `rehypeMdxDocHandle`), and a parser here would add zod to
 * the bundle of each page.
 */
function hasToc(handle: unknown): handle is Pick<DocHandle, "toc"> {
	return (
		typeof handle === "object" && handle != null && "toc" in handle && Array.isArray(handle.toc)
	);
}

/** One array for each page with no toc, so the scroll-spy effect keeps its input. */
const noToc: Array<TocEntry> = [];

/**
 * The toc from the deepest match whose route `handle` carries one. A docs
 * page's leaf match is its MDX route module, and the docs pipeline injects
 * `handle = { frontmatter, toc }` into every compiled doc.
 *
 * @example
 * const matches = useMatches();
 * const toc = tocFromMatches(matches);
 * // on a docs page: [{ id: "usage", text: "Usage", level: 2 }, …]
 * // on a section index with no doc handle: []
 */
export function tocFromMatches(matches: Array<{ handle?: unknown } | undefined>): Array<TocEntry> {
	for (let index = matches.length - 1; index >= 0; index--) {
		const handle = matches[index]?.handle;
		if (hasToc(handle)) {
			return handle.toc;
		}
	}
	return noToc;
}

/**
 * Shared page frame used by section layouts (docs, recipes, …). Renders the
 * three-column grid (sidebar | main | TOC aside). The sidebar comes from the
 * `handle` of the section layout route, see {@link SectionHandle}.
 *
 * @example
 * ```tsx
 * export const handle = { sidebar: <DocsNavigation /> } satisfies SectionHandle;
 *
 * export default function DocsLayout() {
 * 	return (
 * 		<PageLayout>
 * 			<Outlet />
 * 		</PageLayout>
 * 	);
 * }
 * ```
 */
export function PageLayout({ className, children, ...props }: ComponentProps<"div">) {
	const matches = useMatches();
	const toc = tocFromMatches(matches);

	return (
		<PageContainer className={cx("flex gap-4", className)} {...props}>
			<div className="scroll-fade-y scrollbar sticky top-15 hidden max-h-[calc(100vh-3.75rem)] w-44 overflow-y-auto px-1 pb-4 md:block">
				{sidebarFromMatches(matches)}
			</div>
			{/* The `xl:pb-[80vh]` tail lets late headings reach the scroll-spy
			trigger line; it exists for the TOC aside, so below `xl` (no TOC,
			no spy) the page keeps a normal end-of-page gap. */}
			<Main className="w-0 flex-1 pb-16 xl:pb-[80vh] sm:px-8">{children}</Main>
			<aside className="hidden w-40 xl:block">
				<TableOfContents entries={toc} />
			</aside>
		</PageContainer>
	);
}
