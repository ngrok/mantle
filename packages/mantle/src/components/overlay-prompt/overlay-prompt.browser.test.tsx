import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import * as Dialog from "../dialog/dialog-parts.js";
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
});
