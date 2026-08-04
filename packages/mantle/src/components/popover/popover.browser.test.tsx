"use client";

import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Popover } from "./popover.js";

/**
 * Mirrors the CSS Tailwind 4 emits for the utilities this file's geometry leans
 * on. We inline it instead of importing the full mantle stylesheet so the test
 * stays hermetic and needs no Tailwind build step.
 *
 * `.relative` is deliberately written as Tailwind's own utility rather than a
 * rule aimed at `[data-slot="popover-content"]`. The component has to emit the
 * class for the rule to match, so the assertion still fails if it stops doing so.
 */
const STYLE = `
@layer utilities {
	.relative { position: relative; }
}
[data-slot="popover-content"] {
	background: #fff;
	border: 1px solid #000;
	padding: 16px;
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

/** How far the arrow's base reaches past the content's outer edge, in pixels. */
function baseOverlap() {
	const arrow = document.querySelector("[data-slot='popover-arrow']");
	const content = document.querySelector("[data-slot='popover-content']");
	if (arrow == null || content == null) {
		throw new Error("expected an open Popover.Content with a Popover.Arrow inside it");
	}
	return arrow.getBoundingClientRect().right - content.getBoundingClientRect().left;
}

describe("Popover.Arrow", () => {
	test("keeps its offset when the content becomes a containing block", async () => {
		const user = userEvent.setup();
		render(
			<Popover.Root>
				<Popover.Trigger>Open</Popover.Trigger>
				<Popover.Content side="right">
					<Popover.Arrow />
					<p>Products moved up here</p>
				</Popover.Content>
			</Popover.Root>,
		);

		await user.click(screen.getByRole("button", { name: "Open" }));
		await screen.findByRole("dialog");
		const settled = baseOverlap();

		// The open animation scales the content, and a scale makes the element a
		// containing block for the arrow's absolutely-positioned wrapper. `scale: 1`
		// reproduces that with no visual change, so this isolates the containing
		// block from the motion. Without `relative` on the content, the wrapper's `0`
		// offset moves from the border box to the padding box and the arrow jumps by
		// the content's border width.
		const content = screen.getByRole("dialog");
		content.style.scale = "1";
		content.getBoundingClientRect();

		expect(baseOverlap()).toBeCloseTo(settled, 1);
	});

	test("overlaps the content's border so the two edges read as one line", async () => {
		const user = userEvent.setup();
		render(
			<Popover.Root>
				<Popover.Trigger>Open</Popover.Trigger>
				<Popover.Content side="right">
					<Popover.Arrow />
					<p>Products moved up here</p>
				</Popover.Content>
			</Popover.Root>,
		);

		await user.click(screen.getByRole("button", { name: "Open" }));
		await screen.findByRole("dialog");

		// One border width, so the arrow's fill covers the border across its base and
		// no line cuts the tip off the content. Less would leave that line showing.
		expect(baseOverlap()).toBeCloseTo(1, 1);
	});
});
