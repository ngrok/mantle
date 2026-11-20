import { describe, expect, test } from "vitest";

import { getHighlightSegments } from "./highlight.js";
import { testGrammar, typedTestGrammar } from "./test-grammar.js";

describe("getHighlightSegments", () => {
	test("splits a qualifier into key, colon, and value", () => {
		expect(getHighlightSegments(testGrammar, "is:new")).toEqual([
			{ start: 0, text: "is", kind: "key" },
			{ start: 2, text: ":", kind: "syntax" },
			{ start: 3, text: "new", kind: "value" },
		]);
	});

	test("colours a negation prefix as syntax on both token kinds", () => {
		expect(getHighlightSegments(testGrammar, "-is:new -acme")).toMatchObject([
			{ text: "-", kind: "syntax" },
			{ text: "is", kind: "key" },
			{ text: ":", kind: "syntax" },
			{ text: "new", kind: "value" },
			{ text: " ", kind: "plain" },
			{ text: "-", kind: "syntax" },
			{ text: "acme", kind: "text" },
		]);
	});

	test("leaves an unknown key as plain search text", () => {
		expect(getHighlightSegments(testGrammar, "stauts:error")).toEqual([
			{ start: 0, text: "stauts:error", kind: "text" },
		]);
	});

	test("emits nothing for a half-typed qualifier's empty value", () => {
		expect(getHighlightSegments(testGrammar, "is:")).toMatchObject([
			{ text: "is", kind: "key" },
			{ text: ":", kind: "syntax" },
		]);
	});

	test("colours the commas of a value list as syntax, each member on its own", () => {
		expect(getHighlightSegments(testGrammar, "is:new,bogus")).toMatchObject([
			{ text: "is", kind: "key" },
			{ text: ":", kind: "syntax" },
			{ text: "new", kind: "value" },
			{ text: ",", kind: "syntax" },
			{ text: "bogus", kind: "invalid" },
		]);
	});

	test("colours a trailing comma as syntax", () => {
		expect(getHighlightSegments(testGrammar, "is:new,")).toMatchObject([
			{ text: "is", kind: "key" },
			{ text: ":", kind: "syntax" },
			{ text: "new", kind: "value" },
			{ text: ",", kind: "syntax" },
		]);
	});

	test("colours a bare OR or AND as an operator", () => {
		expect(getHighlightSegments(testGrammar, "is:new OR acme AND x")).toMatchObject([
			{ text: "is", kind: "key" },
			{ text: ":", kind: "syntax" },
			{ text: "new", kind: "value" },
			{ text: " ", kind: "plain" },
			{ text: "OR", kind: "operator" },
			{ text: " ", kind: "plain" },
			{ text: "acme", kind: "text" },
			{ text: " ", kind: "plain" },
			{ text: "AND", kind: "operator" },
			{ text: " ", kind: "plain" },
			{ text: "x", kind: "text" },
		]);
	});

	test("keeps a quoted value one run, commas included", () => {
		expect(getHighlightSegments(testGrammar, 'name:"a,b"')).toMatchObject([
			{ text: "name", kind: "key" },
			{ text: ":", kind: "syntax" },
			{ text: '"a,b"', kind: "value" },
		]);
	});

	test.each([
		"",
		"   ",
		'  description:"staging api"   -is:new  ',
		'desc:"unclosed',
		"is:new,shared, -name:a,,b metadata:x,y",
		'name:"a,b" is:,',
		'is:new OR name:a || "OR" -OR or',
		'a AND b && "AND" -AND and',
	])("reproduces the query exactly for %j", (query) => {
		// The overlay paints under the caret, so a dropped or duplicated
		// character would slide every glyph after it out of line.
		expect(
			getHighlightSegments(testGrammar, query).reduce((text, segment) => text + segment.text, ""),
		).toBe(query);
	});

	test("keeps quote characters in the painted copy", () => {
		expect(getHighlightSegments(testGrammar, 'desc:"staging api"')).toMatchObject([
			{ text: "desc", kind: "key" },
			{ text: ":", kind: "syntax" },
			{ text: '"staging api"', kind: "value" },
		]);
	});

	test("paints NOT and parentheses as operators, and a leading ! as syntax", () => {
		expect(getHighlightSegments(testGrammar, "!(is:new OR NOT acme)")).toMatchObject([
			{ text: "!", kind: "syntax" },
			{ text: "(", kind: "operator" },
			{ text: "is", kind: "key" },
			{ text: ":", kind: "syntax" },
			{ text: "new", kind: "value" },
			{ text: " ", kind: "plain" },
			{ text: "OR", kind: "operator" },
			{ text: " ", kind: "plain" },
			{ text: "NOT", kind: "operator" },
			{ text: " ", kind: "plain" },
			{ text: "acme", kind: "text" },
			{ text: ")", kind: "operator" },
		]);
	});

	test("paints a typed value invalid when it does not parse or its operator is not accepted", () => {
		const kinds = (query: string) =>
			getHighlightSegments(typedTestGrammar, query)
				.filter((segment) => segment.kind === "value" || segment.kind === "invalid")
				.map((segment) => `${segment.text}:${segment.kind}`);

		expect(kinds("replicas:many latency:<1s replicas:>=3 created:>7d")).toEqual([
			"many:invalid",
			"<1s:invalid",
			">=3:value",
			">7d:value",
		]);
	});
});
