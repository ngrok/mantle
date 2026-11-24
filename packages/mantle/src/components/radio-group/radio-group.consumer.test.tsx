import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import * as RadioGroup from "./radio-group-parts.js";

test("a consumer checks a radio by role", async () => {
	const user = userEvent.setup();
	render(
		<RadioGroup.Root aria-label="Plan" defaultValue="free">
			<RadioGroup.Item value="free">
				<RadioGroup.Indicator />
				<span>Free</span>
			</RadioGroup.Item>
			<RadioGroup.Item value="pro">
				<RadioGroup.Indicator />
				<span>Pro</span>
			</RadioGroup.Item>
		</RadioGroup.Root>,
	);

	await user.click(screen.getByRole("radio", { name: "Pro" }));

	expect(screen.getByRole("radio", { name: "Pro" })).toBeChecked();
	expect(screen.getByRole("radio", { name: "Free" })).not.toBeChecked();
});
