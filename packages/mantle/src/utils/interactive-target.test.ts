import { describe, expect, test } from "vitest";
import { isInteractiveTarget } from "./interactive-target.js";

/**
 * Render `html` inside a fresh container and return the container plus the
 * element `targetSelector` picks out of it.
 */
function renderTarget(html: string, targetSelector: string) {
	const within = document.createElement("div");
	within.innerHTML = html;
	const target = within.querySelector(targetSelector);
	if (target == null) {
		throw new Error(`no element matches ${targetSelector}`);
	}
	return { within, target };
}

describe("isInteractiveTarget", () => {
	// Each row pins one entry of the selector: drop that entry and its row fails.
	test.each([
		{ name: "a link", html: '<a href="#docs">docs</a>', targetSelector: "a" },
		{ name: "a button", html: "<button>go</button>", targetSelector: "button" },
		{
			name: "a <summary> through its <details>",
			html: "<details><summary>more</summary>text</details>",
			targetSelector: "summary",
		},
		{ name: "an input", html: '<input type="checkbox" />', targetSelector: "input" },
		{ name: "a select", html: "<select><option>a</option></select>", targetSelector: "select" },
		{ name: "a textarea", html: "<textarea></textarea>", targetSelector: "textarea" },
		{ name: "a label", html: "<label>name</label>", targetSelector: "label" },
		{ name: 'role="button"', html: '<span role="button">go</span>', targetSelector: "span" },
		{ name: 'role="link"', html: '<span role="link">docs</span>', targetSelector: "span" },
		{ name: 'role="menuitem"', html: '<div role="menuitem">open</div>', targetSelector: "div" },
		{
			name: "contenteditable",
			html: '<div contenteditable="true">edit</div>',
			targetSelector: "div",
		},
	])("returns true for $name inside `within`", ({ html, targetSelector }) => {
		const { within, target } = renderTarget(html, targetSelector);
		expect(isInteractiveTarget(target, within)).toBe(true);
	});

	test("returns true for text inside interactive content, not only the element itself", () => {
		const { within, target } = renderTarget("<button><span>go</span></button>", "span");
		expect(isInteractiveTarget(target, within)).toBe(true);
	});

	test("returns false for plain content (the ancestor acts)", () => {
		const { within, target } = renderTarget("<p>Get notified by email.</p>", "p");
		expect(isInteractiveTarget(target, within)).toBe(false);
	});

	test("returns false for a placeholder link with no href", () => {
		const { within, target } = renderTarget("<a>not a link</a>", "a");
		expect(isInteractiveTarget(target, within)).toBe(false);
	});

	test("returns false for a non-element target", () => {
		const within = document.createElement("div");
		expect(isInteractiveTarget(null, within)).toBe(false);
	});

	test("ignores interactive ancestors outside `within`", () => {
		// `within` sits inside a <details>. A click on its own text is not
		// interactive, even though an ancestor is.
		const outer = document.createElement("details");
		const within = document.createElement("div");
		const text = document.createElement("p");
		outer.append(within);
		within.append(text);
		expect(isInteractiveTarget(text, within)).toBe(false);
	});
});
