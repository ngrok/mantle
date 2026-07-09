import type { ComponentProps, ReactNode } from "react";
import { href, Link } from "react-router";
import { useNavigation } from "./navigation-context";
import { ScrollMask } from "./scroll-mask";
import { TOC_PORTAL_ID } from "./table-of-contents";
import { cx } from "@ngrok/mantle/cx";
import { Main } from "@ngrok/mantle/main";

type PageLayoutProps = ComponentProps<"div"> & {
	/** The section's sidebar navigation — rendered in the desktop sidebar column and inside the mobile drawer. */
	sidebar: ReactNode;
};

const mobileDrawerLinks = [
	{ to: href("/"), label: "Docs" },
	{ to: href("/components/alert-dialog"), label: "Components" },
	{ to: href("/blocks"), label: "Blocks" },
];

/**
 * Shared page frame used by section layouts (docs, blocks, …). Renders the
 * three-column grid (sidebar | main | TOC aside) and the mobile drawer. The
 * mobile drawer's open/closed state comes from `NavigationContext`, which is
 * toggled by the header's hamburger button.
 */
export function PageLayout({ className, children, sidebar, ...props }: PageLayoutProps) {
	const { showNavigation, setShowNavigation } = useNavigation();

	const closeMobileNavigation = () => {
		setShowNavigation(false);
	};

	return (
		<>
			<div className={cx("flex gap-4", className)} {...props}>
				<ScrollMask className="scrollbar sticky top-15 hidden max-h-[calc(100vh-3.75rem)] w-44 overflow-y-auto px-1 pb-4 md:block">
					{sidebar}
				</ScrollMask>
				<Main className="w-0 flex-1 pb-[80vh] sm:px-8">{children}</Main>
				<aside id={TOC_PORTAL_ID} className="hidden w-40 xl:block" />
			</div>
			{showNavigation && (
				<div className="bg-card fixed bottom-0 left-0 right-0 top-15 z-50 p-4 md:hidden">
					<ScrollMask className="scrollbar h-full overflow-auto overscroll-contain px-1">
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
					</ScrollMask>
				</div>
			)}
		</>
	);
}
