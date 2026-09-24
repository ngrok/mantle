/**
 * The demo's data. Every page and every crumb label resolves from these
 * records through the query hooks in `queries.ts`, so the demo shows the
 * same warm-cache and cold-cache behavior an app sees.
 */

/** The URL segments that name how an endpoint is served. */
const endpointTypes = ["cloud", "agent"] as const;

type DemoEndpointType = (typeof endpointTypes)[number];

/**
 * Whether a URL segment names an endpoint type. A real type guard, so a page
 * reads `params.endpointType` without an assertion.
 */
function isEndpointType(value: string): value is DemoEndpointType {
	return endpointTypes.some((type) => type === value);
}

type DemoEndpoint = {
	id: string;
	type: DemoEndpointType;
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

type DemoVault = {
	id: string;
	name: string;
};

type DemoSecret = {
	id: string;
	vaultId: string;
	name: string;
	updatedOn: string;
};

const endpoints: ReadonlyArray<DemoEndpoint> = [
	{
		id: "ep_3Exgo",
		type: "cloud",
		url: "https://forward-labels.test",
		domainId: "rd_2Kq9a",
		trafficPolicy: "on_http_request:\n  - actions:\n      - type: forward-internal",
	},
	{
		id: "ep_7Hnq2",
		type: "cloud",
		url: "https://api.forward-labels.test",
		domainId: "rd_2Kq9a",
		trafficPolicy: "on_http_request:\n  - actions:\n      - type: oauth",
	},
	{
		id: "ep_9Zr4m",
		type: "agent",
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

const vaults: ReadonlyArray<DemoVault> = [
	{ id: "vlt_9Xk2p", name: "production" },
	{ id: "vlt_4Ma7r", name: "staging" },
];

const secrets: ReadonlyArray<DemoSecret> = [
	{ id: "sec_4Kd9w", vaultId: "vlt_9Xk2p", name: "DATABASE_URL", updatedOn: "2026-08-30" },
	{ id: "sec_8Bq1z", vaultId: "vlt_9Xk2p", name: "SMTP_PASSWORD", updatedOn: "2026-07-12" },
	{ id: "sec_2Fn6t", vaultId: "vlt_4Ma7r", name: "DATABASE_URL", updatedOn: "2026-09-02" },
];

export {
	//,
	domains,
	endpoints,
	isEndpointType,
	secrets,
	tlsCerts,
	vaults,
};

export type {
	//,
	DemoDomain,
	DemoEndpoint,
	DemoEndpointType,
	DemoSecret,
	DemoTlsCert,
	DemoVault,
};
