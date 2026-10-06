import type { Route } from "./+types/endpoint-settings";
import { domains, endpoints } from "./fixtures";

/** The Settings tab: the endpoint's configuration, read straight from the fixtures. */
export default function EndpointSettings({ params }: Route.ComponentProps) {
	const endpoint = endpoints.find((candidate) => candidate.id === params.endpointId);
	const domain = domains.find((candidate) => candidate.id === endpoint?.domainId);

	if (endpoint == null || domain == null) {
		return <p className="text-muted text-sm">No endpoint has this id.</p>;
	}

	return (
		<dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm">
			<dt className="text-muted">URL</dt>
			<dd>
				<code translate="no" className="text-strong">
					{endpoint.url}
				</code>
			</dd>
			<dt className="text-muted">Domain</dt>
			<dd className="text-strong">{domain.name}</dd>
			<dt className="text-muted">Pooling</dt>
			<dd className="text-strong">disabled</dd>
		</dl>
	);
}
