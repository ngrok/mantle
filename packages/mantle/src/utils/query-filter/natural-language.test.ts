import { describe, expect, test } from "vitest";
import { defineRemoteFilterGrammar } from "./grammar.js";
import { checkFilterQuery, describeFilterGrammar } from "./natural-language.js";
import { testGrammar } from "./test-grammar.js";

describe("describeFilterGrammar", () => {
	test("describes each key with its canonical values and what it accepts", () => {
		const description = describeFilterGrammar(testGrammar);

		expect(description.syntax).toBe("full");
		expect(description.keys.map((key) => key.key)).toEqual(
			testGrammar.keys.map((definition) => definition.key),
		);
		const is = description.keys.find((key) => key.key === "is");
		expect(is?.values?.map((value) => value.value)).toEqual([
			"new",
			"shared",
			"private",
			"archived",
		]);
		expect(is).toMatchObject({ negatable: true, acceptsList: true });
		expect(description.keys.find((key) => key.key === "name")?.values).toBeUndefined();
	});

	test("leaves out aliases and matchers, so the description serializes to JSON", () => {
		const json = JSON.stringify(describeFilterGrammar(testGrammar));

		expect(json).not.toContain("personal");
		expect(JSON.parse(json)).toEqual(describeFilterGrammar(testGrammar));
	});

	test("states only the syntax the grammar honors", () => {
		const grammar = defineRemoteFilterGrammar({
			keys: [{ key: "is", description: "State", negatable: false, values: [{ value: "active" }] }],
		});

		const { rules } = describeFilterGrammar(grammar);

		expect(rules.join(" ")).not.toMatch(/OR|excludes|either|quotes/);
		expect(rules).toContain("Other words search the item text.");
	});

	test("does not offer an exclusion that a qualifiers grammar reads as text", () => {
		const grammar = defineRemoteFilterGrammar({
			keys: [{ key: "is", description: "State", values: [{ value: "active" }] }],
		});

		const description = describeFilterGrammar(grammar);

		expect(description.keys[0]?.negatable).toBe(false);
		expect(description.rules.join(" ")).not.toMatch(/excludes/);
	});

	test("tells the model that a conjunction grammar reads only qualifiers", () => {
		const grammar = defineRemoteFilterGrammar({
			syntax: "conjunction",
			keys: [{ key: "is", description: "State", values: [{ value: "active" }] }],
		});

		const { rules } = describeFilterGrammar(grammar);

		expect(rules).toContain("Write only qualifiers. The search cannot read other words.");
		expect(rules).not.toContain("Other words search the item text.");
	});
});

describe("checkFilterQuery", () => {
	test("finds nothing wrong in a clean query", () => {
		expect(checkFilterQuery(testGrammar, 'is:shared -name:staging "a:b" api')).toEqual([]);
	});

	test("reports a key the grammar does not define", () => {
		expect(checkFilterQuery(testGrammar, "is:shared owner:me")).toEqual([
			{ kind: "unknown-key", key: "owner", start: 10, end: 18 },
		]);
	});

	test("reports a quoted key, a key in any script, and an exclusion that a qualifiers grammar reads as text", () => {
		const qualifiers = defineRemoteFilterGrammar({
			keys: [{ key: "is", description: "State", values: [{ value: "active" }] }],
		});

		expect(checkFilterQuery(testGrammar, '"owner":me über:x 123:y')).toEqual([
			{ kind: "unknown-key", key: "owner", start: 0, end: 10 },
			{ kind: "unknown-key", key: "über", start: 11, end: 17 },
			{ kind: "unknown-key", key: "123", start: 18, end: 23 },
		]);
		expect(checkFilterQuery(qualifiers, "-is:active")).toEqual([
			{ kind: "unknown-key", key: "-is", start: 0, end: 10 },
		]);
	});

	test("reads a URL as search text, not as a key", () => {
		expect(checkFilterQuery(testGrammar, "https://api.example.com")).toEqual([]);
	});

	test("reports a bare term that a conjunction grammar cannot run", () => {
		const grammar = defineRemoteFilterGrammar({
			syntax: "conjunction",
			keys: [{ key: "is", description: "State", values: [{ value: "active" }] }],
		});

		expect(checkFilterQuery(grammar, "is:active api")).toEqual([
			{ kind: "unsupported-term", text: "api", start: 10, end: 13 },
		]);
	});

	test("reports each value that a key with listed values does not accept", () => {
		expect(checkFilterQuery(testGrammar, "is:shared,bogus")).toEqual([
			{ kind: "unknown-value", key: "is", value: "bogus", start: 10, end: 15 },
		]);
	});

	test("reports an exclusion on a key that cannot exclude", () => {
		const grammar = defineRemoteFilterGrammar({
			syntax: "conjunction",
			keys: [{ key: "is", description: "State", negatable: false, values: [{ value: "active" }] }],
		});

		expect(checkFilterQuery(grammar, "-is:active")).toEqual([
			{ kind: "not-negatable", key: "is", start: 0, end: 10 },
		]);
	});
});
