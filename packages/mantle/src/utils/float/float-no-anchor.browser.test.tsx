import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { commands } from "vitest/browser";
import { afterAll, beforeAll, expect, test, vi } from "vitest";

/**
 * Runs a float in a browser with the popover API and no CSS anchor
 * positioning, such as Safari 18 or Firefox 140: the script places it. Why a
 * dynamic import: the float reads the feature once, when its module loads.
 */
const supports = vi.spyOn(CSS, "supports").mockReturnValue(false);
const Popover = await import("../../components/popover/popover-parts.js");

let styleElement: HTMLStyleElement;

beforeAll(async () => {
	styleElement = document.createElement("style");
	styleElement.textContent = [
		"*, ::before, ::after { box-sizing: border-box; border: 0 solid; }",
		await commands.tailwindCss("./use-float.ts"),
		await commands.tailwindCss("../../components/popover/popover.tsx"),
	].join("\n");
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
	supports.mockRestore();
});

test("the script places a popover in the top layer next to its trigger, and flips it", async () => {
	const user = userEvent.setup();
	render(
		<div style={{ position: "fixed", bottom: 10, left: 100 }}>
			<Popover.Root>
				<Popover.Trigger>Open</Popover.Trigger>
				<Popover.Content align="start">
					<p style={{ height: 120 }}>Tall content</p>
				</Popover.Content>
			</Popover.Root>
		</div>,
	);
	const trigger = screen.getByRole("button", { name: "Open" });

	await user.click(trigger);
	const content = await screen.findByRole("dialog");

	expect(content.matches(":popover-open")).toBe(true);
	expect(content.style.getPropertyValue("position-anchor")).toBe("");
	await waitFor(() => expect(content).toHaveAttribute("data-side", "top"));
	// Why: the open transition scales the box.
	await Promise.all(content.getAnimations().map((animation) => animation.finished));
	const anchor = trigger.getBoundingClientRect();
	const box = content.getBoundingClientRect();
	expect(box.bottom).toBeCloseTo(anchor.top - 4, 0);
	expect(box.left).toBeCloseTo(anchor.left, 0);
});
