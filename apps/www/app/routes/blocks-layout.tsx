import { Outlet } from "react-router";
import { BlocksNavigation } from "~/components/blocks-navigation";
import { PageLayout } from "~/components/page-layout";

/** Layout route for the blocks section. Renders the blocks sidebar alongside the page outlet. */
export default function BlocksLayout() {
	return (
		<PageLayout sidebar={<BlocksNavigation />}>
			<Outlet />
		</PageLayout>
	);
}
