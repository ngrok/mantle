import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import * as Sheet from "./sheet-parts.js";

test("a consumer opens the sheet and closes it by role", async () => {
	const user = userEvent.setup();
	render(
		<Sheet.Root>
			<Sheet.Trigger asChild>
				<button type="button">Open</button>
			</Sheet.Trigger>
			<Sheet.Content>
				<Sheet.Title>Settings</Sheet.Title>
				<Sheet.Close asChild>
					<button type="button">Done</button>
				</Sheet.Close>
			</Sheet.Content>
		</Sheet.Root>,
	);

	await user.click(screen.getByRole("button", { name: "Open" }));
	expect(await screen.findByRole("dialog", { name: "Settings" })).toBeInTheDocument();

	await user.click(screen.getByRole("button", { name: "Done" }));
	expect(screen.queryByRole("dialog", { name: "Settings" })).toBeNull();
});
