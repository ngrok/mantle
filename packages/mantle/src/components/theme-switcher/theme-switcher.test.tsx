import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import type { WithStyleProps } from "../../types/with-style-props.js";
import { DropdownMenu } from "../dropdown-menu/index.js";
import { ThemeProvider, useTheme } from "../theme/theme-provider.js";
import { ThemeDropdownMenuRadioGroup, ThemeSwitcher } from "./theme-switcher.js";

/**
 * Renders the current theme from `useTheme` so tests can observe theme
 * changes made through the radio group.
 */
function CurrentThemeProbe() {
	const [theme] = useTheme();
	return <output data-testid="current-theme">{theme}</output>;
}

const themeLabels = [
	"System Preference",
	"Light Mode",
	"Dark Mode",
	"Light High Contrast",
	"Dark High Contrast",
];

/**
 * Mount the radio group inside a controlled-open dropdown menu so the
 * portaled content is present without simulating trigger interaction.
 */
const renderRadioGroup = (props: WithStyleProps = {}) =>
	render(
		<ThemeProvider>
			<CurrentThemeProbe />
			<DropdownMenu.Root open>
				<DropdownMenu.Trigger>t</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<ThemeDropdownMenuRadioGroup {...props} />
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</ThemeProvider>,
	);

beforeEach(() => {
	// ThemeProvider initializes from the persisted cookie, which survives
	// between tests in the same happy-dom document — reset to a known theme.
	document.cookie = "mantle-ui-theme=system";
});

describe("ThemeSwitcher", () => {
	test("renders a button with the default accessible name", () => {
		render(
			<ThemeProvider>
				<ThemeSwitcher />
			</ThemeProvider>,
		);
		expect(screen.getByRole("button", { name: "Change Theme" })).toBeInTheDocument();
	});

	test("custom label overrides the accessible name", () => {
		render(
			<ThemeProvider>
				<ThemeSwitcher label="Pick a theme" />
			</ThemeProvider>,
		);
		expect(screen.getByRole("button", { name: "Pick a theme" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Change Theme" })).not.toBeInTheDocument();
	});

	test("trigger has data-slot and merges custom className and style", () => {
		render(
			<ThemeProvider>
				<ThemeSwitcher className="custom-class" style={{ marginTop: "4px" }} />
			</ThemeProvider>,
		);
		const trigger = screen.getByRole("button", { name: "Change Theme" });
		expect(trigger).toHaveAttribute("data-slot", "theme-switcher");
		expect(trigger.className).toContain("custom-class");
		expect(trigger).toHaveStyle({ marginTop: "4px" });
	});

	test("appearance defaults to ghost and is overridable", () => {
		render(
			<ThemeProvider>
				<ThemeSwitcher />
			</ThemeProvider>,
		);
		expect(screen.getByRole("button", { name: "Change Theme" })).toHaveAttribute(
			"data-appearance",
			"ghost",
		);
	});

	test("appearance prop overrides the ghost default", () => {
		render(
			<ThemeProvider>
				<ThemeSwitcher appearance="outlined" />
			</ThemeProvider>,
		);
		expect(screen.getByRole("button", { name: "Change Theme" })).toHaveAttribute(
			"data-appearance",
			"outlined",
		);
	});
});

describe("ThemeDropdownMenuRadioGroup", () => {
	test("renders one menuitemradio per theme with the expected labels", () => {
		renderRadioGroup();
		const items = screen.getAllByRole("menuitemradio");
		expect(items).toHaveLength(5);
		for (const label of themeLabels) {
			expect(screen.getByRole("menuitemradio", { name: label })).toBeInTheDocument();
		}
	});

	test("the item matching the current theme is checked", () => {
		document.cookie = "mantle-ui-theme=dark";
		renderRadioGroup();
		const darkItem = screen.getByRole("menuitemradio", { name: "Dark Mode" });
		expect(darkItem).toHaveAttribute("aria-checked", "true");
		expect(darkItem).toHaveAttribute("data-state", "checked");
		expect(screen.getByRole("menuitemradio", { name: "Light Mode" })).toHaveAttribute(
			"aria-checked",
			"false",
		);
	});

	test("selecting a different item updates the theme", () => {
		renderRadioGroup();
		expect(screen.getByTestId("current-theme")).toHaveTextContent("system");
		fireEvent.click(screen.getByRole("menuitemradio", { name: "Dark Mode" }));
		expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
		expect(screen.getByRole("menuitemradio", { name: "Dark Mode" })).toHaveAttribute(
			"aria-checked",
			"true",
		);
		expect(screen.getByRole("menuitemradio", { name: "System Preference" })).toHaveAttribute(
			"aria-checked",
			"false",
		);
	});

	test("has data-slot and merges custom className and style", () => {
		renderRadioGroup({ className: "custom-radio-class", style: { marginTop: "4px" } });
		const group = screen.getByRole("group");
		expect(group).toHaveAttribute("data-slot", "theme-dropdown-menu-radio-group");
		expect(group.className).toContain("custom-radio-class");
		expect(group).toHaveStyle({ marginTop: "4px" });
	});
});
