import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { AlertDialog } from "./alert-dialog.js";

function renderAlertDialog(
	intent: "info" | "danger",
	actionIntent?: "accent" | "danger" | "neutral",
) {
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
		renderAlertDialog("info");
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
			const { action } = renderAlertDialog("danger");
			expect(action).toHaveAttribute("data-appearance", "filled");
			expect(action).toHaveAttribute("data-intent", "danger");
		});

		test(`Action derives an accent button from intent="info"`, () => {
			const { action } = renderAlertDialog("info");
			expect(action).toHaveAttribute("data-appearance", "filled");
			expect(action).toHaveAttribute("data-intent", "accent");
		});

		test("a consumer-passed Action intent wins over the derived one", () => {
			const { action } = renderAlertDialog("danger", "neutral");
			expect(action).toHaveAttribute("data-intent", "neutral");
		});

		test("Cancel renders outlined + neutral", () => {
			const { cancel } = renderAlertDialog("danger");
			expect(cancel).toHaveAttribute("data-appearance", "outlined");
			expect(cancel).toHaveAttribute("data-intent", "neutral");
		});
	});
});
