"use client";

import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Select } from "./select.js";

/**
 * Mirrors the CSS Tailwind 4 emits for the one utility the wrapper spans carry,
 * plus a consumer override in the shape product code uses on the trigger
 * (`[&>span]:flex [&>span]:gap-2`) to lay the value out as a row. Inlined so
 * the test stays hermetic and needs no Tailwind build step.
 */
const STYLE = `
@layer utilities {
	.contents { display: contents; }
}
[data-slot~="select-value"] { display: flex; align-items: center; gap: 8px; }
`;

const GAP = 8;

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

/** The wrapper span the test is about, found by its slot inside the trigger. */
function wrapper(slot: string) {
	const element = screen.getByRole("combobox").querySelector(`[data-slot="${slot}"]`);
	if (element == null) {
		throw new Error(`No element carries data-slot="${slot}".`);
	}
	return element;
}

describe("Select wrapper span layout", () => {
	test("a consumer's children inside Select.Value stay flex items of the value node", async () => {
		render(
			<Select.Root value="apple">
				<Select.Trigger>
					<Select.Value placeholder="Select a fruit">
						<span data-testid="name">Apple</span>
						<span data-testid="hint">fruit</span>
					</Select.Value>
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="apple">Apple</Select.Item>
				</Select.Content>
			</Select.Root>,
		);

		// The proof that the label span generates no box: both children are flex
		// items of the value node, so its `gap` separates them. With a box on the
		// span they would be one inline run, laid out flush at 0px.
		expect(
			horizontalDistance(await screen.findByTestId("name"), screen.getByTestId("hint")),
		).toBeCloseTo(GAP, 0);
		expect(wrapper("select-value-label").getClientRects()).toHaveLength(0);
		expect(getComputedStyle(wrapper("select-value-label")).display).toBe("contents");
	});

	test("the portaled item label keeps the item's children as flex items of the value node", async () => {
		render(
			<Select.Root defaultValue="apple">
				<Select.Trigger>
					<Select.Value placeholder="Select a fruit" />
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="apple">
						<span data-testid="name">Apple</span>
						<span data-testid="hint">fruit</span>
					</Select.Item>
				</Select.Content>
			</Select.Root>,
		);

		// Radix portals the label span into the value node, so the same contract
		// holds for the copy the trigger shows.
		const name = await screen.findByTestId("name");
		expect(horizontalDistance(name, screen.getByTestId("hint"))).toBeCloseTo(GAP, 0);
		expect(wrapper("select-item-label").getClientRects()).toHaveLength(0);
		expect(getComputedStyle(wrapper("select-item-label")).display).toBe("contents");
	});

	test("the placeholder span generates no box", () => {
		render(
			<Select.Root>
				<Select.Trigger>
					<Select.Value placeholder="Select a fruit" />
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="apple">Apple</Select.Item>
				</Select.Content>
			</Select.Root>,
		);

		expect(wrapper("select-placeholder").getClientRects()).toHaveLength(0);
		expect(getComputedStyle(wrapper("select-placeholder")).display).toBe("contents");
	});
});
