import { act, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, onTestFinished, test, vi } from "vitest";
import * as Popover from "../../components/popover/popover-parts.js";
import * as Sheet from "../../components/sheet/sheet-parts.js";

/**
 * Why its own file: the listeners for a covering frame stay on the document
 * for the life of the module. Only the first float that mounts in a file shows
 * that it adds them before Radix adds the listeners of its own layer.
 */
test("focus into a frame above a sheet leaves open the popover that holds the sheet", async () => {
	// Regression: a popover closes when focus leaves it, and it unmounts the
	// sheet with it. Its listener is on the document before the sheet opens.
	const user = userEvent.setup();
	// Cross-file spelling pin: tests load no Tailwind, so this restates the
	// `fixed` and `z-60` classes that the sheet positioner carries.
	const tierStyle = document.createElement("style");
	tierStyle.textContent = ".fixed { position: fixed; } .z-60 { z-index: 60; }";
	document.head.append(tierStyle);
	onTestFinished(() => tierStyle.remove());
	render(
		<Popover.Root defaultOpen>
			<Popover.Trigger>Billing</Popover.Trigger>
			<Popover.Content>
				<Sheet.Root>
					<Sheet.Trigger>Add card</Sheet.Trigger>
					<Sheet.Content>
						<Sheet.Header>
							<Sheet.TitleGroup>
								<Sheet.Title>Payment method</Sheet.Title>
							</Sheet.TitleGroup>
						</Sheet.Header>
						<Sheet.Body>
							<button type="button">Save</button>
						</Sheet.Body>
					</Sheet.Content>
				</Sheet.Root>
			</Popover.Content>
		</Popover.Root>,
	);
	await user.click(screen.getByRole("button", { name: "Add card" }));
	screen.getByRole("button", { name: "Save" }).focus();
	// A stand-in for a payment popup: a wrapper above every layer that holds a
	// frame. happy-dom lays nothing out, so the stub is the hit test.
	const popup = document.createElement("div");
	popup.style.cssText = "position: fixed; z-index: 2147483647; pointer-events: auto;";
	const frame = document.createElement("iframe");
	// Why `srcdoc`: happy-dom logs an error for a frame with no document of its own.
	frame.srcdoc = "";
	popup.append(frame);
	document.body.append(popup);
	onTestFinished(() => popup.remove());
	vi.spyOn(document, "elementFromPoint").mockReturnValue(frame);

	// Why `act`: a popover that closes on the focus move unmounts in the next render.
	act(() => frame.focus());

	expect(frame).toHaveFocus();
	expect(screen.getByText("Payment method")).toBeInTheDocument();
});
