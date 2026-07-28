import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { MatchMediaControls } from "../../test-utils/mock-match-media.js";
import { mockMatchMedia } from "../../test-utils/mock-match-media.js";
import {
	PreventWrongThemeFlashScript,
	ThemeProvider,
	determineThemeFromMediaQuery,
	extractThemeCookie,
	getStoredTheme,
	preventWrongThemeFlashScriptContent,
	useInitialHtmlThemeProps,
	useTheme,
} from "./theme-provider.js";
import { resolvedThemes, themes } from "./themes.js";

// Spelling pins: the storage key and the two media queries are private to the
// implementation but baked into the cookie every SSR host reads and into the
// stringified FOUC script, so the tests restate them deliberately.
const THEME_COOKIE_NAME = "mantle-ui-theme";
const PREFERS_DARK = "(prefers-color-scheme: dark)";
const PREFERS_HIGH_CONTRAST = "(prefers-contrast: more)";

/** The theme cookie pair currently in `document.cookie`, if any. */
function readThemeCookie(): string | undefined {
	return document.cookie
		.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith(`${THEME_COOKIE_NAME}=`));
}

/**
 * Drop the persisted theme. happy-dom keys cookies by name + path, so the path must
 * match the one the implementation writes; an ignored expiry would leave an empty
 * value behind, which every reader also treats as "nothing stored".
 */
