"use client";

import { render } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Label } from "./label.js";

/**
 * Mirrors the CSS Tailwind 4 emits for our utilities, paired with the `where`
 * custom variant registered in `mantle.css`. We inline this instead of importing
 * the full mantle stylesheet so the test stays hermetic and doesn't require a
 * Tailwind build step in the test pipeline.
 *
 * Keep the selector form identical to Tailwind's output — that's what determines
 * specificity and source order. The numeric values are inlined (vs. CSS vars) so
 * the test doesn't depend on the mantle theme being loaded.
 */
const STYLE = `
body { font-weight: 100; }
@layer utilities {
	.font-bold { font-weight: 700; }
	.font-medium { font-weight: 500; }
	.font-normal { font-weight: 400; }
	.\\[\\:where\\(\\&\\:not\\(\\:has\\(input\\,textarea\\,select\\,button\\,\\[contenteditable\\]\\)\\)\\)\\]\\:font-medium {
		:where(&:not(:has(input,textarea,select,button,[contenteditable]))) {
			font-weight: 500;
		}
	}
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

describe("Label conditional font-weight", () => {
	test("standalone label renders font-medium (500)", () => {
		const { container } = render(<Label>Email</Label>);
		const label = container.querySelector("label");
		expect(label).not.toBeNull();
		expect(getComputedStyle(label as HTMLLabelElement).fontWeight).toBe("500");
	});

	test("label wrapping <input> inherits its weight (does not become medium)", () => {
		const { container } = render(
			<Label>
				<span>Email</span>
				<input type="email" />
			</Label>,
		);
		const label = container.querySelector("label");
		expect(label).not.toBeNull();
		expect(getComputedStyle(label as HTMLLabelElement).fontWeight).toBe("100");
	});

	test("label wrapping <textarea>, <select>, or <button> also opts out", () => {
		const cases = [
			<Label key="ta">
				<textarea />
			</Label>,
			<Label key="sel">
				<select>
					<option>a</option>
				</select>
			</Label>,
			<Label key="btn">
				<button type="button">x</button>
			</Label>,
		];
		for (const node of cases) {
			const { container, unmount } = render(node);
			const label = container.querySelector("label");
			expect(label).not.toBeNull();
			expect(getComputedStyle(label as HTMLLabelElement).fontWeight).toBe("100");
			unmount();
		}
	});

	test("user-supplied font-bold overrides the default on a standalone label", () => {
		const { container } = render(<Label className="font-bold">Email</Label>);
		const label = container.querySelector("label");
		expect(label).not.toBeNull();
		expect(getComputedStyle(label as HTMLLabelElement).fontWeight).toBe("700");
	});

	test("user-supplied font-normal overrides the default on a standalone label", () => {
		const { container } = render(<Label className="font-normal">Email</Label>);
		const label = container.querySelector("label");
		expect(label).not.toBeNull();
		expect(getComputedStyle(label as HTMLLabelElement).fontWeight).toBe("400");
	});

	test("user-supplied font-bold still applies when wrapping a control", () => {
		const { container } = render(
			<Label className="font-bold">
				<span>Email</span>
				<input type="email" />
			</Label>,
		);
		const label = container.querySelector("label");
		expect(label).not.toBeNull();
		expect(getComputedStyle(label as HTMLLabelElement).fontWeight).toBe("700");
	});

	test("user-supplied font-bold still applies when wrapping a [contenteditable]", () => {
		const { container } = render(
			<Label className="font-bold">
				<span>Bio</span>
				<div contentEditable suppressContentEditableWarning>
					hi
				</div>
			</Label>,
		);
		const label = container.querySelector("label");
		expect(label).not.toBeNull();
		expect(getComputedStyle(label as HTMLLabelElement).fontWeight).toBe("700");
	});

	test("label wrapping a [contenteditable] element opts out", () => {
		const { container } = render(
			<Label>
				<span>Bio</span>
				<div contentEditable suppressContentEditableWarning>
					hello
				</div>
			</Label>,
		);
		const label = container.querySelector("label");
		expect(label).not.toBeNull();
		expect(getComputedStyle(label as HTMLLabelElement).fontWeight).toBe("100");
	});

	test("nested control deeper than direct child still suppresses the default", () => {
		const { container } = render(
			<Label>
				<span>Email</span>
				<div>
					<div>
						<input type="email" />
					</div>
				</div>
			</Label>,
		);
		const label = container.querySelector("label");
		expect(label).not.toBeNull();
		expect(getComputedStyle(label as HTMLLabelElement).fontWeight).toBe("100");
	});
});
