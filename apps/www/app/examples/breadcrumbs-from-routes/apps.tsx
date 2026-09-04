import { Anchor } from "@ngrok/mantle/anchor";
import type { BreadcrumbHandle } from "@ngrok/mantle/breadcrumb";
import { Link } from "react-router";
import { apps } from "./fixtures";
import { PageHeader, ResourceList, ResourceRow } from "./page-parts";
import { demoPaths } from "./paths";

export const handle = { breadcrumb: "Apps" } satisfies BreadcrumbHandle;

export default function AppsList() {
	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title="Apps"
				description="An app's name exists only in fetched data, so its crumb is query-backed and shows a skeleton first."
			/>
			<ResourceList label="Apps">
				{apps.map((app) => (
					<ResourceRow
						key={app.id}
						meta={app.id}
						title={
							<Anchor asChild>
								<Link to={demoPaths.app(app.id)}>{app.name}</Link>
							</Anchor>
						}
					/>
				))}
			</ResourceList>
		</div>
	);
}
