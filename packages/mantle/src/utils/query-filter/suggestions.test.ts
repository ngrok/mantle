import { describe, expect, test } from "vitest";

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
	test("offers every qualifier, domain first, and its exclusion, on an empty query", () => {
		const { items } = suggest("");

		expect(items.filter((item) => item.section === "filters").map((item) => item.label)).toEqual([
			"domain:",
			"description:",
			"is:",
			"id:",
			"metadata:",
		]);
		expect(items.filter((item) => item.section === "exclusions").map((item) => item.label)).toEqual(
			["-domain:", "-description:", "-is:", "-id:", "-metadata:"],
		);
	});

	test("narrows to the qualifiers that answer to what is typed", () => {
		expect(suggest("desc").items.map((item) => item.label)).toEqual([
			"description:",
			"-description:",
		]);
	});

	test("finds a qualifier through an alias rather than its own spelling", () => {
		expect(suggest("host").items.map((item) => item.label)).toEqual(["domain:", "-domain:"]);
	});

	test("offers only exclusions once a dash is typed", () => {
		expect(suggest("-desc").items.map((item) => item.label)).toEqual(["-description:"]);
	});

	test("does not finish the filter when a qualifier is picked", () => {
		expect(suggest("desc").items.every((item) => item.completes)).toBe(false);
	});

	test("replaces what was typed with the canonical qualifier", () => {
		expect(accept("host", 4, "domain:")).toBe("domain:");
		expect(accept("-desc", 5, "-description:")).toBe("-description:");
	});

	test("keeps a value that is already typed when the key is rewritten", () => {
		expect(accept("desc:api", 4, "description:")).toBe("description:api");
	});

	test("offers nothing for a key that matches no qualifier or alias", () => {
		expect(suggest("stauts").items).toEqual([]);
	});

	test("offers qualifiers for the token the caret sits in, not the last one", () => {
		expect(accept("is:dev desc acme", 11, "description:")).toBe("is:dev description: acme");
	});
});

describe("value suggestions", () => {
	test("counts how many domains each value would leave", () => {
		expect(
			suggest("is:").items.map((item) => ({ label: item.label, matchCount: item.matchCount })),
		).toEqual([
			{ label: "dev", matchCount: 1 },
			{ label: "custom", matchCount: 2 },
			{ label: "managed", matchCount: 1 },
			{ label: "wildcard", matchCount: 0 },
		]);
	});

	test("counts against the rest of the query, not the whole list", () => {
		expect(
			suggest("-domain:api is:").items.map((item) => ({
				label: item.label,
				matchCount: item.matchCount,
			})),
		).toEqual([
			{ label: "dev", matchCount: 1 },
			{ label: "custom", matchCount: 1 },
			{ label: "managed", matchCount: 1 },
			{ label: "wildcard", matchCount: 0 },
		]);
	});

	test("narrows the values to what is typed after the colon", () => {
		expect(suggest("is:man").items.map((item) => item.label)).toEqual(["managed"]);
	});

	test("finishes the filter when a value is picked", () => {
		expect(suggest("is:").items.every((item) => item.completes)).toBe(true);
	});

	test("replaces a typed value with the canonical spelling", () => {
		expect(accept("is:MANAGED", 10, "managed")).toBe("is:managed");
	});

	test("finds a value through an alias rather than its own spelling", () => {
		expect(suggest("is:ngrok").items.map((item) => item.label)).toEqual(["managed"]);
	});

	test("offers nothing for a qualifier that takes arbitrary text", () => {
		expect(suggest("domain:").items).toEqual([]);
		expect(suggest("description:").items).toEqual([]);
		expect(suggest("id:").items).toEqual([]);
		expect(suggest("metadata:").items).toEqual([]);
	});

	test("suggests for the comma member under the caret, replacing only it", () => {
		expect(accept("is:dev,cus", 10, "custom")).toBe("is:dev,custom");
		expect(accept("is:dev,cus is:managed", 10, "custom")).toBe("is:dev,custom is:managed");
	});

	test("offers everything but the members already picked after a comma", () => {
		const labels = suggest("is:dev,").items.map((item) => item.label);

		expect(labels).not.toContain("dev");
		expect(labels).toContain("custom");
	});

	test("counts a comma member against the whole accepted list", () => {
		const item = suggest("is:dev,").items.find((candidate) => candidate.label === "custom");

		// dev OR custom covers all three fixture domains.
		expect(item?.matchCount).toBe(3);
	});

	test("replaces the whole value for a prose key, commas included", () => {
		const suggestions = suggest("description:a,b");

		expect(suggestions.replaceStart).toBe(12);
		expect(suggestions.replaceEnd).toBe(15);
	});

	test("suggests for the member under the caret after a quoted member", () => {
		expect(accept('is:"dev",cus', 12, "custom")).toBe('is:"dev",custom');
	});

	test("rewrites a quoted member with its quotes", () => {
		expect(accept('is:"de",custom', 7, "dev")).toBe("is:dev,custom");
	});
});

describe("suggestions without items", () => {
	test("carries no match counts when there is nothing to count", () => {
		const { items } = getFilterSuggestions({ grammar: testGrammar, query: "is:", caretIndex: 3 });

		expect(items.map((item) => item.label)).toEqual(["dev", "custom", "managed", "wildcard"]);
		expect(items.every((item) => item.matchCount == null)).toBe(true);
	});
});
