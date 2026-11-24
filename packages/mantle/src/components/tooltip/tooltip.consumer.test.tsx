import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import * as Tooltip from "./tooltip-parts.js";
import { TooltipProvider } from "./tooltip.js";

test("a consumer hovers the trigger and finds the tooltip by role", async () => {
	const user = userEvent.setup();
	render(
		<TooltipProvider>
			<Tooltip.Root>
				<Tooltip.Trigger>Copy</Tooltip.Trigger>
				<Tooltip.Content>Copy endpoint URL</Tooltip.Content>
			</Tooltip.Root>
		</TooltipProvider>,
	);

	await user.hover(screen.getByRole("button", { name: "Copy" }));

	expect(await screen.findByRole("tooltip")).toHaveTextContent("Copy endpoint URL");
});
