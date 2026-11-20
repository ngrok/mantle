import { href, Link, useMatches } from "react-router";
import { useNavigation } from "./navigation-context";
import { sidebarFromMatches } from "./page-layout";

const sectionLinks = [
	{ to: href("/"), label: "Docs" },
	{ to: href("/components/actions/button"), label: "Components" },
	{ to: href("/layouts"), label: "Layouts" },
	{ to: href("/recipes"), label: "Recipes" },
	{ to: href("/migrations"), label: "Migrations" },
];

/**
 * The mobile drawer that the hamburger button of `Header` opens. Lists the
 * site sections, then the sidebar of the matched section when the page has
 * one. Render it once, beside `Header`, so each page gets it.
 *
 * @example
 * ```tsx
 * <Header />
 * <MobileNavigation />
 * <Outlet />
 * ```
 */
export function MobileNavigation() {
	const { showNavigation, setShowNavigation } = useNavigation();
	const sidebar = sidebarFromMatches(useMatches());

	if (!showNavigation) {
		return null;
	}

	return (
		<div className="bg-card fixed bottom-0 left-0 right-0 top-15 z-50 p-4 md:hidden">
			<div className="scroll-fade-y scrollbar h-full overflow-auto overscroll-contain px-1">
				<nav aria-label="Sections" className="text-sm px-1 mb-6">
					<ul className="flex flex-col">
						<li className="mb-2 text-xs font-medium uppercase tracking-wider font-mono">Menu</li>
						{sectionLinks.map((link) => (
							<li key={link.to}>
								<Link
									to={link.to}
									prefetch="intent"
									className="text-muted hover:text-strong block py-1 rounded focus:outline-hidden focus-visible:ring-3 focus-visible:ring-focus-accent"
									onClick={() => {
										setShowNavigation(false);
									}}
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
	);
}
