"use client";

import { act, render, screen, waitFor } from "@testing-library/react";
import { useCallback, useState } from "react";
import { userEvent } from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { commands, page, server } from "vitest/browser";
import * as Dialog from "../dialog/dialog-parts.js";
import * as Drawer from "../drawer/drawer-parts.js";
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

	test("keeps a control that a bar child shows out of the Tab order under the drawer", async () => {
		await page.viewport(390, 844);
		await commands.emulateMedia({ hover: "none" });
		const user = userEvent.setup();
		render(
			<>
				<Reminder />
				<Sandbar.Root open>
					<Sandbar.Message>You have unsaved changes</Sandbar.Message>
					<button type="button" style={{ visibility: "visible" }}>
						Save
					</button>
				</Sandbar.Root>
			</>,
		);
		const save = screen.getByRole("button", { name: "Save" });
		await openDrawer(user);
		await waitFor(() =>
			expect(screen.queryByRole("group", { name: "You have unsaved changes" })).toBeNull(),
		);

		save.focus();
		expect(document.activeElement).not.toBe(save);
	});

	test("hides a Sandbar that holds the trigger while its drawer is open", async () => {
		await page.viewport(390, 844);
		await commands.emulateMedia({ hover: "none" });
		const user = userEvent.setup();
		render(
			<Sandbar.Root open>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
				<Reminder />
			</Sandbar.Root>,
		);
		const bar = () => screen.queryByRole("group", { name: "You have unsaved changes" });

		await openDrawer(user);
		await waitFor(() => expect(bar()).toBeNull());

		await user.click(screen.getByRole("button", { name: "Cancel" }));
		await waitFor(() => expect(bar()).toBeInTheDocument());
	});

	test("names a drawer that opens inside a dialog by its trigger", async () => {
		await page.viewport(390, 844);
		await commands.emulateMedia({ hover: "none" });
		const user = userEvent.setup();
		const { unmount } = render(<Reminder />);
		// Why: an open on the first render presents a drawer only once the module loaded.
		await openDrawer(user);
		unmount();

		render(
			<Dialog.Root open>
				<Dialog.Content aria-label="Settings">
					<Popover.Root presentation="auto" defaultOpen>
						<Popover.Trigger>Schedule</Popover.Trigger>
						<Popover.Content>Reminder</Popover.Content>
					</Popover.Root>
				</Dialog.Content>
			</Dialog.Root>,
		);

		const drawer = await screen.findByRole("dialog", { name: "Schedule" });
		expect(drawer.matches(":modal")).toBe(true);
	});

	test("does not open over a modal that covers its trigger", async () => {
		await page.viewport(390, 844);
		await commands.emulateMedia({ hover: "none" });
		const user = userEvent.setup();
		function Page() {
			const [open, setOpen] = useState(false);
			return (
				<>
					<Popover.Root presentation="auto" open={open} onOpenChange={setOpen}>
						<Popover.Trigger>Add reminder</Popover.Trigger>
						<Popover.Content>Reminder</Popover.Content>
					</Popover.Root>
					<Drawer.Root>
						<Drawer.Trigger>Filters</Drawer.Trigger>
						<Drawer.Content aria-label="Filters">
							<button type="button" onClick={() => setOpen(true)}>
								Remind me later
							</button>
						</Drawer.Content>
					</Drawer.Root>
				</>
			);
		}
		render(<Page />);
		await openDrawer(user);
		await user.click(screen.getByRole("button", { name: "Add reminder" }));
		await waitFor(() => expect(document.querySelector("dialog:modal")).toBeNull());

		await user.click(screen.getByRole("button", { name: "Filters" }));
		const filters = await screen.findByRole("dialog", { name: "Filters" });
		await user.click(screen.getByRole("button", { name: "Remind me later" }));

		expect(document.querySelectorAll("dialog:modal")).toHaveLength(1);
		expect(filters.contains(document.activeElement)).toBe(true);
	});

	test("does not mount open over a modal that covers its trigger", async () => {
		await page.viewport(390, 844);
		await commands.emulateMedia({ hover: "none" });
		const user = userEvent.setup();
		function Page() {
			const [mounted, setMounted] = useState(false);
			return (
				<>
					<Reminder />
					{mounted && (
						<Popover.Root presentation="auto" defaultOpen>
							<Popover.Trigger>Schedule</Popover.Trigger>
							<Popover.Content>Reminder</Popover.Content>
						</Popover.Root>
					)}
					<Drawer.Root>
						<Drawer.Trigger>Filters</Drawer.Trigger>
						<Drawer.Content aria-label="Filters">
							<button type="button" onClick={() => setMounted(true)}>
								Schedule later
							</button>
						</Drawer.Content>
					</Drawer.Root>
				</>
			);
		}
		render(<Page />);
		await openDrawer(user);
		await user.click(screen.getByRole("button", { name: "Add reminder" }));
		await waitFor(() => expect(document.querySelector("dialog:modal")).toBeNull());

		await user.click(screen.getByRole("button", { name: "Filters" }));
		const filters = await screen.findByRole("dialog", { name: "Filters" });
		await user.click(screen.getByRole("button", { name: "Schedule later" }));

		expect(document.querySelectorAll("dialog:modal")).toHaveLength(1);
		expect(filters.contains(document.activeElement)).toBe(true);
	});

	test("does not open over a native modal dialog", async () => {
		await page.viewport(390, 844);
		await commands.emulateMedia({ hover: "none" });
		const user = userEvent.setup();
		const control = { setOpen: (_open: boolean) => {} };
		function Background() {
			const [open, setOpen] = useState(false);
			control.setOpen = setOpen;
			return (
				<Popover.Root presentation="auto" open={open} onOpenChange={setOpen}>
					<Popover.Trigger>Schedule</Popover.Trigger>
					<Popover.Content>Reminder</Popover.Content>
				</Popover.Root>
			);
		}
		render(
			<>
				<Reminder />
				<Background />
				<dialog aria-label="Checkout">
					<button type="button">Pay</button>
				</dialog>
			</>,
		);
		await openDrawer(user);
		await user.click(screen.getByRole("button", { name: "Add reminder" }));
		await waitFor(() => expect(document.querySelector("dialog:modal")).toBeNull());
		const checkout = document.querySelector("dialog[aria-label='Checkout']");
		if (!(checkout instanceof HTMLDialogElement)) {
			throw new Error("expected the checkout dialog");
		}
		checkout.showModal();

		act(() => control.setOpen(true));

		expect(document.querySelectorAll("dialog:modal")).toHaveLength(1);
		expect(checkout.contains(document.activeElement)).toBe(true);
	});

	test("keeps a bar usable in a dialog over a drawer", async () => {
		await page.viewport(390, 844);
		await commands.emulateMedia({ hover: "none" });
		const user = userEvent.setup();
		function Page() {
			const [confirming, setConfirming] = useState(false);
			return (
				<>
					<Drawer.Root>
						<Drawer.Trigger>Filters</Drawer.Trigger>
						<Drawer.Content aria-label="Filters">
							<button type="button" onClick={() => setConfirming(true)}>
								Delete
							</button>
						</Drawer.Content>
					</Drawer.Root>
					<Dialog.Root open={confirming} onOpenChange={setConfirming}>
						<Dialog.Content aria-label="Confirm">Delete the filter?</Dialog.Content>
					</Dialog.Root>
					<Sandbar.Root open>
						<Sandbar.Message>You have unsaved changes</Sandbar.Message>
						<button type="button">Save</button>
					</Sandbar.Root>
				</>
			);
		}
		render(<Page />);
		await user.click(screen.getByRole("button", { name: "Filters" }));
		await screen.findByRole("dialog", { name: "Filters" });
		await user.click(screen.getByRole("button", { name: "Delete" }));
		const confirm = await screen.findByRole("dialog", { name: "Confirm" });
		const save = screen.getByRole("button", { name: "Save" });
		await waitFor(() => expect(confirm.contains(save)).toBe(true));

		save.focus();
		expect(document.activeElement).toBe(save);
	});

	test("names a drawer that reopens during its exit by its new trigger", async () => {
		await page.viewport(390, 844);
		await commands.emulateMedia({ hover: "none" });
		const user = userEvent.setup();
		const control = { setOpen: (_open: boolean) => {}, setId: (_id: string) => {} };
		function Renamed() {
			const [open, setOpen] = useState(false);
			const [id, setId] = useState("schedule");
			control.setOpen = setOpen;
			control.setId = setId;
			return (
				<Popover.Root presentation="auto" open={open} onOpenChange={setOpen}>
					<Popover.Trigger id={id}>{id === "schedule" ? "Schedule" : "Snooze"}</Popover.Trigger>
					<Popover.Content>Reminder</Popover.Content>
				</Popover.Root>
			);
		}
		render(
			<>
				<Reminder />
				<Renamed />
			</>,
		);
		// Why: an open presents a drawer only once the module loaded.
		await openDrawer(user);
		await user.click(screen.getByRole("button", { name: "Add reminder" }));
		act(() => control.setOpen(true));
		const drawer = await screen.findByRole("dialog", { name: "Schedule" });

		// Why wait: a close before the enter moves the panel has no exit.
		await waitFor(() => expect(drawer.getAnimations({ subtree: true })).toHaveLength(0));
		act(() => control.setOpen(false));
		expect(drawer).toHaveAttribute("data-closing");
		act(() => {
			control.setId("snooze");
			control.setOpen(true);
		});

		await waitFor(() => expect(drawer).toHaveAccessibleName("Snooze"));
	});

	test("hides a float of the bar that opens under the drawer", async () => {
		await page.viewport(390, 844);
		await commands.emulateMedia({ hover: "none" });
		const user = userEvent.setup();
		function Page() {
			const [open, setOpen] = useState(false);
			return (
				<>
					<Drawer.Root>
						<Drawer.Trigger>Filters</Drawer.Trigger>
						<Drawer.Content aria-label="Filters">
							<button type="button" onClick={() => setOpen(true)}>
								Show tips
							</button>
						</Drawer.Content>
					</Drawer.Root>
					<Sandbar.Root open>
						<Sandbar.Message>You have unsaved changes</Sandbar.Message>
						<Popover.Root open={open} onOpenChange={setOpen}>
							<Popover.Trigger>Tips</Popover.Trigger>
							<Popover.Content>
								<button type="button">Got it</button>
							</Popover.Content>
						</Popover.Root>
					</Sandbar.Root>
				</>
			);
		}
		render(<Page />);
		await user.click(screen.getByRole("button", { name: "Filters" }));
		await screen.findByRole("dialog", { name: "Filters" });
		await user.click(screen.getByRole("button", { name: "Show tips" }));

		const gotIt = await screen.findByText("Got it");
		await waitFor(() => {
			gotIt.focus();
			expect(document.activeElement).not.toBe(gotIt);
		});
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
		// Why the blur: a field that blurs to close the keyboard leaves focus on <body>.
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}

		await user.keyboard("{Escape}");
		await waitFor(() =>
			expect(document.querySelector("dialog[data-slot='drawer-positioner']")).toBeNull(),
		);
		expect(outer).toHaveAttribute("aria-expanded", "true");
	});

	test("keeps a consumer ref that measures the content attached once", async () => {
		await page.viewport(390, 844);
		await commands.emulateMedia({ hover: "none" });
		const user = userEvent.setup();
		const calls: (HTMLElement | null)[] = [];
		function Measured() {
			const [height, setHeight] = useState(0);
			const measure = useCallback((element: HTMLDivElement | null) => {
				calls.push(element);
				if (element != null) {
					setHeight(element.offsetHeight);
				}
			}, []);
			return (
				<Popover.Root presentation="auto">
					<Popover.Trigger>Add reminder</Popover.Trigger>
					<Popover.Content ref={measure}>Height {height}</Popover.Content>
				</Popover.Root>
			);
		}
		render(<Measured />);
		await openDrawer(user);

		expect(await screen.findByRole("dialog", { name: "Add reminder" })).toBeInTheDocument();
		expect(calls.filter((element) => element?.dataset.presentation === "drawer")).toHaveLength(1);
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
