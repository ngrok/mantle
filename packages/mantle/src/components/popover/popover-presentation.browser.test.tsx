"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { commands, page, server } from "vitest/browser";
import * as Sandbar from "../sandbar/sandbar-parts.js";
import * as Popover from "./popover-parts.js";

/** A popover that holds a small task, as `presentation="auto"` is for. */
function Reminder() {
	return (
		<Popover.Root presentation="auto">
			{/* Why an `id`: the drawer takes its name from the trigger's rendered `id`. */}
			<Popover.Trigger id="add-reminder">Add reminder</Popover.Trigger>
			<Popover.Content>
				<label>
					Remind me to <input defaultValue="Send the Q3 roadmap" />
				</label>
				<Popover.Close>Cancel</Popover.Close>
			</Popover.Content>
		</Popover.Root>
	);
}

/**
 * Opens the popover once the prefetch of the drawer module has loaded:
 * an open before the load presents as a popover by design, so the test
 * closes it and opens again until the open presents a drawer.
 */
async function openDrawer(user: ReturnType<typeof userEvent.setup>) {
	const trigger = screen.getByRole("button", { name: "Add reminder" });
	await expect
		.poll(async () => {
			if (trigger.getAttribute("aria-expanded") === "true") {
				await user.click(trigger);
			}
			await user.click(trigger);
			return document.querySelector("dialog[data-slot='drawer-positioner']:modal") != null;
		})
		.toBe(true);
	return trigger;
}

let styleElement: HTMLStyleElement;

beforeAll(async () => {
	styleElement = document.createElement("style");
	styleElement.textContent = [
		await commands.tailwindCss("./popover.tsx"),
		await commands.tailwindCss("./drawer.tsx"),
		await commands.tailwindCss("../drawer/drawer.tsx"),
		await commands.tailwindCss("../dialog/native-primitive.tsx"),
		await commands.tailwindCss("../sandbar/sandbar.tsx"),
	].join("\n");
	document.head.append(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

afterEach(async () => {
	await commands.emulateMedia({ hover: "hover" });
	await page.viewport(1280, 800);
});

// Why Chromium only: touch emulation, which sets `pointer: coarse`, is a CDP call.
describe.runIf(server.browser === "chromium")('Popover presentation="auto"', () => {
	test("presents a modal drawer on a phone, and returns focus to the trigger", async () => {
		await page.viewport(390, 844);
		await commands.emulateMedia({ hover: "none" });
		const user = userEvent.setup();
		render(<Reminder />);
		const trigger = await openDrawer(user);

		const drawer = await screen.findByRole("dialog", { name: "Add reminder" });
		expect(drawer.matches("dialog:modal")).toBe(true);
		expect(
			document.querySelector("[data-slot~='popover-content']")?.getAttribute("data-presentation"),
		).toBe("drawer");
		// Why: focus on the field would open the on-screen keyboard over the drawer.
		expect(document.activeElement).toBe(drawer);

		await user.click(screen.getByRole("button", { name: "Cancel" }));
		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
		expect(document.activeElement).toBe(trigger);
	});

	test("hides an open Sandbar while the drawer is open, and shows it after", async () => {
		await page.viewport(390, 844);
		await commands.emulateMedia({ hover: "none" });
		const user = userEvent.setup();
		render(
			<>
				<Reminder />
				<Sandbar.Root open>
					<Sandbar.Message>You have unsaved changes</Sandbar.Message>
				</Sandbar.Root>
			</>,
		);
		const bar = () => screen.queryByRole("group", { name: "You have unsaved changes" });
		expect(bar()).toBeInTheDocument();

		await openDrawer(user);
		// Why `invisible`: a hidden bar leaves the accessibility tree and the Tab order.
		await waitFor(() => expect(bar()).not.toBeInTheDocument());

		await user.click(screen.getByRole("button", { name: "Cancel" }));
		await waitFor(() => expect(bar()).toBeInTheDocument());
	});

	test("gives Escape to a drawer inside a popover, and keeps the popover open", async () => {
		await page.viewport(390, 844);
		await commands.emulateMedia({ hover: "none" });
		const user = userEvent.setup();
		render(
			<Popover.Root>
				<Popover.Trigger>Project</Popover.Trigger>
				<Popover.Content>
					<Reminder />
				</Popover.Content>
			</Popover.Root>,
		);
		const outer = screen.getByRole("button", { name: "Project" });
		await user.click(outer);
		await openDrawer(user);

		await user.keyboard("{Escape}");
		await waitFor(() =>
			expect(document.querySelector("dialog[data-slot='drawer-positioner']")).toBeNull(),
		);
		expect(outer).toHaveAttribute("aria-expanded", "true");
	});

	test("keeps the popover on a desktop", async () => {
		const user = userEvent.setup();
		render(<Reminder />);

		await user.click(screen.getByRole("button", { name: "Add reminder" }));

		const content = await screen.findByRole("dialog", { name: "Add reminder" });
		expect(content.getAttribute("data-presentation")).toBe("popover");
		expect(content.matches(":popover-open")).toBe(true);
	});
});
