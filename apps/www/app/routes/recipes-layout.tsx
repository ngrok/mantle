import { Outlet } from "react-router";
import { PageLayout } from "~/components/page-layout";
import { RecipesNavigation } from "~/components/recipes-navigation";

/** Layout route for the recipes section. Renders the recipes sidebar alongside the page outlet. */
export default function RecipesLayout() {
	return (
		<PageLayout sidebar={<RecipesNavigation />}>
			<Outlet />
		</PageLayout>
	);
}
