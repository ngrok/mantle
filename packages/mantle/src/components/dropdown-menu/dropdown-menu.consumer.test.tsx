import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import * as DropdownMenu from "./dropdown-menu-parts.js";

test("a consumer opens the menu and picks an item by role", async () => {
	const user = userEvent.setup();
	const onSelect = vi.fn<(event: Event) => void>();
	render(
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild>
				<button type="button">Actions</button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				<DropdownMenu.Item onSelect={onSelect}>Rename</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>,
	);

	await user.click(screen.getByRole("button", { name: "Actions" }));
	await user.click(await screen.findByRole("menuitem", { name: "Rename" }));

	expect(onSelect).toHaveBeenCalledTimes(1);
	// Why wait: the menu stays mounted for its exit transition.
	await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
});
