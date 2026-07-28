"use client";

import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Field } from "./field.js";

/**
 * Mirrors the CSS Tailwind 4 emits for the three spacing utilities `Field`
 * relies on for vertical rhythm. We inline it instead of importing the full
 * mantle stylesheet so the test stays hermetic and doesn't require a Tailwind
 * build step in the test pipeline.
 *
 * Keep the escaped class selectors identical to the class names in `field.tsx`
 * — a rename or typo on either side stops the rule from matching, which is
 * exactly the regression these tests exist to catch. The numeric values are
 * inlined (vs. the `--spacing` var) so the test doesn't depend on the mantle
 * theme being loaded.
 */
const STYLE = `
@layer base, utilities;
/* Tailwind's preflight zeroes UA margins from a lower cascade layer, so a
   0-specificity utility still wins over it. */
@layer base {
	p { margin: 0; }
}
@layer utilities {
	.mb-1\\.5 { margin-bottom: 6px; }
	.mt-0 { margin-top: 0px; }
	.-my-0\\.5 { margin-top: -2px; margin-bottom: -2px; }
	.\\[\\:where\\(\\[data-slot\\=field-error-list\\]\\+\\&\\)\\]\\:-mt-1\\.5 {
		:where([data-slot=field-error-list]+&) {
			margin-top: -6px;
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

describe("Field vertical rhythm", () => {
	test("Field.Legend owns a 6px bottom margin because <legend> ignores the fieldset's flex gap", () => {
		render(
			<Field.Set>
				<Field.Legend data-testid="legend">Account</Field.Legend>
			</Field.Set>,
		);

		expect(getComputedStyle(screen.getByTestId("legend")).marginBottom).toBe("6px");
	});

	test("Field.HelpTrigger trims 2px off each side so it contributes 20px to the label row", () => {
		// Without the negative y-margin the 24px (`size-6`) `xs` IconButton
		// drives the LabelRow to 24px and pushes the 20px label text down 2px.
		render(
			<Field.Help defaultOpen={false}>
				<Field.HelpTrigger label="What is this?" />
				<Field.HelpContent>help body</Field.HelpContent>
			</Field.Help>,
		);

		const trigger = getComputedStyle(screen.getByRole("button", { name: "What is this?" }));
		expect(trigger.marginTop).toBe("-2px");
		expect(trigger.marginBottom).toBe("-2px");
	});

	test("Field.Description collapses the parent gap when it directly follows an error list", () => {
		render(
			<Field.Item name="email">
				<Field.ErrorList>
					<Field.ErrorItem>Email is required.</Field.ErrorItem>
				</Field.ErrorList>
				<Field.Description data-testid="desc">Use your work email.</Field.Description>
			</Field.Item>,
		);

		expect(getComputedStyle(screen.getByTestId("desc")).marginTop).toBe("-6px");
	});

	test("Field.Description keeps the parent gap when no error list precedes it", () => {
		render(
			<Field.Item name="email">
				<Field.Description data-testid="desc">Use your work email.</Field.Description>
			</Field.Item>,
		);

		expect(getComputedStyle(screen.getByTestId("desc")).marginTop).toBe("0px");
	});

	test("a caller margin utility beats the collapse rule's flattened specificity", () => {
		render(
			<Field.Item name="email">
				<Field.ErrorList>
					<Field.ErrorItem>Email is required.</Field.ErrorItem>
				</Field.ErrorList>
				<Field.Description className="mt-0" data-testid="desc">
					Use your work email.
				</Field.Description>
			</Field.Item>,
		);

		expect(getComputedStyle(screen.getByTestId("desc")).marginTop).toBe("0px");
	});
});
