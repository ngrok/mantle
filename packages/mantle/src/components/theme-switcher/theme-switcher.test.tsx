import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import type { ComponentProps, ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mockMatchMedia } from "../../test-utils/mock-match-media.js";
import * as DropdownMenu from "../dropdown-menu/dropdown-menu-parts.js";
import { ThemeIcon } from "../icons/theme.js";
import { ThemeProvider, useTheme } from "../theme/theme-provider.js";
import {
	ThemeDropdownMenuItem,
	ThemeSwitcher,
	ThemeSwitcherIcon,
	useThemeToggle,
} from "./theme-switcher.js";

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
	// between tests in the same happy-dom document. Reset to a known theme.
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
		// oxlint-disable-next-line typescript/no-deprecated -- Why: the `MediaQueryList` type still requires it.
		addListener: () => {},
		// oxlint-disable-next-line typescript/no-deprecated -- Why: the `MediaQueryList` type still requires it.
		removeListener: () => {},
		dispatchEvent: () => false,
	}));
}

/**
 * The switcher button. Why by slot: these tests are about the theme, not the
 * name, which the role tests pin.
 */
function getSwitcher(): HTMLButtonElement {
	const button = document.querySelector('[data-slot~="theme-switcher"]');
	if (!(button instanceof HTMLButtonElement)) {
		throw new Error("No ThemeSwitcher button is rendered.");
	}
	return button;
}

/** The server HTML of `element` under a provider seeded with each stored theme. */
function serverHtmlForEachTheme(element: ReactElement) {
	return ["light", "dark", "system"].map((theme) =>
		renderToString(<ThemeProvider ssrCookie={`mantle-ui-theme=${theme}`}>{element}</ThemeProvider>),
	);
}

const renderSwitcher = (props: ComponentProps<typeof ThemeSwitcher> = {}) =>
	render(
		<ThemeProvider>
			<CurrentThemeProbe />
			<ThemeSwitcher {...props} />
		</ThemeProvider>,
	);

