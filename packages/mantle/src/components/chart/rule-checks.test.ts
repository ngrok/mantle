import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const components = path.resolve(import.meta.dirname, "..");
const rules = readFileSync(path.resolve(components, "../../../../docs/charts.md"), "utf8");

/** A code span. A title that holds a backtick is in a double-backtick span. */
const SPAN = "(?:`` .+? ``|`[^`]+`)";

/**
 * Each check that docs/charts.md names: one test title or a list of them in
 * code spans, then ` in ` and the test file in a code span.
 */
const citations = [
	...rules.matchAll(
		new RegExp(`(${SPAN}(?:(?:, and |, | and )${SPAN})*) in \`([^\`]+\\.test\\.tsx?)\``, "g"),
	),
];
const namedChecks = citations.flatMap(([, titles = "", file = ""]) =>
	[...titles.matchAll(/`` (.+?) ``|`([^`]+)`/g)].map(([, long, short]) => ({
		title: long ?? short ?? "",
		file,
	})),
);

describe("docs/charts.md", () => {
	// Why: the rule file gives each rule a test as its check. A test that someone
	// renames leaves the rule with no check, and no other test fails.
	test.each(namedChecks)("names a test that exists: $title", ({ title, file }) => {
		const source = readFileSync(path.resolve(components, file), "utf8");
		// Why the quote marks: a part of a title is not a title.
		const quoted = [`"${title}"`, `'${title}'`, `\`${title}\``];
		expect(quoted.filter((text) => source.includes(text))).toHaveLength(1);
	});

	test("names each check in the form that this file reads", () => {
		// Why a count: a check in another form matches no pattern, so it would pass unread.
		// Two test files are in code spans that name no test: this file, and the home of `installFrameClock`.
		const fileSpans = [...rules.matchAll(/`[^`]+\.test\.tsx?`/g)];
		expect(citations).toHaveLength(fileSpans.length - 2);
	});
});
