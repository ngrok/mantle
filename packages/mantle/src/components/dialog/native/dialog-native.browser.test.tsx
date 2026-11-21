import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef, Profiler, type ReactNode, useState } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, onTestFinished, test, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";
import * as AlertDialog from "../../alert-dialog/alert-dialog-parts.js";
import * as DropdownMenu from "../../dropdown-menu/dropdown-menu-parts.js";
import * as MultiSelect from "../../multi-select/multi-select-parts.js";
import * as Popover from "../../popover/popover-parts.js";
import * as Select from "../../select/select-parts.js";
import * as SheetNative from "../../sheet/native/sheet-native-parts.js";
import { makeToast, Toaster } from "../../toast/toast.js";
import * as Tooltip from "../../tooltip/tooltip-parts.js";
import { TooltipProvider } from "../../tooltip/tooltip.js";
import * as Dialog from "./dialog-native-parts.js";

afterEach(async () => {
	// Why: Escape and clicks leave an open `<dialog>` in the top layer between tests.
	for (const dialog of document.querySelectorAll("dialog")) {
		dialog.close();
	}
	await Promise.resolve();
});

function ExampleDialog({
	children,
	onOpenChange,
	open,
}: {
	children?: ReactNode;
	onOpenChange?: (open: boolean) => void;
	open?: boolean;
}) {
	return (
		<Dialog.Root onOpenChange={onOpenChange} open={open}>
			<Dialog.Trigger>Open dialog</Dialog.Trigger>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Delete tunnel</Dialog.Title>
					<Dialog.Description>The tunnel stops at once.</Dialog.Description>
					<Dialog.CloseIconButton />
				</Dialog.Header>
				<Dialog.Body>{children}</Dialog.Body>
				<Dialog.Footer>
					<Dialog.Close>Cancel</Dialog.Close>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
	);
}

function dialogElement(): HTMLDialogElement {
	const dialog = document.querySelector("dialog");
	if (!(dialog instanceof HTMLDialogElement)) {
		throw new Error("no <dialog> rendered");
	}
	return dialog;
}

