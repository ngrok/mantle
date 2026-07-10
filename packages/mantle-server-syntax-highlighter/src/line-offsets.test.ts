import { describe, expect, test } from "vitest";
import { buildLineOffsets, offsetToLine } from "./line-offsets.js";

describe("buildLineOffsets", () => {
	test("returns [0] for an empty string", () => {
		expect(buildLineOffsets("")).toEqual([0]);
	});

	test("returns [0] for a single line with no terminator", () => {
		expect(buildLineOffsets("hello")).toEqual([0]);
	});

	test("includes one offset per LF terminator", () => {
		expect(buildLineOffsets("a\nb\nc")).toEqual([0, 2, 4]);
	});

	test("treats CRLF as one line break", () => {
		expect(buildLineOffsets("a\r\nb\r\nc")).toEqual([0, 3, 6]);
	});

	test("treats bare CR as a line break", () => {
		expect(buildLineOffsets("a\rb\rc")).toEqual([0, 2, 4]);
	});

	test("counts blank lines correctly", () => {
		expect(buildLineOffsets("a\n\nb")).toEqual([0, 2, 3]);
	});
});

describe("offsetToLine", () => {
	const offsets = buildLineOffsets("ab\ncd\nef");

	test("maps offset 0 to line 1", () => {
		expect(offsetToLine(offsets, 0)).toBe(1);
	});

	test("maps mid-first-line offsets to line 1", () => {
		expect(offsetToLine(offsets, 1)).toBe(1);
	});

	test("maps the LF position to line 1", () => {
		// The newline character itself sits on line 1; line 2 begins at offset 3.
		expect(offsetToLine(offsets, 2)).toBe(1);
	});

	test("maps the start of the second line to line 2", () => {
		expect(offsetToLine(offsets, 3)).toBe(2);
	});

	test("maps mid-second-line offsets to line 2", () => {
		expect(offsetToLine(offsets, 4)).toBe(2);
	});

	test("maps the start of the third line to line 3", () => {
		expect(offsetToLine(offsets, 6)).toBe(3);
	});

	test("clamps negative offsets to line 1", () => {
		expect(offsetToLine(offsets, -1)).toBe(1);
	});

	test("clamps offsets past EOF to the last line", () => {
		expect(offsetToLine(offsets, 1000)).toBe(3);
	});
});
