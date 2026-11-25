import type { FilterGrammar } from "./grammar.js";

/**
 * A small grammar over plain objects for the engine's own tests. It mirrors
 * the shape of a real grammar (aliases, an enumerated key, prose keys), so
 * the tests stay grammar-realistic without depending on any feature.
 */

/** One item the test grammar filters. */
type TestItem = {
	id: string;
	name: string;
	description?: string;
	metadata?: string;
	shared?: boolean;
	isNew?: boolean;
	archived?: boolean;
};

/** The engine tests' grammar. */
const testGrammar: FilterGrammar<TestItem> = {
	keys: [
		{
			key: "name",
			aliases: ["title", "project"],
			description: "Text in the project name",
			matches: (item, value) => item.name.toLowerCase().includes(value.toLowerCase()),
		},
		{
			key: "description",
			aliases: ["desc"],
			description: "Text in the project description",
			prose: true,
			matches: (item, value) =>
				(item.description ?? "").toLowerCase().includes(value.toLowerCase()),
		},
		{
			key: "is",
			description: "The project state",
			values: [
				{ value: "new", description: "Created this week" },
				{ value: "shared", description: "Shared with your team" },
				{ value: "private", description: "Only you can see it", aliases: ["personal"] },
				{ value: "archived", description: "Kept for reference" },
			],
			matches: (item, value) => {
				switch (value) {
					case "new":
						return item.isNew === true;
					case "shared":
						return item.shared === true;
					case "private":
						return item.shared !== true;
					case "archived":
						return item.archived === true;
					default:
						return false;
				}
			},
		},
		{
			key: "id",
			description: "One project ID",
			matches: (item, value) => item.id.toLowerCase() === value.toLowerCase(),
		},
		{
			key: "metadata",
			aliases: ["meta"],
			description: "Text in the project metadata",
			prose: true,
			matches: (item, value) => (item.metadata ?? "").toLowerCase().includes(value.toLowerCase()),
		},
	],
	getSearchText: (item) => [item.name, item.description, item.id, item.metadata].join("\n"),
};

/** Three items the suggestion and input tests count against. */
const testItems: TestItem[] = [
	{ id: "p_api", name: "acme-api", shared: true },
	{ id: "p_app", name: "acme-app", shared: true },
	{ id: "p_new", name: "lovely-lemur", isNew: true },
];

/** One item the typed test grammar filters. */
type TestDeployment = {
	name: string;
	state: "live" | "paused";
	replicas: number;
	/** Epoch milliseconds, a `Date`, or an ISO 8601 string: a date key reads all three. */
	createdAt: number | Date | string;
	/** Milliseconds. */
	uptime: number;
	canary: boolean;
	region: string | null;
};

/** The clock the typed tests pass: 2026-01-31T12:00:00.000Z. */
const testNow = Date.UTC(2026, 0, 31, 12);

/** A grammar of typed keys, one for each value type and operator limit. */
const typedTestGrammar: FilterGrammar<TestDeployment> = {
	keys: [
		{
			key: "name",
			description: "The deployment name",
			type: "text",
			getValue: (item) => item.name,
		},
		{
			key: "state",
			description: "The deployment state",
			type: "enum",
			values: [{ value: "live", aliases: ["running"] }, { value: "paused" }],
			getValue: (item) => item.state,
		},
		{
			key: "replicas",
			description: "The replica count",
			type: "number",
			getValue: (item) => item.replicas,
		},
		{
			key: "created",
			aliases: ["created_at"],
			description: "When the deployment was created",
			type: "date",
			getValue: (item) => item.createdAt,
		},
		{
			key: "uptime",
			description: "Time since the last restart",
			type: "duration",
			getValue: (item) => item.uptime,
		},
		{
			key: "latency",
			description: "A duration the executor only compares from below",
			type: "duration",
			operators: ["gt", "gte"],
			getValue: (item) => item.uptime,
		},
		{
			key: "canary",
			description: "Whether the deployment is a canary",
			type: "boolean",
			negatable: false,
			getValue: (item) => item.canary,
		},
		{
			key: "region",
			description: "The region, matched exactly",
			type: "text",
			operators: ["equals"],
			getValue: (item) => item.region,
		},
	],
	getSearchText: (item) => item.name,
};

/** Four deployments that sit on both sides of each boundary the typed tests probe. */
const typedTestItems: TestDeployment[] = [
	{
		name: "api-gateway",
		state: "live",
		replicas: 3,
		createdAt: testNow - 2 * 86_400_000,
		uptime: 2 * 3_600_000,
		canary: false,
		region: "us",
	},
	{
		name: "web",
		state: "paused",
		replicas: 0,
		createdAt: new Date(Date.UTC(2026, 0, 1)),
		uptime: 90_000,
		canary: true,
		region: "eu",
	},
	{
		name: "billing-api",
		state: "live",
		replicas: 5,
		createdAt: Date.UTC(2026, 0, 1) - 1,
		uptime: 0,
		canary: false,
		region: null,
	},
	{
		name: "legacy-API",
		state: "live",
		replicas: 2.5,
		createdAt: "2026-01-15T00:00:00Z",
		uptime: 3 * 86_400_000,
		canary: false,
		region: "usa",
	},
];

export {
	//,
	testGrammar,
	testItems,
	testNow,
	typedTestGrammar,
	typedTestItems,
};

export type {
	//,
	TestDeployment,
	TestItem,
};
