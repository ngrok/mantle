import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import * as Popover from "./popover-parts.js";

test("a consumer opens the popover by role and reads its content", async () => {
	const user = userEvent.setup();
	render(
		<Popover.Root>
			<Popover.Trigger asChild>
				<button type="button">Filters</button>
			</Popover.Trigger>
			<Popover.Content>
				<button type="button">Apply</button>
			</Popover.Content>
		</Popover.Root>,
	);

	await user.click(screen.getByRole("button", { name: "Filters" }));
	expect(screen.getByRole("button", { name: "Filters" })).toHaveAttribute("aria-expanded", "true");
	expect(await screen.findByRole("button", { name: "Apply" })).toBeInTheDocument();
});
