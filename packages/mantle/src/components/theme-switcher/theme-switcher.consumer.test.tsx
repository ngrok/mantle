import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import { ThemeProvider } from "../theme/theme-provider.js";
import { ThemeSwitcher } from "./theme-switcher.js";

test("a consumer finds the theme switcher by its name and presses it", async () => {
	const user = userEvent.setup();
	render(
		<ThemeProvider>
			<ThemeSwitcher />
		</ThemeProvider>,
	);

	const button = await screen.findByRole("button", { name: /theme/i });
	await user.click(button);

	expect(screen.getByRole("button", { name: /theme/i })).toBeInTheDocument();
});
