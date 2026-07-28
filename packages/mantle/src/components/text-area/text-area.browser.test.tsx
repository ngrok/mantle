"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { TextArea } from "./text-area.js";

/**
 * Mirrors the CSS Tailwind 4 emits for the utilities `TextArea` uses for its
 * `appearance="monospaced"` variant and its `data-drag-over` state, paired with
 * the `data-drag-over` custom variant registered in `mantle.css`. We inline it
 * instead of importing the full mantle stylesheet so the test stays hermetic
 * and doesn't require a Tailwind build step in the test pipeline.
 *
 * Keep the escaped class selectors identical to the class names in
 * `text-area.tsx` — a rename on either side stops the rule from matching, which
 * is what these tests exist to catch. Values are inlined (vs. theme vars) so
 * the test doesn't depend on the mantle theme being loaded.
 *
 * `.font-sans` is declared *before* `.font-mono` deliberately. Both selectors have
 * equal specificity, so if a caller's `font-sans` and the variant's `font-mono` ever
 * shipped together — i.e. if `cx`/tailwind-merge stopped deduping the font-family
 * group — later-declared `.font-mono` would win and the override test below would go
 * red. Declared the other way around, the caller wins by cascade alone and the test
 * could never observe a merge regression.
 */
const STYLE = `
@layer utilities {
	.font-sans { font-family: ui-sans-serif, sans-serif; }
	.font-mono { font-family: ui-monospace, monospace; }
	.data-drag-over\\:border-dashed[data-drag-over="true"] { border-style: dashed; }
}
`;

let styleElement: HTMLStyleElement;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

describe("TextArea appearance", () => {
	test('appearance="monospaced" renders in the monospace stack', () => {
		render(<TextArea appearance="monospaced" aria-label="Config" />);

		expect(getComputedStyle(screen.getByRole("textbox", { name: "Config" })).fontFamily).toBe(
			"ui-monospace, monospace",
		);
	});

	test("the default appearance is not monospaced", () => {
		render(<TextArea aria-label="Feedback" />);

		expect(getComputedStyle(screen.getByRole("textbox", { name: "Feedback" })).fontFamily).not.toBe(
			"ui-monospace, monospace",
		);
	});

	test("a caller font utility overrides the monospaced appearance", () => {
		render(<TextArea appearance="monospaced" aria-label="Config" className="font-sans" />);

		expect(getComputedStyle(screen.getByRole("textbox", { name: "Config" })).fontFamily).toBe(
			"ui-sans-serif, sans-serif",
		);
	});
});

describe("TextArea drag-over styling", () => {
	test("data-drag-over drives the dashed drop-zone border", () => {
		render(<TextArea aria-label="Feedback" />);

		const textArea = screen.getByRole("textbox", { name: "Feedback" });
		expect(getComputedStyle(textArea).borderStyle).not.toBe("dashed");

		fireEvent.dragEnter(textArea);
		expect(getComputedStyle(textArea).borderStyle).toBe("dashed");

		fireEvent.dragLeave(textArea);
		expect(getComputedStyle(textArea).borderStyle).not.toBe("dashed");
	});
});
