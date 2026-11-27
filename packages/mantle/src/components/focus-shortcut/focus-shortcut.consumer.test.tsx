import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import { Input, InputCapture } from "../input/input.js";
import * as FocusShortcut from "./focus-shortcut-parts.js";

test("a consumer focuses the search field with `/` and types into it", async () => {
	const user = userEvent.setup();
	render(
		<FocusShortcut.Root>
			<Input>
				<FocusShortcut.Field>
					<InputCapture aria-label="Filter endpoints" />
				</FocusShortcut.Field>
				<FocusShortcut.Hint />
			</Input>
		</FocusShortcut.Root>,
	);
	const field = screen.getByRole("textbox", { name: "Filter endpoints" });

	await user.keyboard("/");
	expect(field).toHaveFocus();

	await user.keyboard("api");
	expect(field).toHaveValue("api");
});
