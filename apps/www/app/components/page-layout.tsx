import type { ComponentProps, ReactNode } from "react";
import { href, Link, useMatches } from "react-router";
import { useNavigation } from "./navigation-context";
import { PageContainer } from "./page-container";
import { TableOfContents } from "./table-of-contents";
import { cx } from "@ngrok/mantle/cx";
import { Main } from "@ngrok/mantle/main";
import type { DocHandle, TocEntry } from "~/utilities/docs";

type PageLayoutProps = ComponentProps<"div"> & {
	/** The section's sidebar navigation — rendered in the desktop sidebar column and inside the mobile drawer. */
	sidebar: ReactNode;
};

const mobileDrawerLinks = [
	{ to: href("/"), label: "Docs" },
	{ to: href("/components/actions/button"), label: "Components" },
	{ to: href("/layouts"), label: "Layouts" },
	{ to: href("/recipes"), label: "Recipes" },
	{ to: href("/migrations"), label: "Migrations" },
];

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
 * Shared page frame used by section layouts (docs, blocks, …). Renders the
 * three-column grid (sidebar | main | TOC aside) and the mobile drawer. The
 * mobile drawer's open/closed state comes from `NavigationContext`, which is
 * toggled by the header's hamburger button.
 */
export function PageLayout({ className, children, sidebar, ...props }: PageLayoutProps) {
	const { showNavigation, setShowNavigation } = useNavigation();
	const toc = tocFromMatches(useMatches());

	const closeMobileNavigation = () => {
		setShowNavigation(false);
	};

	return (
		<>
			<PageContainer className={cx("flex gap-4", className)} {...props}>
				<div className="scroll-fade-y scrollbar sticky top-15 hidden max-h-[calc(100vh-3.75rem)] w-44 overflow-y-auto px-1 pb-4 md:block">
					{sidebar}
				</div>
				{/* The `xl:pb-[80vh]` tail lets late headings reach the scroll-spy
				trigger line; it exists for the TOC aside, so below `xl` (no TOC,
				no spy) the page keeps a normal end-of-page gap. */}
				<Main className="w-0 flex-1 pb-16 xl:pb-[80vh] sm:px-8">{children}</Main>
				<aside className="hidden w-40 xl:block">
					<TableOfContents entries={toc} />
				</aside>
			</PageContainer>
			{showNavigation && (
				<div className="bg-card fixed bottom-0 left-0 right-0 top-15 z-50 p-4 md:hidden">
					<div className="scroll-fade-y scrollbar h-full overflow-auto overscroll-contain px-1">
						<nav className="text-sm px-1 mb-6">
							<ul className="flex flex-col">
								<li className="mb-2 text-xs font-medium uppercase tracking-wider font-mono">
									Menu
								</li>
								{mobileDrawerLinks.map((link) => (
									<li key={link.to}>
										<Link
											to={link.to}
											prefetch="intent"
											className="text-muted hover:text-strong block py-1 rounded focus:outline-hidden focus-visible:ring-3 focus-visible:ring-focus-accent"
											onClick={closeMobileNavigation}
										>
											{link.label}
										</Link>
									</li>
								))}
							</ul>
						</nav>
						{sidebar}
					</div>
				</div>
			)}
		</>
	);
}
