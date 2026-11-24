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

// Why no value from the press: jsdom has no layout and no pointer capture, so a press starts no drag.
test("a consumer presses the slider, then moves it with the keyboard", async () => {
	const user = userEvent.setup();
	render(<Slider aria-label="Volume" defaultValue={50} max={100} step={10} />);

	const slider = screen.getByRole("slider", { name: "Volume" });
	await user.click(slider);
	await user.pointer({ target: slider, coords: { clientX: 40 } });
	await user.click(slider);
	expect(slider).toHaveValue("50");
	expect(slider).toHaveFocus();

	await user.keyboard("{ArrowRight}");
	expect(slider).toHaveValue("60");
});
