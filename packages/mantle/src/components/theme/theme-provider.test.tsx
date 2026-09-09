import { act, render, renderHook } from "@testing-library/react";
import type { ReactElement } from "react";
import type { Root } from "react-dom/client";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import { mockMatchMedia } from "../../test-utils/mock-match-media.js";
import {
	determineThemeFromMediaQuery,
	PreventWrongThemeFlashScript,
	preventWrongThemeFlashScriptContent,
	ThemeProvider,
	useAppliedTheme,
	useInitialHtmlThemeProps,
	useTheme,
} from "./theme-provider.js";
import { resolvedThemes, type Theme } from "./themes.js";

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

/**
 * Renders on the server path. happy-dom defines `window`, so `canUseDOM()`
 * returns true. The `window` stub routes the initializer to `ssrCookie`.
 */
function renderOnServer(element: ReactElement): string {
	vi.stubGlobal("window", undefined);
	try {
		return renderToString(element);
	} finally {
		vi.unstubAllGlobals();
	}
}

/**
 * Prints the context theme and the resolved theme, so a server render and a
 * hydration render compare by their markup.
 */
function ThemeProbe() {
	const [theme] = useTheme();
	const appliedTheme = useAppliedTheme();
	return <span>{`theme=${theme} applied=${appliedTheme}`}</span>;
}

describe("useTheme", () => {
	test("throws outside a ThemeProvider instead of returning a no-op setter", () => {
		expect(() => renderHook(() => useTheme())).toThrow(
			"useTheme must be used within a ThemeProvider",
		);
	});

	test("returns the provider's theme tuple inside a ThemeProvider", () => {
		mockMatchMedia({});
		const { result } = renderHook(() => useTheme(), {
			wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
		});
		expect(result.current[0]).toBe("system");

		act(() => {
			result.current[1]("light");
		});
		expect(result.current[0]).toBe("light");
	});
});

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

describe("ssrCookie seeds the server render", () => {
	afterEach(() => {
		resetRootTheme();
	});

	test("the server render resolves the stored theme from ssrCookie", () => {
		const html = renderOnServer(
			<ThemeProvider ssrCookie={`${THEME_COOKIE}=dark`}>
				<ThemeProbe />
			</ThemeProvider>,
		);

		expect(html).toContain("theme=dark applied=dark");
	});

	// Why the first render: the mount effect re-reads `document.cookie` and repairs
	// the state, so a post-mount assertion cannot see which source seeded it.
	test("the client seeds from document.cookie, not ssrCookie, on its first render", () => {
		mockMatchMedia({});
		document.cookie = `${THEME_COOKIE}=dark; path=/`;
		const seen: Theme[] = [];
		function RecordTheme() {
			seen.push(useTheme()[0]);
			return null;
		}

		render(
			<ThemeProvider ssrCookie={`${THEME_COOKIE}=light`}>
				<RecordTheme />
			</ThemeProvider>,
		);

		expect(seen[0]).toBe("dark");
	});

	test("hydrates without a mismatch when ssrCookie and document.cookie agree", () => {
		mockMatchMedia({});
		document.cookie = `${THEME_COOKIE}=dark; path=/`;
		const app = (
			<ThemeProvider ssrCookie={`${THEME_COOKIE}=dark`}>
				<ThemeProbe />
			</ThemeProvider>
		);
		const container = document.createElement("div");
		container.innerHTML = renderOnServer(app);
		document.body.append(container);
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		const onRecoverableError = vi.fn<(error: unknown) => void>();

		let root: Root | undefined;
		act(() => {
			root = hydrateRoot(container, app, { onRecoverableError });
		});

		expect(onRecoverableError).toHaveBeenCalledTimes(0);
		expect(consoleError).toHaveBeenCalledTimes(0);
		expect(container.textContent).toBe("theme=dark applied=dark");

		act(() => {
			root?.unmount();
		});
		container.remove();
	});
});

describe("ThemeProvider closes the cross-tab channel on unmount", () => {
	afterEach(() => {
		resetRootTheme();
	});

	test("closes the channel once and survives a close() that throws", () => {
		mockMatchMedia({});
		const close = vi.fn<() => void>(() => {
			throw new Error("channel already closed");
		});
		class ThrowingBroadcastChannel {
			close = close;
			addEventListener() {}
		}
		vi.stubGlobal("BroadcastChannel", ThrowingBroadcastChannel);
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

		const { unmount } = render(
			<ThemeProvider>
				<span>content</span>
			</ThemeProvider>,
		);

		expect(() => unmount()).not.toThrow();
		expect(close).toHaveBeenCalledTimes(1);
		expect(consoleError).toHaveBeenCalledTimes(0);
	});
});

describe("PreventWrongThemeFlashScript", () => {
	test("renders the forced script under the CSP nonce", () => {
		const html = renderToString(<PreventWrongThemeFlashScript nonce="n1" forceTheme="light" />);

		expect(html).toContain('<script nonce="n1">');
		expect(html).toContain('"forceTheme":"light"');
		expect(html).toContain(preventWrongThemeFlashScriptContent("light"));
	});

	test("omits nonce and forceTheme when neither is set", () => {
		const html = renderToString(<PreventWrongThemeFlashScript />);

		expect(html).toContain("<script>");
		expect(html).not.toContain("nonce");
		expect(html).not.toContain('"forceTheme"');
		expect(html).toContain(preventWrongThemeFlashScriptContent());
	});
});

describe("forceTheme pins what lands on <html>", () => {
	afterEach(() => {
		resetRootTheme();
	});

	// `MantleStyleSheets`' `forceTheme` applies a theme's stylesheet *pair*, so the
	// partner sheet is live on every forced page. Which block wins is then decided
	// by the class and `data-applied-theme` on `<html>` — and these three writers
	// are what put them there. If any of them resolves the stored preference
	// instead of the forced theme, a user whose cookie says dark gets
	// `<html class="dark">` with the dark sheet applied, and a `forceTheme="light"`
	// page paints dark.
	//
	// `data-theme` is deliberately NOT one of the deciders, even though every theme
	// block lists it: it holds the preference, which a forced page leaves
	// disagreeing, so each of those selectors carries `:not([data-applied-theme])`.
	// force-theme.browser.test.ts proves the computed result; these tests only pin
	// the attributes, which is why they cannot see a cascade regression.

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
