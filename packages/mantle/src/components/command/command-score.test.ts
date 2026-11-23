import { describe, expect, test } from "vitest";
import { commandScore } from "./command-score.js";

// Each pair comes from a rule in command-score's own docs: the first string must outrank the second.
describe("commandScore", () => {
	test.each([
		{
			rule: "a complete match beats a longer string",
			search: "html",
			better: "html",
			worse: "html5",
		},
		{ rule: "fewer skipped characters win", search: "bd", better: "bad", worse: "bard" },
		{ rule: "an exact-case match wins", search: "HM", better: "HTML", worse: "haml" },
		{ rule: "a transposition is a weak match", search: "uc", better: "ouch", worse: "curtain" },
		{
			rule: "a word start beats a letter inside a word",
			search: "e",
			better: "Search Emoji",
			worse: "Calendar",
		},
	])("$rule", ({ search, better, worse }) => {
		expect(commandScore(better, search)).toBeGreaterThan(commandScore(worse, search));
		expect(commandScore(worse, search)).toBeGreaterThan(0);
	});

	test("scores an exact match 1 and a string with no match 0", () => {
		expect(commandScore("Calendar", "Calendar")).toBe(1);
		expect(commandScore("Calendar", "xyz")).toBe(0);
	});

	test("matches a keyword the value does not hold", () => {
		expect(commandScore("Profile", "account")).toBe(0);
		expect(commandScore("Profile", "account", ["user", "account"])).toBeGreaterThan(0);
	});

	test("matches a space and a dash as the same character", () => {
		// Only the exact-character penalty (0.9999) separates them.
		expect(commandScore("git-hub", "git hub")).toBeCloseTo(0.9999, 6);
	});
});
