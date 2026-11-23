import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, onTestFinished, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import * as Dialog from "../dialog/dialog-parts.js";
import * as Popover from "../popover/popover-parts.js";
import { OverlayPrompt } from "./overlay-prompt.js";

function Banner({ onAccept }: { onAccept: () => void }) {
	return (
		<OverlayPrompt>
			<div role="group" aria-label="Cookie preferences" style={{ position: "fixed", bottom: 0 }}>
				<button type="button" onClick={onAccept}>
					Accept all
				</button>
			</div>
		</OverlayPrompt>
	);
}

describe("OverlayPrompt over an open modal dialog", () => {
	test("takes a click without closing a dialog that opened before it mounted, and leaves on unmount", async () => {
		const onAccept = vi.fn<() => void>();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		const Page = ({ banner }: { banner: boolean }) => (
			<>
				<Dialog.Root open onOpenChange={onOpenChange}>
					<Dialog.Content>
						<Dialog.Title>Invite Team Member</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>
				{banner && <Banner onAccept={onAccept} />}
			</>
		);
		const view = render(<Page banner={false} />);
		const dialog = screen.getByRole("dialog", { name: "Invite Team Member" });
		await waitFor(() => expect(dialog.matches(":modal")).toBe(true));

		view.rerender(<Page banner />);
		// Why a real click: the browser sends no click to an inert element.
		await userEvent.click(screen.getByRole("button", { name: "Accept all" }));
		expect(onAccept).toHaveBeenCalledTimes(1);
		expect(onOpenChange).not.toHaveBeenCalled();

		view.rerender(<Page banner={false} />);
		expect(dialog.querySelector(".overlay-prompt")).toBeNull();
	});

	test("keeps a frame loaded while it moves into a dialog and back", async () => {
		const loads = vi.fn<() => void>();
		render(
			<>
				<OverlayPrompt>
					<iframe
						title="Chat"
						sandbox=""
						srcDoc="<p>Hi</p>"
						onLoad={loads}
						style={{ position: "fixed", right: 0, bottom: 0, width: 80, height: 60 }}
					/>
				</OverlayPrompt>
				<Dialog.Root>
					<Dialog.Trigger>Open</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Title>Details</Dialog.Title>
						<Dialog.CloseIconButton />
					</Dialog.Content>
				</Dialog.Root>
			</>,
		);
		await waitFor(() => expect(loads).toHaveBeenCalledTimes(1));
		const frame = screen.getByTitle("Chat");

		await userEvent.click(screen.getByRole("button", { name: "Open" }));
		const dialog = screen.getByRole("dialog", { name: "Details" });
		await waitFor(() => expect(dialog.contains(frame)).toBe(true));
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(frame.closest("dialog")).toBeNull());

		expect(loads).toHaveBeenCalledTimes(1);
	});

	test("opens a popover from the content in the dialog, and a dialog with no control in its panel keeps focus", async () => {
		const onPick = vi.fn<() => void>();
		render(
			<>
				<OverlayPrompt>
					<div style={{ position: "fixed", bottom: 0 }}>
						<Popover.Root>
							<Popover.Trigger>Manage</Popover.Trigger>
							<Popover.Content>
								<button type="button" onClick={onPick}>
									Analytics
								</button>
							</Popover.Content>
						</Popover.Root>
					</div>
				</OverlayPrompt>
				<Dialog.Root>
					<Dialog.Trigger>Open</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Title>Loading</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>
			</>,
		);
		await userEvent.click(screen.getByRole("button", { name: "Open" }));
		const dialog = screen.getByRole("dialog", { name: "Loading" });
		expect(dialog).toHaveFocus();

		await userEvent.click(screen.getByRole("button", { name: "Manage" }));
		await userEvent.click(await screen.findByRole("button", { name: "Analytics" }));
		expect(onPick).toHaveBeenCalledTimes(1);
		expect(dialog).toHaveAttribute("open");
	});

	test("a kept-mounted dialog with no control in its panel keeps focus", async () => {
		render(
			<>
				<Banner onAccept={() => {}} />
				<Dialog.Root>
					<Dialog.Trigger>Open</Dialog.Trigger>
					<Dialog.Content forceMount>
						<Dialog.Title>Loading</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>
			</>,
		);
		await userEvent.click(screen.getByRole("button", { name: "Open" }));
		const dialog = screen.getByRole("dialog", { name: "Loading" });

		await waitFor(() => expect(dialog).toHaveFocus());
	});

	test("a dialog composed in the content closes on a press on its backdrop", async () => {
		render(
			<OverlayPrompt>
				<Dialog.Root>
					<Dialog.Trigger>Open</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Title>Confirm</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>
			</OverlayPrompt>,
		);
		await userEvent.click(screen.getByRole("button", { name: "Open" }));
		const dialog = screen.getByRole("dialog", { name: "Confirm" });

		fireEvent.pointerDown(dialog);
		fireEvent.click(dialog);
		await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
	});

	test("a dialog composed in the content stays modal while another dialog opens above it", async () => {
		// Why: Safari has no `moveBefore`, and a plain move takes a dialog out of
		// the top layer.
		const proto = Element.prototype;
		const methods = Object.getOwnPropertyDescriptors(proto);
		Reflect.deleteProperty(proto, "moveBefore");
		onTestFinished(() => {
			Object.defineProperties(proto, methods);
		});
		const Page = ({ second }: { second: boolean }) => (
			<>
				<OverlayPrompt>
					<Dialog.Root defaultOpen>
						<Dialog.Content>
							<Dialog.Title>First</Dialog.Title>
						</Dialog.Content>
					</Dialog.Root>
				</OverlayPrompt>
				<Dialog.Root open={second}>
					<Dialog.Content>
						<Dialog.Title>Second</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>
			</>
		);
		const view = render(<Page second={false} />);
		const first = screen.getByRole("dialog", { name: "First" });
		await waitFor(() => expect(first.matches(":modal")).toBe(true));

		view.rerender(<Page second />);
		await waitFor(() =>
			expect(screen.getByRole("dialog", { name: "Second" }).matches(":modal")).toBe(true),
		);
		view.rerender(<Page second={false} />);

		await waitFor(() => expect(screen.queryByRole("dialog", { name: "Second" })).toBeNull());
		expect(first.matches(":modal")).toBe(true);
	});

	test("a dialog that opens from a popover in the lifted content shows, and the content stays above the dialog under it", async () => {
		// Why: Safari has no `moveBefore`, and a plain move closes a popover.
		const proto = Element.prototype;
		const methods = Object.getOwnPropertyDescriptors(proto);
		Reflect.deleteProperty(proto, "moveBefore");
		onTestFinished(() => {
			Object.defineProperties(proto, methods);
		});
		render(
			<>
				<Dialog.Root defaultOpen>
					<Dialog.Content>
						<Dialog.Title>Details</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>
				<OverlayPrompt>
					<Popover.Root>
						<Popover.Trigger>Manage</Popover.Trigger>
						<Popover.Content>
							<Dialog.Root>
								<Dialog.Trigger>Reset</Dialog.Trigger>
								<Dialog.Content>
									<Dialog.Title>Reset preferences?</Dialog.Title>
									<Dialog.CloseIconButton />
								</Dialog.Content>
							</Dialog.Root>
						</Popover.Content>
					</Popover.Root>
				</OverlayPrompt>
			</>,
		);
		const details = screen.getByRole("dialog", { name: "Details" });
		const manage = screen.getByRole("button", { name: "Manage" });
		await waitFor(() => expect(details.contains(manage)).toBe(true));

		await userEvent.click(manage);
		await userEvent.click(await screen.findByRole("button", { name: "Reset" }));
		const reset = screen.getByRole("dialog", { name: "Reset preferences?" });
		await waitFor(() => expect(reset.matches(":modal")).toBe(true));
		expect(reset.getClientRects().length).toBeGreaterThan(0);

		await userEvent.keyboard("{Escape}");
		await waitFor(() =>
			expect(screen.queryByRole("dialog", { name: "Reset preferences?" })).toBeNull(),
		);
		expect(details.contains(manage)).toBe(true);
	});

	test("a dialog with no control in its panel keeps focus from content that keeps a legacy `overlay-prompt` class", async () => {
		render(
			<>
				<OverlayPrompt>
					<button type="button" className="overlay-prompt">
						Accept all
					</button>
				</OverlayPrompt>
				<Dialog.Root>
					<Dialog.Trigger>Open</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Title>Loading</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>
			</>,
		);
		await userEvent.click(screen.getByRole("button", { name: "Open" }));

		await waitFor(() => expect(screen.getByRole("dialog", { name: "Loading" })).toHaveFocus());
	});

	test("goes home when the dialog it is in closes with a confirm from it still open", async () => {
		const Page = ({ open }: { open: boolean }) => (
			<>
				<Dialog.Root open={open}>
					<Dialog.Content>
						<Dialog.Title>Details</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>
				<OverlayPrompt>
					<Dialog.Root>
						<Dialog.Trigger>Reset</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Title>Reset preferences?</Dialog.Title>
						</Dialog.Content>
					</Dialog.Root>
				</OverlayPrompt>
			</>
		);
		const view = render(<Page open />);
		const reset = screen.getByRole("button", { name: "Reset" });
		await waitFor(() => expect(reset.closest("dialog")).not.toBeNull());
		await userEvent.click(reset);
		await waitFor(() =>
			expect(screen.getByRole("dialog", { name: "Reset preferences?" }).matches(":modal")).toBe(
				true,
			),
		);

		view.rerender(<Page open={false} />);

		await waitFor(() => expect(document.querySelector("dialog[open]")).toBeNull());
		await waitFor(() => expect(reset.closest("dialog")).toBeNull());
		expect(reset.isConnected).toBe(true);
	});
});
