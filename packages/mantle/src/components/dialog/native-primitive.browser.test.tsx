import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef, Profiler, type ReactNode, StrictMode, useEffect, useState } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, onTestFinished, test, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";
import * as AlertDialog from "../alert-dialog/alert-dialog-parts.js";
import * as DropdownMenu from "../dropdown-menu/dropdown-menu-parts.js";
import * as MultiSelect from "../multi-select/multi-select-parts.js";
import * as Popover from "../popover/popover-parts.js";
import * as Select from "../select/select-parts.js";
import * as Sheet from "../sheet/sheet-parts.js";
import { makeToast, Toaster } from "../toast/toast.js";
import * as Tooltip from "../tooltip/tooltip-parts.js";
import { TooltipProvider } from "../tooltip/tooltip.js";
import { LayerContainer } from "../../utils/layer-container/layer-container.js";
import * as Dialog from "./dialog-parts.js";

afterEach(async () => {
	// Why: Escape and clicks leave an open `<dialog>` in the top layer between tests.
	for (const dialog of document.querySelectorAll("dialog")) {
		dialog.close();
	}
	await Promise.resolve();
});

function ExampleDialog({
	children,
	forceMount,
	onOpenChange,
	open,
}: {
	children?: ReactNode;
	forceMount?: true;
	onOpenChange?: (open: boolean) => void;
	open?: boolean;
}) {
	return (
		<Dialog.Root onOpenChange={onOpenChange} open={open}>
			<Dialog.Trigger>Open dialog</Dialog.Trigger>
			<Dialog.Content forceMount={forceMount}>
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

describe("Dialog", () => {
	test("with forceMount, a tap opens the modal dialog with no React render, and Escape closes it", async () => {
		const onOpenChange = vi.fn<(open: boolean) => void>();
		const onRender = vi.fn<() => void>();
		render(
			<Profiler id="dialog" onRender={onRender}>
				<ExampleDialog forceMount onOpenChange={onOpenChange} />
			</Profiler>,
		);
		const trigger = screen.getByRole("button", { name: "Open dialog" });
		const panel = document.querySelector("[data-slot~='dialog-content']");
		onRender.mockClear();

		await userEvent.click(trigger);

		const dialog = screen.getByRole("dialog", { name: "Delete tunnel" });
		expect(dialog.matches(":modal")).toBe(true);
		expect(dialog).toHaveAccessibleDescription("The tunnel stops at once.");
		expect(panel).toHaveAttribute("data-open");
		expect(trigger).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByRole("button", { name: "Close Dialog" })).toHaveFocus();
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenLastCalledWith(true);
		expect(onRender).toHaveBeenCalledTimes(0);

		await userEvent.keyboard("{Escape}");

		await waitFor(() => expect(dialogElement().open).toBe(false));
		expect(panel).not.toHaveAttribute("data-open");
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(trigger).toHaveFocus();
		expect(onOpenChange).toHaveBeenCalledTimes(2);
		expect(onOpenChange).toHaveBeenLastCalledWith(false);
	});

	test("a tap mounts and opens the dialog, and Escape closes and unmounts it", async () => {
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(<ExampleDialog onOpenChange={onOpenChange} />);
		const trigger = screen.getByRole("button", { name: "Open dialog" });
		expect(document.querySelector("dialog")).toBeNull();

		await userEvent.click(trigger);

		const dialog = screen.getByRole("dialog", { name: "Delete tunnel" });
		expect(dialog.matches(":modal")).toBe(true);
		expect(trigger).toHaveAttribute("aria-expanded", "true");
		// The browser focuses the first focusable element.
		expect(screen.getByRole("button", { name: "Close Dialog" })).toHaveFocus();

		await userEvent.keyboard("{Escape}");

		await waitFor(() => expect(document.querySelector("dialog")).toBeNull());
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(trigger).toHaveFocus();
		// Why once each: the trigger's command reaches the dialog that the tap
		// mounted, and must not report the open a second time.
		expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
	});

	test("an autoFocus field takes focus when the dialog mounts on open, and the trigger gets it back", async () => {
		const { unmount } = render(
			<ExampleDialog>
				{/* oxlint-disable-next-line jsx-a11y/no-autofocus -- Why: the test covers React's `autoFocus`. */}
				<input aria-label="Name" autoFocus />
			</ExampleDialog>,
		);
		const trigger = screen.getByRole("button", { name: "Open dialog" });

		await userEvent.click(trigger);
		expect(screen.getByRole("textbox", { name: "Name" })).toHaveFocus();

		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(document.querySelector("dialog")).toBeNull());
		expect(trigger).toHaveFocus();

		// A controlled open with no tap.
		unmount();
		render(
			<ExampleDialog open>
				{/* oxlint-disable-next-line jsx-a11y/no-autofocus -- Why: the test covers React's `autoFocus`. */}
				<input aria-label="Name" autoFocus />
			</ExampleDialog>,
		);
		expect(screen.getByRole("textbox", { name: "Name" })).toHaveFocus();
	});

	test("the first button shows a focus ring after a hotkey open with no focused element", async () => {
		function HotkeyDialog() {
			const [open, setOpen] = useState(false);
			useEffect(() => {
				const onKeyDown = (event: KeyboardEvent) => event.key === "k" && setOpen(true);
				document.addEventListener("keydown", onKeyDown);
				return () => document.removeEventListener("keydown", onKeyDown);
			}, []);
			return <ExampleDialog open={open} onOpenChange={setOpen} />;
		}
		render(<HotkeyDialog />);
		await userEvent.click(document.body);
		expect(document.activeElement).toBe(document.body);

		await userEvent.keyboard("k");

		const close = screen.getByRole("button", { name: "Close Dialog" });
		expect(close).toHaveFocus();
		expect(close.matches(":focus-visible")).toBe(true);
	});

	test("the first button shows a focus ring after a keyboard open and none after a press", async () => {
		render(<ExampleDialog />);
		const trigger = screen.getByRole("button", { name: "Open dialog" });

		await userEvent.click(trigger);
		const close = screen.getByRole("button", { name: "Close Dialog" });
		expect(close).toHaveFocus();
		expect(close.matches(":focus-visible")).toBe(false);

		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(document.querySelector("dialog")).toBeNull());
		await userEvent.keyboard("{Enter}");
		expect(screen.getByRole("button", { name: "Close Dialog" }).matches(":focus-visible")).toBe(
			true,
		);
	});

	test("focus stays in the dialog when the focused button leaves the panel", async () => {
		function RetryDialog() {
			const [pending, setPending] = useState(false);
			return (
				<ExampleDialog open>
					{pending ? (
						<p>Loading</p>
					) : (
						<button type="button" onClick={() => setPending(true)}>
							Retry
						</button>
					)}
				</ExampleDialog>
			);
		}
		render(<RetryDialog />);
		await userEvent.click(screen.getByRole("button", { name: "Retry" }));

		await waitFor(() => expect(screen.getByText("Loading")).toBeInTheDocument());
		await waitFor(() => expect(dialogElement()).toHaveFocus());
	});

	test("Shift+Tab reaches the previous field when the field it leaves renders on blur", async () => {
		function ErrorOnBlurDialog() {
			const [error, setError] = useState(true);
			return (
				<ExampleDialog open>
					<input aria-label="Email" />
					<button type="button" onBlur={() => setError(false)}>
						Role
					</button>
					{error && <p>Choose a role.</p>}
				</ExampleDialog>
			);
		}
		// Why fake timers: the dialog takes focus back a task after a change, so a
		// check at once passes either way. Running the timers first makes it count.
		vi.useFakeTimers({ shouldAdvanceTime: true });
		onTestFinished(() => {
			vi.useRealTimers();
		});
		render(<ErrorOnBlurDialog />);
		screen.getByRole("button", { name: "Role" }).focus();

		await userEvent.keyboard("{Shift>}{Tab}{/Shift}");

		expect(screen.queryByText("Choose a role.")).toBeNull();
		await vi.runOnlyPendingTimersAsync();
		expect(screen.getByRole("textbox", { name: "Email" })).toHaveFocus();
	});

	test("the dialog stays modal with `data-closing` through its exit, then unmounts", async () => {
		const style = document.createElement("style");
		style.textContent = `
@keyframes test-exit { to { opacity: 0; } }
[data-slot~="dialog-content"][data-closing] { animation: test-exit 200ms; }
`;
		document.head.append(style);
		onTestFinished(() => style.remove());
		render(<ExampleDialog />);
		const trigger = screen.getByRole("button", { name: "Open dialog" });
		await userEvent.click(trigger);
		const dialog = dialogElement();
		const panel = document.querySelector("[data-slot~='dialog-content']");

		await userEvent.keyboard("{Escape}");

		expect(panel).not.toHaveAttribute("data-open");
		expect(dialog.matches(":modal")).toBe(true);
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		await waitFor(() => expect(dialog.isConnected).toBe(false));
		expect(trigger).toHaveFocus();
	});

	test("a dialog that is not modal leaves the page live, and closes on Escape and a press outside", async () => {
		render(
			<>
				<button type="button">Page button</button>
				<Dialog.Root modal={false}>
					<Dialog.Trigger>Open dialog</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Title>Payment</Dialog.Title>
						<button type="button">Pay</button>
					</Dialog.Content>
				</Dialog.Root>
			</>,
		);
		const trigger = screen.getByRole("button", { name: "Open dialog" });

		await userEvent.click(trigger);
		const dialog = dialogElement();
		expect(dialog.open).toBe(true);
		expect(dialog.matches(":modal")).toBe(false);
		expect(screen.getByRole("button", { name: "Page button" }).closest("[inert]")).toBeNull();

		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(document.querySelector("dialog")).toBeNull());

		await userEvent.click(trigger);
		await userEvent.click(screen.getByRole("button", { name: "Page button" }));
		await waitFor(() => expect(document.querySelector("dialog")).toBeNull());
	});

	test.each([false, true])(
		"a sheet with closedby closerequest (modal %s) stays open on a press outside, and closes on Escape and Sheet.Close",
		async (modal) => {
			const onOpenChange = vi.fn<(open: boolean) => void>();
			const onOutside = vi.fn<(event: Event) => void>();
			render(
				<>
					<button type="button">Page button</button>
					<Sheet.Root modal={modal} onOpenChange={onOpenChange}>
						<Sheet.Trigger>Open sheet</Sheet.Trigger>
						<Sheet.Content
							closedby="closerequest"
							onPointerDownOutside={onOutside}
							onInteractOutside={onOutside}
						>
							<Sheet.Title>Card</Sheet.Title>
							<input aria-label="Card number" />
							<Sheet.Close>Cancel</Sheet.Close>
						</Sheet.Content>
					</Sheet.Root>
				</>,
			);
			const trigger = screen.getByRole("button", { name: "Open sheet" });

			await userEvent.click(trigger);
			const dialog = dialogElement();
			expect(dialog).toHaveAttribute("closedby", "closerequest");
			onOpenChange.mockClear();
			if (modal) {
				fireEvent.pointerDown(dialog);
				fireEvent.click(dialog);
			} else {
				await userEvent.click(screen.getByRole("button", { name: "Page button" }));
			}
			expect(onOpenChange).not.toHaveBeenCalled();
			expect(onOutside).not.toHaveBeenCalled();
			expect(dialog.open).toBe(true);
			expect(dialog).toHaveAttribute("data-open");

			await userEvent.click(screen.getByRole("textbox", { name: "Card number" }));
			await userEvent.keyboard("{Escape}");
			await waitFor(() => expect(document.querySelector("dialog")).toBeNull());
			expect(onOpenChange).toHaveBeenLastCalledWith(false);

			await userEvent.click(trigger);
			await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
			await waitFor(() => expect(document.querySelector("dialog")).toBeNull());
		},
	);

	test("onOpenAutoFocus and onCloseAutoFocus get the panel as event.currentTarget", async () => {
		const targets: (EventTarget | null)[] = [];
		render(
			<Dialog.Root>
				<Dialog.Trigger>Open</Dialog.Trigger>
				<Dialog.Content
					onOpenAutoFocus={(event) => targets.push(event.currentTarget)}
					onCloseAutoFocus={(event) => targets.push(event.currentTarget)}
				>
					<Dialog.Title>Panel</Dialog.Title>
				</Dialog.Content>
			</Dialog.Root>,
		);
		await userEvent.click(screen.getByRole("button", { name: "Open" }));
		const panel = document.querySelector('[data-slot~="dialog-content"]');
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(targets).toHaveLength(2));
		expect(targets).toEqual([panel, panel]);
	});

	test("an onOpenAutoFocus that prevents the default leaves focus where it puts it", async () => {
		render(
			<Dialog.Root>
				<Dialog.Trigger>Open dialog</Dialog.Trigger>
				<Dialog.Content
					onOpenAutoFocus={(event) => {
						event.preventDefault();
						document.getElementById("query")?.focus();
					}}
				>
					<Dialog.Title>Search</Dialog.Title>
					<button type="button">First</button>
					<input id="query" aria-label="Query" />
				</Dialog.Content>
			</Dialog.Root>,
		);

		await userEvent.click(screen.getByRole("button", { name: "Open dialog" }));

		expect(screen.getByRole("textbox", { name: "Query" })).toHaveFocus();
	});

	// Why: Firefox opens Command's palette with focus on its input, and the
	// handler then focuses that same input.
	test("an onOpenAutoFocus that prevents the default and focuses the browser's pick keeps it", async () => {
		render(
			<Dialog.Root>
				<Dialog.Trigger>Open dialog</Dialog.Trigger>
				<Dialog.Content
					onOpenAutoFocus={(event) => {
						event.preventDefault();
						document.getElementById("query")?.focus();
					}}
				>
					<Dialog.Title>Search</Dialog.Title>
					<input id="query" aria-label="Query" />
				</Dialog.Content>
			</Dialog.Root>,
		);

		await userEvent.click(screen.getByRole("button", { name: "Open dialog" }));

		expect(screen.getByRole("textbox", { name: "Query" })).toHaveFocus();
	});

	test("an onOpenAutoFocus that prevents the default and moves no focus keeps focus off the browser's pick", async () => {
		render(
			<Dialog.Root>
				<Dialog.Trigger>Open dialog</Dialog.Trigger>
				<Dialog.Content onOpenAutoFocus={(event) => event.preventDefault()}>
					<Dialog.Title>Search</Dialog.Title>
					<input aria-label="Query" />
				</Dialog.Content>
			</Dialog.Root>,
		);

		await userEvent.click(screen.getByRole("button", { name: "Open dialog" }));

		expect(document.activeElement).toBe(dialogElement());
	});

	test("Dialog.Close and a click on the backdrop close it, and a click in the panel does not", async () => {
		render(<ExampleDialog>Body text</ExampleDialog>);
		const trigger = screen.getByRole("button", { name: "Open dialog" });

		await userEvent.click(trigger);
		await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
		await waitFor(() => expect(document.querySelector("dialog")).toBeNull());

		await userEvent.click(trigger);
		const dialog = dialogElement();
		fireEvent.pointerDown(screen.getByText("Body text"));
		fireEvent.click(dialog);
		expect(dialog.open).toBe(true);

		fireEvent.pointerDown(dialog);
		fireEvent.click(dialog);
		await waitFor(() => expect(dialog.open).toBe(false));
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
		await waitFor(() => expect(dialog.open).toBe(false));
		expect(onOpenChange).toHaveBeenCalledTimes(1);
	});

	test("with forceMount, a tap before hydration opens the dialog, and hydration takes over its state", async () => {
		const container = document.createElement("div");
		container.innerHTML = renderToString(<ExampleDialog forceMount />);
		document.body.append(container);
		const dialog = dialogElement();
		// Why `showModal()`: the trigger's `command="show-modal"` runs this on a tap before hydration.
		dialog.showModal();

		const onOpenChange = vi.fn<(open: boolean) => void>();
		const root = await act(async () =>
			hydrateRoot(container, <ExampleDialog forceMount onOpenChange={onOpenChange} />),
		);

		expect(container.querySelector("[data-slot~='dialog-content']")).toHaveAttribute(
			"data-open",
			"",
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
				<Dialog.Content forceMount ref={panelRef} className="own-panel" data-testid="panel">
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
		const dialog = dialogElement();
		expect(dialog.contains(toast)).toBe(true);

		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(dialog.contains(toast)).toBe(false));
		expect(document.body.contains(toast)).toBe(true);
	});

	test("a default-open dialog under StrictMode writes its open state", () => {
		render(
			<StrictMode>
				<Dialog.Root defaultOpen>
					<Dialog.Trigger>Open dialog</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Title>Delete tunnel</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>
			</StrictMode>,
		);
		expect(dialogElement().open).toBe(true);
		expect(dialogElement()).toHaveAttribute("data-open");
		expect(screen.getByText("Open dialog")).toHaveAttribute("aria-expanded", "true");
	});

	test("a trigger that mounts while the dialog is open shows the open state", () => {
		function LateTrigger({ withTrigger }: { withTrigger: boolean }) {
			return (
				<Dialog.Root open>
					{withTrigger && <Dialog.Trigger>Open dialog</Dialog.Trigger>}
					<Dialog.Content>
						<Dialog.Title>Delete tunnel</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>
			);
		}
		const { rerender } = render(<LateTrigger withTrigger={false} />);
		rerender(<LateTrigger withTrigger />);
		expect(screen.getByText("Open dialog")).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByText("Open dialog")).not.toHaveAttribute("data-open");
	});

	test("Content gives its aria-label, aria-labelledby, and aria-describedby to the <dialog>", () => {
		render(
			<Dialog.Root open>
				<Dialog.Content aria-labelledby="own-name" aria-describedby="own-help">
					<Dialog.Title>Delete tunnel</Dialog.Title>
					<p id="own-name">Own name</p>
					<p id="own-help">Own help</p>
				</Dialog.Content>
			</Dialog.Root>,
		);
		const dialog = screen.getByRole("dialog", { name: "Own name" });
		expect(dialog).toHaveAccessibleDescription("Own help");
		expect(document.querySelector("[data-mantle-modal-content]")).not.toHaveAttribute(
			"aria-labelledby",
		);
	});

	test("a controlled dialog stays open when a `method=dialog` form submits, and asks its owner", async () => {
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(
			<ExampleDialog open onOpenChange={onOpenChange}>
				<form method="dialog">
					<button type="submit">Submit</button>
				</form>
				<form method="dialog" onSubmit={(event) => event.preventDefault()}>
					<button type="submit">Invalid</button>
				</form>
			</ExampleDialog>,
		);
		await userEvent.click(screen.getByRole("button", { name: "Invalid" }));
		expect(onOpenChange).not.toHaveBeenCalled();
		await userEvent.click(screen.getByRole("button", { name: "Submit" }));
		expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
		expect(dialogElement().open).toBe(true);
	});

	test("focus goes back to the trigger when an open Content unmounts", async () => {
		function Unmounting() {
			const [shown, setShown] = useState(true);
			return (
				<Dialog.Root>
					<Dialog.Trigger>Open dialog</Dialog.Trigger>
					{shown && (
						<Dialog.Content>
							<Dialog.Title>Delete tunnel</Dialog.Title>
							<button type="button" onClick={() => setShown(false)}>
								Done
							</button>
						</Dialog.Content>
					)}
				</Dialog.Root>
			);
		}
		render(<Unmounting />);
		await userEvent.click(screen.getByRole("button", { name: "Open dialog" }));
		await userEvent.click(screen.getByRole("button", { name: "Done" }));
		await waitFor(() => expect(screen.getByRole("button", { name: "Open dialog" })).toHaveFocus());
	});

	test("Escape in a nested dialog closes it and leaves a controlled parent alone", async () => {
		const onOuterOpenChange = vi.fn<(open: boolean) => void>();
		render(
			<ExampleDialog open onOpenChange={onOuterOpenChange}>
				<Dialog.Root>
					<Dialog.Trigger>Open inner</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Title>Inner</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>
			</ExampleDialog>,
		);
		await userEvent.click(screen.getByRole("button", { name: "Open inner" }));
		const inner = screen.getByRole("dialog", { name: "Inner" });

		await userEvent.keyboard("{Escape}");

		await waitFor(() => expect(inner).not.toHaveAttribute("open"));
		expect(onOuterOpenChange).not.toHaveBeenCalled();
	});

	test("closing a controlled parent closes its open nested dialog first", async () => {
		function Nested({ open }: { open: boolean }) {
			return (
				<ExampleDialog open={open}>
					<Dialog.Root>
						<Dialog.Trigger>Open inner</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Title>Inner</Dialog.Title>
						</Dialog.Content>
					</Dialog.Root>
				</ExampleDialog>
			);
		}
		const { rerender } = render(<Nested open />);
		await userEvent.click(screen.getByRole("button", { name: "Open inner" }));
		const inner = screen.getByRole("dialog", { name: "Inner" });

		rerender(<Nested open={false} />);

		await waitFor(() => expect(document.querySelector("dialog:modal")).toBeNull());
		expect(inner).not.toHaveAttribute("open");
	});

	test("a Sheet.Close inside a nested dialog closes both", async () => {
		render(
			<Sheet.Root>
				<Sheet.Trigger>Open sheet</Sheet.Trigger>
				<Sheet.Content>
					<Sheet.Title>Edit</Sheet.Title>
					<Dialog.Root>
						<Dialog.Trigger>Open confirm</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Title>Discard changes?</Dialog.Title>
							<Sheet.Close>Discard</Sheet.Close>
						</Dialog.Content>
					</Dialog.Root>
				</Sheet.Content>
			</Sheet.Root>,
		);
		await userEvent.click(screen.getByRole("button", { name: "Open sheet" }));
		await userEvent.click(screen.getByRole("button", { name: "Open confirm" }));
		await userEvent.click(screen.getByRole("button", { name: "Discard" }));

		await waitFor(() => expect(document.querySelector("dialog[open]")).toBeNull());
		await waitFor(() => expect(screen.getByRole("button", { name: "Open sheet" })).toHaveFocus());
	});

	test("a Dialog.Trigger inside a Sheet.Content opens the Dialog.Root above the sheet", async () => {
		render(
			<Dialog.Root>
				<Sheet.Root open>
					<Sheet.Content>
						<Sheet.Title>Filters</Sheet.Title>
						<Dialog.Trigger>Open dialog</Dialog.Trigger>
					</Sheet.Content>
				</Sheet.Root>
				<Dialog.Content>
					<Dialog.Title>Confirm</Dialog.Title>
				</Dialog.Content>
			</Dialog.Root>,
		);
		await userEvent.click(screen.getByRole("button", { name: "Open dialog" }));
		expect(screen.getByRole("dialog", { name: "Confirm" }).matches(":modal")).toBe(true);
	});
});

