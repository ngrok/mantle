import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import { Slider } from "./slider.js";

test("a consumer moves the slider with the keyboard by role", async () => {
	const user = userEvent.setup();
	render(<Slider aria-label="Volume" defaultValue={50} max={100} step={10} />);

	const slider = screen.getByRole("slider", { name: "Volume" });
	await user.tab();
	expect(slider).toHaveFocus();
	await user.keyboard("{ArrowRight}");

	expect(slider).toHaveValue("60");
});

// Why a crash guard: jsdom has no layout, so the pressed value is not the contract here.
test("a consumer presses the slider without an error", async () => {
	const user = userEvent.setup();
	render(<Slider aria-label="Volume" defaultValue={50} />);

	await user.click(screen.getByRole("slider", { name: "Volume" }));

	expect(screen.getByRole("slider", { name: "Volume" })).toBeInTheDocument();
});
