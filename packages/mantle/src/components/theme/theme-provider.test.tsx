import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactElement } from "react";
import type { Root } from "react-dom/client";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mockMatchMedia } from "../../test-utils/mock-match-media.js";
import {
	determineThemeFromMediaQuery,
	extractThemeCookie,
	getStoredTheme,
	PreventWrongThemeFlashScript,
	preventWrongThemeFlashScriptContent,
	ThemeProvider,
	useAppliedTheme,
	useInitialHtmlThemeProps,
	useTheme,
} from "./theme-provider.js";
import { resolvedThemes, themes, type Theme } from "./themes.js";

const THEME_COOKIE = "mantle-ui-theme";
const PREFERS_DARK = "(prefers-color-scheme: dark)";
const PREFERS_HIGH_CONTRAST = "(prefers-contrast: more)";

/**
 * The theme layer writes onto the shared `<html>` element, the document
 * cookie, and the legacy `localStorage` key, so every test undoes all three.
 * `resolvedThemes` rather than a local list: a new theme must be cleaned up
 * too, or it leaks into the next test.
 */
function resetRootTheme() {
	const html = document.documentElement;
	html.classList.remove(...resolvedThemes);
	html.removeAttribute("data-theme");
	html.removeAttribute("data-applied-theme");
	document.cookie = `${THEME_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
	window.localStorage.removeItem(THEME_COOKIE);
}

afterEach(() => {
	resetRootTheme();
});

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
 * Render `useInitialHtmlThemeProps` on the server and read its result back out of
 * the markup, so the probe component never writes to a variable during render.
 */
function renderHtmlThemePropsOnServer(
	options: Parameters<typeof useInitialHtmlThemeProps>[0],
): unknown {
	const Probe = () => <pre>{JSON.stringify(useInitialHtmlThemeProps(options))}</pre>;
	const template = document.createElement("template");
	template.innerHTML = renderOnServer(<Probe />);
	const text = template.content.querySelector("pre")?.textContent;
	if (text == null) {
		throw new Error("expected the server render to carry the hook result");
	}
	return JSON.parse(text);
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

/**
 * Exposes the provider's context tuple: the current theme as text plus one
 * button per theme that drives the setter, so tests go through the public path.
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

/** The resolved-theme classes on `<html>`: the CSS-selector contract. */
function appliedThemeClasses(): string[] {
	return resolvedThemes.filter((theme) => document.documentElement.classList.contains(theme));
}

/** The theme cookie pair currently in `document.cookie`, if any. */
function readThemeCookie(): string | undefined {
	return document.cookie
		.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith(`${THEME_COOKIE}=`));
}

const openTestChannels = new Set<TestBroadcastChannel>();

/**
 * Same-process `BroadcastChannel` stand-in: `postMessage` delivers synchronously
 * to every other open channel with the same name. Node's real implementation
 * delivers asynchronously and process-wide, so a provider in another test file
 * could hear this file's theme traffic.
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

describe("getStoredTheme", () => {
	test.each([
		{ cookie: `${THEME_COOKIE}=dark`, expected: "dark" },
		{
			cookie: `session=abc; ${THEME_COOKIE}=light-high-contrast; other=1`,
			expected: "light-high-contrast",
		},
		// percent-encoded values are decoded before validation
		{ cookie: `${THEME_COOKIE}=%64ark`, expected: "dark" },
		// a cookie whose name merely ends with the key must not be mistaken for it
		{ cookie: `x-${THEME_COOKIE}=dark`, expected: "system" },
		{ cookie: `${THEME_COOKIE}=purple`, expected: "system" },
		{ cookie: `${THEME_COOKIE}=`, expected: "system" },
		// malformed percent-encoding makes decodeURIComponent throw
		{ cookie: `${THEME_COOKIE}=%E0%A4%A`, expected: "system" },
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
		{ header: `${THEME_COOKIE}=dark`, expected: `${THEME_COOKIE}=dark` },
		// exact equality is the point: session and HttpOnly cookies must not travel into loader data
		{
			header: `session=abc; ${THEME_COOKIE}=dark; csrf=xyz`,
			expected: `${THEME_COOKIE}=dark`,
		},
		{
			header: `  ${THEME_COOKIE}=light-high-contrast  `,
			expected: `${THEME_COOKIE}=light-high-contrast`,
		},
		{ header: `x-${THEME_COOKIE}=dark`, expected: undefined },
		{ header: "session=abc", expected: undefined },
		{ header: "", expected: undefined },
		{ header: null, expected: undefined },
		{ header: undefined, expected: undefined },
	])("given header $header returns $expected", ({ header, expected }) => {
		expect(extractThemeCookie(header)).toBe(expected);
	});
});

describe("ssrCookie seeds the server render", () => {
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

describe("ThemeProvider applies and persists a selection", () => {
	beforeEach(() => {
		vi.stubGlobal("BroadcastChannel", TestBroadcastChannel);
	});

	afterEach(() => {
		openTestChannels.clear();
	});

	test("writes the resolved theme class, both data attributes, and the cookie", async () => {
		mockMatchMedia({});
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
		expect(readThemeCookie()).toBe(`${THEME_COOKIE}=dark`);
	});

	test("removes the previously applied theme class when the selection changes", async () => {
		mockMatchMedia({});
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
		expect(readThemeCookie()).toBe(`${THEME_COOKIE}=light-high-contrast`);
	});

	test("resolves a system selection against the OS media queries", async () => {
		mockMatchMedia({ [PREFERS_DARK]: true, [PREFERS_HIGH_CONTRAST]: true });
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
		// The stored preference stays "system"; only the applied theme is resolved.
		expect(readThemeCookie()).toBe(`${THEME_COOKIE}=system`);
	});

	test("re-resolves the system theme when the OS preference changes", () => {
		const media = mockMatchMedia({});
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

describe("ThemeProvider syncs across tabs and restores", () => {
	beforeEach(() => {
		mockMatchMedia({});
		vi.stubGlobal("BroadcastChannel", TestBroadcastChannel);
	});

	afterEach(() => {
		openTestChannels.clear();
	});

	test("a storage ping from another tab re-reads the theme from the cookie", () => {
		render(
			<ThemeProvider>
				<ThemeControls />
			</ThemeProvider>,
		);
		expect(screen.getByTestId("current-theme")).toHaveTextContent("system");

		// Another tab persisted a selection and pinged the fallback storage key.
		document.cookie = `${THEME_COOKIE}=dark; path=/`;
		fireEvent(window, new StorageEvent("storage", { key: `${THEME_COOKIE}__ping` }));

		expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
		expect(appliedThemeClasses()).toEqual(["dark"]);
	});

	test("ignores storage events for unrelated keys", () => {
		render(
			<ThemeProvider>
				<ThemeControls />
			</ThemeProvider>,
		);

		document.cookie = `${THEME_COOKIE}=dark; path=/`;
		fireEvent(window, new StorageEvent("storage", { key: THEME_COOKIE }));

		expect(screen.getByTestId("current-theme")).toHaveTextContent("system");
		expect(appliedThemeClasses()).toEqual(["light"]);
	});

	test("applies the theme carried by a broadcast message", () => {
		render(
			<ThemeProvider>
				<ThemeControls />
			</ThemeProvider>,
		);
		const otherTab = new BroadcastChannel(THEME_COOKIE);

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
		const otherTab = new BroadcastChannel(THEME_COOKIE);

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
		const otherTab = new BroadcastChannel(THEME_COOKIE);
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

		document.cookie = `${THEME_COOKIE}=light-high-contrast; path=/`;
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

		document.cookie = `${THEME_COOKIE}=dark; path=/`;
		fireEvent(document, new Event("visibilitychange"));

		expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
		expect(appliedThemeClasses()).toEqual(["dark"]);
	});
});

test("ThemeProvider closes the cross-tab channel once on unmount and survives a close() that throws", () => {
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

describe("the inline FOUC script resolves and persists the preference", () => {
	// Why evaluate the stringified script: nothing else can see a scoping or
	// serialization regression in it. Lint, typecheck, and build all pass on a
	// script that throws at runtime.
	function runPreventThemeFlashScript() {
		new Function(preventWrongThemeFlashScriptContent())();
	}

	test("applies the cookie's theme and clears the stale class", () => {
		mockMatchMedia({});
		document.cookie = `${THEME_COOKIE}=dark; path=/`;
		document.documentElement.classList.add("light");
		document.documentElement.dataset.theme = "light";
		document.documentElement.dataset.appliedTheme = "light";

		runPreventThemeFlashScript();

		expect(appliedThemeClasses()).toEqual(["dark"]);
		expect(document.documentElement.dataset.theme).toBe("dark");
		expect(document.documentElement.dataset.appliedTheme).toBe("dark");
		expect(readThemeCookie()).toBe(`${THEME_COOKIE}=dark`);
	});

	test("resolves a stored system preference against the OS high-contrast query", () => {
		mockMatchMedia({ [PREFERS_HIGH_CONTRAST]: true });
		document.cookie = `${THEME_COOKIE}=system; path=/`;

		runPreventThemeFlashScript();

		expect(appliedThemeClasses()).toEqual(["light-high-contrast"]);
		expect(document.documentElement.dataset.theme).toBe("system");
		expect(document.documentElement.dataset.appliedTheme).toBe("light-high-contrast");
	});

	test("falls back to the default theme and persists it when the cookie value is invalid", () => {
		mockMatchMedia({ [PREFERS_DARK]: true });
		document.cookie = `${THEME_COOKIE}=purple; path=/`;

		runPreventThemeFlashScript();

		expect(appliedThemeClasses()).toEqual(["dark"]);
		expect(document.documentElement.dataset.theme).toBe("system");
		expect(readThemeCookie()).toBe(`${THEME_COOKIE}=system`);
	});

	test("seeds the default cookie when nothing is stored", () => {
		mockMatchMedia({ [PREFERS_DARK]: true, [PREFERS_HIGH_CONTRAST]: true });

		runPreventThemeFlashScript();

		expect(appliedThemeClasses()).toEqual(["dark-high-contrast"]);
		expect(document.documentElement.dataset.theme).toBe("system");
		expect(readThemeCookie()).toBe(`${THEME_COOKIE}=system`);
	});

	test("migrates a legacy localStorage preference into the cookie", () => {
		mockMatchMedia({});
		// Why: the runtime reader never looks at localStorage, so this script is
		// the only migration path for a preference that predates the cookie.
		window.localStorage.setItem(THEME_COOKIE, "light-high-contrast");

		runPreventThemeFlashScript();

		expect(appliedThemeClasses()).toEqual(["light-high-contrast"]);
		expect(document.documentElement.dataset.theme).toBe("light-high-contrast");
		expect(readThemeCookie()).toBe(`${THEME_COOKIE}=light-high-contrast`);
		expect(window.localStorage.getItem(THEME_COOKIE)).toBeNull();
	});

	test("prefers the cookie over a legacy localStorage value and leaves it untouched", () => {
		mockMatchMedia({});
		document.cookie = `${THEME_COOKIE}=dark; path=/`;
		window.localStorage.setItem(THEME_COOKIE, "light-high-contrast");

		runPreventThemeFlashScript();

		expect(appliedThemeClasses()).toEqual(["dark"]);
		expect(document.documentElement.dataset.theme).toBe("dark");
		expect(window.localStorage.getItem(THEME_COOKIE)).toBe("light-high-contrast");
	});

	test("ignores an invalid localStorage value and keeps the default", () => {
		mockMatchMedia({});
		window.localStorage.setItem(THEME_COOKIE, "purple");

		runPreventThemeFlashScript();

		expect(appliedThemeClasses()).toEqual(["light"]);
		expect(document.documentElement.dataset.theme).toBe("system");
		expect(readThemeCookie()).toBe(`${THEME_COOKIE}=system`);
	});
});

describe("forceTheme pins what lands on <html>", () => {
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

describe("useInitialHtmlThemeProps resolves a system preference", () => {
	test("against the OS media queries on the client", () => {
		mockMatchMedia({ [PREFERS_DARK]: true, [PREFERS_HIGH_CONTRAST]: true });
		document.cookie = `${THEME_COOKIE}=system; path=/`;

		const { result } = renderHook(() => useInitialHtmlThemeProps());

		expect(result.current).toEqual({
			className: "dark-high-contrast",
			"data-applied-theme": "dark-high-contrast",
			"data-theme": "system",
		});
	});

	test("from ssrCookie, never document.cookie, during server rendering", () => {
		// Why a different client cookie: it proves the server render reads only `ssrCookie`.
		document.cookie = `${THEME_COOKIE}=dark-high-contrast; path=/`;
		const ssrProps = renderHtmlThemePropsOnServer({
			className: "app",
			ssrCookie: `${THEME_COOKIE}=dark`,
		});

		expect(ssrProps).toEqual({
			className: "app dark",
			"data-applied-theme": "dark",
			"data-theme": "dark",
		});
	});

	test("as light without high contrast during server rendering", () => {
		// Why light: media queries are unknowable on the server, and the inline
		// script corrects the class before paint. Resolving dark here would
		// hydrate-mismatch every system user.
		mockMatchMedia({ [PREFERS_DARK]: true });
		const ssrProps = renderHtmlThemePropsOnServer({ ssrCookie: `${THEME_COOKIE}=system` });

		expect(ssrProps).toEqual({
			className: "light",
			"data-applied-theme": "light",
			"data-theme": "system",
		});
	});
});
