import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import { Switch } from "./switch.js";

test("a consumer toggles the switch by role", async () => {
	const user = userEvent.setup();
	render(<Switch aria-label="Notifications" />);

	await user.click(screen.getByRole("switch", { name: "Notifications" }));

	expect(screen.getByRole("switch", { name: "Notifications" })).toBeChecked();
});
