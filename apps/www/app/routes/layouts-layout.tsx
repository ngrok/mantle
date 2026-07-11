import { cx } from "@ngrok/mantle/cx";
import { Outlet, useMatches } from "react-router";
import { fullWidthProseMeasure } from "~/components/content-layout";
import { LayoutsNavigation } from "~/components/layouts-navigation";
import { PageLayout } from "~/components/page-layout";

/**
 * Layout route for the layouts section. Renders the layouts sidebar alongside
 * the page outlet. The section index keeps the standard centered `max-w-7xl`
 * container (matching the recipes/migrations indexes); the layout detail pages
 * render on a full-width canvas — layout demos need the horizontal room — with
 * MDX flow content kept at a readable centered measure via
 * {@link fullWidthProseMeasure}.
 */
export default function LayoutsLayout() {
	const matches = useMatches();
	// Match on route identity, not pathname string equality — trailing-slash
	// URLs like /layouts/ still match the index route but fail an === compare.
	const isSectionIndex = matches[matches.length - 1]?.id === "layouts-index";

	return (
		<PageLayout
			className={cx(!isSectionIndex && ["max-w-full", fullWidthProseMeasure])}
			sidebar={<LayoutsNavigation />}
		>
			<Outlet />
		</PageLayout>
	);
}
