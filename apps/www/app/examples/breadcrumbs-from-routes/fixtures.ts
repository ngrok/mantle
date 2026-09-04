/**
 * The demo's data. Every page and every crumb label resolves from these
 * records through the query hooks in `queries.ts`, so the demo shows the
 * same warm-cache and cold-cache behavior an app sees.
 */

type DemoEndpoint = {
	id: string;
	url: string;
	domainId: string;
	/** The traffic policy the Traffic Policy tab shows. */
	trafficPolicy: string;
};

type DemoDomain = {
	id: string;
	name: string;
	certId: string;
};

type DemoTlsCert = {
	id: string;
	description: string;
	expiresOn: string;
};

type DemoApp = {
	id: string;
	name: string;
};

const endpoints: ReadonlyArray<DemoEndpoint> = [
	{
		id: "ep_3Exgo",
		url: "https://forward-labels.test",
		domainId: "rd_2Kq9a",
		trafficPolicy: "on_http_request:\n  - actions:\n      - type: forward-internal",
	},
	{
		id: "ep_7Hnq2",
		url: "https://api.forward-labels.test",
		domainId: "rd_2Kq9a",
		trafficPolicy: "on_http_request:\n  - actions:\n      - type: oauth",
	},
	{
		id: "ep_9Zr4m",
		url: "https://staging.mantle.test",
		domainId: "rd_8Tt1c",
		trafficPolicy: "on_http_request:\n  - actions:\n      - type: basic-auth",
	},
];

const domains: ReadonlyArray<DemoDomain> = [
	{ id: "rd_2Kq9a", name: "forward-labels.test", certId: "cert_5Pw2x" },
	{ id: "rd_8Tt1c", name: "staging.mantle.test", certId: "cert_1Ll7v" },
];

const tlsCerts: ReadonlyArray<DemoTlsCert> = [
	{ id: "cert_5Pw2x", description: "*.forward-labels.test", expiresOn: "2027-03-01" },
	{ id: "cert_1Ll7v", description: "staging.mantle.test", expiresOn: "2026-11-15" },
];

const apps: ReadonlyArray<DemoApp> = [
	{ id: "app_123", name: "my-app" },
	{ id: "app_456", name: "billing-portal" },
];

export {
	//,
	apps,
	domains,
	endpoints,
	tlsCerts,
};

export type {
	//,
	DemoApp,
	DemoDomain,
	DemoEndpoint,
	DemoTlsCert,
};
