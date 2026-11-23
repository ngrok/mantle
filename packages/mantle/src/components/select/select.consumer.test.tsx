import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import * as Select from "./select-parts.js";

test("a consumer opens the select and picks an option by role", async () => {
	const user = userEvent.setup();
	const onValueChange = vi.fn<(value: string) => void>();
	render(
		<Select.Root onValueChange={onValueChange}>
			<Select.Trigger aria-label="Region">
				<Select.Value placeholder="Pick a region" />
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="us">United States</Select.Item>
				<Select.Item value="eu">Europe</Select.Item>
			</Select.Content>
		</Select.Root>,
	);

	await user.click(screen.getByRole("combobox", { name: "Region" }));
	await user.click(await screen.findByRole("option", { name: "Europe" }));

	expect(onValueChange).toHaveBeenLastCalledWith("eu");
	expect(screen.getByRole("combobox", { name: "Region" })).toHaveTextContent("Europe");
});
