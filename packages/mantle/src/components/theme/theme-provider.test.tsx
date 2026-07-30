import { render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { mockMatchMedia } from "../../test-utils/mock-match-media.js";
import {
	determineThemeFromMediaQuery,
	preventWrongThemeFlashScriptContent,
	ThemeProvider,
	useInitialHtmlThemeProps,
} from "./theme-provider.js";
import { resolvedThemes } from "./themes.js";

const THEME_COOKIE = "mantle-ui-theme";
const PREFERS_DARK = "(prefers-color-scheme: dark)";

/**
 * The theme layer writes onto the shared `<html>` element and the document
 * cookie, so every test undoes both. `resolvedThemes` rather than a local list:
 * a new theme must be cleaned up too, or it leaks into the next test.
 */
function resetRootTheme() {
	const html = document.documentElement;
	html.classList.remove(...resolvedThemes);
	html.removeAttribute("data-theme");
	html.removeAttribute("data-applied-theme");
	document.cookie = `${THEME_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

describe("determineThemeFromMediaQuery", () => {
	test("given prefersDarkMode=true and prefersHighContrast=false, returns dark", () => {
		expect(
			determineThemeFromMediaQuery({
				prefersDarkMode: true,
				prefersHighContrast: false,
			}),
		).toBe("dark");
	});

	test("given prefersDarkMode=false and prefersHighContrast=false, returns light", () => {
		expect(
			determineThemeFromMediaQuery({
				prefersDarkMode: false,
				prefersHighContrast: false,
			}),
		).toBe("light");
	});

	test("given prefersDarkMode=true and prefersHighContrast=true, returns dark-high-contrast", () => {
		expect(
			determineThemeFromMediaQuery({
				prefersDarkMode: true,
				prefersHighContrast: true,
			}),
		).toBe("dark-high-contrast");
	});

	test("given prefersDarkMode=false and prefersHighContrast=true, returns light-high-contrast", () => {
		expect(
			determineThemeFromMediaQuery({
				prefersDarkMode: false,
				prefersHighContrast: true,
			}),
		).toBe("light-high-contrast");
	});
});

describe("forceTheme pins what lands on <html>", () => {
	afterEach(() => {
		resetRootTheme();
	});

	// `MantleStyleSheets`' `forceTheme` applies a theme's stylesheet *pair*, so the
	// partner sheet is live on every forced page. Which block wins is then decided
	// purely by the class on `<html>` — and these three writers are what put it
	// there. If any of them resolves the stored preference instead of the forced
	// theme, a user whose cookie says dark gets `<html class="dark">` with the dark
	// sheet applied, and a `forceTheme="light"` page paints dark.

	test("the inline FOUC script applies the forced theme over a conflicting cookie", () => {
		mockMatchMedia({ [PREFERS_DARK]: true });
		document.cookie = `${THEME_COOKIE}=dark; path=/`;

		// evaluate the real stringified script — nothing else can see a scoping or
		// serialization regression in it, and lint/typecheck/build all pass on a
		// script that throws at runtime
		new Function(preventWrongThemeFlashScriptContent("light"))();

		const html = document.documentElement;
		expect(html.classList.contains("light")).toBe(true);
		expect(html.classList.contains("dark")).toBe(false);
		expect(html.dataset.appliedTheme).toBe("light");
		// the stored preference survives, so a theme switcher and other pages still work
		expect(html.dataset.theme).toBe("dark");
	});

	test("the inline FOUC script still resolves the cookie when nothing is forced", () => {
		mockMatchMedia({ [PREFERS_DARK]: true });
		document.cookie = `${THEME_COOKIE}=dark; path=/`;

		new Function(preventWrongThemeFlashScriptContent())();

		expect(document.documentElement.classList.contains("dark")).toBe(true);
		expect(document.documentElement.dataset.appliedTheme).toBe("dark");
	});

	test("ThemeProvider applies the forced theme, not the stored preference", () => {
		mockMatchMedia({ [PREFERS_DARK]: true });
		document.cookie = `${THEME_COOKIE}=dark; path=/`;

		render(
			<ThemeProvider forceTheme="light">
				<span>content</span>
			</ThemeProvider>,
		);

		const html = document.documentElement;
		expect(html.classList.contains("light")).toBe(true);
		expect(html.classList.contains("dark")).toBe(false);
		expect(html.dataset.appliedTheme).toBe("light");
	});

	test("ThemeProvider applies the stored preference when nothing is forced", () => {
		mockMatchMedia({ [PREFERS_DARK]: true });
		document.cookie = `${THEME_COOKIE}=dark; path=/`;

		render(
			<ThemeProvider>
				<span>content</span>
			</ThemeProvider>,
		);

		expect(document.documentElement.classList.contains("dark")).toBe(true);
		expect(document.documentElement.dataset.appliedTheme).toBe("dark");
	});

	test("useInitialHtmlThemeProps forces the applied theme and keeps the preference", () => {
		mockMatchMedia({ [PREFERS_DARK]: true });
		document.cookie = `${THEME_COOKIE}=dark; path=/`;

		const { result } = renderHook(() =>
			useInitialHtmlThemeProps({ className: "app", forceTheme: "light" }),
		);

		expect(result.current["data-applied-theme"]).toBe("light");
		expect(result.current["data-theme"]).toBe("dark");
		expect(result.current.className).toBe("app light");
	});

	test("useInitialHtmlThemeProps resolves the cookie when nothing is forced", () => {
		mockMatchMedia({ [PREFERS_DARK]: true });
		document.cookie = `${THEME_COOKIE}=dark; path=/`;

		const { result } = renderHook(() => useInitialHtmlThemeProps({ className: "app" }));

		expect(result.current["data-applied-theme"]).toBe("dark");
		expect(result.current.className).toBe("app dark");
	});
});
