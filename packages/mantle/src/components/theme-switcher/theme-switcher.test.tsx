import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import type { ComponentProps, ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mockMatchMedia } from "../../test-utils/mock-match-media.js";
import { DropdownMenu } from "../dropdown-menu/index.js";
import { ThemeIcon } from "../icons/theme.js";
import { ThemeProvider, useTheme } from "../theme/theme-provider.js";
import { ThemeDropdownMenuItem, ThemeSwitcher } from "./theme-switcher.js";

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

/**
 * Mount the item inside a controlled-open dropdown menu so the portaled
 * content is present without simulating trigger interaction.
 */
const renderMenuItem = (props: ComponentProps<typeof ThemeDropdownMenuItem> = {}) =>
	render(
		<ThemeProvider>
			<CurrentThemeProbe />
			<DropdownMenu.Root open>
				<DropdownMenu.Trigger>t</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<ThemeDropdownMenuItem {...props} />
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

	test("under a forced theme, the switcher is disabled and keeps the stored preference", () => {
		stubPrefersDarkMode(false);
		render(
			<ThemeProvider forceTheme="dark">
				<CurrentThemeProbe />
				<ThemeSwitcher />
			</ThemeProvider>,
		);
		const button = screen.getByRole("button", { name: "Theme set by this page" });
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

/**
 * Stubs `document.startViewTransition` the way a browser runs it: the update
 * runs at once, `updateCallbackDone` settles after the update, and `finished`
 * settles when the test calls `finish`. With `deferUpdate`, each update waits
 * until the test calls `runUpdates`, as it does in a browser until the next
 * frame.
 */
function stubViewTransition({ deferUpdate = false }: { deferUpdate?: boolean } = {}) {
	const updates: Array<() => void> = [];
	const runUpdates = () => {
		for (const update of updates.splice(0)) {
			update();
		}
	};
	let finish = () => {};
	const finished = new Promise<undefined>((resolve) => {
		finish = () => resolve(undefined);
	});
	const skipTransition = vi.fn<() => void>();
	const startViewTransition = vi.fn<(update: () => void) => object>((update) => {
		const { promise: updateCallbackDone, resolve } = Promise.withResolvers<undefined>();
		updates.push(() => {
			update();
			resolve(undefined);
		});
		if (!deferUpdate) {
			runUpdates();
		}
		return {
			finished,
			ready: Promise.resolve(undefined),
			skipTransition,
			types: new Set<string>(),
			updateCallbackDone,
		};
	});
	Object.defineProperty(document, "startViewTransition", {
		configurable: true,
		value: startViewTransition,
	});
	vi.spyOn(document.documentElement, "animate").mockImplementation(() => new Animation());
	return { finish, runUpdates, skipTransition, startViewTransition };
}

describe("ThemeSwitcher theme swap", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		Reflect.deleteProperty(document, "startViewTransition");
	});

	test("with motion allowed, the swap runs in a view transition and marks <html> until it ends", async () => {
		mockMatchMedia({ "(prefers-reduced-motion: no-preference)": true });
		const { finish, startViewTransition } = stubViewTransition();
		renderSwitcher();
		const button = screen.getByRole("button", { name: "Switch to dark theme" });

		fireEvent.click(button);
		expect(startViewTransition).toHaveBeenCalledOnce();
		// The theme and the name change on the click, not when the motion ends.
		expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
		expect(button).toHaveAccessibleName("Switch to light theme (system default)");
		expect(document.documentElement).toHaveAttribute("data-theme-transition");

		finish();
		await waitFor(() =>
			expect(document.documentElement).not.toHaveAttribute("data-theme-transition"),
		);
	});

	test("a click during the swap ends it, and a click over the switcher toggles again", async () => {
		mockMatchMedia({ "(prefers-reduced-motion: no-preference)": true });
		const { finish, skipTransition } = stubViewTransition();
		renderSwitcher();
		const button = screen.getByRole("button", { name: "Switch to dark theme" });
		fireEvent.click(button);
		expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");

		// While a view transition runs, the browser targets <html> with each click.
		// After the skip, the button is under the pointer again.
		vi.spyOn(document, "elementFromPoint").mockReturnValue(button);
		fireEvent.click(document.documentElement);
		// The click on <html> skips, then the click it sends to the switcher skips again.
		expect(skipTransition).toHaveBeenCalledTimes(2);
		await waitFor(() => expect(screen.getByTestId("current-theme")).toHaveTextContent("system"));

		finish();
		await waitFor(() =>
			expect(document.documentElement).not.toHaveAttribute("data-theme-transition"),
		);
	});

	test("a click during the swap reaches another control under the pointer", async () => {
		mockMatchMedia({ "(prefers-reduced-motion: no-preference)": true });
		const { finish } = stubViewTransition();
		const onOtherClick = vi.fn<() => void>();
		render(
			<ThemeProvider>
				<ThemeSwitcher />
				<button type="button" onClick={onOtherClick}>
					Other
				</button>
			</ThemeProvider>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));

		vi.spyOn(document, "elementFromPoint").mockReturnValue(
			screen.getByRole("button", { name: "Other" }),
		);
		fireEvent.click(document.documentElement);
		expect(onOtherClick).toHaveBeenCalledOnce();

		finish();
		await waitFor(() =>
			expect(document.documentElement).not.toHaveAttribute("data-theme-transition"),
		);
	});

	test("two presses before the browser runs the first update toggle twice in order", async () => {
		mockMatchMedia({ "(prefers-reduced-motion: no-preference)": true });
		const { finish, runUpdates, startViewTransition } = stubViewTransition({ deferUpdate: true });
		renderSwitcher();
		const button = screen.getByRole("button", { name: "Switch to dark theme" });

		// A key press targets the focused button, not <html>, as this click does.
		fireEvent.click(button);
		fireEvent.click(button);
		expect(startViewTransition).toHaveBeenCalledOnce();
		act(runUpdates);
		await waitFor(() => expect(screen.getByTestId("current-theme")).toHaveTextContent("system"));

		finish();
		await waitFor(() =>
			expect(document.documentElement).not.toHaveAttribute("data-theme-transition"),
		);
	});

	test("fast clicks during the swap start no second view transition, and each click toggles", async () => {
		mockMatchMedia({ "(prefers-reduced-motion: no-preference)": true });
		const { finish, runUpdates, startViewTransition } = stubViewTransition({ deferUpdate: true });
		renderSwitcher();
		const button = screen.getByRole("button", { name: "Switch to dark theme" });
		fireEvent.click(button);

		vi.spyOn(document, "elementFromPoint").mockReturnValue(button);
		for (let i = 0; i < 4; i++) {
			fireEvent.click(document.documentElement);
		}
		expect(startViewTransition).toHaveBeenCalledOnce();

		// Five toggles from system: dark, system, dark, system, dark. The update
		// of the skipped transition runs first, so it cannot restore an old theme.
		act(runUpdates);
		await waitFor(() => expect(screen.getByTestId("current-theme")).toHaveTextContent("dark"));
		expect(document.documentElement).toHaveAttribute("data-applied-theme", "dark");

		finish();
		await waitFor(() =>
			expect(document.documentElement).not.toHaveAttribute("data-theme-transition"),
		);
	});

	test("with reduced motion, the swap is immediate", () => {
		mockMatchMedia({ "(prefers-reduced-motion: no-preference)": false });
		const { startViewTransition } = stubViewTransition();
		renderSwitcher();

		fireEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));
		expect(startViewTransition).not.toHaveBeenCalled();
		expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
		expect(document.documentElement).not.toHaveAttribute("data-theme-transition");
	});
});

