"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { commands } from "vitest/browser";
import * as Popover from "./popover-parts.js";

/**
 * Mirrors the CSS Tailwind 4 emits for the utilities this file's geometry leans
 * on. We inline it instead of importing the full mantle stylesheet so the test
 * stays hermetic and needs no Tailwind build step.
 *
 * `.block` is written as Tailwind's own utility rather than a rule aimed at the
 * arrow. The arrow has to emit the class for the rule to match, and an inline
 * `svg` adds a line box that moves the tip off the edge.
 */
const STYLE = `
@layer utilities {
	.block { display: block; }
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
	test("keeps its offset through the open animation's scale", async () => {
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

		// The open animation scales the content. `scale: 1` sets the property with
		// no visual change, so this isolates the property from the motion. The
		// content is `fixed`, so it is the arrow's containing block either way.
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

describe("Popover.Content placement", () => {
	let placementStyle: HTMLStyleElement;

	beforeAll(async () => {
		placementStyle = document.createElement("style");
		placementStyle.textContent = await commands.tailwindCss("../../utils/float/use-float.ts");
		document.head.appendChild(placementStyle);
	});

	afterAll(() => {
		placementStyle.remove();
	});

	test("aligns to the trigger's start edge after it changes from center", async () => {
		const user = userEvent.setup();
		const Aligned = ({ align }: { align: "center" | "start" }) => (
			<div style={{ padding: 120 }}>
				<Popover.Root>
					<Popover.Trigger>Open</Popover.Trigger>
					<Popover.Content align={align}>
						<p style={{ width: 120 }}>Wider than the trigger</p>
					</Popover.Content>
				</Popover.Root>
			</div>
		);
		const { rerender } = render(<Aligned align="center" />);
		const trigger = screen.getByRole("button", { name: "Open" });
		await user.click(trigger);
		const content = await screen.findByRole("dialog");

		rerender(<Aligned align="start" />);

		await waitFor(() => {
			expect(content.getBoundingClientRect().left).toBeCloseTo(
				trigger.getBoundingClientRect().left,
				0,
			);
		});
	});

	test("aligns start to the trigger's right edge in a right-to-left document", async () => {
		const user = userEvent.setup();
		render(
			<div dir="rtl" style={{ padding: 120 }}>
				<Popover.Root>
					<Popover.Trigger>Open</Popover.Trigger>
					<Popover.Content align="start">
						<p style={{ width: 120 }}>Wider than the trigger</p>
					</Popover.Content>
				</Popover.Root>
			</div>,
		);
		const trigger = screen.getByRole("button", { name: "Open" });
		await user.click(trigger);
		const content = await screen.findByRole("dialog");

		await waitFor(() => {
			expect(content.getBoundingClientRect().right).toBeCloseTo(
				trigger.getBoundingClientRect().right,
				0,
			);
		});
	});

	test("stays next to its trigger while its exit transition plays", async () => {
		const user = userEvent.setup();
		render(
			<div style={{ padding: 120 }}>
				<Popover.Root>
					<Popover.Trigger>Open</Popover.Trigger>
					<Popover.Content>
						<Popover.Close>Done</Popover.Close>
					</Popover.Content>
				</Popover.Root>
			</div>,
		);
		const trigger = screen.getByRole("button", { name: "Open" });
		await user.click(trigger);
		const content = await screen.findByRole("dialog");
		await waitFor(() => expect(getComputedStyle(content).opacity).toBe("1"));
		const openTop = content.getBoundingClientRect().top;

		await user.click(screen.getByRole("button", { name: "Done" }));
		await new Promise(requestAnimationFrame);

		// Why only while painted: Chromium keeps a closing popover in the top
		// layer for its exit; Firefox and Safari hide it at once.
		const paintedTop = content.checkVisibility() ? content.getBoundingClientRect().top : openTop;
		expect(paintedTop).toBeCloseTo(openTop, 0);
	});

	test("takes pointer input when a modal menu turns off pointer events on the body", async () => {
		const user = userEvent.setup();
		render(
			<Popover.Root>
				<Popover.Trigger>Open</Popover.Trigger>
				<Popover.Content>
					<button type="button">Inside</button>
				</Popover.Content>
			</Popover.Root>,
		);
		await user.click(screen.getByRole("button", { name: "Open" }));
		const content = await screen.findByRole("dialog");
		document.body.style.pointerEvents = "none";
		try {
			expect(getComputedStyle(content).pointerEvents).toBe("auto");
		} finally {
			document.body.style.removeProperty("pointer-events");
		}
	});

	test("does not place the open content again when it renders again", async () => {
		const user = userEvent.setup();
		const tree = (label: string) => (
			<Popover.Root>
				<Popover.Trigger>Open</Popover.Trigger>
				<Popover.Content>
					<p>{label}</p>
				</Popover.Content>
			</Popover.Root>
		);
		const { rerender } = render(tree("First"));
		await user.click(screen.getByRole("button", { name: "Open" }));
		const content = await screen.findByRole("dialog");
		await waitFor(() => expect(getComputedStyle(content).opacity).toBe("1"));
		const styleWrites: MutationRecord[] = [];
		const observer = new MutationObserver((records) => styleWrites.push(...records));
		observer.observe(content, { attributeFilter: ["style"] });

		rerender(tree("Second"));
		await screen.findByText("Second");
		await new Promise(requestAnimationFrame);
		observer.disconnect();

		expect(styleWrites).toHaveLength(0);
	});
});
