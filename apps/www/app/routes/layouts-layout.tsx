import { Outlet } from "react-router";
import { LayoutsNavigation } from "~/components/layouts-navigation";
import { PageLayout } from "~/components/page-layout";

/** Layout route for the layouts section. Renders the layouts sidebar alongside the page outlet. */
export default function LayoutsLayout() {
	return (
		<PageLayout sidebar={<LayoutsNavigation />}>
			<Outlet />
		</PageLayout>
	);
}
