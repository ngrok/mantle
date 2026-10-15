import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ComponentProps, ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import type { ButtonIntent } from "../button/intents.js";
import { AlertDialog } from "./alert-dialog.js";

// AlertDialogIntent is not exported from the component module, so derive it
// from the Root props to stay in sync with the real union.
type AlertDialogIntent = ComponentProps<typeof AlertDialog.Root>["intent"];

/**
 * Renders an open AlertDialog with the given dialog `intent` (and optionally a
 * consumer-passed `actionIntent` on `AlertDialog.Action`), returning the
 * rendered action and cancel buttons.
 */
function renderAlertDialog({
	intent,
	actionIntent,
}: {
	intent: AlertDialogIntent;
	actionIntent?: ButtonIntent;
}) {
	render(
		<AlertDialog.Root intent={intent} open>
			<AlertDialog.Content>
				<AlertDialog.Body>
					<AlertDialog.Header>
						<AlertDialog.Title>Are you sure?</AlertDialog.Title>
						<AlertDialog.Description>This cannot be undone.</AlertDialog.Description>
					</AlertDialog.Header>
					<AlertDialog.Footer>
						<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
						<AlertDialog.Action intent={actionIntent}>Confirm</AlertDialog.Action>
					</AlertDialog.Footer>
				</AlertDialog.Body>
			</AlertDialog.Content>
		</AlertDialog.Root>,
	);

	return {
		action: screen.getByRole("button", { name: "Confirm" }),
		cancel: screen.getByRole("button", { name: "Cancel" }),
	};
}

/**
 * The rendered `AlertDialog.Icon` inside the open dialog, or `null` when it is
 * missing so the jest-dom matcher reports the absence.
 */
function getDialogIcon() {
	return screen.getByRole("alertdialog").querySelector('[data-slot~="alert-dialog-icon"]');
}

