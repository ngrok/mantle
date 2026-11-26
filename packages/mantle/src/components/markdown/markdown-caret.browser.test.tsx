import { afterAll, beforeAll, describe, expect, test } from "vitest";
import mantleCss from "../../mantle.css?raw";

let styleElement: HTMLStyleElement;

beforeAll(() => {
	// Why the rule from `mantle.css`: browser tests load no stylesheet, and the caret is one rule.
	const match =
		/:where\(\[data-slot~="markdown"\]\[data-streaming\]\)[\s\S]*?opacity: 0\.6;\n\t\}/.exec(
			mantleCss,
		);
	if (match == null) {
		throw new Error("mantle.css holds no caret rule for streaming Markdown.");
	}
	styleElement = document.createElement("style");
	styleElement.textContent = match[0];
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

/** The element whose `::after` draws the caret, as `tag:text`, or `none`. */
function caretAt(html: string, { streaming = true } = {}) {
	const answer = document.createElement("div");
	answer.dataset.slot = "markdown";
	if (streaming) {
		answer.setAttribute("data-streaming", "");
	}
	answer.innerHTML = html;
	document.body.append(answer);
	const owners = [...answer.querySelectorAll("*")].filter(
		(element) => getComputedStyle(element, "::after").display === "inline-block",
	);
	answer.remove();
	return (
		owners.map((element) => `${element.tagName.toLowerCase()}:${element.textContent}`).join(",") ||
		"none"
	);
}

describe("Markdown streaming caret", () => {
	test.each([
		{ name: "the last paragraph", html: "<p>a</p><p>b</p>", caret: "p:b" },
		{ name: "a last heading", html: "<p>a</p><h2>h</h2>", caret: "h2:h" },
		{ name: "the last list item", html: "<p>a</p><ul><li>x</li><li>y</li></ul>", caret: "li:y" },
		{
			name: "the last paragraph of a loose list",
			html: "<ol><li><p>x</p></li><li><p>y</p><p>z</p></li></ol>",
			caret: "p:z",
		},
		{
			name: "the last paragraph of a quote",
			html: "<blockquote><p>q1</p><p>q2</p></blockquote>",
			caret: "p:q2",
		},
		{ name: "a paragraph after a list", html: "<ul><li>x</li></ul><p>after</p>", caret: "p:after" },
		{ name: "no block after a code block", html: "<p>a</p><pre>code</pre>", caret: "none" },
		{
			name: "no item with a nested list",
			html: "<ul><li>x<ul><li>n</li></ul></li></ul>",
			caret: "none",
		},
	])("draws the caret after $name", ({ html, caret }) => {
		expect(caretAt(html)).toBe(caret);
	});

	test("draws no caret once the answer stops streaming", () => {
		expect(caretAt("<p>a</p>", { streaming: false })).toBe("none");
	});
});
