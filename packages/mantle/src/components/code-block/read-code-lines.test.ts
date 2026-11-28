import { expect, test } from "vitest";
import { jsonCodeBlockValue } from "./json-highlight.js";
import { createMantleCodeBlockValue } from "./mantle-code.js";
import { readCodeLines } from "./read-code-lines.js";

test("reads the colored tokens of each line of decorated HTML", () => {
	const lines = readCodeLines(jsonCodeBlockValue({ a: "x&y" }));
	const second = lines[1];
	expect(typeof second === "string" ? second : second?.map((token) => token.content).join("")).toBe(
		'  "a": "x&y"',
	);
	expect(
		typeof second !== "string" && second?.find((token) => token.content === '  "a"')?.color,
	).toBe("var(--shiki-token-keyword)");
});

test("keeps plain text when the tokens do not spell the line", () => {
	const value = createMantleCodeBlockValue({
		code: "const x = 1;",
		language: "typescript",
		preHtml:
			'<span class="mantle-code-line" data-line-number="1"><span class="mantle-code-line-content"><span class="tk">const</span> y = 1;</span></span>',
	});
	expect(readCodeLines(value)).toEqual(["const x = 1;"]);
});

test("keeps plain text for a value with no highlighting", () => {
	expect(readCodeLines(createMantleCodeBlockValue({ code: "a\nb", language: "text" }))).toEqual([
		"a",
		"b",
	]);
});

test("reads a line that holds a paragraph separator", () => {
	expect(Array.isArray(readCodeLines(jsonCodeBlockValue({ city: "a\u2029b" }))[1])).toBe(true);
});