describe("Dialog (native)", () => {
	test("a tap opens the modal dialog with no React render, and Escape closes it", async () => {
		const onOpenChange = vi.fn<(open: boolean) => void>();
		const onRender = vi.fn<() => void>();
		render(
			<Profiler id="dialog" onRender={onRender}>
				<ExampleDialog onOpenChange={onOpenChange} />
			</Profiler>,
		);
		const trigger = screen.getByRole("button", { name: "Open dialog" });
		const panel = document.querySelector("[data-slot~='dialog-content']");
		onRender.mockClear();

		await userEvent.click(trigger);

		const dialog = screen.getByRole("dialog", { name: "Delete tunnel" });
		expect(dialog.matches(":modal")).toBe(true);
		expect(dialog).toHaveAccessibleDescription("The tunnel stops at once.");
		expect(panel).toHaveAttribute("data-state", "open");
		expect(trigger).toHaveAttribute("aria-expanded", "true");
		expect(trigger).toHaveAttribute("data-state", "open");
		expect(screen.getByRole("button", { name: "Close Dialog" })).toHaveFocus();
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenLastCalledWith(true);
		expect(onRender).toHaveBeenCalledTimes(0);

		await userEvent.keyboard("{Escape}");

		await waitFor(() => expect(panel).toHaveAttribute("data-state", "closed"));
		expect(dialogElement().open).toBe(false);
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(trigger).toHaveFocus();
		expect(onOpenChange).toHaveBeenCalledTimes(2);
		expect(onOpenChange).toHaveBeenLastCalledWith(false);
	});

	test("Dialog.Close and a click on the backdrop close it, and a click in the panel does not", async () => {
		render(<ExampleDialog>Body text</ExampleDialog>);
		const dialog = dialogElement();

		await userEvent.click(screen.getByRole("button", { name: "Open dialog" }));
		await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(dialog.open).toBe(false);

		await userEvent.click(screen.getByRole("button", { name: "Open dialog" }));
		fireEvent.pointerDown(screen.getByText("Body text"));
		fireEvent.click(dialog);
		expect(dialog.open).toBe(true);

		fireEvent.pointerDown(dialog);
		fireEvent.click(dialog);
		expect(dialog.open).toBe(false);
	});

	test("a controlled dialog asks its owner on Escape and moves with `open`", async () => {
		const onOpenChange = vi.fn<(open: boolean) => void>();
		const { rerender } = render(<ExampleDialog open onOpenChange={onOpenChange} />);
		const dialog = dialogElement();
		expect(dialog.open).toBe(true);
		expect(onOpenChange).toHaveBeenCalledTimes(0);

		await userEvent.keyboard("{Escape}");
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenLastCalledWith(false);
		expect(dialog.open).toBe(true);

		rerender(<ExampleDialog open={false} onOpenChange={onOpenChange} />);
		expect(dialog.open).toBe(false);
		await waitFor(() =>
			expect(document.querySelector("[data-slot~='dialog-content']")).toHaveAttribute(
				"data-state",
				"closed",
			),
		);
		expect(onOpenChange).toHaveBeenCalledTimes(1);
	});

	test("a tap before hydration opens the dialog, and hydration takes over its state", async () => {
		const container = document.createElement("div");
		container.innerHTML = renderToString(<ExampleDialog />);
		document.body.append(container);
		const dialog = dialogElement();
		// Why `showModal()`: the trigger's `command="show-modal"` runs this on a tap before hydration.
		dialog.showModal();

		const onOpenChange = vi.fn<(open: boolean) => void>();
		const root = await act(async () =>
			hydrateRoot(container, <ExampleDialog onOpenChange={onOpenChange} />),
		);

		expect(container.querySelector("[data-slot~='dialog-content']")).toHaveAttribute(
			"data-state",
			"open",
		);
		expect(container.querySelector("[data-slot~='dialog-trigger']")).toHaveAttribute(
			"aria-expanded",
			"true",
		);
		expect(onOpenChange).toHaveBeenLastCalledWith(true);
		act(() => root.unmount());
		container.remove();
	});

	test("Trigger asChild and Content pass slots, classes, and refs to the elements they render", () => {
		const panelRef = createRef<HTMLDivElement>();
		render(
			<Dialog.Root>
				<Dialog.Trigger asChild>
					<a href="#open" className="own-trigger">
						Open dialog
					</a>
				</Dialog.Trigger>
				<Dialog.Content ref={panelRef} className="own-panel" data-testid="panel">
					<Dialog.Title>Delete tunnel</Dialog.Title>
				</Dialog.Content>
			</Dialog.Root>,
		);
		const trigger = screen.getByText("Open dialog");
		expect(trigger).toHaveClass("own-trigger");
		expect(trigger).toHaveAttribute("data-slot", "dialog-trigger");
		expect(trigger).toHaveAttribute("aria-controls", dialogElement().id);
		expect(panelRef.current).toBe(screen.getByTestId("panel"));
		expect(panelRef.current).toHaveClass("own-panel");
		expect(panelRef.current).toHaveAttribute("data-slot", "dialog-content");
		expect(dialogElement()).toHaveAttribute("data-slot", "dialog-positioner");

		// Why a link: invoker commands work on a <button> only, so the click handler opens it.
		fireEvent.click(trigger);
		expect(dialogElement().open).toBe(true);
	});

	test("a toast fired from an open dialog paints in it, and goes back to <body> on close", async () => {
		render(
			<>
				<Toaster />
				<ExampleDialog>
					<button type="button" onClick={() => makeToast(<span>Tunnel deleted</span>)}>
						Delete
					</button>
				</ExampleDialog>
			</>,
		);
		await userEvent.click(screen.getByRole("button", { name: "Open dialog" }));
		await userEvent.click(screen.getByRole("button", { name: "Delete" }));

		const toast = await screen.findByText("Tunnel deleted");
		expect(dialogElement().contains(toast)).toBe(true);

		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(dialogElement().contains(toast)).toBe(false));
		expect(document.body.contains(toast)).toBe(true);
	});
});

/** Each native overlay, rendered with a trigger and `children` in its body. */
const overlays = [
	{
		name: "Dialog",
		render: (children: ReactNode) => <ExampleDialog>{children}</ExampleDialog>,
		trigger: "Open dialog",
	},
	{
		name: "Sheet",
		render: (children: ReactNode) => (
			<SheetNative.Root>
				<SheetNative.Trigger>Open sheet</SheetNative.Trigger>
				<SheetNative.Content>
					<SheetNative.Header>
						<SheetNative.TitleGroup>
							<SheetNative.Title>Navigation</SheetNative.Title>
						</SheetNative.TitleGroup>
					</SheetNative.Header>
					<SheetNative.Body>{children}</SheetNative.Body>
				</SheetNative.Content>
			</SheetNative.Root>
		),
		trigger: "Open sheet",
	},
] as const;

/**
 * Each float, with the trigger that opens it and the content it shows. Each one
 * opens inside the native overlay, so it must render in the `<dialog>`, take
 * the first Escape, and give focus back to its trigger.
 */