function clearThemeCookie() {
	document.cookie = `${THEME_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/** Which resolved-theme classes are on `<html>` — the CSS-selector contract. */
function appliedThemeClasses(): string[] {
	return resolvedThemes.filter((theme) => document.documentElement.classList.contains(theme));
}

function resetHtmlTheme() {
	document.documentElement.classList.remove(...resolvedThemes);
	delete document.documentElement.dataset.theme;
	delete document.documentElement.dataset.appliedTheme;
}

const openTestChannels = new Set<TestBroadcastChannel>();

/**
 * Minimal same-process `BroadcastChannel` stand-in: `postMessage` delivers synchronously
 * to every other open channel with the same name, which is all ThemeProvider's cross-tab
 * listener needs. Keeps the tests off Node's real implementation, whose delivery is
 * asynchronous and process-wide.
 */
class TestBroadcastChannel extends EventTarget {
	readonly name: string;

	constructor(name: string) {
		super();
		this.name = name;
		openTestChannels.add(this);
	}

	postMessage(data: unknown) {
		for (const channel of openTestChannels) {
			if (channel !== this && channel.name === this.name) {
				channel.dispatchEvent(Object.assign(new Event("message"), { data }));
			}
		}
	}

	close() {
		openTestChannels.delete(this);
	}
}

/**
 * Exposes the provider's context tuple: the current theme as text plus one button per
 * theme that drives the setter, so tests go through the real public path.
 */
function ThemeControls() {
	const [theme, setTheme] = useTheme();

	return (
		<>
			<output data-testid="current-theme">{theme}</output>
			{themes.map((value) => (
				<button key={value} onClick={() => setTheme(value)} type="button">
					{value}
				</button>
			))}
		</>
	);
}

/**
 * Evaluate the stringified bootstrap the way the browser does when it parses the inline
 * `<head>` script. This is the only way its closure-scoped helpers, its cookie /
 * localStorage migration and its DOM writes are executed at all — a helper hoisted out
 * of `preventThemeFlash` would throw a ReferenceError here.
 */
function runPreventThemeFlashScript() {
	new Function(preventWrongThemeFlashScriptContent())();
}

let media: MatchMediaControls;

beforeEach(() => {
	// Deterministic OS preferences: unprimed queries report `matches: false`, so the
	// resolved theme is "light" unless a test says otherwise.
	media = mockMatchMedia();
	// Node supplies a real, process-wide BroadcastChannel in this environment. Swapping in a
	// synchronous local one makes delivery deterministic and keeps this file's providers from
	// hearing (or emitting) theme traffic from other test files sharing the process.
	vi.stubGlobal("BroadcastChannel", TestBroadcastChannel);
	clearThemeCookie();
	localStorage.removeItem(THEME_COOKIE_NAME);
	resetHtmlTheme();
});

afterEach(() => {
	clearThemeCookie();
	localStorage.removeItem(THEME_COOKIE_NAME);
	resetHtmlTheme();
	openTestChannels.clear();
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

describe("getStoredTheme", () => {
	test.each([
		{ cookie: `${THEME_COOKIE_NAME}=dark`, expected: "dark" },
		{
			cookie: `session=abc; ${THEME_COOKIE_NAME}=light-high-contrast; other=1`,
			expected: "light-high-contrast",
		},
		// percent-encoded values are decoded before validation
		{ cookie: `${THEME_COOKIE_NAME}=%64ark`, expected: "dark" },
		// a cookie whose name merely ends with the key must not be mistaken for it
		{ cookie: `x-${THEME_COOKIE_NAME}=dark`, expected: "system" },
		{ cookie: `${THEME_COOKIE_NAME}=purple`, expected: "system" },
		{ cookie: `${THEME_COOKIE_NAME}=`, expected: "system" },
		// malformed percent-encoding makes decodeURIComponent throw
		{ cookie: `${THEME_COOKIE_NAME}=%E0%A4%A`, expected: "system" },
		{ cookie: "session=abc123; other=value", expected: "system" },
		{ cookie: "", expected: "system" },
		{ cookie: null, expected: "system" },
		{ cookie: undefined, expected: "system" },
	])("given cookie $cookie returns $expected", ({ cookie, expected }) => {
		expect(getStoredTheme({ cookie })).toBe(expected);
	});
});

describe("extractThemeCookie", () => {
	test.each([
		{ header: `${THEME_COOKIE_NAME}=dark`, expected: `${THEME_COOKIE_NAME}=dark` },
		// exact equality is the point: session/HttpOnly cookies must not travel into loader data
		{
			header: `session=abc; ${THEME_COOKIE_NAME}=dark; csrf=xyz`,
			expected: `${THEME_COOKIE_NAME}=dark`,
		},
		{
			header: `  ${THEME_COOKIE_NAME}=light-high-contrast  `,
			expected: `${THEME_COOKIE_NAME}=light-high-contrast`,
		},
		{ header: `x-${THEME_COOKIE_NAME}=dark`, expected: undefined },
		{ header: "session=abc", expected: undefined },
		{ header: "", expected: undefined },
		{ header: null, expected: undefined },
		{ header: undefined, expected: undefined },
	])("given header $header returns $expected", ({ header, expected }) => {
		expect(extractThemeCookie(header)).toBe(expected);
	});
});

describe("ThemeProvider — applying and persisting a selection", () => {
	test("writes the resolved theme class, both data attributes, and the cookie", async () => {
		const user = userEvent.setup();
		render(
			<ThemeProvider>
				<ThemeControls />
			</ThemeProvider>,
		);

		await user.click(screen.getByRole("button", { name: "dark" }));

		expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
		expect(appliedThemeClasses()).toEqual(["dark"]);
		expect(document.documentElement.dataset.theme).toBe("dark");
		expect(document.documentElement.dataset.appliedTheme).toBe("dark");
		expect(readThemeCookie()).toBe(`${THEME_COOKIE_NAME}=dark`);
	});

	test("removes the previously applied theme class when the selection changes", async () => {
		const user = userEvent.setup();
		render(
			<ThemeProvider>
				<ThemeControls />
			</ThemeProvider>,
		);

		await user.click(screen.getByRole("button", { name: "dark" }));
		await user.click(screen.getByRole("button", { name: "light-high-contrast" }));

		// Exactly one theme class may be present, or two stylesheets fight over `<html>`.
		expect(appliedThemeClasses()).toEqual(["light-high-contrast"]);
		expect(document.documentElement.dataset.appliedTheme).toBe("light-high-contrast");
		expect(readThemeCookie()).toBe(`${THEME_COOKIE_NAME}=light-high-contrast`);
	});

	test("resolves a system selection against the OS media queries", async () => {
		media.setMatches(PREFERS_DARK, true);
		media.setMatches(PREFERS_HIGH_CONTRAST, true);
		const user = userEvent.setup();
		render(
			<ThemeProvider>
				<ThemeControls />
			</ThemeProvider>,
		);

		await user.click(screen.getByRole("button", { name: "light" }));
		expect(appliedThemeClasses()).toEqual(["light"]);

		await user.click(screen.getByRole("button", { name: "system" }));

		expect(screen.getByTestId("current-theme")).toHaveTextContent("system");
		expect(appliedThemeClasses()).toEqual(["dark-high-contrast"]);
		expect(document.documentElement.dataset.theme).toBe("system");
		expect(document.documentElement.dataset.appliedTheme).toBe("dark-high-contrast");
		// The stored preference stays "system" — only the applied theme is resolved.
		expect(readThemeCookie()).toBe(`${THEME_COOKIE_NAME}=system`);
	});

	test("re-resolves the system theme when the OS preference changes", () => {
		render(
			<ThemeProvider>
				<ThemeControls />
			</ThemeProvider>,
		);
		expect(appliedThemeClasses()).toEqual(["light"]);

		act(() => {
			media.setMatches(PREFERS_DARK, true);
		});

		expect(appliedThemeClasses()).toEqual(["dark"]);
		expect(document.documentElement.dataset.appliedTheme).toBe("dark");
		expect(document.documentElement.dataset.theme).toBe("system");
	});
});

describe("ThemeProvider — cross-tab and restore sync", () => {
	test("a storage ping from another tab re-reads the theme from the cookie", () => {
		render(
			<ThemeProvider>
				<ThemeControls />
			</ThemeProvider>,
		);
		expect(screen.getByTestId("current-theme")).toHaveTextContent("system");

		// Another tab persisted a selection and pinged the fallback storage key.
		document.cookie = `${THEME_COOKIE_NAME}=dark; path=/`;
		fireEvent(window, new StorageEvent("storage", { key: `${THEME_COOKIE_NAME}__ping` }));

		expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
		expect(appliedThemeClasses()).toEqual(["dark"]);
	});

	test("ignores storage events for unrelated keys", () => {
		render(
			<ThemeProvider>
				<ThemeControls />
			</ThemeProvider>,
		);

		document.cookie = `${THEME_COOKIE_NAME}=dark; path=/`;
		fireEvent(window, new StorageEvent("storage", { key: THEME_COOKIE_NAME }));

		expect(screen.getByTestId("current-theme")).toHaveTextContent("system");
		expect(appliedThemeClasses()).toEqual(["light"]);
	});

	test("applies the theme carried by a broadcast message", () => {
		render(
			<ThemeProvider>
				<ThemeControls />
			</ThemeProvider>,
		);
		const otherTab = new BroadcastChannel(THEME_COOKIE_NAME);

		act(() => {
			// BroadcastChannel.postMessage takes no targetOrigin (unlike Window.postMessage).
			// oxlint-disable-next-line unicorn/require-post-message-target-origin
			otherTab.postMessage({ theme: "dark-high-contrast", timestamp: 1 });
		});
		otherTab.close();

		expect(screen.getByTestId("current-theme")).toHaveTextContent("dark-high-contrast");
		expect(appliedThemeClasses()).toEqual(["dark-high-contrast"]);
	});

	test("ignores a broadcast message whose payload is not a theme", () => {
		render(
			<ThemeProvider>
				<ThemeControls />
			</ThemeProvider>,
		);
		const otherTab = new BroadcastChannel(THEME_COOKIE_NAME);

		act(() => {
			// oxlint-disable-next-line unicorn/require-post-message-target-origin
			otherTab.postMessage({ theme: "purple", timestamp: 1 });
		});
		otherTab.close();

		expect(screen.getByTestId("current-theme")).toHaveTextContent("system");
		expect(appliedThemeClasses()).toEqual(["light"]);
	});

	test("broadcasts the new theme to other tabs when the setter runs", async () => {
		const messages: unknown[] = [];
		const otherTab = new BroadcastChannel(THEME_COOKIE_NAME);
		otherTab.addEventListener("message", (event) => {
			messages.push(event.data);
		});
		const user = userEvent.setup();
		render(
			<ThemeProvider>
				<ThemeControls />
			</ThemeProvider>,
		);

		await user.click(screen.getByRole("button", { name: "dark" }));
		otherTab.close();

		expect(messages).toHaveLength(1);
		expect(messages[0]).toMatchObject({ theme: "dark" });
	});

	test("a bfcache restore re-reads the theme from the cookie", () => {
		render(
			<ThemeProvider>
				<ThemeControls />
			</ThemeProvider>,
		);

		document.cookie = `${THEME_COOKIE_NAME}=light-high-contrast; path=/`;
		fireEvent(window, new Event("pageshow"));

		expect(screen.getByTestId("current-theme")).toHaveTextContent("light-high-contrast");
		expect(appliedThemeClasses()).toEqual(["light-high-contrast"]);
	});

	test("returning to the tab re-reads the theme from the cookie", () => {
		render(
			<ThemeProvider>
				<ThemeControls />
			</ThemeProvider>,
		);

		document.cookie = `${THEME_COOKIE_NAME}=dark; path=/`;
		fireEvent(document, new Event("visibilitychange"));

		expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
		expect(appliedThemeClasses()).toEqual(["dark"]);
	});
});

describe("PreventWrongThemeFlashScript", () => {
	test("inlines the bootstrap and forwards the CSP nonce", () => {
		const template = document.createElement("template");
		template.innerHTML = renderToString(<PreventWrongThemeFlashScript nonce="test-nonce" />);

		const script = template.content.querySelector("script");
		expect(script?.getAttribute("nonce")).toBe("test-nonce");
		expect(script?.textContent).toBe(preventWrongThemeFlashScriptContent());
	});
});

describe("preventWrongThemeFlashScriptContent — the inlined FOUC bootstrap", () => {
	test("applies the cookie's theme and clears the stale class", () => {
		document.cookie = `${THEME_COOKIE_NAME}=dark; path=/`;
		document.documentElement.classList.add("light");
		document.documentElement.dataset.theme = "light";
		document.documentElement.dataset.appliedTheme = "light";

		runPreventThemeFlashScript();

		expect(appliedThemeClasses()).toEqual(["dark"]);
		expect(document.documentElement.dataset.theme).toBe("dark");
		expect(document.documentElement.dataset.appliedTheme).toBe("dark");
		expect(readThemeCookie()).toBe(`${THEME_COOKIE_NAME}=dark`);
	});

	test("resolves a stored system preference against the OS high-contrast query", () => {
		document.cookie = `${THEME_COOKIE_NAME}=system; path=/`;
		media.setMatches(PREFERS_HIGH_CONTRAST, true);

		runPreventThemeFlashScript();

		expect(appliedThemeClasses()).toEqual(["light-high-contrast"]);
		expect(document.documentElement.dataset.theme).toBe("system");
		expect(document.documentElement.dataset.appliedTheme).toBe("light-high-contrast");
	});

	test("falls back to the default theme and persists it when the cookie value is invalid", () => {
		document.cookie = `${THEME_COOKIE_NAME}=purple; path=/`;
		media.setMatches(PREFERS_DARK, true);

		runPreventThemeFlashScript();

		expect(appliedThemeClasses()).toEqual(["dark"]);
		expect(document.documentElement.dataset.theme).toBe("system");
		expect(readThemeCookie()).toBe(`${THEME_COOKIE_NAME}=system`);
	});

	test("writes the default cookie when nothing is stored", () => {
		media.setMatches(PREFERS_DARK, true);
		media.setMatches(PREFERS_HIGH_CONTRAST, true);

		runPreventThemeFlashScript();

		expect(appliedThemeClasses()).toEqual(["dark-high-contrast"]);
		expect(document.documentElement.dataset.theme).toBe("system");
		expect(readThemeCookie()).toBe(`${THEME_COOKIE_NAME}=system`);
	});

	test("migrates a legacy localStorage preference into the cookie", () => {
		// The runtime reader never looks at localStorage, so this script is the only
		// migration path for users whose preference predates the cookie.
		localStorage.setItem(THEME_COOKIE_NAME, "light-high-contrast");

		runPreventThemeFlashScript();

		expect(appliedThemeClasses()).toEqual(["light-high-contrast"]);
		expect(document.documentElement.dataset.theme).toBe("light-high-contrast");
		expect(readThemeCookie()).toBe(`${THEME_COOKIE_NAME}=light-high-contrast`);
		expect(localStorage.getItem(THEME_COOKIE_NAME)).toBeNull();
	});

	test("prefers the cookie over a legacy localStorage value and leaves it untouched", () => {
		document.cookie = `${THEME_COOKIE_NAME}=dark; path=/`;
		localStorage.setItem(THEME_COOKIE_NAME, "light-high-contrast");

		runPreventThemeFlashScript();

		expect(appliedThemeClasses()).toEqual(["dark"]);
		expect(document.documentElement.dataset.theme).toBe("dark");
		expect(localStorage.getItem(THEME_COOKIE_NAME)).toBe("light-high-contrast");
	});

	test("ignores an invalid localStorage value and keeps the default", () => {
		localStorage.setItem(THEME_COOKIE_NAME, "purple");

		runPreventThemeFlashScript();

		expect(appliedThemeClasses()).toEqual(["light"]);
		expect(document.documentElement.dataset.theme).toBe("system");
		expect(readThemeCookie()).toBe(`${THEME_COOKIE_NAME}=system`);
	});
});

describe("useInitialHtmlThemeProps", () => {
	test("resolves the stored cookie theme and keeps the caller's className", () => {
		document.cookie = `${THEME_COOKIE_NAME}=dark; path=/`;

		const { result } = renderHook(() => useInitialHtmlThemeProps({ className: "h-full" }));

		expect(result.current).toEqual({
			className: "h-full dark",
			"data-applied-theme": "dark",
			"data-theme": "dark",
		});
	});

	test("resolves a stored system preference from the OS media queries on the client", () => {
		document.cookie = `${THEME_COOKIE_NAME}=system; path=/`;
		media.setMatches(PREFERS_DARK, true);
		media.setMatches(PREFERS_HIGH_CONTRAST, true);

		const { result } = renderHook(() => useInitialHtmlThemeProps());

		expect(result.current).toEqual({
			className: "dark-high-contrast",
			"data-applied-theme": "dark-high-contrast",
			"data-theme": "system",
		});
	});

	test("resolves the ssrCookie theme during server rendering", () => {
		// A different client cookie proves the server render reads only `ssrCookie`.
		document.cookie = `${THEME_COOKIE_NAME}=dark-high-contrast; path=/`;
		let ssrProps: ReturnType<typeof useInitialHtmlThemeProps> | undefined;

		function SsrProbe() {
			ssrProps = useInitialHtmlThemeProps({
				className: "h-full",
				ssrCookie: `${THEME_COOKIE_NAME}=dark`,
			});
			return null;
		}

		// `canUseDOM()` gates the SSR branch on the absence of `window`.
		vi.stubGlobal("window", undefined);
		renderToString(<SsrProbe />);

		expect(ssrProps).toEqual({
			className: "h-full dark",
			"data-applied-theme": "dark",
			"data-theme": "dark",
		});
	});

	test("assumes light without high contrast for a system preference during server rendering", () => {
		// Media queries are unknowable server-side; the inline script corrects this before
		// paint. Resolving dark here instead would hydrate-mismatch every system user.
		media.setMatches(PREFERS_DARK, true);
		let ssrProps: ReturnType<typeof useInitialHtmlThemeProps> | undefined;

		function SsrProbe() {
			ssrProps = useInitialHtmlThemeProps({
				ssrCookie: `${THEME_COOKIE_NAME}=system`,
			});
			return null;
		}

		vi.stubGlobal("window", undefined);
		renderToString(<SsrProbe />);

		expect(ssrProps).toEqual({
			className: "light",
			"data-applied-theme": "light",
			"data-theme": "system",
		});
	});
});
