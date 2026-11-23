import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import { vi } from "vitest";
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
