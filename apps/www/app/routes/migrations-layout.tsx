import { Outlet } from "react-router";
import { MigrationsNavigation } from "~/components/migrations-navigation";
import { PageLayout, type SectionHandle } from "~/components/page-layout";

export const handle = { sidebar: <MigrationsNavigation /> } satisfies SectionHandle;

/** Layout route for the migrations section. Renders the migrations sidebar alongside the page outlet. */
export default function MigrationsLayout() {
	return (
		<PageLayout>
			<Outlet />
		</PageLayout>
	);
}