describe("ThemeDropdownMenuItem", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	test.each([
		{ stored: "system", prefersDarkMode: false, name: "Theme: Switch to dark theme" },
		{
			stored: "dark",
			prefersDarkMode: false,
			name: "Theme: Switch to light theme (system default)",
		},
		{ stored: "system", prefersDarkMode: true, name: "Theme: Switch to light theme" },
	])(
		"with $stored stored and prefersDarkMode $prefersDarkMode, the item is named $name",
		({ stored, prefersDarkMode, name }) => {
			stubPrefersDarkMode(prefersDarkMode);
			document.cookie = `mantle-ui-theme=${stored}; path=/`;
			renderMenuItem();
			expect(screen.getByRole("menuitem", { name })).toHaveTextContent("Theme");
		},
	);

	test("label sets the visible label and the accessible name", () => {
		renderMenuItem({ label: "Tema" });
		const item = screen.getByRole("menuitem", { name: "Tema" });
		expect(item.querySelector('[data-slot="theme-dropdown-menu-item-label"]')).toHaveTextContent(
			"Tema",
		);
	});

	test("the icon shows the applied theme", () => {
		stubPrefersDarkMode(false);
		document.cookie = "mantle-ui-theme=dark; path=/";
		renderMenuItem();
		expect(glyphOf(shownIcon(screen.getByRole("menuitem")))).toBe(
			glyphOf(<ThemeIcon theme="dark" />),
		);
	});

	test.each([
		{ stored: "system", prefersDarkMode: false, expected: "dark" },
		{ stored: "dark", prefersDarkMode: false, expected: "system" },
		{ stored: "system", prefersDarkMode: true, expected: "light" },
		{ stored: "light", prefersDarkMode: true, expected: "system" },
	])(
		"with $stored stored and prefersDarkMode $prefersDarkMode, a press stores $expected",
		({ stored, prefersDarkMode, expected }) => {
			stubPrefersDarkMode(prefersDarkMode);
			document.cookie = `mantle-ui-theme=${stored}; path=/`;
			renderMenuItem();
			fireEvent.click(screen.getByRole("menuitem"));
			expect(screen.getByTestId("current-theme")).toHaveTextContent(expected);
		},
	);

	test("a press keeps the menu open", () => {
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(
			<ThemeProvider>
				<DropdownMenu.Root open onOpenChange={onOpenChange}>
					<DropdownMenu.Trigger>t</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<ThemeDropdownMenuItem />
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</ThemeProvider>,
		);
		fireEvent.click(screen.getByRole("menuitem"));
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(screen.getByRole("menuitem")).toBeInTheDocument();
	});

	test("under forceTheme, the item shows the forced theme and is disabled", () => {
		render(
			<ThemeProvider forceTheme="dark">
				<DropdownMenu.Root open>
					<DropdownMenu.Trigger>t</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<ThemeDropdownMenuItem />
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</ThemeProvider>,
		);
		const item = screen.getByRole("menuitem");
		expect(item).toHaveAttribute("aria-disabled", "true");
		expect(glyphOf(shownIcon(item))).toBe(glyphOf(<ThemeIcon theme="dark" />));
	});

	test("has data-slot and merges className and style", () => {
		renderMenuItem({ className: "custom-item-class", style: { marginTop: "4px" } });
		const item = screen.getByRole("menuitem");
		// The part's slot joins ahead of the `DropdownMenu.Item` it renders.
		expect(item).toHaveAttribute("data-slot", "theme-dropdown-menu-item dropdown-menu-item");
		// Why the class check: the tailwind-merge contract puts the consumer's class beside the defaults.
		expect(item.className).toContain("custom-item-class");
		expect(item).toHaveStyle({ marginTop: "4px" });
	});
});
