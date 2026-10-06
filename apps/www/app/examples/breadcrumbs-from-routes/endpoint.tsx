import type { BreadcrumbHandle } from "@ngrok/mantle/breadcrumb";
import { routeBreadcrumb } from "@ngrok/mantle/breadcrumb";
import { Skeleton } from "@ngrok/mantle/skeleton";
import { Outlet, type UIMatch } from "react-router";
import type { OriginHandle } from "~/features/navigation-origin/origin-trail";
import type { Route } from "./+types/endpoint";
import { isEndpointType } from "./fixtures";
import { demoPaths } from "./paths";
import { useEndpoint } from "./queries";
import { RouteTabs } from "./route-tabs";

export const handle = {
	// Why the explicit ancestor: this route is a sibling of `endpoints`, not a
	// child, so the list route never matches here and cannot contribute.
	breadcrumb: (match) => [
		routeBreadcrumb("Endpoints", { to: demoPaths.endpoints }),
		routeBreadcrumb(match.params.endpointId),
	],
	origin: (match) =>
		match.params.endpointId == null ? null : { kind: "endpoint", id: match.params.endpointId },
} satisfies BreadcrumbHandle<UIMatch> & OriginHandle<UIMatch>;

/**
 * An endpoint's detail page. The tabs are child routes with no crumb of their
 * own: the trail ends at the endpoint, and the tabs own the level below it.
 */
export default function EndpointDetail({ params }: Route.ComponentProps) {
	const endpointQuery = useEndpoint(params.endpointId);

	if (!isEndpointType(params.endpointType)) {
		return <p className="text-muted p-6 text-sm">No endpoint type has this name.</p>;
	}

	const { endpointType, endpointId } = params;

	return (
		<div className="flex flex-col gap-6 p-6">
			<div className="flex flex-col gap-1">
				{endpointQuery.data ? (
					<h1 className="text-strong text-2xl font-medium">{endpointQuery.data.url}</h1>
				) : (
					<Skeleton className="h-8 w-80" />
				)}
				<code translate="no" className="text-muted text-xs">
					{endpointId}
				</code>
			</div>
			<RouteTabs
				aria-label="Endpoint sections"
				tabs={[
					{
						value: "overview",
						label: "Overview",
						to: demoPaths.endpointTab(endpointType, endpointId, "overview"),
					},
					{
						value: "traffic",
						label: "Traffic",
						to: demoPaths.endpointTab(endpointType, endpointId, "traffic"),
					},
					{
						value: "traffic-policy",
						label: "Traffic Policy",
						to: demoPaths.endpointTab(endpointType, endpointId, "traffic-policy"),
					},
					{
						value: "settings",
						label: "Settings",
						to: demoPaths.endpointTab(endpointType, endpointId, "settings"),
					},
				]}
			/>
			<Outlet />
		</div>
	);
}
