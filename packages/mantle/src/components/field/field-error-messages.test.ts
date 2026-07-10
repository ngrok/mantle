import { describe, expect, test } from "vitest";

import { toErrorMessages } from "./field-error-messages.js";

describe("toErrorMessages", () => {
	test("returns [] when given undefined", () => {
		expect(toErrorMessages(undefined)).toEqual([]);
	});

	test("returns [] when given null", () => {
		expect(toErrorMessages(null)).toEqual([]);
	});

	test("returns [] for an empty array", () => {
		expect(toErrorMessages([])).toEqual([]);
	});

	test("drops nullish, false, and empty entries", () => {
		expect(toErrorMessages([undefined, null, false, "", "   "])).toEqual([]);
	});

	test("returns plain string entries", () => {
		expect(toErrorMessages(["Required", "Too short"])).toEqual(["Required", "Too short"]);
	});

	test("returns .message from object entries (Zod/StandardSchema issue shape)", () => {
		expect(
			toErrorMessages([{ message: "Please enter a valid email." }, { message: "Too short." }]),
		).toEqual(["Please enter a valid email.", "Too short."]);
	});

	test("returns .message from thrown Error instances", () => {
		expect(toErrorMessages([new Error("boom")])).toEqual(["boom"]);
	});

	test("trims whitespace around messages", () => {
		expect(toErrorMessages(["  Required  ", { message: "  Too short  " }])).toEqual([
			"Required",
			"Too short",
		]);
	});

	test("removes duplicate messages after trimming", () => {
		expect(
			toErrorMessages([
				"  Required  ",
				{ message: "Required" },
				new Error("Required"),
				"Too short",
				{ message: " Too short " },
			]),
		).toEqual(["Required", "Too short"]);
	});

	test("handles a mixed array preserving order", () => {
		expect(
			toErrorMessages([
				"first",
				undefined,
				{ message: "second" },
				false,
				{ message: undefined },
				"third",
			]),
		).toEqual(["first", "second", "third"]);
	});

	test("normalizes Zod-issue-shaped objects (string `message`, ignored extra fields)", () => {
		const zodLikeIssues = [
			{ code: "invalid_string", path: ["email"], message: "Please enter a valid email." },
			{
				code: "too_small",
				path: ["password"],
				minimum: 12,
				message: "Must be at least 12 characters.",
			},
		];
		expect(toErrorMessages(zodLikeIssues)).toEqual([
			"Please enter a valid email.",
			"Must be at least 12 characters.",
		]);
	});
});
