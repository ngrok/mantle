"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { commands } from "vitest/browser";
import * as Drawer from "./drawer-parts.js";

let styleElement: HTMLStyleElement;

beforeAll(async () => {
	styleElement = document.createElement("style");
	styleElement.textContent = await commands.tailwindCss("./drawer.tsx");
	document.head.append(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

function Filters({ dismissible }: { dismissible?: boolean }) {
	return (
		<Drawer.Root dismissible={dismissible}>
			<Drawer.Trigger>Filters</Drawer.Trigger>
			<Drawer.Content>
				<Drawer.Header>
					<Drawer.Title>Filters</Drawer.Title>
				</Drawer.Header>
				<Drawer.Body>
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
		const panel = panelOf(dialog);

		const release = dragDown(panel, panel.offsetHeight * 0.6);
		// Why the swipe value: the scrim fades with the drag.
		expect(Number(dialog.style.getPropertyValue("--drawer-swipe"))).toBeGreaterThan(0.4);
		release();

		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
		expect(document.activeElement).toBe(trigger);
	});

	test("stays open after a long drag and Escape when not dismissible", async () => {
		const user = userEvent.setup();
		render(<Filters dismissible={false} />);
		await user.click(screen.getByRole("button", { name: "Filters" }));
		const dialog = await screen.findByRole("dialog", { name: "Filters" });
		const panel = panelOf(dialog);
		dragDown(panel, panel.offsetHeight * 0.8)();
		await user.keyboard("{Escape}");
		expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Done" }));
		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
	});
});
