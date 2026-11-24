import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import * as Tabs from "./tabs-parts.js";

test("a consumer switches tabs by role, with a click and with the keyboard", async () => {
	const user = userEvent.setup();
	render(
		<Tabs.Root defaultValue="a">
			<Tabs.List aria-label="Sections">
				<Tabs.Trigger value="a">Overview</Tabs.Trigger>
				<Tabs.Trigger value="b">Logs</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="a">Overview panel</Tabs.Content>
			<Tabs.Content value="b">Logs panel</Tabs.Content>
		</Tabs.Root>,
	);

	await user.click(screen.getByRole("tab", { name: "Logs" }));
	expect(screen.getByRole("tab", { name: "Logs" })).toHaveAttribute("aria-selected", "true");
	expect(screen.getByRole("tabpanel", { name: "Logs" })).toHaveTextContent("Logs panel");

	await user.keyboard("{ArrowLeft}");
	expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
});
