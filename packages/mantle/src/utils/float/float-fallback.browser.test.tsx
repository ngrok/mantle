import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { commands } from "vitest/browser";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

/**
 * Runs the floats in a browser with no popover API and no CSS anchor
 * positioning, such as Safari 16 or Chrome 113. Why a dynamic import: the
 * float reads both features once, when its module loads, so the test removes
 * them first.
 */
const popoverMethods = ["showPopover", "hidePopover", "togglePopover"] as const;
const savedMethods = popoverMethods.map((name) =>
	Object.getOwnPropertyDescriptor(HTMLElement.prototype, name),
);
for (const name of popoverMethods) {
	Reflect.deleteProperty(HTMLElement.prototype, name);
}
const supports = vi.spyOn(CSS, "supports").mockReturnValue(false);

const Popover = await import("../../components/popover/popover-parts.js");
const Tooltip = await import("../../components/tooltip/tooltip-parts.js");

let styleElement: HTMLStyleElement;

beforeAll(async () => {
	styleElement = document.createElement("style");
	styleElement.textContent = [
		// Why: Tailwind's preflight sets it.
		"*, ::before, ::after { box-sizing: border-box; border: 0 solid; }",
		// Why: an old browser does not know the attribute, so its own stylesheet
		// does not hide a `[popover]` that is not open. This browser does.
		"[popover]:not(:popover-open) { display: block; }",
		await commands.tailwindCss("./use-float.ts"),
		await commands.tailwindCss("../../components/popover/popover.tsx"),
		await commands.tailwindCss("../../components/tooltip/tooltip.tsx"),
	].join("\n");
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
	supports.mockRestore();
	popoverMethods.forEach((name, index) => {
		const descriptor = savedMethods[index];
		if (descriptor != null) {
			Object.defineProperty(HTMLElement.prototype, name, descriptor);
		}
	});
});

describe("a browser with no popover API and no anchor positioning", () => {
	test("shows a popover as a fixed box at the float tier, next to its trigger", async () => {
		const user = userEvent.setup();
		render(
			<div style={{ padding: 100 }}>
				<Popover.Root>
					<Popover.Trigger>Open</Popover.Trigger>
					<Popover.Content>
						<button type="button">Inside</button>
					</Popover.Content>
				</Popover.Root>
			</div>,
		);
		const trigger = screen.getByRole("button", { name: "Open" });

		await user.click(trigger);
		const content = await screen.findByRole("dialog");

		expect(content.checkVisibility()).toBe(true);
		const style = getComputedStyle(content);
		expect(style.position).toBe("fixed");
		expect(style.zIndex).toBe("50");
		await waitFor(() => expect(style.opacity).toBe("1"));
		// Below the trigger, `sideOffset` away, centered on it.
		const anchor = trigger.getBoundingClientRect();
		const box = content.getBoundingClientRect();
		expect(box.top).toBeCloseTo(anchor.bottom + 4, 0);
		expect((box.left + box.right) / 2).toBeCloseTo((anchor.left + anchor.right) / 2, 0);
		expect(screen.getByRole("button", { name: "Inside" })).toHaveFocus();
	});

	test("flips a popover above its trigger when only that side fits", async () => {
		const user = userEvent.setup();
		render(
			<div style={{ position: "fixed", bottom: 10, left: 100 }}>
				<Popover.Root>
					<Popover.Trigger>Open</Popover.Trigger>
					<Popover.Content>
						<p style={{ height: 120 }}>Tall content</p>
					</Popover.Content>
				</Popover.Root>
			</div>,
		);
		const trigger = screen.getByRole("button", { name: "Open" });

		await user.click(trigger);
		const content = await screen.findByRole("dialog");

		await waitFor(() => expect(content).toHaveAttribute("data-side", "top"));
		expect(content.getBoundingClientRect().bottom).toBeCloseTo(
			trigger.getBoundingClientRect().top - 4,
			0,
		);
	});

	test("closes a popover on Escape and on a press outside", async () => {
		const user = userEvent.setup();
		render(
			<>
				<button type="button">Elsewhere</button>
				<Popover.Root>
					<Popover.Trigger>Open</Popover.Trigger>
					<Popover.Content>Products</Popover.Content>
				</Popover.Root>
			</>,
		);
		const trigger = screen.getByRole("button", { name: "Open" });

		await user.click(trigger);
		await screen.findByRole("dialog");
		await user.keyboard("{Escape}");
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		await waitFor(() => expect(trigger).toHaveFocus());

		await user.click(trigger);
		await screen.findByRole("dialog");
		await user.click(screen.getByRole("button", { name: "Elsewhere" }));
		expect(trigger).toHaveAttribute("aria-expanded", "false");
	});

	test("shows a tooltip on hover, above its trigger", async () => {
		const user = userEvent.setup();
		render(
			<div style={{ padding: 100 }}>
				<Tooltip.Root>
					<Tooltip.Trigger>Help</Tooltip.Trigger>
					<Tooltip.Content>Opens the docs</Tooltip.Content>
				</Tooltip.Root>
			</div>,
		);
		const trigger = screen.getByRole("button", { name: "Help" });

		await user.hover(trigger);
		const tooltip = await screen.findByRole("tooltip");

		expect(tooltip.checkVisibility()).toBe(true);
		expect(getComputedStyle(tooltip).position).toBe("fixed");
		expect(tooltip).toHaveAttribute("data-side", "top");
		expect(tooltip.getBoundingClientRect().bottom).toBeLessThanOrEqual(
			trigger.getBoundingClientRect().top,
		);
	});
});