describe("ThemeSwitcher", () => {
	test("the server render is the same for every stored theme, holds both icons, and adds no page text", () => {
		const [light, dark, system] = serverHtmlForEachTheme(<ThemeSwitcher />);
		expect(dark).toBe(light);
		expect(system).toBe(light);
		const template = document.createElement("template");
		template.innerHTML = light ?? "";
		const button = template.content.querySelector("button");
		const glyphs = [...(button?.querySelectorAll("path") ?? [])].map((path) =>
			path.getAttribute("d"),
		);
		expect(glyphs).toContain(glyphOf(<ThemeIcon theme="light" />));
		expect(glyphs).toContain(glyphOf(<ThemeIcon theme="dark" />));
		expect(button?.querySelector('[data-slot="skeleton"]')).toBeNull();
		// Why: CSS writes the name, so the page text that crawlers read stays empty.
		expect(button).not.toHaveAttribute("aria-label");
		expect(button?.textContent).toBe("");
	});

	test("on a light OS, a click from system pins dark, and a second click returns to system", () => {
		stubPrefersDarkMode(false);
		renderSwitcher();

		fireEvent.click(getSwitcher());
		expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");

		fireEvent.click(getSwitcher());
		expect(screen.getByTestId("current-theme")).toHaveTextContent("system");
	});

	test("on a dark OS, a click from system pins light", () => {
		stubPrefersDarkMode(true);
		renderSwitcher();

		fireEvent.click(getSwitcher());
		expect(screen.getByTestId("current-theme")).toHaveTextContent("light");
	});

	test("a stored override that matches the OS stays pinned until a click", () => {
		document.cookie = "mantle-ui-theme=dark; path=/";
		stubPrefersDarkMode(true);
		renderSwitcher();
		expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");

		fireEvent.click(getSwitcher());
		expect(screen.getByTestId("current-theme")).toHaveTextContent("light");
	});

	test("an onClick that calls preventDefault keeps the theme", () => {
		stubPrefersDarkMode(false);
		renderSwitcher({ onClick: (event) => event.preventDefault() });

		fireEvent.click(getSwitcher());
		expect(screen.getByTestId("current-theme")).toHaveTextContent("system");
	});

	test("a test finds the switcher by its role and default name, and the name follows each click", async () => {
		stubPrefersDarkMode(false);
		renderSwitcher();

		fireEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));

		fireEvent.click(
			await screen.findByRole("button", { name: "Switch to light theme (system default)" }),
		);
		expect(await screen.findByRole("button", { name: "Switch to dark theme" })).toBeInTheDocument();
		expect(screen.getByTestId("current-theme")).toHaveTextContent("system");
	});

	test("a removed label gives the switcher its default name again", () => {
		stubPrefersDarkMode(false);
		const { rerender } = render(
			<ThemeProvider>
				<ThemeSwitcher label="Cambiar tema" />
			</ThemeProvider>,
		);
		expect(screen.getByRole("button", { name: "Cambiar tema" })).toBeInTheDocument();

		rerender(
			<ThemeProvider>
				<ThemeSwitcher />
			</ThemeProvider>,
		);

		expect(screen.getByRole("button", { name: "Switch to dark theme" })).toBeInTheDocument();
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
	// happy-dom has no `getAnimations`. Each browser with view transitions has it.
	Object.defineProperty(document, "getAnimations", { configurable: true, value: () => [] });
	vi.spyOn(document.documentElement, "animate").mockImplementation(() => new Animation());
	return { finish, runUpdates, skipTransition, startViewTransition };
}

describe("ThemeSwitcher theme swap", () => {
	afterEach(() => {
		Reflect.deleteProperty(document, "startViewTransition");
		Reflect.deleteProperty(document, "getAnimations");
	});

	test("with motion allowed, the swap runs in a view transition and marks <html> until it ends", async () => {
		mockMatchMedia({ "(prefers-reduced-motion: no-preference)": true });
		const { finish, startViewTransition } = stubViewTransition();
		renderSwitcher();

		fireEvent.click(getSwitcher());
		expect(startViewTransition).toHaveBeenCalledOnce();
		// The theme changes on the click, not when the motion ends.
		expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
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
		const button = getSwitcher();
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
		fireEvent.click(getSwitcher());

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
		const button = getSwitcher();

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
		const button = getSwitcher();
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

		fireEvent.click(getSwitcher());
		expect(startViewTransition).not.toHaveBeenCalled();
		expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
		expect(document.documentElement).not.toHaveAttribute("data-theme-transition");
	});
});

describe("ThemeDropdownMenuItem", () => {
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

	test("under forceTheme, the item is disabled", () => {
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

describe("ThemeDropdownMenuItem with children", () => {
	test("renders the children in place of the default row, and they name the item", () => {
		renderMenuItem({
			children: (
				<>
					<ThemeSwitcherIcon />
					Appearance
				</>
			),
		});
		const item = screen.getByRole("menuitem", { name: "Appearance" });
		expect(item.firstElementChild).toHaveAttribute("data-slot", "theme-switcher-icon");
		expect(item.querySelector('[data-slot="theme-dropdown-menu-item-label"]')).toBeNull();
	});

	test.each([false, true, ""])("children of %j keep the default row and its name", (children) => {
		stubPrefersDarkMode(false);
		renderMenuItem({ children });
		const item = screen.getByRole("menuitem", { name: "Theme: Switch to dark theme" });
		expect(item.querySelector('[data-slot="theme-dropdown-menu-item-label"]')).toHaveTextContent(
			"Theme",
		);
	});

	test("a press flips the theme", () => {
		stubPrefersDarkMode(false);
		renderMenuItem({ children: "Appearance" });
		fireEvent.click(screen.getByRole("menuitem", { name: "Appearance" }));
		expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
	});
});

describe("ThemeSwitcherIcon", () => {
	test("the server render is the same for every stored theme and holds both icons", () => {
		const [light, dark, system] = serverHtmlForEachTheme(<ThemeSwitcherIcon />);
		expect(dark).toBe(light);
		expect(system).toBe(light);
		const template = document.createElement("template");
		template.innerHTML = light ?? "";
		const glyphs = [...template.content.querySelectorAll("path")].map((path) =>
			path.getAttribute("d"),
		);
		expect(glyphs).toHaveLength(2);
		expect(glyphs).toContain(glyphOf(<ThemeIcon theme="light" />));
		expect(glyphs).toContain(glyphOf(<ThemeIcon theme="dark" />));
	});

	test("is hidden from assistive technology and merges className", () => {
		const { container } = render(
			<ThemeProvider>
				<ThemeSwitcherIcon className="custom-icon-class" />
			</ThemeProvider>,
		);
		const icon = container.querySelector('[data-slot="theme-switcher-icon"]');
		if (!(icon instanceof HTMLElement)) {
			throw new Error("ThemeSwitcherIcon renders no slot");
		}
		expect(icon).toHaveAttribute("aria-hidden", "true");
		// Why the class check: the tailwind-merge contract puts the consumer's class beside the defaults.
		expect(icon.className).toContain("custom-icon-class");
	});
});

describe("useThemeToggle", () => {
	function ThemeItem() {
		const toggle = useThemeToggle();
		return (
			<DropdownMenu.Item disabled={toggle.disabled} onSelect={toggle.onSelect}>
				<ThemeSwitcherIcon />
				{toggle.label}
			</DropdownMenu.Item>
		);
	}

	const renderThemeItem = ({ forceTheme }: { forceTheme?: "dark" } = {}) => {
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(
			<ThemeProvider forceTheme={forceTheme}>
				<CurrentThemeProbe />
				<DropdownMenu.Root open onOpenChange={onOpenChange}>
					<DropdownMenu.Trigger>t</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<ThemeItem />
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</ThemeProvider>,
		);
		return { onOpenChange };
	};

	test("a press flips the theme, updates the label, and keeps the menu open", () => {
		stubPrefersDarkMode(false);
		const { onOpenChange } = renderThemeItem();
		fireEvent.click(screen.getByRole("menuitem", { name: "Switch to dark theme" }));
		expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
		expect(
			screen.getByRole("menuitem", { name: "Switch to light theme (system default)" }),
		).toBeInTheDocument();
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	test("under forceTheme, disabled is true", () => {
		renderThemeItem({ forceTheme: "dark" });
		expect(screen.getByRole("menuitem")).toHaveAttribute("aria-disabled", "true");
	});
});
