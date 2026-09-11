import { Anchor } from "@ngrok/mantle/anchor";
import { OriginLink } from "~/features/navigation-origin/origin-link";
import type { Route } from "./+types/endpoint-overview";
import { domains, endpoints } from "./fixtures";
import { demoPaths } from "./paths";

/**
 * The Overview tab. Its domain link is an `OriginLink`, so the domain page
 * shows this endpoint as where the reader came from.
 */
export default function EndpointOverview({ params }: Route.ComponentProps) {
	const endpoint = endpoints.find((candidate) => candidate.id === params.endpointId);
	const domain = domains.find((candidate) => candidate.id === endpoint?.domainId);

	if (endpoint == null || domain == null) {
		return <p className="text-muted text-sm">No endpoint has this id.</p>;
	}

	return (
		<dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm">
			<dt className="text-muted">Domain</dt>
			<dd>
				<Anchor asChild>
					<OriginLink to={demoPaths.domain(domain.id)}>{domain.name}</OriginLink>
				</Anchor>
			</dd>
			<dt className="text-muted">Binding</dt>
			<dd className="text-strong">public</dd>
			<dt className="text-muted">Type</dt>
			<dd className="text-strong">cloud</dd>
		</dl>
	);
}
