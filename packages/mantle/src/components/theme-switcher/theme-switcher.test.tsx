import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import type { ComponentProps, ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { DropdownMenu } from "../dropdown-menu/index.js";
import { ThemeIcon } from "../icons/theme.js";
import { ThemeProvider, useTheme } from "../theme/theme-provider.js";
import { ThemeDropdownMenuRadioGroup, ThemeSwitcher } from "./theme-switcher.js";

/**
 * The one icon the switcher shows. A hidden icon is in a `data-state="inactive"` span.
 */
function shownIcon(button: HTMLElement): SVGElement {
	const icons = [...button.querySelectorAll("svg")].filter(
		(svg) => svg.closest("[data-state='inactive']") == null,
	);
	expect(icons).toHaveLength(1);
	const [icon] = icons;
	if (icon == null) {
		throw new Error("The switcher shows no icon.");
	}
	return icon;
}

/**
 * The glyph of the first `<path>` in an icon. Each phosphor theme glyph is a
 * single path, so `d` identifies the icon.
 */
function glyphOf(icon: Element | ReactElement): string | null {
	const container = document.createElement("div");
	if (icon instanceof Element) {
		container.append(icon.cloneNode(true));
	} else {
		container.innerHTML = renderToString(icon);
	}
	return container.querySelector("path")?.getAttribute("d") ?? null;
}

/**
 * Renders the current theme from `useTheme` so tests can observe theme
 * changes made through the radio group.
 */
function CurrentThemeProbe() {
	const [theme] = useTheme();
	return <output data-testid="current-theme">{theme}</output>;
}

const themeLabels = ["System Preference", "Light Mode", "Dark Mode"];

/**
 * Mount the radio group inside a controlled-open dropdown menu so the
 * portaled content is present without simulating trigger interaction.
 */
const renderRadioGroup = (props: ComponentProps<typeof ThemeDropdownMenuRadioGroup> = {}) =>
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
	// The provider writes its cookie with `path=/`, and happy-dom keys cookies
	// by name + path, so the reset must use the same path to overwrite it.
	document.cookie = "mantle-ui-theme=system; path=/";
});

describe("ThemeDropdownMenuRadioGroup naming", () => {
	test('the radio group is named "Theme" by default', () => {
		renderRadioGroup();
		expect(screen.getByRole("group", { name: "Theme" })).toBeInTheDocument();
	});

	test("aria-label renames the group", () => {
		renderRadioGroup({ "aria-label": "Appearance" });
		expect(screen.getByRole("group", { name: "Appearance" })).toBeInTheDocument();
	});

	test("aria-labelledby names the group from a visible heading and drops the default aria-label", () => {
		render(
			<ThemeProvider>
				<DropdownMenu.Root open>
					<DropdownMenu.Trigger>t</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Label id="appearance-heading">Appearance</DropdownMenu.Label>
						<ThemeDropdownMenuRadioGroup aria-labelledby="appearance-heading" />
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</ThemeProvider>,
		);
		const group = screen.getByRole("group", { name: "Appearance" });
		expect(group).not.toHaveAttribute("aria-label");
	});
});

/**
 * Stubs `prefers-color-scheme` so a test can pick the OS preference the
 * switcher resolves `"system"` against.
 */
function stubPrefersDarkMode(prefersDarkMode: boolean) {
	vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
		matches: query === "(prefers-color-scheme: dark)" && prefersDarkMode,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		addListener: () => {},
		removeListener: () => {},
		dispatchEvent: () => false,
	}));
}

const renderSwitcher = (props: ComponentProps<typeof ThemeSwitcher> = {}) =>
	render(
		<ThemeProvider>
			<CurrentThemeProbe />
			<ThemeSwitcher {...props} />
		</ThemeProvider>,
	);

