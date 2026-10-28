import { describe, expect, test } from "vitest";

import { defineRemoteFilterGrammar } from "./grammar.js";
import { filterItemsByQuery } from "./match.js";
import { getFilterSuggestions } from "./suggestions.js";
import { testGrammar, testItems } from "./test-grammar.js";

/** Runs the suggestion engine against the fixture items. */
function suggest(query: string, caretIndex = query.length) {
	return getFilterSuggestions({ grammar: testGrammar, query, caretIndex, items: testItems });
}

/** Applies a suggestion the way the input does, so the test asserts the result. */
function accept(query: string, caretIndex: number, label: string) {
	const suggestions = getFilterSuggestions({
		grammar: testGrammar,
		query,
		caretIndex,
		items: testItems,
	});
	const item = suggestions.items.find((candidate) => candidate.label === label);
	if (item == null) {
		throw new Error(`no suggestion labelled ${label}`);
	}
	return (
		query.slice(0, suggestions.replaceStart) + item.insertText + query.slice(suggestions.replaceEnd)
	);
}

describe("qualifier suggestions", () => {
	test("offers every qualifier, name first, and its exclusion, on an empty query", () => {
		const { items } = suggest("");

		expect(items.filter((item) => item.section === "filters").map((item) => item.label)).toEqual([
			"name:",
			"description:",
			"is:",
			"id:",
			"metadata:",
		]);
		expect(items.filter((item) => item.section === "exclusions").map((item) => item.label)).toEqual(
			["-name:", "-description:", "-is:", "-id:", "-metadata:"],
		);
	});

	test("narrows to the qualifiers that answer to what is typed", () => {
		expect(suggest("desc").items.map((item) => item.label)).toEqual([
			"description:",
			"-description:",
		]);
	});

	test("finds a qualifier through an alias rather than its own spelling", () => {
		expect(suggest("title").items.map((item) => item.label)).toEqual(["name:", "-name:"]);
	});

	test("offers only exclusions once a dash is typed", () => {
		expect(suggest("-desc").items.map((item) => item.label)).toEqual(["-description:"]);
	});

	test("does not finish the filter when a qualifier is picked", () => {
		expect(suggest("desc").items.every((item) => item.completes)).toBe(false);
	});

	test("replaces what was typed with the canonical qualifier", () => {
		expect(accept("title", 5, "name:")).toBe("name:");
		expect(accept("-desc", 5, "-description:")).toBe("-description:");
	});

	test("keeps a value that is already typed when the key is rewritten", () => {
		expect(accept("desc:api", 4, "description:")).toBe("description:api");
	});

	test("offers nothing for a key that matches no qualifier or alias", () => {
		expect(suggest("stauts").items).toEqual([]);
	});

	test("offers qualifiers for the token the caret sits in, not the last one", () => {
		expect(accept("is:new desc acme", 11, "description:")).toBe("is:new description: acme");
	});
});

describe("a lone dash", () => {
	test("offers the exclusions it starts", () => {
		const { items } = suggest("-");

		expect(items.map((item) => item.label)).toEqual([
			"-name:",
			"-description:",
			"-is:",
			"-id:",
			"-metadata:",
		]);
		expect(accept("-", 1, "-is:")).toBe("-is:");
	});
});

