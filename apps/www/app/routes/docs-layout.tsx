import { Outlet } from "react-router";
import { DocsNavigation } from "~/components/docs-navigation";
import { PageLayout, type SectionHandle } from "~/components/page-layout";

export const handle = { sidebar: <DocsNavigation /> } satisfies SectionHandle;

/** Layout route for all documentation pages. Renders the docs sidebar alongside the page outlet. */
export default function DocsLayout() {
	return (
		<PageLayout>
			<Outlet />
		</PageLayout>
	);
}
