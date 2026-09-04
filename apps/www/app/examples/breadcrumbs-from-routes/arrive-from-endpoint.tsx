import { useEffect } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/arrive-from-endpoint";
import { endpoints } from "./fixtures";
import { demoPaths } from "./paths";

/**
 * A demo-only entry point. A frame can point at a URL but not at a history
 * entry with state, so this route lands on a domain page as if the reader
 * had followed the endpoint's domain link: it replaces itself with the domain
 * route and carries the endpoint as the origin trail. The navigation runs in
 * an effect, so the server renders the placeholder and the client moves on.
 */
export default function ArriveFromEndpoint({ params }: Route.ComponentProps) {
	const navigate = useNavigate();
	const endpoint = endpoints.find((candidate) => candidate.id === params.endpointId);

	useEffect(() => {
		if (endpoint == null) {
			return;
		}
		void navigate(demoPaths.domain(endpoint.domainId), {
			replace: true,
			state: {
				origin: [
					{
						kind: "endpoint",
						id: endpoint.id,
						to: demoPaths.endpoint(endpoint.id),
						ancestors: [{ label: "Endpoints", to: demoPaths.endpoints }],
					},
				],
			},
		});
	}, [endpoint, navigate]);

	if (endpoint == null) {
		return <p className="text-muted p-6 text-sm">No endpoint has this id.</p>;
	}

	return (
		<p className="text-muted p-6 text-sm">
			Arriving at the domain from <code translate="no">{endpoint.url}</code>…
		</p>
	);
}
