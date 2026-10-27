import { describe, expect, test } from "vitest";

import { acceptsValueList, defineRemoteFilterGrammar, getFilterSyntax } from "./grammar.js";
import { getHighlightSegments } from "./highlight.js";
import { parseFilterQuery } from "./parse.js";
import { getFilterSuggestions } from "./suggestions.js";
import { testGrammar } from "./test-grammar.js";

/** A remote grammar shaped like the corp account search: verbs the server reads. */
const remoteGrammar = defineRemoteFilterGrammar({
	keys: [
		{ key: "hasplan", description: "Accounts on a plan" },
		{
			key: "is",
			description: "Account state",
			values: [{ value: "suspended" }, { value: "past_due", description: "Payment past due" }],
		},
	],
});

/** A remote grammar shaped like the traffic inspector: one AND group the server runs. */
const conjunctionGrammar = defineRemoteFilterGrammar({
	syntax: "conjunction",
	keys: [
		{ key: "method", description: "HTTP method", values: [{ value: "GET" }, { value: "POST" }] },
		{ key: "host", description: "Host name", negatable: false },
	],
});

describe("getFilterSyntax", () => {
	test("defaults a grammar to the full syntax", () => {
		expect(getFilterSyntax(testGrammar)).toBe("full");
	});

	test("reads the qualifiers syntax off a remote grammar", () => {
		expect(getFilterSyntax(remoteGrammar)).toBe("qualifiers");
	});

	test("reads the conjunction syntax a remote grammar declares", () => {
		expect(getFilterSyntax(conjunctionGrammar)).toBe("conjunction");
	});
});

describe("acceptsValueList", () => {
	test("splits list keys and keeps prose keys whole under the full syntax", () => {
		const [domain, description] = testGrammar.keys;
		if (domain == null || description == null) {
			throw new Error("the test grammar lost its keys");
		}

		expect(acceptsValueList(testGrammar, domain)).toBe(true);
		expect(acceptsValueList(testGrammar, description)).toBe(false);
	});

	test("never splits under the qualifiers syntax", () => {
		const [hasplan] = remoteGrammar.keys;
		if (hasplan == null) {
			throw new Error("the remote grammar lost its keys");
		}

		expect(acceptsValueList(remoteGrammar, hasplan)).toBe(false);
	});
});

describe("defineRemoteFilterGrammar", () => {
	test("keeps every qualifier and value spelling it was given", () => {
		expect(parseFilterQuery(remoteGrammar, "hasplan:v2_pro is:PAST_DUE")).toMatchObject([
			{ kind: "facet", key: "hasplan", members: [{ value: "v2_pro", isKnownValue: true }] },
			{ kind: "facet", key: "is", members: [{ value: "past_due", isKnownValue: true }] },
		]);
	});

	test("reads the dash, the operators, quotes, and commas as plain text", () => {
		// The server splits on spaces and reads `verb:value`; nothing else is
		// structure, so the highlighter must not promise otherwise.
		expect(parseFilterQuery(remoteGrammar, '-hasplan:free OR "acme corp" is:a,b')).toMatchObject([
			{ kind: "text", text: "-hasplan:free", negated: false },
			{ kind: "text", text: "OR" },
			{ kind: "text", text: '"acme' },
			{ kind: "text", text: 'corp"' },
			{ kind: "facet", key: "is", members: [{ value: "a,b", isKnownValue: false }] },
		]);
		expect(getHighlightSegments(remoteGrammar, "-is:suspended OR acme")).toMatchObject([
			{ text: "-is:suspended", kind: "text" },
			{ text: " ", kind: "plain" },
			{ text: "OR", kind: "text" },
			{ text: " ", kind: "plain" },
			{ text: "acme", kind: "text" },
		]);
	});

	test("offers no exclusions, since the executor has none", () => {
		const { items } = getFilterSuggestions({ grammar: remoteGrammar, query: "", caretIndex: 0 });

		expect(items.map((item) => item.label)).toEqual(["hasplan:", "is:"]);
		expect(items.every((item) => item.section === "filters")).toBe(true);
	});
});

describe("the conjunction syntax", () => {
	test("reads the dash, quotes, commas, and the operators as structure", () => {
		expect(
			parseFilterQuery(conjunctionGrammar, '-method:GET,POST host:"a b" OR AND'),
		).toMatchObject([
			{
				kind: "facet",
				key: "method",
				negated: true,
				members: [{ value: "GET" }, { value: "POST" }],
			},
			{ kind: "facet", key: "host", members: [{ value: "a b" }] },
			{ kind: "or" },
			{ kind: "and" },
		]);
	});

	test("paints a bare term invalid, and OR and AND as operators", () => {
		expect(getHighlightSegments(conjunctionGrammar, "404 OR -acme AND method:GET")).toMatchObject([
			{ text: "404", kind: "invalid" },
			{ text: " ", kind: "plain" },
			{ text: "OR", kind: "operator" },
			{ text: " ", kind: "plain" },
			{ text: "-acme", kind: "invalid" },
			{ text: " ", kind: "plain" },
			{ text: "AND", kind: "operator" },
			{ text: " ", kind: "plain" },
			{ text: "method", kind: "key" },
			{ text: ":", kind: "syntax" },
			{ text: "GET", kind: "value" },
		]);
	});

	test("paints the dash invalid on a key that cannot exclude, and as syntax on one that can", () => {
		expect(getHighlightSegments(conjunctionGrammar, "-host:a -method:GET")).toMatchObject([
			{ text: "-", kind: "invalid" },
			{ text: "host", kind: "key" },
			{ text: ":", kind: "syntax" },
			{ text: "a", kind: "value" },
			{ text: " ", kind: "plain" },
			{ text: "-", kind: "syntax" },
			{ text: "method", kind: "key" },
			{ text: ":", kind: "syntax" },
			{ text: "GET", kind: "value" },
		]);
	});

	test("offers an exclusion only for the keys that can exclude", () => {
		const { items } = getFilterSuggestions({
			grammar: conjunctionGrammar,
			query: "",
			caretIndex: 0,
		});

		expect(items.map((item) => item.label)).toEqual(["method:", "host:", "-method:"]);
	});

	test("offers no row for a key that cannot exclude once a dash is typed", () => {
		const excluded = getFilterSuggestions({
			grammar: conjunctionGrammar,
			query: "-hos",
			caretIndex: 4,
		});
		const offered = getFilterSuggestions({
			grammar: conjunctionGrammar,
			query: "-me",
			caretIndex: 3,
		});

		expect(excluded.items).toEqual([]);
		expect(offered.items.map((item) => item.label)).toEqual(["-method:"]);
	});
});
