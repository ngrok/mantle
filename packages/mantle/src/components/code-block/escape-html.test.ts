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
	});

	test("given plain text before the first special character, keeps the prefix", () => {
		expect(escapeHtml("Hello <b>world</b> & more")).toBe(
			"Hello &lt;b&gt;world&lt;/b&gt; &amp; more",
		);
	});
});
