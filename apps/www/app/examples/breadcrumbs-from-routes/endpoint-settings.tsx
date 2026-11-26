import { DescriptionList } from "@ngrok/mantle/description-list";
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
		<DescriptionList.Root>
			<DescriptionList.Item>
				<DescriptionList.Label>URL</DescriptionList.Label>
				{/* Why break-all: a URL or a domain name has no space, and a 320px screen is narrower than it. */}
				<DescriptionList.Value translate="no" className="break-all">
					{endpoint.url}
				</DescriptionList.Value>
			</DescriptionList.Item>
			<DescriptionList.Item>
				<DescriptionList.Label>Domain</DescriptionList.Label>
				<DescriptionList.Value className="break-all">{domain.name}</DescriptionList.Value>
			</DescriptionList.Item>
			<DescriptionList.Item>
				<DescriptionList.Label>Pooling</DescriptionList.Label>
				<DescriptionList.Value>disabled</DescriptionList.Value>
			</DescriptionList.Item>
		</DescriptionList.Root>
	);
}
