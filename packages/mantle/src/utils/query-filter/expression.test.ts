import { describe, expect, test } from "vitest";

import { parseFilterExpression } from "./expression.js";
import { testGrammar, typedTestGrammar } from "./test-grammar.js";

/** The text node of one term, at its span. */
function text(value: string, start: number, end = start + value.length) {
	return { kind: "text", text: value, start, end };
}

/** The facet node of one `is` member, at its span. */
function isFacet(value: string, start: number) {
	return {
		kind: "facet",
		key: "is",
		comparison: { operator: "equals", operand: { type: "text", value } },
		start,
		end: start + value.length,
	};
}

describe("parseFilterExpression", () => {
	test("returns null for a query that asks nothing", () => {
		expect(parseFilterExpression(testGrammar, "")).toBeNull();
		expect(parseFilterExpression(testGrammar, "OR AND")).toBeNull();
		expect(parseFilterExpression(testGrammar, "()")).toBeNull();
		expect(parseFilterExpression(testGrammar, "NOT")).toBeNull();
	});

	test("returns a tree for a query nested past the group limit", () => {
		const deep = `${"(".repeat(10_000)}a${")".repeat(10_000)}`;

		expect(parseFilterExpression(testGrammar, deep)).toMatchObject({ kind: "and" });
	});

	test("binds AND tighter than OR", () => {
		expect(parseFilterExpression(testGrammar, "a OR b c")).toEqual({
			kind: "or",
			children: [text("a", 0), { kind: "and", children: [text("b", 5), text("c", 7)] }],
		});
	});

	test("runs a group as one operand", () => {
		expect(parseFilterExpression(testGrammar, "(is:new OR is:shared) acme")).toEqual({
			kind: "and",
			children: [
				{ kind: "or", children: [isFacet("new", 4), isFacet("shared", 14)] },
				text("acme", 22),
			],
		});
	});

	test("turns a comma list into an OR of one facet per member", () => {
		expect(parseFilterExpression(testGrammar, "is:new,shared")).toEqual({
			kind: "or",
			children: [isFacet("new", 3), isFacet("shared", 7)],
		});
	});

	test("pushes NOT down to the leaves", () => {
		expect(parseFilterExpression(testGrammar, "NOT (a OR b)")).toEqual({
			kind: "and",
			children: [
				{ kind: "not", child: text("a", 5) },
				{ kind: "not", child: text("b", 10) },
			],
		});
		expect(parseFilterExpression(testGrammar, "-is:new,shared")).toEqual({
			kind: "and",
			children: [
				{ kind: "not", child: isFacet("new", 4) },
				{ kind: "not", child: isFacet("shared", 8) },
			],
		});
	});

	test("cancels a double negation", () => {
		expect(parseFilterExpression(testGrammar, "NOT -acme")).toEqual(text("acme", 4, 9));
		expect(parseFilterExpression(testGrammar, "!(NOT acme)")).toEqual(text("acme", 6));
	});

	test("folds a member that matches nothing out of an OR, and into the whole AND", () => {
		expect(parseFilterExpression(testGrammar, "is:bogus OR acme")).toEqual(text("acme", 12));
		expect(parseFilterExpression(testGrammar, "is:bogus acme")).toEqual({
			kind: "or",
			children: [],
		});
		// A member that matches nothing excludes nothing.
		expect(parseFilterExpression(testGrammar, "-is:bogus acme")).toEqual(text("acme", 10));
	});

	test("reads a qualifier still being typed as matching every item", () => {
		expect(parseFilterExpression(testGrammar, "is:")).toEqual({ kind: "and", children: [] });
		expect(parseFilterExpression(testGrammar, "is: acme")).toEqual(text("acme", 4));
	});

	test("reads any negation of a key that cannot exclude as matching nothing", () => {
		expect(parseFilterExpression(typedTestGrammar, "-canary:true")).toEqual({
			kind: "or",
			children: [],
		});
		expect(parseFilterExpression(typedTestGrammar, "NOT NOT canary:true")).toMatchObject({
			kind: "facet",
			key: "canary",
		});
	});

	test("carries the operator and the typed values of a comparison", () => {
		expect(parseFilterExpression(typedTestGrammar, "replicas:2..5")).toEqual({
			kind: "facet",
			key: "replicas",
			comparison: {
				operator: "range",
				from: { type: "number", value: 2 },
				to: { type: "number", value: 5 },
			},
			start: 9,
			end: 13,
		});
		expect(
			parseFilterExpression(typedTestGrammar, "created:>=2026-01-31T09:30+02:00"),
		).toMatchObject({
			comparison: { operator: "gte", operand: { type: "date", value: "2026-01-31T07:30:00.000Z" } },
		});
		expect(parseFilterExpression(typedTestGrammar, "created:<1h30m")).toMatchObject({
			comparison: { operator: "lt", operand: { type: "duration", value: 5_400_000 } },
		});
		expect(parseFilterExpression(typedTestGrammar, "created:0099-12-31")).toMatchObject({
			comparison: { operator: "equals", operand: { type: "date", value: "0099-12-31" } },
		});
	});
});
