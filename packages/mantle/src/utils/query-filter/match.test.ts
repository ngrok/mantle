import { describe, expect, test, vi } from "vitest";

import { countItemsByQuery, filterItemsByQuery, filterItemsByTokens } from "./match.js";
import { parseFilterQuery } from "./parse.js";
import { testGrammar, testItems, type TestItem } from "./test-grammar.js";

/** Parses a query against the engine's own grammar. */
function tokens(query: string) {
	return parseFilterQuery(testGrammar, query);
}

/**
 * A fresh copy of the fixture items per test: the count cache keys on the
 * items array identity, so a shared array would let one test's counts leak
 * into another.
 */
function freshItems(): TestItem[] {
	return testItems.map((item) => ({ ...item }));
}

describe("filterItemsByTokens", () => {
	// A caller that memoizes on the query string alone relies on this identity:
	// a new array on an unasked query would give each list a new reference on
	// every render.
	test("hands back the same array when the query asks nothing", () => {
		expect(
			filterItemsByTokens({ grammar: testGrammar, items: testItems, tokens: tokens("") }),
		).toBe(testItems);
		expect(
			filterItemsByTokens({ grammar: testGrammar, items: testItems, tokens: tokens("   ") }),
		).toBe(testItems);
	});

	test("hands back the same array for the bare operators typing passes through", () => {
		expect(
			filterItemsByTokens({ grammar: testGrammar, items: testItems, tokens: tokens("OR") }),
		).toBe(testItems);
		expect(
			filterItemsByTokens({ grammar: testGrammar, items: testItems, tokens: tokens("||") }),
		).toBe(testItems);
		expect(
			filterItemsByTokens({ grammar: testGrammar, items: testItems, tokens: tokens("AND") }),
		).toBe(testItems);
	});

	test("copies the array for a qualifier whose value is not typed yet", () => {
		const result = filterItemsByTokens({
			grammar: testGrammar,
			items: testItems,
			tokens: tokens("is:"),
		});

		// A memberless qualifier skips matching rather than emptying the list, so
		// the contents are whole even though the reference is new.
		expect(result).not.toBe(testItems);
		expect(result).toEqual(testItems);
	});

	test("copies the array for a query that filters", () => {
		const result = filterItemsByTokens({
			grammar: testGrammar,
			items: testItems,
			tokens: tokens("is:new"),
		});

		expect(result).not.toBe(testItems);
		expect(result).toEqual([testItems[2]]);
	});
});

describe("filterItemsByQuery", () => {
	test("keeps the same identity guarantee as the parsed form", () => {
		expect(filterItemsByQuery({ grammar: testGrammar, items: testItems, query: "" })).toBe(
			testItems,
		);
		expect(
			filterItemsByQuery({ grammar: testGrammar, items: testItems, query: "is:new" }),
		).not.toBe(testItems);
	});
});

/**
 * The engine's evaluation rules, tested once here so a feature grammar test
 * pins only its own keys, values, and corpus. The descriptions and the
 * metadata give the free-text terms something to find that the names do not
 * carry.
 */
