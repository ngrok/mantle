import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import { vi } from "vitest";
import { Checkbox } from "./checkbox.js";

test("a consumer checks the checkbox by role", async () => {
	const user = userEvent.setup();
	const onCheckedChange = vi.fn<(checked: boolean | "indeterminate") => void>();
	render(<Checkbox aria-label="Accept" onCheckedChange={onCheckedChange} />);

	await user.click(screen.getByRole("checkbox", { name: "Accept" }));

	expect(screen.getByRole("checkbox", { name: "Accept" })).toBeChecked();
	expect(onCheckedChange).toHaveBeenLastCalledWith(true);
});
