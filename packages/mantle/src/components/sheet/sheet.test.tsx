import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "../dialog/dialog.js";
import { Sheet } from "./sheet.js";

describe("Sheet.Content", () => {
	describe("accessible description", () => {
		it("carries no aria-describedby when no Description is rendered", async () => {
			const user = userEvent.setup();
			render(
				<Sheet.Root>
					<Sheet.Trigger asChild>
						<button type="button">Open</button>
					</Sheet.Trigger>
					<Sheet.Content>
						<Sheet.Header>
							<Sheet.Title>Endpoint details</Sheet.Title>
						</Sheet.Header>
					</Sheet.Content>
				</Sheet.Root>,
			);
			await user.click(screen.getByRole("button", { name: "Open" }));

			const content = await screen.findByRole("dialog");
			expect(content).not.toHaveAttribute("aria-describedby");
		});

		it("points aria-describedby at the Description when one is rendered", async () => {
			const user = userEvent.setup();
			render(
				<Sheet.Root>
					<Sheet.Trigger asChild>
						<button type="button">Open</button>
					</Sheet.Trigger>
					<Sheet.Content>
						<Sheet.Header>
							<Sheet.Title>Endpoint details</Sheet.Title>
							<Sheet.Description>Traffic policy and edges for this endpoint.</Sheet.Description>
						</Sheet.Header>
					</Sheet.Content>
				</Sheet.Root>,
			);
			await user.click(screen.getByRole("button", { name: "Open" }));

			const content = await screen.findByRole("dialog");
			const description = screen.getByText("Traffic policy and edges for this endpoint.");
			expect(description.id).not.toBe("");
			expect(content).toHaveAttribute("aria-describedby", description.id);
			expect(content).toHaveAccessibleDescription("Traffic policy and edges for this endpoint.");
		});
	});
});

describe("Sheet dialog scope", () => {
	it("a Dialog.Trigger inside Sheet.Content opens the Dialog.Root above the sheet", async () => {
		// Why: a sheet is a Radix dialog, and a default-scope trigger binds to the
		// nearest one. The sheet's own scope keeps it out of that lookup.
		const user = userEvent.setup();
		const onSheetOpenChange = vi.fn<(open: boolean) => void>();
		render(
			<Dialog.Root>
				<Sheet.Root open onOpenChange={onSheetOpenChange}>
					<Sheet.Content>
						<Sheet.Header>
							<Sheet.Title>Filters</Sheet.Title>
						</Sheet.Header>
						<Dialog.Trigger>Open dialog</Dialog.Trigger>
					</Sheet.Content>
				</Sheet.Root>
				<Dialog.Content>
					<Dialog.Title>Confirm</Dialog.Title>
				</Dialog.Content>
			</Dialog.Root>,
		);
		const trigger = screen.getByRole("button", { name: "Open dialog" });

		await user.click(trigger);

		// Held from before the click: the open dialog marks the sheet and the
		// trigger `aria-hidden`, so a role query cannot reach them any more.
		const dialog = await screen.findByRole("dialog", { name: "Confirm" });
		expect(trigger).toHaveAttribute("aria-controls", dialog.id);
		expect(onSheetOpenChange).not.toHaveBeenCalled();
	});

	it("Sheet.Description under a Dialog.Root describes the sheet, not the dialog", () => {
		// Pins the primitive `Description` handing its props to the Radix part:
		// with the scope dropped there, the description registers with the outer
		// dialog and the sheet loses its `aria-describedby`.
		render(
			<Dialog.Root>
				<Sheet.Root open>
					<Sheet.Content>
						<Sheet.Header>
							<Sheet.Title>Endpoint details</Sheet.Title>
							<Sheet.Description>Traffic policy for this endpoint.</Sheet.Description>
						</Sheet.Header>
					</Sheet.Content>
				</Sheet.Root>
			</Dialog.Root>,
		);
		expect(screen.getByRole("dialog", { name: "Endpoint details" })).toHaveAccessibleDescription(
			"Traffic policy for this endpoint.",
		);
	});

	it("Sheet.Close closes the sheet", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(
			<Sheet.Root open onOpenChange={onOpenChange}>
				<Sheet.Content>
					<Sheet.Header>
						<Sheet.Title>Filters</Sheet.Title>
					</Sheet.Header>
					<Sheet.Close>Done</Sheet.Close>
				</Sheet.Content>
			</Sheet.Root>,
		);

		await user.click(screen.getByRole("button", { name: "Done" }));

		expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
	});

	it("Sheet.CloseIconButton closes the sheet", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(
			<Sheet.Root open onOpenChange={onOpenChange}>
				<Sheet.Content>
					<Sheet.Header>
						<Sheet.Title>Filters</Sheet.Title>
						<Sheet.CloseIconButton />
					</Sheet.Header>
				</Sheet.Content>
			</Sheet.Root>,
		);

		await user.click(screen.getByRole("button", { name: "Close Sheet" }));

		expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
	});
});
