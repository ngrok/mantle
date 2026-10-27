import { describe, expect, test } from "vitest";

import {
	findTokenAtCaret,
	formatFacet,
	isCaretInFacetValue,
	parseFilterQuery,
	queryUsesQualifiers,
	quoteFilterValue,
} from "./parse.js";
import { testGrammar } from "./test-grammar.js";

describe("parseFilterQuery", () => {
	test("splits a known key from its value on the first colon", () => {
		expect(parseFilterQuery(testGrammar, "is:new")).toEqual([
			{
				kind: "facet",
				start: 0,
				end: 6,
				negated: false,
				key: "is",
				rawValue: "new",
				members: [{ value: "new", rawValue: "new", isKnownValue: true, start: 3, end: 6 }],
				isKnownValue: true,
				colonIndex: 2,
			},
		]);
	});

	test("keeps an unknown key as one free-text term, colon included", () => {
		expect(parseFilterQuery(testGrammar, "stauts:error")).toEqual([
			{ kind: "text", start: 0, end: 12, negated: false, text: "stauts:error" },
		]);
	});

	test("resolves key and value aliases to their canonical spelling", () => {
		expect(parseFilterQuery(testGrammar, "DESC:api NAME:acme is:personal")).toMatchObject([
			{ key: "description", members: [{ value: "api" }] },
			{ key: "name", members: [{ value: "acme" }] },
			{ key: "is", members: [{ value: "private" }] },
		]);
	});

	test("carries spaces inside a quoted value and drops the quotes", () => {
		expect(parseFilterQuery(testGrammar, 'description:"staging api"')).toMatchObject([
			{ key: "description", members: [{ value: "staging api" }], rawValue: "staging api", end: 25 },
		]);
	});

	test("lets an unclosed quote consume the rest of the query", () => {
		expect(parseFilterQuery(testGrammar, 'description:"staging api')).toMatchObject([
			{ key: "description", members: [{ value: "staging api" }], end: 24 },
		]);
	});

	test("reads an escaped quote as text that neither opens nor closes a quoted run", () => {
		expect(parseFilterQuery(testGrammar, 'name:"a\\"b",c name:\\"d')).toMatchObject([
			{ key: "name", members: [{ value: 'a"b', start: 5, end: 11 }, { value: "c" }], end: 13 },
			{ key: "name", members: [{ value: '"d' }] },
		]);
	});

	test("keeps a backslash before any other character as text", () => {
		expect(parseFilterQuery(testGrammar, "name:a\\b")).toMatchObject([
			{ members: [{ value: "a\\b" }] },
		]);
	});

	test("marks a leading dash as negation on both qualifiers and terms", () => {
		expect(parseFilterQuery(testGrammar, "-is:new -staging")).toMatchObject([
			{ kind: "facet", key: "is", members: [{ value: "new" }], negated: true },
			{ kind: "text", text: "staging", negated: true },
		]);
	});

	test("treats a quoted dash as part of the term, not as negation", () => {
		expect(parseFilterQuery(testGrammar, '"-staging"')).toMatchObject([
			{ kind: "text", text: "-staging", negated: false },
		]);
	});

	test("keeps a lone dash as a search term", () => {
		expect(parseFilterQuery(testGrammar, "-")).toMatchObject([
			{ kind: "text", text: "-", negated: false },
		]);
	});

	test("flags a value that matches no alias on an enumerated key", () => {
		expect(parseFilterQuery(testGrammar, "is:bogus")).toMatchObject([
			{
				key: "is",
				rawValue: "bogus",
				members: [{ value: "bogus", isKnownValue: false }],
				isKnownValue: false,
			},
		]);
	});

	test("accepts a half-typed qualifier without flagging its empty value", () => {
		expect(parseFilterQuery(testGrammar, "is:")).toMatchObject([
			{ key: "is", rawValue: "", members: [], isKnownValue: true },
		]);
	});

	test("takes any value for a free-text key", () => {
		expect(parseFilterQuery(testGrammar, "id:RD_2abc")).toMatchObject([
			{ key: "id", members: [{ value: "RD_2abc" }], isKnownValue: true },
		]);
	});

	test("splits a list key's value on commas into OR members with source offsets", () => {
		expect(parseFilterQuery(testGrammar, "is:new,shared")).toMatchObject([
			{
				key: "is",
				rawValue: "new,shared",
				isKnownValue: true,
				members: [
					{ value: "new", start: 3, end: 6 },
					{ value: "shared", start: 7, end: 13 },
				],
			},
		]);
	});

	test("flags only the member that matches no alias", () => {
		expect(parseFilterQuery(testGrammar, "is:new,bogus")).toMatchObject([
			{
				isKnownValue: false,
				members: [
					{ value: "new", isKnownValue: true },
					{ value: "bogus", isKnownValue: false },
				],
			},
		]);
	});

	test("produces no member for a trailing or doubled comma", () => {
		expect(parseFilterQuery(testGrammar, "is:new,")).toMatchObject([
			{ members: [{ value: "new" }] },
		]);
		expect(parseFilterQuery(testGrammar, "is:new,,shared")).toMatchObject([
			{ members: [{ value: "new" }, { value: "shared" }] },
		]);
		expect(parseFilterQuery(testGrammar, "is:,")).toMatchObject([{ members: [] }]);
	});

	test("splits a list on its unquoted commas and keeps each quoted member whole", () => {
		const query = 'name:"a,b",c';

		expect(parseFilterQuery(testGrammar, query)).toMatchObject([
			{
				rawValue: "a,b,c",
				members: [
					{ value: "a,b", start: 5, end: 10 },
					{ value: "c", start: 11, end: 12 },
				],
			},
		]);
		// A quoted member's span covers its quotes, so the highlighter paints them with it.
		expect(query.slice(5, 10)).toBe('"a,b"');
	});

	test("still splits an unquoted value when the quotes sat in the key", () => {
		expect(parseFilterQuery(testGrammar, '"is":new,shared')).toMatchObject([
			{ key: "is", members: [{ value: "new" }, { value: "shared" }] },
		]);
	});

	test("reads a bare OR or || as the group separator", () => {
		expect(parseFilterQuery(testGrammar, "is:new OR name:api || acme")).toMatchObject([
			{ kind: "facet", key: "is" },
			{ kind: "or", text: "OR" },
			{ kind: "facet", key: "name" },
			{ kind: "or", text: "||" },
			{ kind: "text", text: "acme" },
		]);
	});

	test("keeps a quoted, lowercase, or negated OR as a search term", () => {
		expect(parseFilterQuery(testGrammar, '"OR" or -OR')).toMatchObject([
			{ kind: "text", text: "OR", negated: false },
			{ kind: "text", text: "or" },
			{ kind: "text", text: "OR", negated: true },
		]);
	});

	test("reads a bare AND or && as an operator, and a lowercase and as text", () => {
		expect(parseFilterQuery(testGrammar, "is:new AND acme && and")).toMatchObject([
			{ kind: "facet", key: "is" },
			{ kind: "and", text: "AND" },
			{ kind: "text", text: "acme" },
			{ kind: "and", text: "&&" },
			{ kind: "text", text: "and" },
		]);
	});

	test("keeps commas as content for the prose keys", () => {
		expect(parseFilterQuery(testGrammar, "description:a,b metadata:c,d")).toMatchObject([
			{ key: "description", members: [{ value: "a,b" }] },
			{ key: "metadata", members: [{ value: "c,d" }] },
		]);
	});

	test("reports offsets that address the source query", () => {
		const query = "  is:new   acme";

		expect(parseFilterQuery(testGrammar, query)).toMatchObject([
			{ start: 2, end: 8, colonIndex: 4 },
			{ start: 11, end: 15 },
		]);
		expect(query.slice(2, 8)).toBe("is:new");
	});

	test("returns no tokens for an empty or whitespace-only query", () => {
		expect(parseFilterQuery(testGrammar, "")).toEqual([]);
		expect(parseFilterQuery(testGrammar, "   ")).toEqual([]);
	});

	test("parses every prefix of an awkward query without throwing", () => {
		const query = 'description:"staging api" -is:new https://a.b:c "unclosed';

		for (let length = 0; length <= query.length; length += 1) {
			expect(() => parseFilterQuery(testGrammar, query.slice(0, length))).not.toThrow();
		}

		// The whole string still parses into the tokens the grammar promises,
		// so "never throws" is not being bought with a degenerate result.
		expect(parseFilterQuery(testGrammar, query)).toMatchObject([
			{ key: "description", members: [{ value: "staging api" }] },
			{ key: "is", members: [{ value: "new" }], negated: true },
			{ kind: "text", text: "https://a.b:c" },
			{ kind: "text", text: "unclosed" },
		]);
	});
});

