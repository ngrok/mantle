import { Anchor } from "@ngrok/mantle/anchor";
import type { BreadcrumbHandle } from "@ngrok/mantle/breadcrumb";
import { Link } from "react-router";
import { endpoints } from "./fixtures";
import { PageHeader, ResourceList, ResourceRow } from "./page-parts";
import { demoPaths } from "./paths";

export const handle = { breadcrumb: "Endpoints" } satisfies BreadcrumbHandle;

export default function EndpointsList() {
	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title="Endpoints"
				description="A plain Link: opening an endpoint from its list starts with an empty origin trail."
			/>
			<ResourceList label="Endpoints">
				{endpoints.map((endpoint) => (
					<ResourceRow
						key={endpoint.id}
						meta={endpoint.id}
						title={
							<Anchor asChild>
								<Link to={demoPaths.endpoint(endpoint.id)}>{endpoint.url}</Link>
							</Anchor>
						}
					/>
				))}
			</ResourceList>
		</div>
	);
}
