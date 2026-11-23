import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import { vi } from "vitest";
import * as Command from "./command-parts.js";

test("a consumer opens the palette, filters, and picks an item by role", async () => {
	const user = userEvent.setup();
	const onSelect = vi.fn<(value: string) => void>();
	render(
		<Command.DialogRoot>
			<Command.DialogTrigger asChild>
				<button type="button">Search</button>
			</Command.DialogTrigger>
			<Command.DialogContent title="Command palette">
				<Command.Input placeholder="Search" />
				<Command.List>
					<Command.Item onSelect={onSelect}>Billing</Command.Item>
					<Command.Item>Profile</Command.Item>
				</Command.List>
			</Command.DialogContent>
		</Command.DialogRoot>,
	);

	await user.click(screen.getByRole("button", { name: "Search" }));
	await screen.findByRole("dialog", { name: "Command palette" });
	await user.type(screen.getByRole("combobox"), "bill");

	expect(screen.queryByRole("option", { name: "Profile" })).toBeNull();
	await user.click(screen.getByRole("option", { name: "Billing" }));
	expect(onSelect).toHaveBeenCalledTimes(1);
});
