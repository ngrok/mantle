import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, test } from "vitest";
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

describe("AlertDialog", () => {
	test("renders title and description when open", () => {
		renderAlertDialog({ intent: "info" });
		expect(screen.getByText("Are you sure?")).toBeInTheDocument();
		expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
	});

	describe("intent", () => {
		test("`intent` is required at the type level", () => {
			const missingIntent = (
				// @ts-expect-error -- intent is required on AlertDialog.Root
				<AlertDialog.Root open>
					<AlertDialog.Content />
				</AlertDialog.Root>
			);
			expect(missingIntent).toBeDefined();
		});

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
});
