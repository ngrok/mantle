"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { TextArea } from "./text-area.js";

/**
 * Mirrors the CSS Tailwind 4 emits for the utilities `TextArea` uses for its
 * `appearance="monospaced"` variant, its height utilities, and its
 * `data-drag-over` state, paired with
 * Tailwind's built-in `data-drag-over:` presence variant. We inline it
 * instead of importing the full mantle stylesheet so the test stays hermetic
 * and doesn't require a Tailwind build step in the test pipeline.
 *
 * Keep the escaped class selectors identical to the class names in
 * `text-area.tsx`: a rename on either side stops the rule from matching, which
 * is what these tests exist to catch. Values are inlined (vs. theme vars) so
 * the test doesn't depend on the mantle theme being loaded.
 *
 * `.font-sans` is declared *before* `.font-mono` deliberately. Both selectors have
 * equal specificity, so if a caller's `font-sans` and the variant's `font-mono` ever
 * shipped together (i.e. if `cx`/tailwind-merge stopped deduping the font-family
 * group), later-declared `.font-mono` would win and the override test below would go
 * red. Declared the other way around, the caller wins by cascade alone and the test
 * could never observe a merge regression.
 */
const STYLE = `
@layer utilities {
	.font-sans { font-family: ui-sans-serif, sans-serif; }
	.font-mono { font-family: ui-monospace, monospace; }
	.field-sizing-content { field-sizing: content; }
	.max-h-60 { max-height: 15rem; }
	.min-h-24 { min-height: 6rem; }
	[class~="min-h-[calc(var(--_text-area-rows)*1lh+(--spacing(4)))]"] { min-height: calc(var(--_text-area-rows) * 1lh + 1rem); }
	.data-drag-over\\:border-dashed[data-drag-over] { border-style: dashed; }
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

describe("TextArea height", () => {
	// Why: the test page has no preflight, so the browser's padding, border, and box sizing would change each height.
	const style = { border: 0, boxSizing: "border-box", lineHeight: "20px", padding: 0 } as const;
	const height = (name: string) =>
		screen.getByRole("textbox", { name }).getBoundingClientRect().height;

	test("rows sets the minimum height, and a field without a valid rows is at least 6rem tall", () => {
		render(
			<>
				<TextArea aria-label="Feedback" style={style} />
				<TextArea aria-label="Zero rows" rows={0} style={style} />
				<TextArea aria-label="Not a number" rows={Number.NaN} style={style} />
				<TextArea aria-label="Prompt" rows={3} style={style} />
			</>,
		);

		expect(height("Feedback")).toBe(96);
		expect(height("Zero rows")).toBe(96);
		expect(height("Not a number")).toBe(96);
		// Three 20px lines and the 16px padding and border that the minimum height adds.
		expect(height("Prompt")).toBe(76);
	});

	test.skipIf(!CSS.supports("field-sizing", "content"))(
		"the field grows with its text past rows and stops at 15rem",
		() => {
			render(
				<>
					<TextArea aria-label="Three lines" rows={1} defaultValue={"1\n2\n3"} style={style} />
					<TextArea
						aria-label="Many lines"
						defaultValue={Array.from({ length: 20 }, (_, index) => index).join("\n")}
						style={style}
					/>
				</>,
			);

			expect(height("Three lines")).toBe(60);
			expect(height("Many lines")).toBe(240);
		},
	);
});
