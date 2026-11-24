import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import * as Dialog from "./dialog-parts.js";

test("a consumer opens and closes the dialog by role", async () => {
	const user = userEvent.setup();
	render(
		<Dialog.Root>
			<Dialog.Trigger asChild>
				<button type="button">Open</button>
			</Dialog.Trigger>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Request log</Dialog.Title>
					<Dialog.CloseIconButton />
				</Dialog.Header>
				<Dialog.Body>Body</Dialog.Body>
			</Dialog.Content>
		</Dialog.Root>,
	);

	await user.click(screen.getByRole("button", { name: "Open" }));
	const dialog = await screen.findByRole("dialog", { name: "Request log" });
	expect(dialog).toBeInTheDocument();

	await user.click(screen.getByRole("button", { name: /close/i }));
	expect(screen.queryByRole("dialog", { name: "Request log" })).toBeNull();
});
