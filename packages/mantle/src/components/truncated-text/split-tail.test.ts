import { describe, expect, test } from "vitest";
import { splitTail } from "./split-tail.js";

describe("splitTail", () => {
	test("keeps the last `count` graphemes as the tail", () => {
		expect(splitTail("ep_2abcdEFGhijKL123456", { tail: 6 })).toEqual({
			head: "ep_2abcdEFGhijKL",
			lead: null,
			tail: "123456",
			tailGraphemes: 6,
		});
	});

	test("puts a shorter value in the tail and reports its real length", () => {
		expect(splitTail("short", { tail: 8 })).toEqual({
			head: "",
			lead: null,
			tail: "short",
			tailGraphemes: 5,
		});
	});

	test("puts the whole value in the head when `count` is 0", () => {
		expect(splitTail("ep_2abcd", { tail: 0 })).toEqual({
			head: "ep_2abcd",
			lead: null,
			tail: "",
			tailGraphemes: 0,
		});
	});

	test("never splits a grapheme cluster", () => {
		// A family emoji is one grapheme built from four code points and seven
		// UTF-16 code units, so a split by code point or by code unit lands inside it.
		expect(splitTail("id-👨‍👩‍👧", { tail: 1 })).toEqual({
			head: "id-",
			lead: null,
			tail: "👨‍👩‍👧",
			tailGraphemes: 1,
		});
	});

	test("throws when `count` is negative", () => {
		expect(() => splitTail("ep_2abcd", { tail: -1 })).toThrow("non-negative integer");
	});

	test("throws when `count` is not an integer", () => {
		expect(() => splitTail("ep_2abcd", { tail: 1.5 })).toThrow("non-negative integer");
	});

	test("keeps the first `head` graphemes as the lead", () => {
		expect(splitTail("ep_2abcdEFGhijKL123456", { head: 3, tail: 6 }).lead).toBe("ep_");
	});

	test("has no lead when the value holds exactly `head + tail` graphemes", () => {
		// The boundary: one more grapheme gives the value a lead.
		expect(splitTail("ep_123456", { head: 3, tail: 6 }).lead).toBeNull();
		expect(splitTail("ep_x123456", { head: 3, tail: 6 }).lead).toBe("ep_");
	});

	test("never splits a grapheme cluster in the lead", () => {
		expect(splitTail("👨‍👩‍👧-abcdef", { head: 1, tail: 2 }).lead).toBe("👨‍👩‍👧");
	});

	test("throws when `head` is not a non-negative integer", () => {
		expect(() => splitTail("ep_2abcd", { head: -1, tail: 2 })).toThrow(
			"`head` must be a non-negative integer",
		);
	});
});
