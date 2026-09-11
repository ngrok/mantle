import type { Route } from "./+types/endpoint-traffic-policy";
import { endpoints } from "./fixtures";

/**
 * The Traffic Policy tab. A tab that forwards `location.state` keeps the
 * origin trail; the trail in the header does not change when you open it.
 */
export default function EndpointTrafficPolicy({ params }: Route.ComponentProps) {
	const endpoint = endpoints.find((candidate) => candidate.id === params.endpointId);

	if (endpoint == null) {
		return <p className="text-muted text-sm">No endpoint has this id.</p>;
	}

	return (
		<pre
			translate="no"
			className="bg-base text-strong border-card-muted overflow-auto rounded-lg border p-4 text-xs"
		>
			{endpoint.trafficPolicy}
		</pre>
	);
}
