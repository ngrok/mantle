import { describe, expect, test } from "vitest";
import { defineRemoteFilterGrammar } from "./grammar.js";
import { checkFilterQuery, describeFilterGrammar } from "./natural-language.js";
import { testGrammar, typedTestGrammar } from "./test-grammar.js";

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

describe("describeFilterGrammar with typed keys", () => {
	test("describes the type and the operators of each key", () => {
		const { keys } = describeFilterGrammar(typedTestGrammar);

		expect(keys.find((key) => key.key === "latency")).toMatchObject({
			type: "duration",
			operators: ["gt", "gte"],
		});
		expect(keys.find((key) => key.key === "state")).toMatchObject({
			type: "enum",
			operators: ["equals"],
		});
		// A key with no type takes no operator: its matcher reads the value as written.
		expect(describeFilterGrammar(testGrammar).keys[0]).toMatchObject({
			type: "text",
			operators: ["equals"],
		});
	});

	test("states the operator, date, and duration rules only for a grammar that has them", () => {
		const typedRules = describeFilterGrammar(typedTestGrammar).rules.join(" ");
		const untypedRules = describeFilterGrammar(testGrammar).rules.join(" ");

		expect(typedRules).toContain("`key:>a`");
		expect(typedRules).toContain("`key:>7d` keeps the last 7 days");
		expect(typedRules).toContain("`key:a*` starts with a");
		expect(untypedRules).not.toMatch(/key:>a|7d|starts with/);
		expect(untypedRules).toContain("`NOT key:value`");
		expect(untypedRules).toContain("Parentheses group");
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

	test("names what is wrong with a typed value", () => {
		expect(checkFilterQuery(typedTestGrammar, "replicas:many latency:<1s state:bogus")).toEqual([
			{ kind: "invalid-value", key: "replicas", value: "many", start: 9, end: 13 },
			{ kind: "unsupported-operator", key: "latency", operator: "lt", start: 22, end: 25 },
			{ kind: "unknown-value", key: "state", value: "bogus", start: 32, end: 37 },
		]);
	});

	test("reports an exclusion through NOT or a negated group, and not a double negation", () => {
		const kinds = (query: string) =>
			checkFilterQuery(typedTestGrammar, query).map(
				(problem) => `${problem.kind}@${problem.start}`,
			);

		expect(kinds("NOT canary:true")).toEqual(["not-negatable@4"]);
		expect(kinds("-(name:web canary:true) canary:false")).toEqual(["not-negatable@11"]);
		expect(kinds("NOT NOT canary:true !(NOT canary:true)")).toEqual([]);
	});
});