const floats = [
	{
		name: "Popover",
		render: () => (
			<Popover.Root>
				<Popover.Trigger>Open float</Popover.Trigger>
				<Popover.Content>
					<button type="button">float content</button>
				</Popover.Content>
			</Popover.Root>
		),
		trigger: () => screen.getByRole("button", { name: "Open float" }),
		content: () => screen.findByText("float content"),
	},
	{
		name: "DropdownMenu",
		render: () => (
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>Open float</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Item>float content</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		),
		trigger: () => screen.getByRole("button", { name: "Open float" }),
		content: () => screen.findByRole("menu"),
	},
	{
		name: "Select",
		render: () => (
			<Select.Root>
				<Select.Trigger aria-label="Open float" />
				<Select.Content>
					<Select.Item value="a">float content</Select.Item>
				</Select.Content>
			</Select.Root>
		),
		trigger: () => screen.getByRole("combobox", { name: "Open float" }),
		content: () => screen.findByRole("listbox"),
	},
	{
		name: "MultiSelect",
		render: () => (
			<MultiSelect.Root>
				<MultiSelect.Trigger aria-label="Open float">
					<MultiSelect.TagValues />
					<MultiSelect.Input placeholder="Pick" />
				</MultiSelect.Trigger>
				<MultiSelect.Content>
					<MultiSelect.Item value="a">float content</MultiSelect.Item>
				</MultiSelect.Content>
			</MultiSelect.Root>
		),
		trigger: () => screen.getByRole("combobox"),
		content: () => screen.findByRole("listbox"),
	},
	{
		name: "AlertDialog",
		render: () => (
			<AlertDialog.Root intent="danger">
				<AlertDialog.Trigger>Open float</AlertDialog.Trigger>
				<AlertDialog.Content>
					<AlertDialog.Body>
						<AlertDialog.Title>float content</AlertDialog.Title>
						<AlertDialog.Footer>
							<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
						</AlertDialog.Footer>
					</AlertDialog.Body>
				</AlertDialog.Content>
			</AlertDialog.Root>
		),
		trigger: () => screen.getByRole("button", { name: "Open float" }),
		content: () => screen.findByRole("alertdialog"),
	},
] as const;

describe("Sheet (native) positioning", () => {
	test("a popover in the sheet sits under its trigger once the slide ends", async () => {
		const style = document.createElement("style");
		style.textContent = [
			await commands.tailwindCss("../native-primitive.tsx"),
			await commands.tailwindCss("../../sheet/native/sheet-native.tsx"),
			await commands.tailwindCss("../../sheet/presentation.tsx"),
		].join("\n");
		document.head.append(style);
		onTestFinished(() => style.remove());
		render(
			overlays[1].render(
				<Popover.Root>
					<Popover.Trigger>Open float</Popover.Trigger>
					<Popover.Content side="bottom" align="start">
						float content
					</Popover.Content>
				</Popover.Root>,
			),
		);
		await userEvent.click(screen.getByRole("button", { name: "Open sheet" }));
		const panel = document.querySelector("[data-slot~='sheet-content']");
		await waitFor(() => expect(panel && getComputedStyle(panel).translate).toBe("none"));

		const trigger = screen.getByRole("button", { name: "Open float" });
		await userEvent.click(trigger);
		const content = await screen.findByText("float content");

		const triggerRect = trigger.getBoundingClientRect();
		const contentRect = content.getBoundingClientRect();
		expect(Math.abs(contentRect.left - triggerRect.left)).toBeLessThan(2);
		expect(contentRect.top).toBeGreaterThanOrEqual(triggerRect.bottom);
		expect(contentRect.top - triggerRect.bottom).toBeLessThan(16);
	});
});

describe.each(overlays)("$name (native) holding a float", (overlay) => {
	test.each(floats)(
		"$name opens in the <dialog>, takes the first Escape, and returns focus",
		async (float) => {
			render(overlay.render(float.render()));
			await userEvent.click(screen.getByRole("button", { name: overlay.trigger }));
			const dialog = dialogElement();
			const floatTrigger = float.trigger();

			await userEvent.click(floatTrigger);
			const content = await float.content();
			expect(dialog.contains(content)).toBe(true);

			await userEvent.keyboard("{Escape}");
			await waitFor(() => expect(content.isConnected && content.checkVisibility()).toBe(false));
			expect(dialog.open).toBe(true);
			await waitFor(() => expect(floatTrigger).toHaveFocus());

			await userEvent.keyboard("{Escape}");
			expect(dialog.open).toBe(false);
		},
	);

	test("a Tooltip shows in the <dialog>", async () => {
		function Tip() {
			const [open, setOpen] = useState(false);
			return (
				<TooltipProvider>
					<Tooltip.Root open={open} onOpenChange={setOpen}>
						<Tooltip.Trigger onFocus={() => setOpen(true)}>Hint</Tooltip.Trigger>
						<Tooltip.Content>tooltip content</Tooltip.Content>
					</Tooltip.Root>
				</TooltipProvider>
			);
		}
		render(overlay.render(<Tip />));
		await userEvent.click(screen.getByRole("button", { name: overlay.trigger }));
		await userEvent.hover(screen.getByRole("button", { name: "Hint" }));

		const contents = await screen.findAllByText("tooltip content");
		expect(contents.every((element) => dialogElement().contains(element))).toBe(true);
	});
});
