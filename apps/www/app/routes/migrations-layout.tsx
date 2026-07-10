import { Outlet } from "react-router";
import { MigrationsNavigation } from "~/components/migrations-navigation";
import { PageLayout } from "~/components/page-layout";

/** Layout route for the migrations section. Renders the migrations sidebar alongside the page outlet. */
export default function MigrationsLayout() {
	return (
		<PageLayout sidebar={<MigrationsNavigation />}>
			<Outlet />
		</PageLayout>
	);
}
