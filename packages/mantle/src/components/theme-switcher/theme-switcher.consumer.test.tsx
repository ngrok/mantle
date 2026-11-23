import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import * as DropdownMenu from "../dropdown-menu/dropdown-menu-parts.js";
import { ThemeProvider } from "../theme/theme-provider.js";
import { ThemeDropdownMenuItem, ThemeSwitcher } from "./theme-switcher.js";

test("a consumer finds the theme switcher by its name and presses it", async () => {
	const user = userEvent.setup();
	render(
		<ThemeProvider>
			<ThemeSwitcher />
		</ThemeProvider>,
	);

	await user.click(await screen.findByRole("button", { name: "Switch to dark theme" }));

	expect(
		screen.getByRole("button", { name: "Switch to light theme (system default)" }),
	).toBeInTheDocument();
	// Why: the theme lives on `<html>` and in a cookie, which outlive the render.
	await user.click(screen.getByRole("button", { name: /^Switch to light theme/ }));
});

test("a consumer picks the theme item in a menu by role", async () => {
	const user = userEvent.setup();
	render(
		<ThemeProvider>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger asChild>
					<button type="button">Account</button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<ThemeDropdownMenuItem />
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</ThemeProvider>,
	);

	await user.click(screen.getByRole("button", { name: "Account" }));
	await user.click(await screen.findByRole("menuitem", { name: "Theme: Switch to dark theme" }));
	await user.click(screen.getByRole("button", { name: "Account" }));

	expect(
		await screen.findByRole("menuitem", { name: /^Theme: Switch to light theme/ }),
	).toBeInTheDocument();
});
