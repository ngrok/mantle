import { href } from "react-router";

/**
 * Every destination the demo links to, built once with the typed `href`. The
 * demo lives under `/preview/breadcrumbs-from-routes`, so the recipe's
 * `/domains` is `demoPaths.domains` here.
 */
const demoPaths = {
	endpoints: href("/preview/breadcrumbs-from-routes/endpoints"),
	endpoint: (endpointId: string) =>
		href("/preview/breadcrumbs-from-routes/endpoints/:endpointId", { endpointId }),
	endpointTrafficPolicy: (endpointId: string) =>
		href("/preview/breadcrumbs-from-routes/endpoints/:endpointId/traffic-policy", { endpointId }),
	domains: href("/preview/breadcrumbs-from-routes/domains"),
	domain: (domainId: string) =>
		href("/preview/breadcrumbs-from-routes/domains/:domainId", { domainId }),
	tlsCerts: href("/preview/breadcrumbs-from-routes/tls-certs"),
	apps: href("/preview/breadcrumbs-from-routes/apps"),
	app: (appId: string) => href("/preview/breadcrumbs-from-routes/apps/:appId", { appId }),
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
