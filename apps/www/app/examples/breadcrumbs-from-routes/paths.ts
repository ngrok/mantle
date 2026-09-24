import { href } from "react-router";
import type { DemoEndpointType } from "./fixtures";

/** The URL segment of each tab under an endpoint. */
type EndpointTab = "overview" | "traffic" | "traffic-policy" | "settings";

/**
 * An endpoint's resource root. It redirects to the Overview tab, and it is
 * the `to` an origin entry stores, so a link from another resource targets
 * it rather than a tab.
 */
function endpointRoot(endpointType: DemoEndpointType, endpointId: string): string {
	return href("/preview/breadcrumbs-from-routes/endpoints/:endpointType/:endpointId", {
		endpointType,
		endpointId,
	});
}

/**
 * Every destination the demo links to, built once with the typed `href`. The
 * demo lives under `/preview/breadcrumbs-from-routes`, so the recipe's
 * `/domains` is `demoPaths.domains` here.
 */
const demoPaths = {
	endpoints: href("/preview/breadcrumbs-from-routes/endpoints"),
	endpoint: endpointRoot,
	endpointTab: (endpointType: DemoEndpointType, endpointId: string, tab: EndpointTab) =>
		`${endpointRoot(endpointType, endpointId)}/${tab}`,
	domains: href("/preview/breadcrumbs-from-routes/domains"),
	domain: (domainId: string) =>
		href("/preview/breadcrumbs-from-routes/domains/:domainId", { domainId }),
	tlsCerts: href("/preview/breadcrumbs-from-routes/tls-certs"),
	vaults: href("/preview/breadcrumbs-from-routes/vaults"),
	vault: (vaultId: string) => href("/preview/breadcrumbs-from-routes/vaults/:vaultId", { vaultId }),
	secret: (vaultId: string, secretId: string) =>
		href("/preview/breadcrumbs-from-routes/vaults/:vaultId/secrets/:secretId", {
			vaultId,
			secretId,
		}),
	settingsGeneral: href("/preview/breadcrumbs-from-routes/settings/general"),
	billing: href("/preview/breadcrumbs-from-routes/billing"),
	teamMembers: href("/preview/breadcrumbs-from-routes/team-members"),
	/** The demo-only entry that lands on a domain page with the endpoint as the origin. */
	fromEndpoint: (endpointId: string) =>
		href("/preview/breadcrumbs-from-routes/from-endpoint/:endpointId", { endpointId }),
} as const;

export {
	//,
	demoPaths,
};

export type {
	//,
	EndpointTab,
};
