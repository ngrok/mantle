import { Anchor } from "@ngrok/mantle/anchor";
import type { BreadcrumbHandle } from "@ngrok/mantle/breadcrumb";
import { routeBreadcrumb } from "@ngrok/mantle/breadcrumb";
import { Skeleton } from "@ngrok/mantle/skeleton";
import type { UIMatch } from "react-router";
import { OriginLink } from "~/features/navigation-origin/origin-link";
import type { OriginHandle } from "~/features/navigation-origin/origin-trail";
import type { Route } from "./+types/domain";
import { endpoints } from "./fixtures";
import { ResourceList, ResourceRow } from "./page-parts";
import { demoPaths } from "./paths";
import { useDomain } from "./queries";

export const handle = {
	// Why a sibling of the hub: a full-page detail must not render under the
	// hub's tabs, so it lives beside the hub and names `Domains` itself.
	breadcrumb: (match) => [
		routeBreadcrumb("Domains", { to: demoPaths.domains }),
		routeBreadcrumb(match.params.domainId),
	],
	origin: (match) =>
		match.params.domainId == null ? null : { kind: "domain", id: match.params.domainId },
} satisfies BreadcrumbHandle<UIMatch> & OriginHandle<UIMatch>;

/**
 * A domain's detail page. Each endpoint on it is an `OriginLink`, so a reader
 * who came from an endpoint and goes back to it pops the trail instead of
 * growing it.
 */
export default function DomainDetail({ params }: Route.ComponentProps) {
	const domainQuery = useDomain(params.domainId);
	const domainEndpoints = endpoints.filter((endpoint) => endpoint.domainId === params.domainId);

	return (
		<div className="flex flex-col gap-6 p-6">
			<div className="flex flex-col gap-1">
				{domainQuery.data ? (
					<h1 className="text-strong text-2xl font-medium">{domainQuery.data.name}</h1>
				) : (
					<Skeleton className="h-8 w-64" />
				)}
				<code translate="no" className="text-muted text-xs">
					{params.domainId}
				</code>
			</div>
			<ResourceList label="Endpoints on this domain">
				{domainEndpoints.map((endpoint) => (
					<ResourceRow
						key={endpoint.id}
						meta={endpoint.id}
						title={
							<Anchor asChild>
								<OriginLink to={demoPaths.endpoint(endpoint.id)}>{endpoint.url}</OriginLink>
							</Anchor>
						}
					/>
				))}
			</ResourceList>
		</div>
	);
}