describe("ThemeSwitcher", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("the server render puts a <span> skeleton inside the button, never a <div>", () => {
		const html = renderToString(
			<ThemeProvider>
				<ThemeSwitcher />
			</ThemeProvider>,
		);
		const template = document.createElement("template");
		template.innerHTML = html;
		const button = template.content.querySelector("button");
		const skeleton = button?.querySelector('[data-slot="skeleton"]');
		expect(skeleton?.tagName).toBe("SPAN");
		expect(button?.querySelector("div")).toBeNull();
		// Why only inactive: the button keeps its hidden loading spinner mounted.
		for (const svg of template.content.querySelectorAll("svg")) {
			expect(svg.closest("[data-state='inactive']")).not.toBeNull();
		}
	});

	test("the server render uses a generic name, because the OS preference is unknown", () => {
		const html = renderToString(
			<ThemeProvider>
				<ThemeSwitcher />
			</ThemeProvider>,
		);
		expect(html).toContain('aria-label="Toggle theme"');
	});

	test("on a light OS, a click from system pins dark, and a second click returns to system", () => {
		stubPrefersDarkMode(false);
		renderSwitcher();
		const button = screen.getByRole("button", { name: "Switch to dark theme" });

		fireEvent.click(button);
		expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
		expect(button).toHaveAccessibleName("Switch to light theme (system default)");

		fireEvent.click(button);
		expect(screen.getByTestId("current-theme")).toHaveTextContent("system");
		expect(button).toHaveAccessibleName("Switch to dark theme");
	});

	test("on a dark OS, a click from system pins light", () => {
		stubPrefersDarkMode(true);
		renderSwitcher();

		fireEvent.click(screen.getByRole("button", { name: "Switch to light theme" }));
		expect(screen.getByTestId("current-theme")).toHaveTextContent("light");
	});

	test("a stored override that matches the OS stays pinned until a click", () => {
		document.cookie = "mantle-ui-theme=dark; path=/";
		stubPrefersDarkMode(true);
		renderSwitcher();
		expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");

		fireEvent.click(screen.getByRole("button", { name: "Switch to light theme" }));
		expect(screen.getByTestId("current-theme")).toHaveTextContent("light");
	});

	test("an onClick that calls preventDefault keeps the theme", () => {
		stubPrefersDarkMode(false);
		renderSwitcher({ onClick: (event) => event.preventDefault() });

		fireEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));
		expect(screen.getByTestId("current-theme")).toHaveTextContent("system");
	});

	test("custom label overrides the accessible name", () => {
		renderSwitcher({ label: "Pick a theme" });
		expect(screen.getByRole("button", { name: "Pick a theme" })).toBeInTheDocument();
	});

	test("has data-slot and merges custom className and style", () => {
		renderSwitcher({ className: "custom-class", style: { marginTop: "4px" } });
		const button = screen.getByRole("button");
		// The part's slot joins ahead of the `IconButton` it renders.
		expect(button).toHaveAttribute("data-slot", "theme-switcher icon-button");
		// Why the class check: the tailwind-merge contract puts the consumer's class beside the defaults.
		expect(button.className).toContain("custom-class");
		expect(button).toHaveStyle({ marginTop: "4px" });
	});

	test("joins an incoming data-slot chain ahead of its own slot name", () => {
		renderSwitcher({ "data-slot": "page-footer" });
		expect(screen.getByRole("button")).toHaveAttribute(
			"data-slot",
			"page-footer theme-switcher icon-button",
		);
	});

	test("appearance defaults to ghost, and the prop overrides it", () => {
		const { unmount } = renderSwitcher();
		expect(screen.getByRole("button")).toHaveAttribute("data-appearance", "ghost");
		unmount();

		renderSwitcher({ appearance: "outlined" });
		expect(screen.getByRole("button")).toHaveAttribute("data-appearance", "outlined");
	});

	test("a disabled switcher does not change the theme", () => {
		renderSwitcher({ disabled: true });
		const button = screen.getByRole("button");
		expect(button).toBeDisabled();
		fireEvent.click(button);
		expect(screen.getByTestId("current-theme")).toHaveTextContent("system");
	});

	test("forwards its ref to the button", () => {
		const ref = createRef<HTMLButtonElement>();
		renderSwitcher({ ref });
		expect(ref.current).toBe(screen.getByRole("button"));
	});

	test("swaps its icon to the applied theme and keeps the previous icon mounted", () => {
		stubPrefersDarkMode(false);
		renderSwitcher();
		const button = screen.getByRole("button");
		expect(button.querySelector('[data-slot="skeleton"]')).toBeNull();
		const sunIcon = shownIcon(button);
		expect(glyphOf(sunIcon)).toBe(glyphOf(<ThemeIcon theme="light" />));

		fireEvent.click(button);

		expect(glyphOf(shownIcon(button))).toBe(glyphOf(<ThemeIcon theme="dark" />));
		expect(button).toContainElement(sunIcon);
		expect(sunIcon.parentElement).toHaveAttribute("data-state", "inactive");
	});

	test("a loading switcher hides its theme icon behind the spinner", () => {
		renderSwitcher({ isLoading: true });
		const button = screen.getByRole("button");
		const spinner = shownIcon(button);
		expect(glyphOf(spinner)).not.toBe(glyphOf(<ThemeIcon theme="light" />));
		const hiddenIcons = [...button.querySelectorAll("svg")].filter((svg) => svg !== spinner);
		for (const svg of hiddenIcons) {
			expect(svg.closest("[data-state='inactive']")).not.toBeNull();
		}
	});
});

describe("ThemeDropdownMenuRadioGroup", () => {
	test("renders one menuitemradio per theme with the expected labels", () => {
		renderRadioGroup();
		const items = screen.getAllByRole("menuitemradio");
		expect(items).toHaveLength(3);
		for (const label of themeLabels) {
			expect(screen.getByRole("menuitemradio", { name: label })).toBeInTheDocument();
		}
	});

	test("the item matching the current theme is checked", () => {
		document.cookie = "mantle-ui-theme=dark; path=/";
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
		// The part's slot joins ahead of the `DropdownMenu.RadioGroup` it renders.
		expect(group).toHaveAttribute(
			"data-slot",
			"theme-dropdown-menu-radio-group dropdown-menu-radio-group",
		);
		// Why the class check: the tailwind-merge contract puts the consumer's class beside the defaults.
		expect(group.className).toContain("custom-radio-class");
		expect(group).toHaveStyle({ marginTop: "4px" });
	});
});
