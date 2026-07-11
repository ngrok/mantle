import { cx } from "@ngrok/mantle/cx";
import { href, Outlet, useLocation } from "react-router";
import { LayoutsNavigation } from "~/components/layouts-navigation";
import { PageLayout } from "~/components/page-layout";

/**
 * Layout route for the layouts section. Renders the layouts sidebar alongside
 * the page outlet. The section index keeps the standard centered `max-w-7xl`
 * container (matching the recipes/migrations indexes); the layout detail pages
 * render on a full-width canvas — layout demos need the horizontal room — with
 * MDX flow content kept at a readable centered measure, and blocks marked
 * `data-full-bleed` (e.g. `CodeExample`) spanning the whole canvas.
 */
export default function LayoutsLayout() {
	const { pathname } = useLocation();
	const isSectionIndex = pathname === href("/layouts");

	return (
		<PageLayout
			className={cx(
				!isSectionIndex && [
					"max-w-full",
					"[&_[data-mdx-content]>*]:mx-auto [&_[data-mdx-content]>*]:max-w-3xl",
					"[&_[data-mdx-content]>[data-full-bleed]]:max-w-none",
				],
			)}
			sidebar={<LayoutsNavigation />}
		>
			<Outlet />
		</PageLayout>
	);
}
