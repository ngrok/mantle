import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ComponentProps, ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import { Button } from "../button/button.js";
import type { ButtonIntent } from "../button/intents.js";
import { AlertDialog } from "./alert-dialog.js";

// AlertDialogIntent is not exported from the component module, so derive it
// from the Root props to stay in sync with the real union.
type AlertDialogIntent = ComponentProps<typeof AlertDialog.Root>["intent"];

/**
 * Type-level contract, owned by `pnpm typecheck` rather than vitest: making
 * `intent` optional on `AlertDialog.Root` turns the directive below into an
 * unused `@ts-expect-error`, which is a compile error. It is deliberately not a
 * `test()` — no runtime assertion can observe a type, and a constant-true
 * `expect` would only claim otherwise.
 */
void (
	(
		// @ts-expect-error -- intent is required on AlertDialog.Root
		<AlertDialog.Root open>
			<AlertDialog.Content />
		</AlertDialog.Root>
	)
);

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
 * The realistic uncontrolled flow: a trigger opens the dialog, `Cancel`
 * dismisses it, and `Action` runs the destructive operation. `closeOnAction`
 * wraps the action in `AlertDialog.Close`, the documented opt-in for
 * dismiss-on-confirm.
 */
function ConfirmFlow({
	closeOnAction = false,
	onConfirm,
}: {
	closeOnAction?: boolean;
	onConfirm: () => void;
}) {
	const action = <AlertDialog.Action onClick={onConfirm}>Delete endpoint</AlertDialog.Action>;

	return (
		<AlertDialog.Root intent="danger">
			<AlertDialog.Trigger asChild>
				<Button type="button" appearance="outlined" intent="neutral">
					Delete
				</Button>
			</AlertDialog.Trigger>
			<AlertDialog.Content>
				<AlertDialog.Icon />
				<AlertDialog.Body>
					<AlertDialog.Header>
						<AlertDialog.Title>Are you sure?</AlertDialog.Title>
						<AlertDialog.Description>This cannot be undone.</AlertDialog.Description>
					</AlertDialog.Header>
					<AlertDialog.Footer>
						<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
						{closeOnAction ? <AlertDialog.Close asChild>{action}</AlertDialog.Close> : action}
					</AlertDialog.Footer>
				</AlertDialog.Body>
			</AlertDialog.Content>
		</AlertDialog.Root>
	);
}

/**
 * The rendered `AlertDialog.Icon`, narrowed to an `SVGElement` so it can be
 * asserted on without a type assertion.
 */
function getDialogIcon() {
	const icon = screen.getByRole("dialog").querySelector('[data-slot="alert-dialog-icon"]');
	if (!(icon instanceof SVGElement)) {
		throw new Error("AlertDialog.Icon did not render an svg");
	}
	return icon;
}

describe("AlertDialog", () => {
	test("renders title and description when open", () => {
		renderAlertDialog({ intent: "info" });
		expect(screen.getByText("Are you sure?")).toBeInTheDocument();
		expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
	});

	test("names the dialog surface with its title", () => {
		renderAlertDialog({ intent: "danger" });
		// the role AND accessible name are the pattern contract: a part rename or
		// a swap of the underlying primitive would change what AT announces
		expect(screen.getByRole("dialog", { name: "Are you sure?" })).toBeInTheDocument();
	});

	describe("open state", () => {
		test("the trigger opens it and Cancel closes it", async () => {
			const user = userEvent.setup();
			const onConfirm = vi.fn<() => void>();
			render(<ConfirmFlow onConfirm={onConfirm} />);
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "Delete" }));
			expect(await screen.findByRole("dialog", { name: "Are you sure?" })).toBeInTheDocument();

			// Cancel is wrapped in the primitive's Close — without that wrapper it is
			// a dead button
			await user.click(screen.getByRole("button", { name: "Cancel" }));
			await waitFor(() => {
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
			});
			expect(onConfirm).not.toHaveBeenCalled();
		});

		test("Escape closes it", async () => {
			const user = userEvent.setup();
			render(<ConfirmFlow onConfirm={vi.fn<() => void>()} />);
			await user.click(screen.getByRole("button", { name: "Delete" }));
			expect(await screen.findByRole("dialog")).toBeInTheDocument();

			await user.keyboard("{Escape}");

			await waitFor(() => {
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
			});
		});

		test("Action runs its onClick and deliberately leaves the dialog open", async () => {
			const user = userEvent.setup();
			const onConfirm = vi.fn<() => void>();
			render(<ConfirmFlow onConfirm={onConfirm} />);
			await user.click(screen.getByRole("button", { name: "Delete" }));

			await user.click(await screen.findByRole("button", { name: "Delete endpoint" }));

			expect(onConfirm).toHaveBeenCalledTimes(1);
			// documented: Action does NOT close, so an async destructive flow can
			// keep showing pending/error state in the dialog it was launched from
			expect(screen.getByRole("dialog")).toBeInTheDocument();
		});

		test("wrapping Action in AlertDialog.Close both confirms and dismisses", async () => {
			const user = userEvent.setup();
			const onConfirm = vi.fn<() => void>();
			render(<ConfirmFlow closeOnAction onConfirm={onConfirm} />);
			await user.click(screen.getByRole("button", { name: "Delete" }));

			await user.click(await screen.findByRole("button", { name: "Delete endpoint" }));

			expect(onConfirm).toHaveBeenCalledTimes(1);
			await waitFor(() => {
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
			});
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
			// no data attribute or variable exposes the icon's tone, so the class is
			// the only handle on this per-intent branch
			renderWithIcon(intent);
			expect(getDialogIcon()).toHaveClass(tone);
		});

		test("picks a different default glyph per intent", () => {
			renderWithIcon("danger");
			const dangerGlyph = getDialogIcon().innerHTML;
			cleanup();

			renderWithIcon("info");

			expect(getDialogIcon().innerHTML).not.toBe(dangerGlyph);
		});

		test("renders a custom svg in place of the intent default", () => {
			renderWithIcon("danger", <svg data-testid="custom-icon" />);
			expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
		});
	});

	test("a part rendered outside AlertDialog.Root fails fast", () => {
		// React logs the failed render before rethrowing
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<AlertDialog.Action>Confirm</AlertDialog.Action>)).toThrow(
			"AlertDialog child component used outside of AlertDialog parent!",
		);
	});
});
