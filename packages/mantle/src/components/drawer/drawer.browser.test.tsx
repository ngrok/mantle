"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState } from "react";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { commands } from "vitest/browser";
import * as DropdownMenu from "../dropdown-menu/dropdown-menu-parts.js";
import * as Drawer from "./drawer-parts.js";

let styleElement: HTMLStyleElement;

beforeAll(async () => {
	styleElement = document.createElement("style");
	// Why all of mantle.css: the exit and enter of the panel read its animations.
	styleElement.textContent = await commands.tailwindCss(
		["./drawer.tsx", "../dialog/native-primitive.tsx", "../dropdown-menu/dropdown-menu.tsx"],
		{ mantleCss: true },
	);
	document.head.append(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

function Filters({
	dismissible,
	onOpenChange,
}: {
	dismissible?: boolean;
	onOpenChange?: (open: boolean) => void;
}) {
	return (
		<Drawer.Root dismissible={dismissible} onOpenChange={onOpenChange}>
			<Drawer.Trigger>Filters</Drawer.Trigger>
			<Drawer.Content>
				<Drawer.Header>
					<Drawer.Title>Filters</Drawer.Title>
				</Drawer.Header>
				<Drawer.Body>
					<input aria-label="Search" />
					<p>Status</p>
				</Drawer.Body>
				<Drawer.Footer>
					<Drawer.Close>Done</Drawer.Close>
				</Drawer.Footer>
			</Drawer.Content>
		</Drawer.Root>
	);
}

/** The panel inside an open drawer's `<dialog>`. */
function panelOf(dialog: HTMLElement): HTMLElement {
	const panel = dialog.querySelector("[data-slot='drawer-content']");
	if (!(panel instanceof HTMLElement)) {
		throw new Error("expected a drawer panel");
	}
	return panel;
}

/**
 * Drags the panel down from its grab handle by `distance` pixels, in steps.
 * Returns the release.
 */
function dragDown(panel: HTMLElement, distance: number) {
	const handle = panel.querySelector("[data-slot='drawer-handle']");
	if (!(handle instanceof HTMLElement)) {
		throw new Error("expected a drawer handle");
	}
	const { left, top, width } = handle.getBoundingClientRect();
	const x = left + width / 2;
	const base = { pointerId: 1, isPrimary: true, button: 0, bubbles: true, clientX: x };
	handle.dispatchEvent(new PointerEvent("pointerdown", { ...base, clientY: top }));
	const steps = 10;
	for (let step = 1; step <= steps; step++) {
		document.dispatchEvent(
			new PointerEvent("pointermove", { ...base, clientY: top + (distance * step) / steps }),
		);
	}
	return () =>
		document.dispatchEvent(new PointerEvent("pointerup", { ...base, clientY: top + distance }));
}

describe("Drawer", () => {
	test("opens as a modal named by its title, and a long drag down closes it", async () => {
		const user = userEvent.setup();
		render(<Filters />);
		const trigger = screen.getByRole("button", { name: "Filters" });
		await user.click(trigger);
		const dialog = await screen.findByRole("dialog", { name: "Filters" });
		expect(dialog.matches(":modal")).toBe(true);
		// Why: focus on the field would open the on-screen keyboard over the drawer.
		expect(document.activeElement).toBe(dialog);
		const panel = panelOf(dialog);

		const release = dragDown(panel, panel.offsetHeight * 0.6);
		// Why the swipe value: the scrim fades with the drag.
		expect(Number(dialog.style.getPropertyValue("--drawer-swipe"))).toBeGreaterThan(0.4);
		release();

		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
		expect(document.activeElement).toBe(trigger);
	});

	test("stays open after a long drag, Escape, and back when not dismissible", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(<Filters dismissible={false} onOpenChange={onOpenChange} />);
		await user.click(screen.getByRole("button", { name: "Filters" }));
		const dialog = await screen.findByRole("dialog", { name: "Filters" });
		const panel = panelOf(dialog);
		dragDown(panel, panel.offsetHeight * 0.8)();
		// Why: the drag turns off text selection, and the spring back restores it.
		expect(panel.style.userSelect).toBe("");
		await user.keyboard("{Escape}");
		// Why a `cancel` event: the back gesture sends it, with no Escape keydown.
		dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
		// Why the one call: the open. The drag, Escape, and back ask for no close.
		expect(onOpenChange.mock.calls).toEqual([[true]]);
		expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Done" }));
		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
	});

	test("goes back to rest when a controlled owner keeps it open after a long drag", async () => {
		render(
			<Drawer.Root open onOpenChange={() => {}}>
				<Drawer.Content aria-label="Edit">
					<Drawer.Body>Name</Drawer.Body>
				</Drawer.Content>
			</Drawer.Root>,
		);
		const dialog = await screen.findByRole("dialog", { name: "Edit" });
		const panel = panelOf(dialog);
		dragDown(panel, panel.offsetHeight * 0.8)();
		await waitFor(() => expect(dialog.style.getPropertyValue("--drawer-swipe")).toBe("0"));
		expect(panel.style.translate).toBe("");
		expect(dialog.matches(":modal")).toBe(true);
	});

	test("gives a press on a menu trigger in the header to the menu, not to a drag", async () => {
		const onSelect = vi.fn<() => void>();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(
			<Drawer.Root open onOpenChange={onOpenChange}>
				<Drawer.Content aria-label="Edit">
					<Drawer.Header>
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>Sort</DropdownMenu.Trigger>
							<DropdownMenu.Content>
								<DropdownMenu.Item>Name</DropdownMenu.Item>
								<DropdownMenu.Item onSelect={onSelect}>Date</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</Drawer.Header>
					<Drawer.Body style={{ minHeight: 300 }} />
				</Drawer.Content>
			</Drawer.Root>,
		);
		const dialog = await screen.findByRole("dialog", { name: "Edit" });
		await waitFor(() => expect(panelOf(dialog).getAnimations()).toHaveLength(0));
		const trigger = screen.getByRole("button", { name: "Sort" });
		const { left, top } = trigger.getBoundingClientRect();
		const base = { pointerId: 1, isPrimary: true, button: 0, bubbles: true, clientX: left + 4 };
		trigger.dispatchEvent(new PointerEvent("pointerdown", { ...base, clientY: top + 4 }));
		const item = await screen.findByRole("menuitem", { name: "Date" });
		const itemTop = item.getBoundingClientRect().top;
		for (let step = 1; step <= 10; step++) {
			document.dispatchEvent(
				new PointerEvent("pointermove", { ...base, clientY: top + ((itemTop - top) * step) / 10 }),
			);
		}
		item.dispatchEvent(new PointerEvent("pointerup", { ...base, clientY: itemTop + 4 }));

		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(panelOf(dialog).style.translate).toBe("");
	});

	test("reverses from where it is when a controlled owner reopens it during the exit", async () => {
		function Controlled() {
			const [open, setOpen] = useState(true);
			return (
				<>
					<button type="button" onClick={() => setOpen((value) => !value)}>
						Toggle
					</button>
					<Drawer.Root open={open} onOpenChange={setOpen}>
						<Drawer.Content aria-label="Edit">
							<Drawer.Body style={{ minHeight: 300 }}>Name</Drawer.Body>
						</Drawer.Content>
					</Drawer.Root>
				</>
			);
		}
		render(<Controlled />);
		const dialog = await screen.findByRole("dialog", { name: "Edit" });
		const panel = panelOf(dialog);
		const toggle = screen.getByRole("button", { name: "Toggle" });
		// Why wait: the enter must end, so the exit starts from rest.
		await waitFor(() => expect(panel.getAnimations()).toHaveLength(0));
		const rest = panel.getBoundingClientRect().top;

		toggle.click();
		await expect.poll(() => panel.getBoundingClientRect().top).toBeGreaterThan(rest);
		toggle.click();
		const tops: number[] = [];
		for (let frame = 0; frame < 4; frame++) {
			await new Promise(requestAnimationFrame);
			tops.push(panel.getBoundingClientRect().top);
		}

		// Why: an enter that starts over jumps to the closed pose, a full height down.
		expect(Math.max(...tops)).toBeLessThan(rest + panel.offsetHeight - 1);
		expect(tops.at(-1)).toBeLessThan(Math.max(...tops));
		await waitFor(() => expect(panel.getBoundingClientRect().top).toBe(rest));
	});

	test("stays on the bottom edge while a drag pulls it up", async () => {
		render(
			<Drawer.Root open>
				<Drawer.Content aria-label="Edit">
					<Drawer.Body>Name</Drawer.Body>
				</Drawer.Content>
			</Drawer.Root>,
		);
		const dialog = await screen.findByRole("dialog", { name: "Edit" });
		const panel = panelOf(dialog);
		await waitFor(() => expect(panel.getAnimations()).toHaveLength(0));
		const release = dragDown(panel, -120);
		expect(panel.getBoundingClientRect().bottom).toBeLessThan(innerHeight);

		// Why the hit test: a gap under the panel would show the page.
		const { left, width } = panel.getBoundingClientRect();
		expect(panel.contains(document.elementFromPoint(left + width / 2, innerHeight - 2))).toBe(true);
		release();
	});

	test("keeps the consumer's own inline styles through a drag", async () => {
		render(
			<Drawer.Root open>
				<Drawer.Content aria-label="Edit" style={{ userSelect: "none" }}>
					<Drawer.Body>Name</Drawer.Body>
				</Drawer.Content>
			</Drawer.Root>,
		);
		const panel = panelOf(await screen.findByRole("dialog", { name: "Edit" }));
		dragDown(panel, -24)();
		dragDown(panel, panel.offsetHeight * 0.1)();
		expect(panel.style.userSelect).toBe("none");
	});
});
