import { Outlet } from "react-router";
import { DocsNavigation } from "~/components/docs-navigation";
import { PageLayout } from "~/components/page-layout";

/** Layout route for all documentation pages. Renders the docs sidebar alongside the page outlet. */
export default function DocsLayout() {
	return (
		<PageLayout sidebar={<DocsNavigation />}>
			<Outlet />
		</PageLayout>
	);
}
