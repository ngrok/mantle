import type { Route } from "./+types/endpoint-traffic";
import { endpoints } from "./fixtures";

/**
 * The Traffic tab. Like every tab, it is a child route with no `handle`, so
 * the trail in the header still ends at the endpoint.
 */
export default function EndpointTraffic({ params }: Route.ComponentProps) {
	const endpoint = endpoints.find((candidate) => candidate.id === params.endpointId);

	if (endpoint == null) {
		return <p className="text-muted text-sm">No endpoint has this id.</p>;
	}

	return (
		<p className="text-muted text-sm">
			No requests reached <code translate="no">{endpoint.url}</code> in the last hour.
		</p>
	);
}
