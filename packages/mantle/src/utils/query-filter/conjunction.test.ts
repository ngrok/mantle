import { describe, expect, test } from "vitest";

import { getFilterConjunction } from "./conjunction.js";
import type { FilterConjunctionOptions } from "./conjunction.js";
import { filterItemsByQuery } from "./match.js";
import { parseFilterQuery } from "./parse.js";
import { testGrammar, testItems } from "./test-grammar.js";

/** Each clause as `key:value` or text, with `-` for a negated term. */
function read(query: string, options?: FilterConjunctionOptions) {
	const { clauses, problems } = getFilterConjunction(parseFilterQuery(testGrammar, query), options);
	return {
		clauses: clauses.map((clause) =>
			clause.map(({ token, negated }) => {
				const body =
					token.kind === "facet"
						? `${token.key}:${token.members.map((member) => member.value).join(",")}`
						: token.text;
				return `${negated ? "-" : ""}${body}`;
			}),
		),
		problems: problems.map(({ kind, start, end }) => ({ kind, text: query.slice(start, end) })),
	};
}

describe("getFilterConjunction", () => {
	test("reads an AND group of qualifiers, text, and comma lists", () => {
		expect(read("is:shared,new -name:api acme")).toEqual({
			clauses: [["is:shared,new"], ["-name:api"], ["acme"]],
			problems: [],
		});
	});

	test("moves NOT and a negated group's negation onto each term", () => {
		expect(read("NOT is:shared")).toEqual({ clauses: [["-is:shared"]], problems: [] });
		// NOT (a OR b) is NOT a AND NOT b, which one AND group holds.
		expect(read("NOT (is:shared OR is:new)")).toEqual({
			clauses: [["-is:shared"], ["-is:new"]],
			problems: [],
		});
		expect(read("-(is:shared -name:api)").problems).toEqual([
			{ kind: "negated-group", text: "is:shared -name:api" },
		]);
		// A double negation cancels.
		expect(read("NOT -is:shared")).toEqual({ clauses: [["is:shared"]], problems: [] });
	});

	test("refuses NOT before a group of two terms, which is an OR", () => {
		expect(read("NOT (is:shared is:new)")).toEqual({
			clauses: [["-is:shared", "-is:new"]],
			problems: [{ kind: "negated-group", text: "is:shared is:new" }],
		});
	});

	test("refuses each OR by default", () => {
		expect(read("is:shared OR is:new").problems).toEqual([
			{ kind: "or", text: "is:shared OR is:new" },
		]);
	});

	test("with same-key, an OR of one key's values is one clause", () => {
		expect(read("is:shared OR is:new name:api", { or: "same-key" })).toEqual({
			clauses: [["is:shared", "is:new", "name:api"]],
			problems: [{ kind: "or", text: "is:shared OR is:new name:api" }],
		});
		expect(read("(is:shared OR is:new) name:api", { or: "same-key" })).toEqual({
			clauses: [["is:shared", "is:new"], ["name:api"]],
			problems: [],
		});
	});

	test("with same-key, refuses an OR across keys, of text, or beside an exclusion", () => {
		const options = { or: "same-key" } as const;
		expect(read("is:shared OR name:api", options).problems).toHaveLength(1);
		expect(read("acme OR lemur", options).problems).toHaveLength(1);
		expect(read("is:shared OR -is:new", options).problems).toHaveLength(1);
		// NOT (a b) on one key is NOT a OR NOT b: each side is negated.
		expect(read("NOT (is:shared is:new)", options).problems).toEqual([
			{ kind: "negated-group", text: "is:shared is:new" },
		]);
	});

	test("lists each problem in query order", () => {
		expect(
			read("(is:shared OR name:api) NOT (is:new acme)").problems.map(({ kind }) => kind),
		).toEqual(["or", "negated-group"]);
	});

	test.each([
		"is:shared name:acme",
		"NOT (is:shared OR is:new)",
		"(is:shared OR is:new) -name:api",
		"NOT -is:shared acme",
		"-(is:new) name:acme-app",
	])("keeps the same items as the full matcher: %s", (query) => {
		const { clauses, problems } = getFilterConjunction(parseFilterQuery(testGrammar, query), {
			or: "same-key",
		});
		expect(problems).toEqual([]);
		const ids = (items: { id: string }[]) => items.map((item) => item.id);
		// Each term alone, with its effective negation written as `-`.
		const termIds = ({ token, negated }: (typeof clauses)[number][number]) =>
			ids(
				filterItemsByQuery({
					grammar: testGrammar,
					items: testItems,
					query: `${negated ? "-" : ""}${query.slice(token.start, token.end).replace(/^[-!]/, "")}`,
				}),
			);
		const expected = ids(filterItemsByQuery({ grammar: testGrammar, items: testItems, query }));
		const actual = ids(testItems).filter((id) =>
			clauses.every((clause) => clause.some((term) => termIds(term).includes(id))),
		);
		expect(actual).toEqual(expected);
	});

	test("reads a query wider than the engine's argument limit", () => {
		const values = Array.from({ length: 200_000 }, (_, index) => `name:v${index}`);
		expect(
			getFilterConjunction(parseFilterQuery(testGrammar, values.join(" "))).clauses,
		).toHaveLength(200_000);
		const { problems } = getFilterConjunction(parseFilterQuery(testGrammar, values.join(" OR ")));
		expect(problems).toHaveLength(1);
	});

	test("keeps a qualifier still being typed, and asks nothing of an empty query", () => {
		// The caller sees `is:` with no members and can ask for a value; a backend must not drop it in silence.
		expect(read("is: name:api")).toEqual({ clauses: [["is:"], ["name:api"]], problems: [] });
		expect(read("")).toEqual({ clauses: [], problems: [] });
		expect(read("OR")).toEqual({ clauses: [], problems: [] });
	});
});
