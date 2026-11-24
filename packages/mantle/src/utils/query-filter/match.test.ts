import { describe, expect, test, vi } from "vitest";

import { countItemsByQuery, filterItemsByQuery, filterItemsByTokens } from "./match.js";
import { parseFilterQuery } from "./parse.js";
import {
	testGrammar,
	testItems,
	testNow,
	typedTestGrammar,
	typedTestItems,
	type TestDeployment,
	type TestItem,
} from "./test-grammar.js";

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

	test("matches nothing for an exclusion on a key that cannot exclude", () => {
		const grammar = {
			...testGrammar,
			keys: testGrammar.keys.map((definition) =>
				definition.key === "is" ? { ...definition, negatable: false } : definition,
			),
		};

		expect(ids("-is:new", grammar)).toEqual([]);
		expect(ids("is:new", grammar)).toEqual(["p_new"]);
	});

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

	test("matches nothing for a quoted empty value, while a bare key waits for one", () => {
		expect(ids('is:""')).toEqual([]);
		expect(ids("is:")).toHaveLength(3);
		expect(ids('is:"')).toHaveLength(3);
		expect(ids('name:""')).toHaveLength(3);
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

describe("filterItemsByQuery with groups and NOT", () => {
	/** Filters the shared fixture items and returns the matching names, in list order. */
	function names(query: string) {
		return filterItemsByQuery({ grammar: testGrammar, items: testItems, query }).map(
			(item) => item.name,
		);
	}

	test("runs a group before the tokens beside it", () => {
		// Without the group, `-acme-api` binds to `app` alone, so `acme-api` comes back.
		expect(names("(api OR app) -acme-api")).toEqual(["acme-app"]);
		expect(names("api OR app -acme-api")).toEqual(["acme-api", "acme-app"]);
	});

	test("excludes with NOT and ! as it does with -", () => {
		expect(names("NOT acme")).toEqual(["lovely-lemur"]);
		expect(names("!acme")).toEqual(["lovely-lemur"]);
		expect(names("NOT NOT acme")).toEqual(["acme-api", "acme-app"]);
	});

	test("negates a whole group", () => {
		expect(names("-(acme api)")).toEqual(["acme-app", "lovely-lemur"]);
		expect(names("NOT (api OR lemur)")).toEqual(["acme-app"]);
	});

	test("closes an unclosed group at the end of the query", () => {
		expect(names("(api OR lemur")).toEqual(["acme-api", "lovely-lemur"]);
	});

	test("drops a qualifier still being typed, also inside a negated group", () => {
		// Negation turns the group's AND into an OR, where a match-all stand-in would keep every item.
		expect(names("NOT (is:shared name:)")).toEqual(["lovely-lemur"]);
	});

	test("calls a matcher as a method of its key", () => {
		const grammar = {
			keys: [
				{
					key: "name",
					description: "The name",
					matches(item: { name: string }, value: string) {
						return item.name === value && this.key === "name";
					},
				},
			],
			getSearchText: (item: { name: string }) => item.name,
		};
		expect(
			filterItemsByQuery({ grammar, items: [{ name: "api" }, { name: "web" }], query: "name:api" }),
		).toEqual([{ name: "api" }]);
	});
});

describe("filterItemsByQuery with typed keys", () => {
	/** Filters the typed fixture items at the fixed test clock and returns their names. */
	function names(query: string) {
		return filterItemsByQuery({
			grammar: typedTestGrammar,
			items: typedTestItems,
			query,
			context: { now: testNow },
		}).map((item) => item.name);
	}

	test("runs each text match mode without regard to case", () => {
		expect(names("name:api")).toEqual(["api-gateway", "billing-api", "legacy-API"]);
		expect(names("name:=WEB")).toEqual(["web"]);
		expect(names("name:=api")).toEqual([]);
		expect(names("name:api*")).toEqual(["api-gateway"]);
		expect(names("name:*api")).toEqual(["billing-api", "legacy-API"]);
		expect(names("name:*gate*")).toEqual(["api-gateway"]);
	});

	test("reads a quoted * or = as text, and a * outside the quotes as a wildcard", () => {
		expect(names('name:"api*"')).toEqual([]);
		expect(names('name:"=web"')).toEqual([]);
		expect(names('name:"api"*')).toEqual(["api-gateway"]);
		// An unclosed quote runs to the end, so its last * is text too.
		expect(names('name:"api*')).toEqual([]);
	});

	test("matches nothing for an operator with no value after it", () => {
		expect(names("name:*")).toEqual([]);
		expect(names("name:=")).toEqual([]);
		expect(names("replicas:>")).toEqual([]);
	});

	test("reads a plain value as exactly on a text key that does not accept contains", () => {
		expect(names("region:us")).toEqual(["api-gateway"]);
		expect(names("region:us*")).toEqual([]);
	});

	test("compares numbers on both sides of the boundary", () => {
		expect(names("replicas:>3")).toEqual(["billing-api"]);
		expect(names("replicas:>=3")).toEqual(["api-gateway", "billing-api"]);
		expect(names("replicas:<3")).toEqual(["web", "legacy-API"]);
		expect(names("replicas:<=3")).toEqual(["api-gateway", "web", "legacy-API"]);
		expect(names("replicas:3")).toEqual(["api-gateway"]);
		expect(names("replicas:=2.5")).toEqual(["legacy-API"]);
	});

	test("keeps both ends of a range, in either order", () => {
		expect(names("replicas:2..3")).toEqual(["api-gateway", "legacy-API"]);
		expect(names("replicas:3..2")).toEqual(["api-gateway", "legacy-API"]);
		expect(names("replicas:-1..0")).toEqual(["web"]);
	});

	test("matches nothing for a value that does not parse for its type", () => {
		expect(names("replicas:three")).toEqual([]);
		expect(names("replicas:2..x")).toEqual([]);
		expect(names("uptime:5")).toEqual([]);
		expect(names("created:2026-02-30")).toEqual([]);
		expect(names("canary:yes")).toEqual([]);
		// A quoted `..` is text, not a range.
		expect(names('replicas:"2..5"')).toEqual([]);
		// Too many digits overflow to Infinity.
		expect(names(`replicas:${"9".repeat(309)}`)).toEqual([]);
	});

	test("reads a decimal duration as exactly the milliseconds it names", () => {
		const items = [
			{
				name: "exact",
				state: "live",
				replicas: 1,
				createdAt: 0,
				uptime: 1001,
				canary: false,
				region: null,
			},
		] satisfies TestDeployment[];
		const query = (q: string) =>
			filterItemsByQuery({ grammar: typedTestGrammar, items, query: q }).map((item) => item.name);
		expect(query("uptime:1.001s")).toEqual(["exact"]);
		expect(query("uptime:1001ms")).toEqual(["exact"]);
	});

	test("reads a date alone as its whole UTC day", () => {
		// `billing-api` was created 1 ms before 2026-01-01, and `web` at its first instant.
		expect(names("created:2026-01-01")).toEqual(["web"]);
		expect(names("created:<2026-01-01")).toEqual(["billing-api"]);
		expect(names("created:>2026-01-01")).toEqual(["api-gateway", "legacy-API"]);
		expect(names("created:>=2026-01-01")).toEqual(["api-gateway", "web", "legacy-API"]);
		expect(names("created:<=2026-01-01")).toEqual(["web", "billing-api"]);
		expect(names("created:2025-12-31..2026-01-01")).toEqual(["web", "billing-api"]);
	});

	test("ends a day before the next midnight", () => {
		const nextMidnight = [
			{
				name: "next",
				state: "live" as const,
				replicas: 1,
				createdAt: Date.UTC(2026, 0, 2),
				uptime: 0,
				canary: false,
				region: null,
			},
		];
		const count = (query: string) =>
			filterItemsByQuery({ grammar: typedTestGrammar, items: nextMidnight, query }).length;

		expect(count("created:<=2026-01-01")).toBe(0);
		expect(count("created:2026-01-01")).toBe(0);
		expect(count("created:2025-12-31..2026-01-01")).toBe(0);
		expect(count("created:>2026-01-01")).toBe(1);
	});

	test("compares a date and time as one instant, its offset applied", () => {
		expect(names("created:2026-01-01T01:00+01:00")).toEqual(["web"]);
		expect(names("created:<2026-01-01T00:00Z")).toEqual(["billing-api"]);
		// No offset means UTC, and the ISO string field of `legacy-API` sits on the boundary.
		expect(names("created:>=2026-01-15T00:00")).toEqual(["api-gateway", "legacy-API"]);
	});

	test("counts a duration on a date key back from the clock", () => {
		expect(names("created:>7d")).toEqual(["api-gateway"]);
		expect(names("created:<7d")).toEqual(["web", "billing-api", "legacy-API"]);
		expect(
			filterItemsByQuery({
				grammar: typedTestGrammar,
				items: typedTestItems,
				query: "created:>7d",
				context: { now: Date.UTC(2026, 0, 20) },
			}).map((item) => item.name),
		).toEqual(["api-gateway", "legacy-API"]);
	});

	test("compares durations, compound units included", () => {
		expect(names("uptime:>1h")).toEqual(["api-gateway", "legacy-API"]);
		expect(names("uptime:90s")).toEqual(["web"]);
		expect(names("uptime:1m30s")).toEqual(["web"]);
		expect(names("uptime:<=0ms")).toEqual(["billing-api"]);
	});

	test("matches nothing for an operator the key does not accept", () => {
		expect(names("latency:<1s")).toEqual([]);
		expect(names("latency:>=90s")).toEqual(["api-gateway", "web", "legacy-API"]);
	});

	test("matches booleans and enum aliases", () => {
		expect(names("canary:TRUE")).toEqual(["web"]);
		expect(names("canary:false")).toEqual(["api-gateway", "billing-api", "legacy-API"]);
		expect(names("state:running")).toEqual(["api-gateway", "billing-api", "legacy-API"]);
		expect(names("state:=paused")).toEqual(["web"]);
	});

	test("ORs the comma members of a typed value, each with its own operator", () => {
		expect(names("replicas:<1,>4")).toEqual(["web", "billing-api"]);
	});

	test("negates a comparison, and a missing field passes the negation", () => {
		expect(names("-replicas:>3")).toEqual(["api-gateway", "web", "legacy-API"]);
		expect(names("NOT replicas:>3")).toEqual(["api-gateway", "web", "legacy-API"]);
		expect(names("!region:=us")).toEqual(["web", "billing-api", "legacy-API"]);
	});

	test("matches nothing for any negation of a key that cannot exclude", () => {
		expect(names("-canary:true")).toEqual([]);
		expect(names("NOT (canary:true OR name:web)")).toEqual([]);
		// Negation turns this AND into an OR, which must not drop the forbidden half and run the rest.
		expect(names("NOT (canary:true name:web)")).toEqual([]);
		expect(names("NOT NOT canary:true")).toEqual(["web"]);
	});

	test("runs groups and negated groups of comparisons", () => {
		expect(names("(replicas:0 OR replicas:5) -name:web")).toEqual(["billing-api"]);
		expect(names("-(state:live replicas:>2)")).toEqual(["web"]);
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

	test("starts the cache over once it holds 1000 counts for one items array", () => {
		const definition = testGrammar.keys.find((key) => key.key === "is");
		if (definition == null) {
			throw new Error("the test grammar lost its is key");
		}
		const items = freshItems();
		countItemsByQuery(testGrammar, items, "is:new");
		for (let index = 1; index < 1000; index += 1) {
			countItemsByQuery(testGrammar, items, `name:${index}`);
		}
		const matches = vi.spyOn(definition, "matches");

		// The cache is full, so this count clears it and is stored alone.
		countItemsByQuery(testGrammar, items, "name:full");
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
