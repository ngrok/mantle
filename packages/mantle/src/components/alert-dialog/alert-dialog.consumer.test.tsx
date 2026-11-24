import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import * as AlertDialog from "./alert-dialog-parts.js";

test("a consumer opens the alert dialog and cancels it by role", async () => {
	const user = userEvent.setup();
	render(
		<AlertDialog.Root intent="danger">
			<AlertDialog.Trigger asChild>
				<button type="button">Delete</button>
			</AlertDialog.Trigger>
			<AlertDialog.Content>
				<AlertDialog.Body>
					<AlertDialog.Header>
						<AlertDialog.Title>Are you sure?</AlertDialog.Title>
					</AlertDialog.Header>
					<AlertDialog.Footer>
						<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
						<AlertDialog.Action>Confirm</AlertDialog.Action>
					</AlertDialog.Footer>
				</AlertDialog.Body>
			</AlertDialog.Content>
		</AlertDialog.Root>,
	);

	await user.click(screen.getByRole("button", { name: "Delete" }));
	expect(await screen.findByRole("alertdialog", { name: "Are you sure?" })).toBeInTheDocument();

	await user.click(screen.getByRole("button", { name: "Cancel" }));
	expect(screen.queryByRole("alertdialog", { name: "Are you sure?" })).toBeNull();
});
