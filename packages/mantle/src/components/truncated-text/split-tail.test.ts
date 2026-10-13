import { describe, expect, test } from "vitest";
import { splitTail } from "./split-tail.js";

describe("splitTail", () => {
	test("keeps the last `count` graphemes as the tail", () => {
		expect(splitTail("ep_2abcdEFGhijKL123456", 6)).toEqual({
			head: "ep_2abcdEFGhijKL",
			tail: "123456",
			tailGraphemes: 6,
		});
	});

	test("puts a shorter value in the tail and reports its real length", () => {
		expect(splitTail("short", 8)).toEqual({ head: "", tail: "short", tailGraphemes: 5 });
	});

	test("puts the whole value in the head when `count` is 0", () => {
		expect(splitTail("ep_2abcd", 0)).toEqual({ head: "ep_2abcd", tail: "", tailGraphemes: 0 });
	});

	test("never splits a grapheme cluster", () => {
		// A family emoji is one grapheme built from four code points and seven
		// UTF-16 code units, so a split by code point or by code unit lands inside it.
		expect(splitTail("id-👨‍👩‍👧", 1)).toEqual({ head: "id-", tail: "👨‍👩‍👧", tailGraphemes: 1 });
	});

	test("throws when `count` is negative", () => {
		expect(() => splitTail("ep_2abcd", -1)).toThrow("non-negative integer");
	});

	test("throws when `count` is not an integer", () => {
		expect(() => splitTail("ep_2abcd", 1.5)).toThrow("non-negative integer");
	});
});