describe("queryUsesQualifiers", () => {
	test("reports a qualifier standing beside a search term", () => {
		expect(queryUsesQualifiers(testGrammar, "is:new acme")).toBe(true);
	});

	test("reports no qualifier for search terms alone", () => {
		expect(queryUsesQualifiers(testGrammar, "acme staging")).toBe(false);
	});

	test("reports no qualifier for a misspelled key, which stays free text", () => {
		expect(queryUsesQualifiers(testGrammar, "stauts:error")).toBe(false);
	});

	test("reports a qualifier before its value is typed", () => {
		// The empty state must not flip its advice on the keystroke after the
		// colon, so a half-typed `is:` already counts.
		expect(queryUsesQualifiers(testGrammar, "is:")).toBe(true);
	});
});

describe("quoteFilterValue", () => {
	test("quotes a value that would otherwise split into two tokens", () => {
		expect(quoteFilterValue("staging api")).toBe('"staging api"');
	});

	test("leaves a single-word value bare", () => {
		expect(quoteFilterValue("acme")).toBe("acme");
	});

	test("quotes a comma so a list key keeps the value as one member", () => {
		expect(quoteFilterValue("a,b")).toBe('"a,b"');
		expect(parseFilterQuery(testGrammar, `name:${quoteFilterValue("a,b")}`)).toMatchObject([
			{ members: [{ value: "a,b" }] },
		]);
	});

	test("escapes a quote and a backslash, so the value round-trips through the parser", () => {
		expect(quoteFilterValue('/a"b')).toBe('"/a\\"b"');
		expect(quoteFilterValue("a\\b")).toBe("a\\\\b");

		const [token] = parseFilterQuery(
			testGrammar,
			`description:${quoteFilterValue('say "hi" \\ now')}`,
		);
		expect(token).toMatchObject({ key: "description", members: [{ value: 'say "hi" \\ now' }] });
	});
});

