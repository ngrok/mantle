"use client";

import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Button } from "./button.js";

/**
 * Mirrors the CSS Tailwind 4 emits for the utilities this test depends on. We
 * inline it instead of importing the mantle stylesheet so the test stays
 * hermetic and needs no Tailwind build step.
 *
 * Keep the selector form and the numeric values identical to Tailwind's output —
 * `gap-1.5` is `0.375rem`, which is `6px` at the default root font size.
 */
const STYLE = `
@layer utilities {
	.contents { display: contents; }
	.inline-flex { display: inline-flex; }
	.items-center { align-items: center; }
	.gap-1\\.5 { gap: 6px; }
	.order-last { order: 9999; }
	.shrink-0 { flex-shrink: 0; }
	.size-5 { width: 20px; height: 20px; }
	.max-w-48 { max-width: 192px; }
	.min-w-0 { min-width: 0; }
	.flex-1 { flex: 1 1 0%; }
	.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}
`;

const GAP = 6;

let styleElement: HTMLStyleElement;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

/** The horizontal distance between two elements laid out in a row. */
function horizontalDistance(left: Element, right: Element) {
	return right.getBoundingClientRect().left - left.getBoundingClientRect().right;
}

describe("Button label slot layout", () => {
	test("the button's gap falls between two children, not around them", () => {
		render(
			<Button appearance="filled" intent="neutral">
				<span data-testid="count">+3</span>
				<span data-testid="word">more</span>
			</Button>,
		);

		// The proof that the label slot generates no box: both children are flex
		// items of the button, so the container's `gap` separates them. With a box
		// on the slot they would be one flex item, laid out flush at 0px.
		expect(horizontalDistance(screen.getByTestId("count"), screen.getByTestId("word"))).toBeCloseTo(
			GAP,
			0,
		);
	});

	test("a leading icon slot and a trailing child icon both take the gap", () => {
		render(
			<Button appearance="filled" intent="neutral" icon={<PlusIcon data-testid="lead" />}>
				<span data-testid="word">Create endpoint</span>
				<CaretDownIcon data-testid="trail" />
			</Button>,
		);

		// A button with two icons lays out on one row with even spacing: the `icon`
		// slot is a flex item, and so is every child of the label slot.
		expect(horizontalDistance(screen.getByTestId("lead"), screen.getByTestId("word"))).toBeCloseTo(
			GAP,
			0,
		);
		expect(horizontalDistance(screen.getByTestId("word"), screen.getByTestId("trail"))).toBeCloseTo(
			GAP,
			0,
		);
	});

	test("iconPlacement='end' draws the icon slot after the label", () => {
		render(
			<Button
				appearance="filled"
				intent="neutral"
				icon={<CaretDownIcon data-testid="caret" />}
				iconPlacement="end"
			>
				<span data-testid="word">Show more</span>
			</Button>,
		);

		// `order-last` moves the icon visually without moving it in the DOM, which is
		// what keeps its `insertBefore` aimed at the label element.
		const caret = screen.getByTestId("caret");
		const word = screen.getByTestId("word");
		expect(horizontalDistance(word, caret)).toBeCloseTo(GAP, 0);
		expect(caret.compareDocumentPosition(word) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	test("a child label shrinks and truncates inside a width-constrained button", () => {
		render(
			<Button
				appearance="filled"
				intent="neutral"
				className="max-w-48 min-w-0"
				icon={<PlusIcon data-testid="lead" />}
			>
				<span data-testid="label" className="min-w-0 flex-1 truncate">
					A label far too long for the width of this button
				</span>
				<CaretDownIcon data-testid="trail" />
			</Button>,
		);

		// The shape ai-dashboard's access-key chip uses: a leading icon, a label that
		// absorbs the slack, and a trailing caret. `flex-1` and `min-w-0` only reach the
		// label while it is a flex item of the button, so a label slot that laid out a
		// box would drop both and the text would push past `max-w-48`.
		const label = screen.getByTestId("label");
		expect(screen.getByRole("button").getBoundingClientRect().width).toBeLessThanOrEqual(192);
		expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
		expect(getComputedStyle(label).textOverflow).toBe("ellipsis");
		// The icons keep their size while the label absorbs the shrink.
		expect(screen.getByTestId("lead").getBoundingClientRect().width).toBeCloseTo(20, 0);
		expect(screen.getByTestId("trail").getBoundingClientRect().width).toBeGreaterThan(0);
	});
});