describe("filterItemsByQuery evaluation", () => {
	const items: TestItem[] = [
		{
			id: "p_api",
			name: "acme-api",
			description: "Production API",
			metadata: "env:prod",
			shared: true,
		},
		{ id: "p_app", name: "acme-app", description: "Staging app", shared: true },
		{ id: "p_new", name: "lovely-lemur", description: "Draft roadmap", isNew: true },
	];

	/** Filters the fixture items and returns the matching IDs, in list order. */
	function ids(query: string, grammar = testGrammar) {
		return filterItemsByQuery({ grammar, items, query }).map((item) => item.id);
	}

	test("ANDs every token, repeats of one key included", () => {
		expect(ids("acme production")).toEqual(["p_api"]);
		expect(ids("name:acme name:app")).toEqual(["p_app"]);
		expect(ids("name:api name:app")).toEqual([]);
	});

	test("reads a bare AND or && as the conjunction it already implies", () => {
		expect(ids("name:acme AND staging")).toEqual(["p_app"]);
		expect(ids("name:acme && staging")).toEqual(["p_app"]);
		expect(ids("is:new AND")).toEqual(["p_new"]);
	});

	test("ORs the comma members of one value", () => {
		expect(ids("id:p_api,p_new")).toEqual(["p_api", "p_new"]);
	});

	test("matches the known members even when a sibling member is unknown", () => {
		expect(ids("is:new,bogus")).toEqual(["p_new"]);
	});

	test("ignores a comma-only value the same as an empty one", () => {
		expect(ids("is:,")).toHaveLength(3);
	});

	test("ORs whole filter groups, with AND binding tighter", () => {
		expect(ids("is:new OR name:api")).toEqual(["p_api", "p_new"]);
		expect(ids("is:shared staging OR is:new")).toEqual(["p_app", "p_new"]);
		expect(ids("id:p_api || id:p_new")).toEqual(["p_api", "p_new"]);
	});

	test("ignores an OR that has nothing on one side yet", () => {
		expect(ids("is:new OR")).toEqual(["p_new"]);
		expect(ids("OR is:new")).toEqual(["p_new"]);
		expect(ids("is:new OR OR id:p_api")).toEqual(["p_api", "p_new"]);
	});

	test("excludes the rows a negated term matches", () => {
		expect(ids("-staging")).toEqual(["p_api", "p_new"]);
	});

	test("excludes on a negated qualifier, ANDing the exclusions", () => {
		expect(ids("-is:new")).toEqual(["p_api", "p_app"]);
		expect(ids("-is:new -name:api")).toEqual(["p_app"]);
	});

	test("excludes every row a negated member list matches", () => {
		expect(ids("-is:new,shared")).toEqual([]);
	});

	test("matches nothing for an unknown value, and its negation excludes nothing", () => {
		// The designed filtered-empty state: a real filter nothing satisfies.
		expect(ids("is:bogus")).toEqual([]);
		expect(ids("-is:bogus")).toHaveLength(3);
	});

	test("searches an unknown key as literal text rather than failing", () => {
		// A misspelled key stays one term, so it finds the rows that carry it
		// as text and empties the list for the rows that do not.
		expect(ids("env:prod")).toEqual(["p_api"]);
		expect(ids("stauts:active")).toEqual([]);
	});

	test("matches an exact substring instead of a fuzzy neighbour", () => {
		expect(ids("staging")).toEqual(["p_app"]);
		expect(ids("stagnig")).toEqual([]);
	});

	test("matches free text case-insensitively", () => {
		expect(ids("PRODUCTION")).toEqual(["p_api"]);
	});

	test("matches no row for a term that normalizes to nothing, so its negation matches every row", () => {
		const wildcardGrammar = {
			...testGrammar,
			normalizeSearchTerm: (term: string) => term.replace(/^\*\./, ""),
		};

		expect(ids("*.", wildcardGrammar)).toEqual([]);
		expect(ids("-*.", wildcardGrammar)).toHaveLength(3);
		expect(ids("*.acme", wildcardGrammar)).toEqual(["p_api", "p_app"]);
	});
});

describe("countItemsByQuery", () => {
	test("counts what filterItemsByQuery would return", () => {
		const items = freshItems();

		expect(countItemsByQuery(testGrammar, items, "")).toBe(3);
		expect(countItemsByQuery(testGrammar, items, "is:new")).toBe(1);
		expect(countItemsByQuery(testGrammar, items, "is:shared acme")).toBe(2);
		expect(countItemsByQuery(testGrammar, items, "is:new OR is:shared")).toBe(3);
		expect(countItemsByQuery(testGrammar, items, "-is:shared")).toBe(1);
		expect(countItemsByQuery(testGrammar, items, "is:archived")).toBe(0);
	});

	test("serves a repeat of the same items and query from the cache", () => {
		const definition = testGrammar.keys.find((key) => key.key === "is");
		if (definition == null) {
			throw new Error("the test grammar lost its is key");
		}
		const matches = vi.spyOn(definition, "matches");
		const items = freshItems();

		expect(countItemsByQuery(testGrammar, items, "is:new")).toBe(1);
		expect(matches).toHaveBeenCalledTimes(items.length);

		expect(countItemsByQuery(testGrammar, items, "is:new")).toBe(1);
		expect(matches).toHaveBeenCalledTimes(items.length);
	});

	test("recounts when the items array is replaced", () => {
		const definition = testGrammar.keys.find((key) => key.key === "is");
		if (definition == null) {
			throw new Error("the test grammar lost its is key");
		}
		const matches = vi.spyOn(definition, "matches");

		expect(countItemsByQuery(testGrammar, freshItems(), "is:new")).toBe(1);
		expect(countItemsByQuery(testGrammar, freshItems(), "is:new")).toBe(1);

		expect(matches).toHaveBeenCalledTimes(testItems.length * 2);
	});
});