describe("AlertDialog", () => {
	test("the content is an alertdialog named by its title and described by its description", () => {
		renderAlertDialog({ intent: "danger" });
		const dialog = screen.getByRole("alertdialog", { name: "Are you sure?" });
		expect(dialog).toHaveAccessibleDescription("This cannot be undone.");
	});

	test("the content carries no aria-describedby when no Description is rendered", async () => {
		const user = userEvent.setup();
		render(
			<AlertDialog.Root intent="danger">
				<AlertDialog.Trigger>Delete</AlertDialog.Trigger>
				<AlertDialog.Content>
					<AlertDialog.Body>
						<AlertDialog.Header>
							<AlertDialog.Title>Delete this endpoint?</AlertDialog.Title>
						</AlertDialog.Header>
					</AlertDialog.Body>
				</AlertDialog.Content>
			</AlertDialog.Root>,
		);
		await user.click(screen.getByRole("button", { name: "Delete" }));

		const dialog = await screen.findByRole("alertdialog");
		expect(dialog).not.toHaveAttribute("aria-describedby");
	});

	test("an explicit aria-describedby on the content wins over the Radix default", async () => {
		const user = userEvent.setup();
		render(
			<AlertDialog.Root intent="danger">
				<AlertDialog.Trigger>Delete</AlertDialog.Trigger>
				<AlertDialog.Content aria-describedby="custom-description">
					<AlertDialog.Body>
						<AlertDialog.Header>
							<AlertDialog.Title>Delete this endpoint?</AlertDialog.Title>
							<p id="custom-description">Removes the endpoint for good.</p>
						</AlertDialog.Header>
					</AlertDialog.Body>
				</AlertDialog.Content>
			</AlertDialog.Root>,
		);
		await user.click(screen.getByRole("button", { name: "Delete" }));

		const dialog = await screen.findByRole("alertdialog");
		expect(dialog).toHaveAttribute("aria-describedby", "custom-description");
		expect(dialog).toHaveAccessibleDescription("Removes the endpoint for good.");
	});

	describe("dismissal", () => {
		function renderDismissible() {
			const handleOpenChange = vi.fn<(open: boolean) => void>();
			render(
				<AlertDialog.Root intent="danger" defaultOpen onOpenChange={handleOpenChange}>
					<AlertDialog.Content>
						<AlertDialog.Body>
							<AlertDialog.Header>
								<AlertDialog.Title>Delete this endpoint?</AlertDialog.Title>
							</AlertDialog.Header>
							<AlertDialog.Footer>
								<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
								<AlertDialog.Action>Delete</AlertDialog.Action>
							</AlertDialog.Footer>
						</AlertDialog.Body>
					</AlertDialog.Content>
				</AlertDialog.Root>,
			);
			return { handleOpenChange };
		}

		test("a pointer down on the backdrop does not close the dialog", async () => {
			const user = userEvent.setup();
			const { handleOpenChange } = renderDismissible();
			const overlay = document.querySelector('[data-slot="alert-dialog-overlay"]');
			expect(overlay).not.toBeNull();
			if (overlay == null) {
				return;
			}

			await user.pointer({ keys: "[MouseLeft]", target: overlay });

			expect(screen.getByRole("alertdialog")).toBeInTheDocument();
			expect(handleOpenChange).not.toHaveBeenCalled();
		});

		test("Escape still closes the dialog", async () => {
			const user = userEvent.setup();
			const { handleOpenChange } = renderDismissible();

			await user.keyboard("{Escape}");

			expect(handleOpenChange).toHaveBeenCalledTimes(1);
			expect(handleOpenChange).toHaveBeenLastCalledWith(false);
		});

		test("Cancel still closes the dialog", async () => {
			const user = userEvent.setup();
			const { handleOpenChange } = renderDismissible();

			await user.click(screen.getByRole("button", { name: "Cancel" }));

			expect(handleOpenChange).toHaveBeenCalledTimes(1);
			expect(handleOpenChange).toHaveBeenLastCalledWith(false);
		});
	});

	describe("Action", () => {
		/**
		 * `closeOnAction` wraps the action in `AlertDialog.Close`, the documented
		 * opt-in for dismiss-on-confirm.
		 */
		function renderConfirmFlow({ closeOnAction }: { closeOnAction: boolean }) {
			const handleOpenChange = vi.fn<(open: boolean) => void>();
			const handleConfirm = vi.fn<() => void>();
			const action = <AlertDialog.Action onClick={handleConfirm}>Delete</AlertDialog.Action>;
			render(
				<AlertDialog.Root intent="danger" defaultOpen onOpenChange={handleOpenChange}>
					<AlertDialog.Content>
						<AlertDialog.Body>
							<AlertDialog.Header>
								<AlertDialog.Title>Delete this endpoint?</AlertDialog.Title>
							</AlertDialog.Header>
							<AlertDialog.Footer>
								<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
								{closeOnAction ? <AlertDialog.Close asChild>{action}</AlertDialog.Close> : action}
							</AlertDialog.Footer>
						</AlertDialog.Body>
					</AlertDialog.Content>
				</AlertDialog.Root>,
			);
			return { handleOpenChange, handleConfirm };
		}

		test("runs its onClick and leaves the dialog open", async () => {
			const user = userEvent.setup();
			const { handleOpenChange, handleConfirm } = renderConfirmFlow({ closeOnAction: false });

			await user.click(screen.getByRole("button", { name: "Delete" }));

			expect(handleConfirm).toHaveBeenCalledTimes(1);
			// Why it stays open: an async destructive flow keeps showing its pending or
			// error state in the dialog it was launched from.
			expect(handleOpenChange).not.toHaveBeenCalled();
			expect(screen.getByRole("alertdialog")).toBeInTheDocument();
		});

		test("wrapped in AlertDialog.Close, it both confirms and dismisses", async () => {
			const user = userEvent.setup();
			const { handleOpenChange, handleConfirm } = renderConfirmFlow({ closeOnAction: true });

			await user.click(screen.getByRole("button", { name: "Delete" }));

			expect(handleConfirm).toHaveBeenCalledTimes(1);
			expect(handleOpenChange).toHaveBeenCalledTimes(1);
			expect(handleOpenChange).toHaveBeenLastCalledWith(false);
		});
	});

	describe("intent", () => {
		test(`Action derives a danger button from intent="danger"`, () => {
			const { action } = renderAlertDialog({ intent: "danger" });
			expect(action).toHaveAttribute("data-appearance", "filled");
			expect(action).toHaveAttribute("data-intent", "danger");
		});

		test(`Action derives a neutral button from intent="info"`, () => {
			const { action } = renderAlertDialog({ intent: "info" });
			expect(action).toHaveAttribute("data-appearance", "filled");
			expect(action).toHaveAttribute("data-intent", "neutral");
		});

		test("a consumer-passed Action intent wins over the derived one", () => {
			const { action } = renderAlertDialog({ intent: "danger", actionIntent: "neutral" });
			expect(action).toHaveAttribute("data-intent", "neutral");
		});

		test("Cancel renders outlined + neutral", () => {
			const { cancel } = renderAlertDialog({ intent: "danger" });
			expect(cancel).toHaveAttribute("data-appearance", "outlined");
			expect(cancel).toHaveAttribute("data-intent", "neutral");
		});
	});

	describe("Icon", () => {
		function renderWithIcon(intent: AlertDialogIntent, svg?: ReactNode) {
			render(
				<AlertDialog.Root intent={intent} open>
					<AlertDialog.Content>
						<AlertDialog.Icon svg={svg} />
						<AlertDialog.Body>
							<AlertDialog.Header>
								<AlertDialog.Title>Are you sure?</AlertDialog.Title>
							</AlertDialog.Header>
						</AlertDialog.Body>
					</AlertDialog.Content>
				</AlertDialog.Root>,
			);
		}

		test.each([
			{ intent: "danger", tone: "text-danger-600" },
			{ intent: "info", tone: "text-accent-600" },
		] as const)(`intent="$intent" tones the default glyph with $tone`, ({ intent, tone }) => {
			// Why a class assertion: the icon's tone has no data attribute, so the class
			// is the only observable implementation of the per-intent lookup.
			renderWithIcon(intent);
			expect(getDialogIcon()).toHaveClass(tone);
		});

		test("picks a different default glyph per intent", () => {
			renderWithIcon("danger");
			const dangerGlyph = getDialogIcon()?.innerHTML;
			cleanup();

			renderWithIcon("info");

			expect(getDialogIcon()?.innerHTML).not.toBe(dangerGlyph);
		});

		test("renders a custom svg in place of the intent default", () => {
			renderWithIcon("danger", <svg data-testid="custom-icon" />);
			expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
		});
	});

	test("a part rendered outside AlertDialog.Root fails fast", () => {
		// React logs the failed render before rethrowing.
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<AlertDialog.Action>Confirm</AlertDialog.Action>)).toThrow(
			"AlertDialog child component used outside of AlertDialog parent!",
		);
	});
});

/**
 * Type-level contracts, owned by `pnpm typecheck` and not by a `test()`. A
 * `@ts-expect-error` that compiles is the assertion; a runtime `expect` beside
 * it reads as coverage the vitest run does not have.
 */
export function typeLevelContracts() {
	return (
		// @ts-expect-error -- intent is required on AlertDialog.Root
		<AlertDialog.Root open>
			<AlertDialog.Content />
		</AlertDialog.Root>
	);
}
