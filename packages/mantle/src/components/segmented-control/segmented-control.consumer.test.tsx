import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import * as SegmentedControl from "./segmented-control-parts.js";

test("a consumer checks a segment by role", async () => {
	const user = userEvent.setup();
	render(
		<SegmentedControl.Root aria-label="View" defaultValue="list">
			<SegmentedControl.Item value="list">List</SegmentedControl.Item>
			<SegmentedControl.Item value="grid">Grid</SegmentedControl.Item>
		</SegmentedControl.Root>,
	);

	await user.click(screen.getByRole("radio", { name: "Grid" }));

	expect(screen.getByRole("radio", { name: "Grid" })).toBeChecked();
});
