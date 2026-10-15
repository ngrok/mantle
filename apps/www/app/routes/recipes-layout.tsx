import { cx } from "@ngrok/mantle/cx";
import { Outlet, useMatches } from "react-router";
import { fullWidthProseMeasure, isFullWidthDoc } from "~/components/content-layout";
import { PageLayout } from "~/components/page-layout";
import { RecipesNavigation } from "~/components/recipes-navigation";

/**
 * Layout route for the recipes section. Renders the recipes sidebar alongside
 * the page outlet. A recipe whose frontmatter says `layout: full` renders on
 * the full-width canvas the layouts section uses, because a shell demo needs
 * the horizontal room; its prose keeps a readable centered measure through
 * {@link fullWidthProseMeasure}.
 */
export default function RecipesLayout() {
	const fullWidth = isFullWidthDoc(useMatches());

	return (
		<PageLayout
			className={cx(fullWidth && ["max-w-full", fullWidthProseMeasure])}
			sidebar={<RecipesNavigation />}
		>
			<Outlet />
		</PageLayout>
	);
}
