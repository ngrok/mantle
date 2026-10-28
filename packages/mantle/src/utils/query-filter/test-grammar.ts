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

export {
	//,
	testGrammar,
	testItems,
};

export type {
	//,
	TestItem,
};
