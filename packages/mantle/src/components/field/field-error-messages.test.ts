import { describe, expect, test } from "vitest";

import { toErrorMessages } from "./field-error-messages.js";

describe("toErrorMessages", () => {
	test("returns [] for a nullish errors array", () => {
		expect(toErrorMessages(undefined)).toEqual([]);
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
});