/** Each overlay, rendered with a trigger and `children` in its body. */
const overlays = [
	{
		name: "Dialog",
		render: (children: ReactNode) => <ExampleDialog>{children}</ExampleDialog>,
		trigger: "Open dialog",
	},
	{
		name: "Sheet",
		render: (children: ReactNode) => (
			<Sheet.Root>
				<Sheet.Trigger>Open sheet</Sheet.Trigger>
				<Sheet.Content>
					<Sheet.Header>
						<Sheet.TitleGroup>
							<Sheet.Title>Navigation</Sheet.Title>
						</Sheet.TitleGroup>
					</Sheet.Header>
					<Sheet.Body>{children}</Sheet.Body>
				</Sheet.Content>
			</Sheet.Root>
		),
		trigger: "Open sheet",
	},
] as const;

/**
 * Each float, with the trigger that opens it and the content it shows. Each one
 * opens inside the overlay, so it must render in the `<dialog>`, take
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

describe("focus return on close", () => {
	// Why the real browser: happy-dom has no focus restore in `close()`, and
	// the dialog relies on it for the element that had focus at open.
	function ShortcutDialog({
		modal,
		onCloseAutoFocus,
	}: {
		modal?: false;
		onCloseAutoFocus?: (event: Event) => void;
	}) {
		const [isOpen, setIsOpen] = useState(false);
		const [hasShortcut, setHasShortcut] = useState(true);
		return (
			<>
				{hasShortcut && (
					<button type="button" onClick={() => setIsOpen(true)}>
						Shortcut
					</button>
				)}
				<input aria-label="Filter" />
				<Dialog.Root open={isOpen} onOpenChange={setIsOpen} modal={modal}>
					<Dialog.Trigger>Open dialog</Dialog.Trigger>
					<Dialog.Content onCloseAutoFocus={onCloseAutoFocus}>
						<Dialog.Title>Search</Dialog.Title>
						<button type="button" onClick={() => setHasShortcut(false)}>
							Remove shortcut
						</button>
					</Dialog.Content>
				</Dialog.Root>
			</>
		);
	}

	test("returns focus to the element focused at open, not the trigger", async () => {
		render(<ShortcutDialog />);
		await userEvent.click(screen.getByRole("button", { name: "Shortcut" }));
		await screen.findByRole("dialog", { name: "Search" });

		await userEvent.keyboard("{Escape}");

		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		expect(screen.getByRole("button", { name: "Shortcut" })).toHaveFocus();
	});

	test("falls back to the trigger when the element focused at open is gone", async () => {
		render(<ShortcutDialog />);
		await userEvent.click(screen.getByRole("button", { name: "Shortcut" }));
		await userEvent.click(await screen.findByRole("button", { name: "Remove shortcut" }));

		await userEvent.keyboard("{Escape}");

		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		expect(screen.getByRole("button", { name: "Open dialog" })).toHaveFocus();
	});

	test("a dialog that replaces an open one keeps the focus it takes", async () => {
		function Replace({ which }: { which: "a" | "b" }) {
			return which === "a" ? (
				<Dialog.Root key="a" defaultOpen>
					<Dialog.Content onCloseAutoFocus={(event) => event.preventDefault()}>
						<Dialog.Title>A</Dialog.Title>
						<button type="button">a</button>
					</Dialog.Content>
				</Dialog.Root>
			) : (
				<Dialog.Root key="b" defaultOpen>
					<Dialog.Content
						onOpenAutoFocus={(event) => {
							event.preventDefault();
							document.querySelector<HTMLInputElement>("#replacement")?.focus();
						}}
					>
						<Dialog.Title>B</Dialog.Title>
						<input id="replacement" aria-label="Replacement" />
					</Dialog.Content>
				</Dialog.Root>
			);
		}
		const { rerender } = render(<Replace which="a" />);

		rerender(<Replace which="b" />);
		// Why: the old dialog's focus return runs in a microtask after the commit.
		await act(async () => {});

		expect(screen.getByRole("textbox", { name: "Replacement" })).toHaveFocus();
	});

	test("returns no focus when onCloseAutoFocus prevents the default", async () => {
		const onCloseAutoFocus = vi.fn<(event: Event) => void>((event) => event.preventDefault());
		render(<ShortcutDialog onCloseAutoFocus={onCloseAutoFocus} />);
		await userEvent.click(screen.getByRole("button", { name: "Shortcut" }));
		await screen.findByRole("dialog", { name: "Search" });

		await userEvent.keyboard("{Escape}");

		await waitFor(() => expect(onCloseAutoFocus).toHaveBeenCalledTimes(1));
		expect(document.activeElement).toBe(document.body);
	});

	// Why: Chromium's `close()` returns no focus to a frame, such as a docs
	// preview that sends ⌘K to the page.
	test("returns focus to a frame that had focus at open", async () => {
		const frame = document.createElement("iframe");
		frame.srcdoc = "<button>Inside</button>";
		await new Promise((resolve) => {
			frame.addEventListener("load", resolve, { once: true });
			document.body.append(frame);
		});
		onTestFinished(() => frame.remove());
		// Why an event: a docs page opens its palette from a message the frame sends.
		function FrameDialog() {
			const [isOpen, setIsOpen] = useState(false);
			useEffect(() => {
				const openSearch = () => setIsOpen(true);
				window.addEventListener("open-search", openSearch);
				return () => window.removeEventListener("open-search", openSearch);
			}, []);
			return (
				<Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
					<Dialog.Content>
						<Dialog.Title>Search</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>
			);
		}
		render(<FrameDialog />);
		frame.contentDocument?.querySelector("button")?.focus();
		expect(document.activeElement).toBe(frame);
		act(() => {
			window.dispatchEvent(new Event("open-search"));
		});
		await screen.findByRole("dialog", { name: "Search" });

		await userEvent.keyboard("{Escape}");

		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await waitFor(() => expect(document.activeElement).toBe(frame));
	});

	test("keeps focus where the user moved it when a non-modal dialog closes", async () => {
		render(<ShortcutDialog modal={false} />);
		await userEvent.click(screen.getByRole("button", { name: "Shortcut" }));
		await screen.findByRole("dialog", { name: "Search" });

		await userEvent.click(screen.getByRole("textbox", { name: "Filter" }));

		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		expect(screen.getByRole("textbox", { name: "Filter" })).toHaveFocus();
	});
});

describe("state the DOM owns, hydration, and nesting", () => {
	test("with forceMount and no owner, Escape runs onEscapeKeyDown, which can keep it open", async () => {
		const onEscapeKeyDown = vi.fn<(event: KeyboardEvent) => void>((event) =>
			event.preventDefault(),
		);
		render(
			<Dialog.Root>
				<Dialog.Trigger>Open dialog</Dialog.Trigger>
				<Dialog.Content forceMount onEscapeKeyDown={onEscapeKeyDown}>
					<Dialog.Title>Kept</Dialog.Title>
					<button type="button">Inside</button>
				</Dialog.Content>
			</Dialog.Root>,
		);
		await userEvent.click(screen.getByRole("button", { name: "Open dialog" }));

		await userEvent.keyboard("{Escape}");

		expect(onEscapeKeyDown).toHaveBeenCalledTimes(1);
		expect(dialogElement().open).toBe(true);
	});

	test("with forceMount and no owner, a trigger open runs onOpenAutoFocus", async () => {
		render(
			<Dialog.Root>
				<Dialog.Trigger>Open dialog</Dialog.Trigger>
				<Dialog.Content
					forceMount
					onOpenAutoFocus={(event) => {
						event.preventDefault();
						document.getElementById("query")?.focus();
					}}
				>
					<Dialog.Title>Kept</Dialog.Title>
					<button type="button">First</button>
					<input id="query" aria-label="Query" />
				</Dialog.Content>
			</Dialog.Root>,
		);

		await userEvent.click(screen.getByRole("button", { name: "Open dialog" }));

		await waitFor(() => expect(screen.getByRole("textbox", { name: "Query" })).toHaveFocus());
	});

	test("a dialog that hydrates open runs onEscapeKeyDown", async () => {
		const onEscapeKeyDown = vi.fn<(event: KeyboardEvent) => void>((event) =>
			event.preventDefault(),
		);
		const tree = (
			<Dialog.Root defaultOpen>
				<Dialog.Content onEscapeKeyDown={onEscapeKeyDown}>
					<Dialog.Title>Hydrated</Dialog.Title>
				</Dialog.Content>
			</Dialog.Root>
		);
		const container = document.createElement("div");
		container.innerHTML = renderToString(tree);
		document.body.append(container);
		const root = await act(async () => hydrateRoot(container, tree));
		onTestFinished(() => {
			act(() => root.unmount());
			container.remove();
		});
		await screen.findByRole("dialog", { name: "Hydrated" });

		await userEvent.keyboard("{Escape}");

		expect(onEscapeKeyDown).toHaveBeenCalledTimes(1);
		expect(screen.getByRole("dialog", { name: "Hydrated" })).toBeInTheDocument();
	});

	test("a child that opens in a closed forceMount parent does not make the page inert", async () => {
		function Nested() {
			const [child, setChild] = useState(false);
			return (
				<>
					<button type="button" onClick={() => setChild(true)}>
						Open child
					</button>
					<Dialog.Root>
						<Dialog.Content forceMount>
							<Dialog.Title>Parent</Dialog.Title>
							<Dialog.Root open={child} onOpenChange={setChild}>
								<Dialog.Content>
									<Dialog.Title>Child</Dialog.Title>
								</Dialog.Content>
							</Dialog.Root>
						</Dialog.Content>
					</Dialog.Root>
				</>
			);
		}
		render(<Nested />);

		await userEvent.click(screen.getByRole("button", { name: "Open child" }));
		await act(async () => {
			await Promise.resolve();
		});

		expect(document.querySelector("dialog:modal")).toBeNull();
	});

	test("an open uses the props of the render that opens it", async () => {
		function Switching() {
			const [shown, setShown] = useState(false);
			return (
				<>
					<button type="button" onClick={() => setShown(true)}>
						Show
					</button>
					<Dialog.Root open={shown} onOpenChange={setShown} modal={!shown}>
						<Dialog.Content forceMount>
							<Dialog.Title>Switching</Dialog.Title>
						</Dialog.Content>
					</Dialog.Root>
				</>
			);
		}
		render(<Switching />);

		await userEvent.click(screen.getByRole("button", { name: "Show" }));

		await waitFor(() => expect(dialogElement().open).toBe(true));
		expect(dialogElement().matches(":modal")).toBe(false);
	});

	test("an onCloseAutoFocus that prevents the default and focuses the trigger keeps it there", async () => {
		render(
			<Dialog.Root>
				<Dialog.Trigger>Open dialog</Dialog.Trigger>
				<Dialog.Content
					onCloseAutoFocus={(event) => {
						event.preventDefault();
						screen.getByRole("button", { name: "Open dialog" }).focus();
					}}
				>
					<Dialog.Title>Close focus</Dialog.Title>
				</Dialog.Content>
			</Dialog.Root>,
		);
		await userEvent.click(screen.getByRole("button", { name: "Open dialog" }));
		await screen.findByRole("dialog", { name: "Close focus" });

		await userEvent.keyboard("{Escape}");

		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await waitFor(() => expect(screen.getByRole("button", { name: "Open dialog" })).toHaveFocus());
	});

	test("an open dialog that leaves the page runs onCloseAutoFocus", async () => {
		const onCloseAutoFocus = vi.fn<(event: Event) => void>();
		function Removable() {
			const [mounted, setMounted] = useState(true);
			return mounted ? (
				<Dialog.Root defaultOpen>
					<Dialog.Content onCloseAutoFocus={onCloseAutoFocus}>
						<Dialog.Title>Removable</Dialog.Title>
						<button type="button" onClick={() => setMounted(false)}>
							Remove
						</button>
					</Dialog.Content>
				</Dialog.Root>
			) : null;
		}
		render(<Removable />);

		await userEvent.click(await screen.findByRole("button", { name: "Remove" }));

		await waitFor(() => expect(onCloseAutoFocus).toHaveBeenCalledTimes(1));
	});

	test("a reopen during the exit keeps the dialog open", async () => {
		const style = document.createElement("style");
		style.textContent =
			"@keyframes exit { to { opacity: 0 } } [data-slot~='dialog-content'][data-closing] { animation: exit 200ms }";
		document.head.append(style);
		onTestFinished(() => style.remove());
		render(
			<Dialog.Root modal={false}>
				<Dialog.Trigger>Open dialog</Dialog.Trigger>
				<Dialog.Content forceMount>
					<Dialog.Title>Reopened</Dialog.Title>
					<Dialog.Close>Cancel</Dialog.Close>
				</Dialog.Content>
			</Dialog.Root>,
		);
		const trigger = screen.getByRole("button", { name: "Open dialog" });
		await userEvent.click(trigger);

		act(() => {
			screen.getByRole("button", { name: "Cancel" }).click();
			trigger.click();
		});
		await Promise.allSettled(
			dialogElement()
				.getAnimations({ subtree: true })
				.map((animation) => animation.finished),
		);
		await act(async () => {
			await Promise.resolve();
		});

		expect(dialogElement().open).toBe(true);
		expect(dialogElement()).toHaveAttribute("data-open", "");
		expect(dialogElement()).not.toHaveAttribute("data-closing");
	});

	test("nested default-open forceMount dialogs open parent first, so the child is on top", async () => {
		render(
			<Dialog.Root defaultOpen>
				<Dialog.Content forceMount>
					<Dialog.Title>Outer</Dialog.Title>
					<Dialog.Root defaultOpen>
						<Dialog.Content forceMount>
							<Dialog.Title>Inner</Dialog.Title>
							<button type="button">Inner button</button>
						</Dialog.Content>
					</Dialog.Root>
				</Dialog.Content>
			</Dialog.Root>,
		);

		await waitFor(() => expect(screen.getByRole("button", { name: "Inner button" })).toHaveFocus());
	});

	test("a non-modal dialog lets a press around the panel reach the page and close it", async () => {
		const style = document.createElement("style");
		style.textContent = [
			await commands.tailwindCss("./native-primitive.tsx"),
			await commands.tailwindCss("./dialog.tsx"),
			await commands.tailwindCss("./presentation.tsx"),
		].join("\n");
		document.head.append(style);
		onTestFinished(() => style.remove());
		const onPageClick = vi.fn<() => void>();
		render(
			<>
				<button
					type="button"
					onClick={onPageClick}
					style={{ position: "fixed", top: 24, left: 24 }}
				>
					Page button
				</button>
				<Dialog.Root defaultOpen modal={false}>
					<Dialog.Content>
						<Dialog.Title>Live page</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>
			</>,
		);
		const dialog = await screen.findByRole("dialog", { name: "Live page" });
		// The premise: the `<dialog>` spans the corner where the page button sits.
		const box = dialog.getBoundingClientRect();
		expect(box.left <= 24 && box.top <= 24).toBe(true);

		await userEvent.click(screen.getByRole("button", { name: "Page button" }));

		expect(onPageClick).toHaveBeenCalledTimes(1);
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
	});
});

describe("review round 2", () => {
	test("a trigger outside a closed forceMount parent does not open its child", async () => {
		render(
			<Sheet.Root>
				<Dialog.Root>
					<Dialog.Trigger>Open child</Dialog.Trigger>
					<Sheet.Content forceMount>
						<Sheet.Title>Parent</Sheet.Title>
						<Dialog.Content forceMount>
							<Dialog.Title>Child</Dialog.Title>
						</Dialog.Content>
					</Sheet.Content>
				</Dialog.Root>
			</Sheet.Root>,
		);

		await userEvent.click(screen.getByRole("button", { name: "Open child" }));

		expect(document.querySelector("dialog:modal")).toBeNull();
	});

	test("an asChild link trigger outside a closed forceMount parent does not open its child", async () => {
		render(
			<Sheet.Root>
				<Dialog.Root>
					<Dialog.Trigger asChild>
						<a href="#child">Open child</a>
					</Dialog.Trigger>
					<Sheet.Content forceMount>
						<Sheet.Title>Parent</Sheet.Title>
						<Dialog.Content forceMount>
							<Dialog.Title>Child</Dialog.Title>
						</Dialog.Content>
					</Sheet.Content>
				</Dialog.Root>
			</Sheet.Root>,
		);

		await userEvent.click(screen.getByRole("link", { name: "Open child" }));

		expect(document.querySelector("dialog:modal")).toBeNull();
	});

	test("a lazy child that could not open in a closed parent opens once the parent does", async () => {
		render(
			<Sheet.Root>
				<Sheet.Trigger>Open sheet</Sheet.Trigger>
				<Dialog.Root>
					<Dialog.Trigger>Open child outside</Dialog.Trigger>
					<Sheet.Content forceMount>
						<Sheet.Title>Parent</Sheet.Title>
						<Dialog.Trigger>Open child inside</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Title>Child</Dialog.Title>
						</Dialog.Content>
					</Sheet.Content>
				</Dialog.Root>
			</Sheet.Root>,
		);

		await userEvent.click(screen.getByRole("button", { name: "Open child outside" }));
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "Open child outside" })).toHaveAttribute(
				"aria-expanded",
				"false",
			),
		);
		await userEvent.click(screen.getByRole("button", { name: "Open sheet" }));
		await userEvent.click(await screen.findByRole("button", { name: "Open child inside" }));

		await waitFor(() =>
			expect(screen.getByRole("dialog", { name: "Child" }).matches(":modal")).toBe(true),
		);
	});

	test("a dialog that moves to a new portal target keeps its floats working", async () => {
		render(
			<LayerContainer>
				<Dialog.Root defaultOpen>
					<Dialog.Content>
						<Dialog.Title>Moved</Dialog.Title>
						<Popover.Root>
							<Popover.Trigger>Open float</Popover.Trigger>
							<Popover.Content>float content</Popover.Content>
						</Popover.Root>
					</Dialog.Content>
				</Dialog.Root>
			</LayerContainer>,
		);

		await userEvent.click(await screen.findByRole("button", { name: "Open float" }));

		await waitFor(() => expect(screen.getByText("float content")).toBeVisible());
	});

	test("a trigger outside an open non-modal dialog closes it", async () => {
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(
			<Dialog.Root modal={false} onOpenChange={onOpenChange}>
				<Dialog.Trigger>Toggle</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Title>Toggled</Dialog.Title>
				</Dialog.Content>
			</Dialog.Root>,
		);
		const trigger = screen.getByRole("button", { name: "Toggle" });

		await userEvent.click(trigger);
		await screen.findByRole("dialog", { name: "Toggled" });
		await userEvent.click(trigger);

		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
	});

	test("a press in a modal above a non-modal dialog leaves the non-modal dialog open", async () => {
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(
			<>
				<Dialog.Root defaultOpen modal={false} onOpenChange={onOpenChange}>
					<Dialog.Content>
						<Dialog.Title>Below</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>
				<Dialog.Root defaultOpen>
					<Dialog.Content>
						<Dialog.Title>Above</Dialog.Title>
						<button type="button">Inside above</button>
					</Dialog.Content>
				</Dialog.Root>
			</>,
		);

		await userEvent.click(await screen.findByRole("button", { name: "Inside above" }));

		expect(onOpenChange).not.toHaveBeenCalled();
	});

	test("an uncontrolled trigger of a non-modal dialog sends no modal command", () => {
		render(
			<Dialog.Root modal={false}>
				<Dialog.Trigger>Open</Dialog.Trigger>
				<Dialog.Content forceMount>
					<Dialog.Title>Live</Dialog.Title>
				</Dialog.Content>
			</Dialog.Root>,
		);

		expect(screen.getByRole("button", { name: "Open" })).not.toHaveAttribute("command");
	});
});

describe("a stack of three", () => {
	test("Dialog, Dialog, AlertDialog: Escape closes one layer at a time, each returns focus, and the page stays locked until the last closes", async () => {
		render(
			<Dialog.Root>
				<Dialog.Trigger>Open one</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Title>One</Dialog.Title>
					<Dialog.Root>
						<Dialog.Trigger>Open two</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Title>Two</Dialog.Title>
							<AlertDialog.Root intent="danger">
								<AlertDialog.Trigger>Open three</AlertDialog.Trigger>
								<AlertDialog.Content>
									<AlertDialog.Title>Three</AlertDialog.Title>
									<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
								</AlertDialog.Content>
							</AlertDialog.Root>
						</Dialog.Content>
					</Dialog.Root>
				</Dialog.Content>
			</Dialog.Root>,
		);
		const root = document.documentElement;
		const open = async (name: string) => {
			const trigger = screen.getByRole("button", { name });
			await userEvent.click(trigger);
			return trigger;
		};
		const one = await open("Open one");
		const two = await open("Open two");
		const three = await open("Open three");
		const top = screen.getByRole("alertdialog", { name: "Three" });
		expect(top.matches(":modal")).toBe(true);
		expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
		// Everything outside the top layer is inert, the dialogs under it too.
		expect(two.closest("dialog")?.contains(top)).toBe(true);
		two.focus();
		expect(two).not.toHaveFocus();

		for (const [trigger, name] of [
			[three, "Three"],
			[two, "Two"],
		] as const) {
			await userEvent.keyboard("{Escape}");
			await waitFor(() => expect(screen.queryByText(name)).toBeNull());
			expect(trigger).toHaveFocus();
			expect(root).toHaveAttribute("data-mantle-scroll-lock");
		}
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(document.querySelector("dialog")).toBeNull());
		expect(one).toHaveFocus();
		expect(root).not.toHaveAttribute("data-mantle-scroll-lock");
	});

	test("a panel that its owner makes inert stays inert after a dialog above it closes", async () => {
		const Page = ({ second }: { second: boolean }) => (
			<>
				<Dialog.Root open>
					<Dialog.Content inert>
						<Dialog.Title>Saving</Dialog.Title>
						<button type="button">Retry</button>
					</Dialog.Content>
				</Dialog.Root>
				<Dialog.Root open={second}>
					<Dialog.Content>
						<Dialog.Title>Second</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>
			</>
		);
		const view = render(<Page second={false} />);
		view.rerender(<Page second />);
		await waitFor(() =>
			expect(screen.getByRole("dialog", { name: "Second" }).matches(":modal")).toBe(true),
		);
		view.rerender(<Page second={false} />);
		await waitFor(() => expect(screen.queryByRole("dialog", { name: "Second" })).toBeNull());

		const retry = screen.getByText("Retry");
		expect(retry.closest("[inert]")).not.toBeNull();
	});

	test("a native close() of a kept-mounted dialog returns focus to the trigger that opened it", async () => {
		render(
			<Dialog.Root defaultOpen>
				<Dialog.Content>
					<Dialog.Title>One</Dialog.Title>
					<Dialog.Root>
						<Dialog.Trigger>First trigger</Dialog.Trigger>
						<Dialog.Trigger>Second trigger</Dialog.Trigger>
						<Dialog.Content forceMount>
							<Dialog.Title>Two</Dialog.Title>
							<button
								type="button"
								onClick={(event) => event.currentTarget.closest("dialog")?.close()}
							>
								Done
							</button>
						</Dialog.Content>
					</Dialog.Root>
				</Dialog.Content>
			</Dialog.Root>,
		);
		const second = screen.getByRole("button", { name: "Second trigger" });
		await userEvent.click(second);
		await waitFor(() =>
			expect(screen.getByRole("dialog", { name: "Two" }).matches(":modal")).toBe(true),
		);

		await userEvent.click(screen.getByRole("button", { name: "Done" }));

		await waitFor(() => expect(second).toHaveFocus());
	});
});

describe("Sheet positioning", () => {
	test("a popover in the sheet sits under its trigger once the slide ends", async () => {
		const style = document.createElement("style");
		style.textContent = [
			await commands.tailwindCss("./native-primitive.tsx"),
			await commands.tailwindCss("../sheet/sheet.tsx"),
			await commands.tailwindCss("../sheet/presentation.tsx"),
			await commands.tailwindCss("../../utils/float/use-float.ts"),
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
		// Why: the open transition scales the box.
		await Promise.all(content.getAnimations().map((animation) => animation.finished));

		const triggerRect = trigger.getBoundingClientRect();
		const contentRect = content.getBoundingClientRect();
		expect(Math.abs(contentRect.left - triggerRect.left)).toBeLessThan(2);
		expect(contentRect.top).toBeGreaterThanOrEqual(triggerRect.bottom);
		expect(contentRect.top - triggerRect.bottom).toBeLessThan(16);
	});
});

describe.each(overlays)("$name holding a float", (overlay) => {
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
			await waitFor(() => expect(dialog.open).toBe(false));
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
