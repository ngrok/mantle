import { describe, expect, test } from "vitest";
import { escapeHtml } from "./escape-html.js";

describe("escapeHtml", () => {
	test("given empty string, returns empty string", () => {
		expect(escapeHtml("")).toBe("");
	});

	test("given a string with all special characters, returns the escaped string", () => {
		expect(escapeHtml("& < > \" '")).toBe("&amp; &lt; &gt; &quot; &#39;");
	});

	test("given a string with no special characters, returns the string", () => {
		expect(escapeHtml("Hello World")).toBe("Hello World");
	});

	test("given a string with special characters, returns the escaped string", () => {
		expect(escapeHtml('<div>Hello & "world"</div>')).toBe(
			"&lt;div&gt;Hello &amp; &quot;world&quot;&lt;/div&gt;",
		);

		expect(escapeHtml('<script>window.alert("lol xss")</script>')).toBe(
			"&lt;script&gt;window.alert(&quot;lol xss&quot;)&lt;/script&gt;",
		);

		expect(escapeHtml("<textarea>foo</textarea>")).toBe("&lt;textarea&gt;foo&lt;/textarea&gt;");
	});

	test("given plain text before the first special character, preserves that prefix", () => {
		expect(escapeHtml('const a = "x"')).toBe("const a = &quot;x&quot;");
		expect(escapeHtml("a&b")).toBe("a&amp;b");
		expect(escapeHtml("trailing &")).toBe("trailing &amp;");
	});

	test("given an existing entity, escapes its ampersand (double escaping is intentional)", () => {
		expect(escapeHtml("&amp;")).toBe("&amp;amp;");
	});
});
