import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import { vi } from "vitest";
import * as MultiSelect from "./multi-select-parts.js";

test("a consumer picks two options by role", async () => {
	const user = userEvent.setup();
	const onValueChange = vi.fn<(value: string[]) => void>();
	render(
		<MultiSelect.Root onValueChange={onValueChange}>
			<MultiSelect.Trigger>
				<MultiSelect.TagValues />
				<MultiSelect.Input aria-label="Fruits" />
			</MultiSelect.Trigger>
			<MultiSelect.Content>
				<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
				<MultiSelect.Item value="banana">Banana</MultiSelect.Item>
			</MultiSelect.Content>
		</MultiSelect.Root>,
	);

	await user.click(screen.getByRole("combobox", { name: "Fruits" }));
	await user.click(await screen.findByRole("option", { name: "Apple" }));
	await user.click(screen.getByRole("option", { name: "Banana" }));

	expect(onValueChange).toHaveBeenLastCalledWith(["apple", "banana"]);
});
