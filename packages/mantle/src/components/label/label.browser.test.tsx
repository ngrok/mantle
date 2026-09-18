"use client";

import { render } from "@testing-library/react";
import type { ReactElement } from "react";
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

/** Renders `node` and reads the computed `font-weight` of the `<label>` it emits. */
const fontWeightOf = (node: ReactElement): string => {
	const { container } = render(node);
	const label = container.querySelector("label");
	if (label == null) {
		throw new Error("No <label> rendered.");
	}
	return getComputedStyle(label).fontWeight;
};

describe("Label conditional font-weight", () => {
	test("standalone label renders font-medium (500)", () => {
		expect(fontWeightOf(<Label>Email</Label>)).toBe("500");
	});

	test("label wrapping <input> inherits its weight (does not become medium)", () => {
		expect(
			fontWeightOf(
				<Label>
					<span>Email</span>
					<input type="email" />
				</Label>,
			),
		).toBe("100");
	});

	test.each([
		["textarea", <textarea key="textarea" />],
		[
			"select",
			<select key="select">
				<option>a</option>
			</select>,
		],
		[
			"button",
			<button key="button" type="button">
				x
			</button>,
		],
	] as const)("label wrapping <%s> inherits its weight", (_name, control) => {
		expect(fontWeightOf(<Label>{control}</Label>)).toBe("100");
	});

	test("user-supplied font-bold overrides the default on a standalone label", () => {
		expect(fontWeightOf(<Label className="font-bold">Email</Label>)).toBe("700");
	});

	test("user-supplied font-bold still applies when wrapping a control", () => {
		expect(
			fontWeightOf(
				<Label className="font-bold">
					<span>Email</span>
					<input type="email" />
				</Label>,
			),
		).toBe("700");
	});

	test("label wrapping a [contenteditable] element opts out", () => {
		expect(
			fontWeightOf(
				<Label>
					<span>Bio</span>
					<div contentEditable suppressContentEditableWarning>
						hello
					</div>
				</Label>,
			),
		).toBe("100");
	});

	test("nested control deeper than direct child still suppresses the default", () => {
		expect(
			fontWeightOf(
				<Label>
					<span>Email</span>
					<div>
						<div>
							<input type="email" />
						</div>
					</div>
				</Label>,
			),
		).toBe("100");
	});
});
