import { describe, expect, test } from "vitest";
import { hasMoreThanNLines } from "./has-more-than-n-lines.js";

describe("hasMoreThanNLines", () => {
	test("matches split-based behavior for empty and single-line strings", () => {
		expect(hasMoreThanNLines("", 0)).toBe("".split("\n").length > 0);
		expect(hasMoreThanNLines("", 1)).toBe("".split("\n").length > 1);
		expect(hasMoreThanNLines("hello", 1)).toBe("hello".split("\n").length > 1);
	});

	test("returns true only when the line count exceeds maxLines", () => {
		const value = "line1\nline2\nline3";
		expect(hasMoreThanNLines(value, 2)).toBe(true);
		expect(hasMoreThanNLines(value, 3)).toBe(false);
	});

	test("matches split-based behavior with trailing newlines", () => {
		const value = "a\nb\n";
		expect(hasMoreThanNLines(value, 2)).toBe(value.split("\n").length > 2);
		expect(hasMoreThanNLines(value, 3)).toBe(value.split("\n").length > 3);
	});
});