describe("value suggestions", () => {
	test("counts how many projects each value would leave", () => {
		expect(
			suggest("is:").items.map((item) => ({ label: item.label, matchCount: item.matchCount })),
		).toEqual([
			{ label: "new", matchCount: 1 },
			{ label: "shared", matchCount: 2 },
			{ label: "private", matchCount: 1 },
			{ label: "archived", matchCount: 0 },
		]);
	});

	test("counts against the rest of the query, not the whole list", () => {
		expect(
			suggest("-name:api is:").items.map((item) => ({
				label: item.label,
				matchCount: item.matchCount,
			})),
		).toEqual([
			{ label: "new", matchCount: 1 },
			{ label: "shared", matchCount: 1 },
			{ label: "private", matchCount: 1 },
			{ label: "archived", matchCount: 0 },
		]);
	});

	test("narrows the values to what is typed after the colon", () => {
		expect(suggest("is:pri").items.map((item) => item.label)).toEqual(["private"]);
	});

	test("finishes the filter when a value is picked", () => {
		expect(suggest("is:").items.every((item) => item.completes)).toBe(true);
	});

	test("replaces a typed value with the canonical spelling", () => {
		expect(accept("is:PRIVATE", 10, "private")).toBe("is:private");
	});

	test("finds a value through an alias rather than its own spelling", () => {
		expect(suggest("is:personal").items.map((item) => item.label)).toEqual(["private"]);
	});

	test("offers nothing for a qualifier that takes arbitrary text", () => {
		expect(suggest("name:").items).toEqual([]);
		expect(suggest("description:").items).toEqual([]);
		expect(suggest("id:").items).toEqual([]);
		expect(suggest("metadata:").items).toEqual([]);
	});

	test("suggests for the comma member under the caret, replacing only it", () => {
		expect(accept("is:new,sha", 10, "shared")).toBe("is:new,shared");
		expect(accept("is:new,sha is:private", 10, "shared")).toBe("is:new,shared is:private");
	});

	test("offers everything but the members already picked after a comma", () => {
		const labels = suggest("is:new,").items.map((item) => item.label);

		expect(labels).not.toContain("new");
		expect(labels).toContain("shared");
	});

	test("counts a comma member against the whole accepted list", () => {
		const item = suggest("is:new,").items.find((candidate) => candidate.label === "shared");

		// new OR shared covers all three fixture projects.
		expect(item?.matchCount).toBe(3);
	});

	test("replaces the whole value for a prose key, commas included", () => {
		const suggestions = suggest("description:a,b");

		expect(suggestions.replaceStart).toBe(12);
		expect(suggestions.replaceEnd).toBe(15);
	});

	test("suggests for the member under the caret after a quoted member", () => {
		expect(accept('is:"new",sha', 12, "shared")).toBe('is:"new",shared');
	});

	test("rewrites a quoted member with its quotes", () => {
		expect(accept('is:"ne",shared', 7, "new")).toBe("is:new,shared");
	});

	test.each([
		{ query: 'is:"', caretIndex: 4 },
		{ query: 'is:""', caretIndex: 4 },
		{ query: 'is:""', caretIndex: 5 },
	])("rewrites the empty quoted value $query with its quotes", ({ query, caretIndex }) => {
		expect(accept(query, caretIndex, "new")).toBe("is:new");
	});

	test("inserts a value as written when the grammar reads quotes as text", () => {
		const grammar = defineRemoteFilterGrammar({
			keys: [{ key: "tag", description: "Tag", values: [{ value: "a,b" }] }],
		});

		const { items } = getFilterSuggestions({ grammar, query: "tag:", caretIndex: 4 });

		expect(items.map((item) => item.insertText)).toEqual(["a,b"]);
	});
});

describe("value match counts", () => {
	test.each([
		"is:",
		"acme is:",
		"-acme is:",
		"is:new OR is:",
		"lemur OR acme is:",
		"is:bogus is:",
		"name:acme is:new,",
		'is:"',
	])("equal the rows the filter keeps for each value of %s", (query) => {
		const items = testItems.map((item) => ({ ...item }));
		const {
			items: rows,
			replaceStart,
			replaceEnd,
		} = getFilterSuggestions({
			grammar: testGrammar,
			query,
			caretIndex: query.length,
			items,
		});

		expect(rows.length).toBeGreaterThan(0);
		for (const row of rows) {
			const accepted = query.slice(0, replaceStart) + row.insertText + query.slice(replaceEnd);
			expect(row.matchCount).toBe(
				filterItemsByQuery({ grammar: testGrammar, items, query: accepted }).length,
			);
		}
	});
});

describe("suggestions without items", () => {
	test("carries no match counts when there is nothing to count", () => {
		const { items } = getFilterSuggestions({ grammar: testGrammar, query: "is:", caretIndex: 3 });

		expect(items.map((item) => item.label)).toEqual(["new", "shared", "private", "archived"]);
		expect(items.every((item) => item.matchCount == null)).toBe(true);
	});
});
