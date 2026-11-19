import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const components = path.resolve(import.meta.dirname, "..");
const rules = readFileSync(path.resolve(components, "../../../../docs/charts.md"), "utf8");

/**
 * Each check that docs/charts.md names: a test title in a code span, then
 * ` in ` and the test file in a code span. A title that holds a backtick is in
 * a double-backtick span.
 */
const namedChecks = [
	...rules.matchAll(
		/(?:`` (.+?) ``|`([^`]+)`)(?: and (?:`` (.+?) ``|`([^`]+)`))? in `([^`]+\.test\.tsx?)`/g,
	),
].flatMap(([, first, second, third, fourth, file = ""]) =>
	[first ?? second, third ?? fourth]
		.filter((title) => title != null)
		.map((title) => ({ title, file })),
);

describe("docs/charts.md", () => {
	// Why: the rule file gives each rule a test as its check. A test that someone
	// renames leaves the rule with no check, and no other test fails.
	test.each(namedChecks)("names a test that exists: $title", ({ title, file }) => {
		expect(readFileSync(path.resolve(components, file), "utf8")).toContain(title);
	});

	test("names its checks in the form that this file reads", () => {
		// Guards the pattern: a rule file with no match would pass the check above.
		expect(namedChecks.length).toBeGreaterThan(20);
	});
});
