import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import * as Combobox from "./combobox-parts.js";

test("a consumer types in the combobox and picks an option by role", async () => {
	const user = userEvent.setup();
	const onValueChange = vi.fn<(value: string) => void>();
	render(
		<Combobox.Root onValueChange={onValueChange}>
			<Combobox.Input aria-label="Fruit" />
			<Combobox.Content>
				<Combobox.Item value="apple">Apple</Combobox.Item>
				<Combobox.Item value="banana">Banana</Combobox.Item>
			</Combobox.Content>
		</Combobox.Root>,
	);

	await user.type(screen.getByRole("combobox", { name: "Fruit" }), "ban");
	await user.click(await screen.findByRole("option", { name: "Banana" }));

	expect(onValueChange).toHaveBeenLastCalledWith("banana");
});

test("a consumer tabs from the input to a footer button and presses it with the list open", async () => {
	const user = userEvent.setup();
	const onLoadMore = vi.fn<() => void>();
	render(
		<Combobox.Root>
			<Combobox.Input aria-label="Release" />
			<Combobox.Content>
				<Combobox.Item value="v1.2.0" />
				<Combobox.ContentFooter>
					<button type="button" onClick={onLoadMore}>
						Load more
					</button>
				</Combobox.ContentFooter>
			</Combobox.Content>
		</Combobox.Root>,
	);

	await user.click(screen.getByRole("combobox", { name: "Release" }));
	await user.tab();
	await user.keyboard("{Enter}");

	expect(onLoadMore).toHaveBeenCalledTimes(1);
	expect(screen.getByRole("combobox", { name: "Release" })).toHaveAttribute(
		"aria-expanded",
		"true",
	);
	expect(screen.getByRole("listbox")).not.toContainElement(
		screen.getByRole("button", { name: "Load more" }),
	);
});
