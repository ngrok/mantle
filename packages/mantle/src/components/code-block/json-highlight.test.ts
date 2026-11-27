import { describe, expect, test } from "vitest";
import { computeJsonFoldRanges } from "./compute-json-fold-ranges.js";
import { decorateHighlightedHtml } from "./decorate-highlighted-html.js";
import { jsonFoldFixtures } from "./json-fold.fixtures.js";
import { jsonHighlightFixtures } from "./json-highlight.fixtures.js";
import { jsonCodeBlockValue, jsonToShikiHtml } from "./json-highlight.js";

describe("jsonToShikiHtml", () => {
	// The fixtures are the <code> inner HTML captured from Mantle's real Shiki
	// engine. Equality here is the byte-for-byte "matches Shiki 1:1" guarantee.
	test.each(jsonHighlightFixtures)("matches Shiki output 1:1 ($name)", ({ code, expected }) => {
		expect(jsonToShikiHtml(code)).toBe(expected);
	});

	test("escapes `&` and `<` as hex entities but leaves `>` literal, like Shiki", () => {
		const html = jsonToShikiHtml(JSON.stringify("a < b > c & d"));
		expect(html).toContain("&#x3C;");
		expect(html).toContain("&#x26;");
		expect(html).toContain("> c"); // `>` is intentionally left literal
		expect(html).not.toContain("&gt;");
		expect(html).not.toContain("&amp;");
	});

	test("colors object keys and string values with distinct token classes", () => {
		const html = jsonToShikiHtml(JSON.stringify({ key: "value" }, null, 2));
		// key → keyword, value → string-expression
		expect(html).toContain('<span class="tk">  "key"</span>');
		expect(html).toContain('<span class="tx"> "value"</span>');
	});

	test("splits escape sequences inside strings into their own escape spans", () => {
		const html = jsonToShikiHtml(JSON.stringify({ a: "x\ny" }, null, 2));
		expect(html).toContain('<span class="te">\\n</span>');
	});
});

describe("jsonCodeBlockValue", () => {
	test("uses the JSON-serialized value (2-space indent) as the copy text", () => {
		const data = { id: "abc", count: 1 };
		const value = jsonCodeBlockValue(data);
		expect(value.language).toBe("json");
		expect(value.code).toBe(JSON.stringify(data, null, 2));
	});

	test("produces decorated, highlighted preHtml with no line numbers by default", () => {
		const value = jsonCodeBlockValue({ id: "abc" });
		const preHtml = value["~preHtml"];
		expect(preHtml).toBeTypeOf("string");
		expect(preHtml).toContain("mantle-code-line-content"); // ran through decorateHighlightedHtml
		expect(preHtml).toContain('class="tk"'); // the key is highlighted
		expect(value["~showLineNumbers"]).toBe(false); // line numbers off by default
	});

	test("turns line numbers on when showLineNumbers is true", () => {
		const value = jsonCodeBlockValue({ id: "abc" }, { showLineNumbers: true });
		expect(value["~showLineNumbers"]).toBe(true);
	});

	test("falls back to an empty string when the value is not JSON-serializable", () => {
		expect(jsonCodeBlockValue(undefined).code).toBe("");
	});

	test("serializes BigInt values (as decimal strings) without throwing", () => {
		const value = jsonCodeBlockValue({ id: 10n });
		expect(value.code).toBe(JSON.stringify({ id: "10" }, null, 2));
	});

	test("serializes circular structures by collapsing the cycle to `[Circular]`, keeping other fields", () => {
		const circular: Record<string, unknown> = { id: "abc" };
		circular.self = circular;
		const { code } = jsonCodeBlockValue(circular);
		// Non-circular fields survive; only the back-reference is collapsed, not the
		// useless whole-object `[object Object]` of a plain `String(value)` fallback.
		expect(code).toContain('"id": "abc"');
		expect(code).toContain('"self": "[Circular]"');
		expect(code).not.toContain("[object Object]");
	});

	test("collapses a shared (acyclic) reference to `[Circular]` after its first occurrence", () => {
		const shared = { value: 1 };
		const { code } = jsonCodeBlockValue({ a: shared, b: shared });
		expect(code).toContain('"a": {');
		expect(code).toContain('"b": "[Circular]"');
	});

	test("never throws, even when both `JSON.stringify` and the `String()` fallback would throw", () => {
		// Null-prototype object with a throwing getter: `JSON.stringify` throws while
		// reading the getter, then `String(value)` throws too (no inherited
		// `toString`). The doubly-guarded fallback must still return a string.
		const hostile: Record<string, unknown> = Object.create(null);
		Object.defineProperty(hostile, "boom", {
			enumerable: true,
			get() {
				throw new Error("nope");
			},
		});
		expect(() => jsonCodeBlockValue(hostile)).not.toThrow();
		expect(jsonCodeBlockValue(hostile).code).toBe("");
	});

	test("normalizes CRLF input to match the LF-highlighted output (no stray `\\r` runs)", () => {
		const lf = jsonToShikiHtml('{\n  "a": 1\n}');
		const crlf = jsonToShikiHtml('{\r\n  "a": 1\r\n}');
		expect(crlf).toBe(lf);
		expect(crlf).not.toContain("\r");
	});

	test("emits fold-toggle markup for multi-line structures by default", () => {
		const value = jsonCodeBlockValue({ nested: { a: 1 } });
		expect(value["~preHtml"]).toContain("mantle-code-fold-toggle");
	});

	test("omits fold markup when `foldable` is false", () => {
		const value = jsonCodeBlockValue({ nested: { a: 1 } }, { foldable: false });
		expect(value["~preHtml"]).not.toContain("mantle-code-fold-toggle");
	});
});

describe("JSON fold parity", () => {
	// Reconstruct the client pipeline (client tokenizer + the shared
	// computeJsonFoldRanges + decorateHighlightedHtml) and assert it matches the
	// fold-decorated markup captured from the real Shiki server pipeline. This is
	// the byte-for-byte "client folds === server/build folds" guarantee.
	test.each(jsonFoldFixtures)(
		"reconstructs the server's fold-decorated markup 1:1 ($name)",
		({ code, html, lineNumberStart, highlightLines }) => {
			const reconstructed = decorateHighlightedHtml({
				html: jsonToShikiHtml(code),
				foldableRanges: computeJsonFoldRanges(code),
				lineNumberStart,
				highlightLines,
			});
			expect(reconstructed).toBe(html);
		},
	);
});

test("sortKeys keeps a boxed primitive as its value", () => {
	// oxlint-disable-next-line unicorn/new-for-builtins, no-new-wrappers -- Why: the boxed value is the input under test.
	const value = { b: new Number(7), a: new String("ok") };
	expect(jsonCodeBlockValue(value, { sortKeys: true }).code).toBe('{\n  "a": "ok",\n  "b": 7\n}');
});

// Why: TypeScript's ES2025 lib has no `JSON.rawJSON`, which each engine mantle supports ships.
declare global {
	interface JSON {
		rawJSON(text: string): object;
	}
}

test("sortKeys keeps raw JSON as its text", () => {
	const value = { id: JSON.rawJSON("9007199254740993") };
	expect(jsonCodeBlockValue(value, { sortKeys: true }).code).toBe('{\n  "id": 9007199254740993\n}');
});