describe("formatFacet", () => {
	test("writes the canonical qualifier with its negation prefix", () => {
		expect(formatFacet({ key: "description", value: "staging api", negated: true })).toBe(
			'-description:"staging api"',
		);
	});

	test("leaves the value off entirely when there is none to write", () => {
		expect(formatFacet({ key: "is", value: "", negated: false })).toBe("is:");
	});
});

describe("findTokenAtCaret", () => {
	const tokens = parseFilterQuery(testGrammar, "is:new acme");

	test("claims a caret sitting against either edge of a token", () => {
		expect(findTokenAtCaret(tokens, 0)).toMatchObject({ key: "is" });
		expect(findTokenAtCaret(tokens, 6)).toMatchObject({ key: "is" });
		expect(findTokenAtCaret(tokens, 7)).toMatchObject({ text: "acme" });
	});

	test("claims no token for a caret parked in whitespace", () => {
		expect(findTokenAtCaret(parseFilterQuery(testGrammar, "is:new   acme"), 8)).toBeUndefined();
	});
});

describe("isCaretInFacetValue", () => {
	test("separates the value side of the colon from the key side", () => {
		const [token] = parseFilterQuery(testGrammar, "is:new");
		if (token == null) {
			throw new Error("expected a token");
		}

		expect(isCaretInFacetValue(token, 3)).toBe(true);
		expect(isCaretInFacetValue(token, 2)).toBe(false);
	});

	test("is never true for a free-text term", () => {
		const [token] = parseFilterQuery(testGrammar, "acme");
		if (token == null) {
			throw new Error("expected a token");
		}

		expect(isCaretInFacetValue(token, 2)).toBe(false);
	});
});
