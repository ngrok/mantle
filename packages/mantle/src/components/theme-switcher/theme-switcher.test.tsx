import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import type { ComponentProps } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, test } from "vitest";
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

describe("ThemeSwitcher", () => {
	test("the server render puts a <span> skeleton inside the trigger button, never a <div>", () => {
		const html = renderToString(
			<ThemeProvider>
				<ThemeSwitcher.Root>
					<ThemeSwitcher.Trigger />
					<ThemeSwitcher.Content />
				</ThemeSwitcher.Root>
			</ThemeProvider>,
		);
		const template = document.createElement("template");
		template.innerHTML = html;
		const button = template.content.querySelector("button");
		const skeleton = button?.querySelector('[data-slot="skeleton"]');
		expect(skeleton?.tagName).toBe("SPAN");
		expect(button?.querySelector("div")).toBeNull();
	});

	test("renders a trigger button with the default accessible name", () => {
		render(
			<ThemeProvider>
				<ThemeSwitcher.Root>
					<ThemeSwitcher.Trigger />
					<ThemeSwitcher.Content />
				</ThemeSwitcher.Root>
			</ThemeProvider>,
		);
		expect(screen.getByRole("button", { name: "Change Theme" })).toBeInTheDocument();
	});

	test("custom label overrides the trigger's accessible name", () => {
		render(
			<ThemeProvider>
				<ThemeSwitcher.Root>
					<ThemeSwitcher.Trigger label="Pick a theme" />
					<ThemeSwitcher.Content />
				</ThemeSwitcher.Root>
			</ThemeProvider>,
		);
		expect(screen.getByRole("button", { name: "Pick a theme" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Change Theme" })).not.toBeInTheDocument();
	});

	test("trigger has data-slot and merges custom className and style", () => {
		render(
			<ThemeProvider>
				<ThemeSwitcher.Root>
					<ThemeSwitcher.Trigger className="custom-class" style={{ marginTop: "4px" }} />
					<ThemeSwitcher.Content />
				</ThemeSwitcher.Root>
			</ThemeProvider>,
		);
		const trigger = screen.getByRole("button", { name: "Change Theme" });
		expect(trigger).toHaveAttribute("data-slot", "theme-switcher-trigger");
		expect(trigger.className).toContain("custom-class");
		expect(trigger).toHaveStyle({ marginTop: "4px" });
	});

	test("trigger joins an incoming data-slot chain ahead of its own slot name", () => {
		render(
			<ThemeProvider>
				<ThemeSwitcher.Root>
					<ThemeSwitcher.Trigger data-slot="page-footer" />
					<ThemeSwitcher.Content />
				</ThemeSwitcher.Root>
			</ThemeProvider>,
		);
		expect(screen.getByRole("button", { name: "Change Theme" })).toHaveAttribute(
			"data-slot",
			"page-footer theme-switcher-trigger",
		);
	});

	test("trigger appearance defaults to ghost", () => {
		render(
			<ThemeProvider>
				<ThemeSwitcher.Root>
					<ThemeSwitcher.Trigger />
					<ThemeSwitcher.Content />
				</ThemeSwitcher.Root>
			</ThemeProvider>,
		);
		expect(screen.getByRole("button", { name: "Change Theme" })).toHaveAttribute(
			"data-appearance",
			"ghost",
		);
	});

	test("trigger appearance prop overrides the ghost default", () => {
		render(
			<ThemeProvider>
				<ThemeSwitcher.Root>
					<ThemeSwitcher.Trigger appearance="outlined" />
					<ThemeSwitcher.Content />
				</ThemeSwitcher.Root>
			</ThemeProvider>,
		);
		expect(screen.getByRole("button", { name: "Change Theme" })).toHaveAttribute(
			"data-appearance",
			"outlined",
		);
	});

	test("opening the trigger shows the theme menu with content props forwarded", () => {
		render(
			<ThemeProvider>
				<ThemeSwitcher.Root>
					<ThemeSwitcher.Trigger />
					<ThemeSwitcher.Content className="shadow-2xl" />
				</ThemeSwitcher.Root>
			</ThemeProvider>,
		);
		fireEvent.pointerDown(screen.getByRole("button", { name: "Change Theme" }));
		const menu = screen.getByRole("menu");
		expect(menu.className).toContain("shadow-2xl");
		// The menu keeps its dropdown-menu-content identity — the part's slot
		// name joins the chain rather than clobbering the wrapped primitive's.
		expect(menu).toHaveAttribute("data-slot", "theme-switcher-content dropdown-menu-content");
		expect(screen.getAllByRole("menuitemradio")).toHaveLength(5);
	});

	test("a disabled trigger does not open the menu", () => {
		render(
			<ThemeProvider>
				<ThemeSwitcher.Root>
					<ThemeSwitcher.Trigger disabled />
					<ThemeSwitcher.Content />
				</ThemeSwitcher.Root>
			</ThemeProvider>,
		);
		const trigger = screen.getByRole("button", { name: "Change Theme" });
		expect(trigger).toBeDisabled();
		fireEvent.pointerDown(trigger);
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
	});

	test("content joins an incoming data-slot chain ahead of its own slot name", () => {
		render(
			<ThemeProvider>
				<ThemeSwitcher.Root open>
					<ThemeSwitcher.Trigger />
					<ThemeSwitcher.Content data-slot="page-footer" />
				</ThemeSwitcher.Root>
			</ThemeProvider>,
		);
		expect(screen.getByRole("menu")).toHaveAttribute(
			"data-slot",
			"page-footer theme-switcher-content dropdown-menu-content",
		);
	});

	test("trigger and content forward refs to their rendered elements", () => {
		const triggerRef = createRef<HTMLButtonElement>();
		const contentRef = createRef<HTMLDivElement>();
		render(
			<ThemeProvider>
				<ThemeSwitcher.Root open>
					<ThemeSwitcher.Trigger ref={triggerRef} />
					<ThemeSwitcher.Content ref={contentRef} />
				</ThemeSwitcher.Root>
			</ThemeProvider>,
		);
		// The open modal menu removes the trigger from the accessibility tree,
		// so assert the trigger ref by identity attributes instead of role.
		expect(triggerRef.current).toBeInstanceOf(HTMLButtonElement);
		expect(triggerRef.current).toHaveAttribute("data-slot", "theme-switcher-trigger");
		expect(contentRef.current).toBe(screen.getByRole("menu"));
	});

	test("content renders the theme radio group when no children are given", () => {
		render(
			<ThemeProvider>
				<ThemeSwitcher.Root open>
					<ThemeSwitcher.Trigger />
					<ThemeSwitcher.Content />
				</ThemeSwitcher.Root>
			</ThemeProvider>,
		);
		for (const label of themeLabels) {
			expect(screen.getByRole("menuitemradio", { name: label })).toBeInTheDocument();
		}
	});

	test("content renders the default radio group for explicit null children", () => {
		render(
			<ThemeProvider>
				<ThemeSwitcher.Root open>
					<ThemeSwitcher.Trigger />
					<ThemeSwitcher.Content>{null}</ThemeSwitcher.Content>
				</ThemeSwitcher.Root>
			</ThemeProvider>,
		);
		expect(screen.getAllByRole("menuitemradio")).toHaveLength(5);
	});

	test("a lone conditional-false child suppresses the default radio group", () => {
		// Pins the `children ?? default` contract: `false` is passed content
		// (renders nothing), not absence — only null/undefined restore the
		// default. A refactor to `||` or a `"children" in props` check would
		// change this behavior and must fail here.
		const showExtras = false;
		render(
			<ThemeProvider>
				<ThemeSwitcher.Root open>
					<ThemeSwitcher.Trigger />
					<ThemeSwitcher.Content>
						{showExtras && <DropdownMenu.Item>Extras</DropdownMenu.Item>}
					</ThemeSwitcher.Content>
				</ThemeSwitcher.Root>
			</ThemeProvider>,
		);
		expect(screen.getByRole("menu")).toBeInTheDocument();
		expect(screen.queryAllByRole("menuitemradio")).toHaveLength(0);
	});

	test("content children replace the default radio group", () => {
		render(
			<ThemeProvider>
				<ThemeSwitcher.Root open>
					<ThemeSwitcher.Trigger />
					<ThemeSwitcher.Content>
						<ThemeDropdownMenuRadioGroup />
						<DropdownMenu.Separator />
						<DropdownMenu.Item>Appearance settings</DropdownMenu.Item>
					</ThemeSwitcher.Content>
				</ThemeSwitcher.Root>
			</ThemeProvider>,
		);
		expect(screen.getAllByRole("menuitemradio")).toHaveLength(5);
		expect(screen.getByRole("menuitem", { name: "Appearance settings" })).toBeInTheDocument();
	});

	test("root forwards controlled open state to the underlying dropdown menu", () => {
		render(
			<ThemeProvider>
				<ThemeSwitcher.Root open>
					<ThemeSwitcher.Trigger />
					<ThemeSwitcher.Content />
				</ThemeSwitcher.Root>
			</ThemeProvider>,
		);
		expect(screen.getByRole("menu")).toBeInTheDocument();
	});

	test("trigger renders the themed icon after hydration", () => {
		render(
			<ThemeProvider>
				<ThemeSwitcher.Root>
					<ThemeSwitcher.Trigger />
					<ThemeSwitcher.Content />
				</ThemeSwitcher.Root>
			</ThemeProvider>,
		);
		const trigger = screen.getByRole("button", { name: "Change Theme" });
		expect(trigger.querySelector("svg")).not.toBeNull();
		expect(trigger.querySelector('[data-slot="skeleton"]')).toBeNull();
	});

	test("trigger renders the skeleton fallback during server rendering", () => {
		// The applied theme is unknowable server-side, so the SSR markup must
		// contain the Skeleton placeholder instead of a themed icon.
		const html = renderToString(
			<ThemeProvider>
				<ThemeSwitcher.Root>
					<ThemeSwitcher.Trigger />
					<ThemeSwitcher.Content />
				</ThemeSwitcher.Root>
			</ThemeProvider>,
		);
		expect(html).toContain('data-slot="skeleton"');
		expect(html).not.toContain("<svg");
	});

	test("selecting a theme from the switcher updates the theme", () => {
		render(
			<ThemeProvider>
				<CurrentThemeProbe />
				<ThemeSwitcher.Root open>
					<ThemeSwitcher.Trigger />
					<ThemeSwitcher.Content />
				</ThemeSwitcher.Root>
			</ThemeProvider>,
		);
		expect(screen.getByTestId("current-theme")).toHaveTextContent("system");
		fireEvent.click(screen.getByRole("menuitemradio", { name: "Dark Mode" }));
		expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
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
		expect(group).toHaveAttribute("data-slot", "theme-dropdown-menu-radio-group");
		expect(group.className).toContain("custom-radio-class");
		expect(group).toHaveStyle({ marginTop: "4px" });
	});
});
