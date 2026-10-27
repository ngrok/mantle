import type { FilterGrammar } from "./grammar.js";

/**
 * A small grammar over plain objects for the engine's own tests. It mirrors
 * the shape of a real grammar — aliases, an enumerated key, prose keys — so
 * the tests stay grammar-realistic without depending on any feature.
 */

/** One item the test grammar filters. */
type TestItem = {
	id: string;
	name: string;
	description?: string;
	metadata?: string;
	custom?: boolean;
	dev?: boolean;
};

/** The engine tests' grammar. */
const testGrammar: FilterGrammar<TestItem> = {
	keys: [
		{
			key: "domain",
			aliases: ["name", "host", "hostname"],
			description: "Text in the domain name",
			matches: (item, value) => item.name.toLowerCase().includes(value.toLowerCase()),
		},
		{
			key: "description",
			aliases: ["desc"],
			description: "Text in the domain description",
			prose: true,
			matches: (item, value) =>
				(item.description ?? "").toLowerCase().includes(value.toLowerCase()),
		},
		{
			key: "is",
			description: "The kind of domain",
			values: [
				{ value: "dev", description: "Your free dev domain" },
				{ value: "custom", description: "A domain you brought to ngrok" },
				{ value: "managed", description: "A hostname ngrok gave you", aliases: ["ngrok"] },
				{ value: "wildcard", description: "Covers every subdomain" },
			],
			matches: (item, value) => {
				switch (value) {
					case "dev":
						return item.dev === true;
					case "custom":
						return item.custom === true;
					case "managed":
						return item.custom !== true;
					case "wildcard":
						return item.name.startsWith("*.");
					default:
						return false;
				}
			},
		},
		{
			key: "id",
			description: "One domain ID",
			matches: (item, value) => item.id.toLowerCase() === value.toLowerCase(),
		},
		{
			key: "metadata",
			aliases: ["meta"],
			description: "Text in the domain metadata",
			prose: true,
			matches: (item, value) => (item.metadata ?? "").toLowerCase().includes(value.toLowerCase()),
		},
	],
	getSearchText: (item) => [item.name, item.description, item.id, item.metadata].join("\n"),
};

/** Three items the suggestion and input tests count against. */
const testItems: TestItem[] = [
	{ id: "rd_api", name: "api.acme.com", custom: true },
	{ id: "rd_app", name: "app.acme.com", custom: true },
	{ id: "rd_dev", name: "lovely-lemur.ngrok.dev", dev: true },
];

export {
	//,
	testGrammar,
	testItems,
};

export type {
	//,
	TestItem,
};
