"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import invariant from "tiny-invariant";
import { useMatchesMediaQuery } from "../../hooks/use-matches-media-query.js";
import { findCookiePair, readCookie } from "../../utils/cookie.js";
import { cx } from "../../utils/cx/cx.js";
import { canUseDOM } from "../browser-only/browser-only.js";
import { swapTheme } from "./swap-theme.js";
import {
	type ResolvedTheme,
	type Theme,
	isResolvedTheme,
	isTheme,
	resolvedThemes,
} from "./themes.js";

/**
 * The media query for the OS dark-mode preference.
 */
const prefersDarkModeMediaQuery = "(prefers-color-scheme: dark)";

/**
 * The cookie name the theme persists under.
 */
const THEME_STORAGE_KEY = "mantle-ui-theme";

/**
 * The theme to apply when storage holds no value.
 */
const DEFAULT_THEME = "system" satisfies Theme;

/**
 * Maps each cookie value mantle reads to the theme it stores. The retired
 * high-contrast values map to their base theme, so a user who picked one keeps
 * a light or dark page. Read it with `Object.hasOwn`, never a bare index.
 */
const themeByCookieValue: Readonly<Record<string, Theme>> = {
	system: "system",
	light: "light",
	dark: "dark",
	"light-high-contrast": "light",
	"dark-high-contrast": "dark",
};

/**
 * The options for the `setTheme` function that `useTheme` returns.
 */
type SetThemeOptions = {
	/**
	 * The element the new theme grows from in the reveal, such as the control
	 * the user pressed. When omitted, the reveal grows from the focused
	 * element, else from the center of the viewport.
	 */
	origin?: Element | null;
};

type ThemeProviderState = [
	theme: Theme,
	setTheme: (theme: Theme | ((theme: Theme) => Theme), options?: SetThemeOptions) => void,
];

/**
 * The `[theme, setTheme]` tuple {@link ThemeProvider} provides. Read it with
 * {@link useTheme}. `null` outside a provider, so `useTheme` can fail fast.
 */
const ThemeProviderContext = createContext<ThemeProviderState | null>(null);

/**
 * The `forceTheme` of the nearest {@link ThemeProvider}, or `undefined` when
 * the page is not pinned. A separate context keeps the public `useTheme` tuple
 * unchanged.
 */
const ForcedThemeContext = createContext<ResolvedTheme | undefined>(undefined);

type ThemeProviderProps = PropsWithChildren<{
	/**
	 * Pin the theme that renders, ignoring the stored preference and the OS. Pass
	 * the same value you pass `PreventWrongThemeFlashScript` and
	 * `useInitialHtmlThemeProps`: each one writes the `<html>` class. Leaving them
	 * out of sync makes a page paint in a theme nobody asked for, because the dark
	 * stylesheet is always applied and a stale `.dark` on the root takes over a
	 * `forceTheme="light"` page.
	 *
	 * The stored preference is still read and still written by `setTheme`, so
	 * unforced pages honor the user's choice. `useAppliedTheme` returns the forced
	 * theme, and `ThemeSwitcher` is disabled, because a click cannot change what
	 * this page shows.
	 */
	forceTheme?: ResolvedTheme;
	/**
	 * The theme cookie pair from the incoming request, read on the server only.
	 * Pass the value `extractThemeCookie` returns. Pass the same value to
	 * `useInitialHtmlThemeProps`. The server then seeds
	 * the context with the stored theme, so the hydrated client agrees with the
	 * server HTML. When omitted, the server renders `"system"`. A client with a
	 * stored theme then reports a hydration mismatch. The client always reads
	 * `document.cookie`.
	 */
	ssrCookie?: string;
}>;

/**
 * Tracks the theme preference and applies the resolved class to `<html>`. Stays
 * in sync with the OS media queries and with the other open tabs.
 *
 * On the server, pass `ssrCookie` so the context starts at the stored theme.
 * The hydrated client then agrees with the server HTML.
 *
 * The preference lives in the `mantle-ui-theme` cookie. The provider reads the
 * cookie again and applies its theme to `<html>` on these events:
 *
 * - mount
 * - `visibilitychange` to visible, and `pageshow`
 * - a theme change in another tab (`BroadcastChannel` or `storage`)
 * - an OS color-scheme change
 *
 * The provider does not read the `<html>` class. The next theme change replaces
 * a direct edit to it. In browser automation, set the cookie
 * (`mantle-ui-theme=dark`) and reload.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme#themeprovider
 *
 * @example
 * ```tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 *
 * @example
 * ```tsx
 * // a page locked to light — mirror the same value everywhere it is forced
 * <ThemeProvider forceTheme="light">
 *   <App />
 * </ThemeProvider>
 * ```
 */
function ThemeProvider({ children, forceTheme, ssrCookie }: ThemeProviderProps) {
	// Why apply during init: the resolved class must be on `<html>` before first paint.
	// Why `ssrCookie` on the server only: the FOUC script can seed or migrate the
	// cookie before hydration. The client reads that newer value from `document.cookie`.
	const [theme, setTheme] = useState<Theme>(() => {
		const storedTheme = getStoredTheme({
			cookie: canUseDOM() ? document.cookie : ssrCookie,
		});
		applyThemeToHtml(storedTheme, { forceTheme });
		return storedTheme;
	});

	const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

	useEffect(() => {
		function syncThemeFromCookie() {
			const newTheme = getStoredTheme({ cookie: document.cookie });
			setTheme(newTheme);
			applyThemeToHtml(newTheme, { forceTheme });
		}

		// Re-sync on mount: the cookie can change between the first render and this effect.
		syncThemeFromCookie();

		// Why rewrite: a retired high-contrast cookie reads as its base theme, and the
		// rewrite stores that theme so every app on the cookie domain agrees.
		const storedValue = readCookie(document.cookie, THEME_STORAGE_KEY);
		if (
			storedValue != null &&
			!isTheme(storedValue) &&
			Object.hasOwn(themeByCookieValue, storedValue)
		) {
			setCookie(getStoredTheme({ cookie: document.cookie }));
		}

		// Why the feature test and the catch: Safari before 15.4 ships no
		// `BroadcastChannel`, and the constructor throws in a sandboxed iframe.
		try {
			if ("BroadcastChannel" in window) {
				broadcastChannelRef.current = new BroadcastChannel(THEME_STORAGE_KEY);
				// Why re-read the cookie: a tab on an older mantle can post a retired theme.
				broadcastChannelRef.current.addEventListener("message", syncThemeFromCookie);
			}
		} catch {
			// silently swallow errors
		}

		// The receive side of the `localStorage` ping. It stays registered even when
		// `BroadcastChannel` is available, because `notifyOtherTabs` writes the ping on
		// every call.
		function onStorage(event: StorageEvent) {
			if (event.key === `${THEME_STORAGE_KEY}__ping`) {
				syncThemeFromCookie();
			}
		}
		window.addEventListener("storage", onStorage);

		const prefersDarkMql = window.matchMedia(prefersDarkModeMediaQuery);

		function onChange() {
			syncThemeFromCookie();
		}

		function onVisibilityChange() {
			if (document.visibilityState === "visible") {
				syncThemeFromCookie();
			}
		}

		prefersDarkMql.addEventListener("change", onChange);

		// pageshow fires on bfcache restore (event.persisted === true) and some restore-from-freeze cases.
		window.addEventListener("pageshow", onChange);

		document.addEventListener("visibilitychange", onVisibilityChange);

		return () => {
			window.removeEventListener("storage", onStorage);
			prefersDarkMql.removeEventListener("change", onChange);
			window.removeEventListener("pageshow", onChange);
			document.removeEventListener("visibilitychange", onVisibilityChange);

			closeBroadcastChannel(broadcastChannelRef.current);
			broadcastChannelRef.current = null;
		};
	}, [forceTheme]);

	const value: ThemeProviderState = useMemo(
		() => [
			theme,
			(next: Theme | ((theme: Theme) => Theme), { origin }: SetThemeOptions = {}) => {
				// Why read `<html>` for an updater: the swap runs `update` in a later
				// frame, so a second call can come first. `update` writes `<html>` at once.
				const resolveNext = () => {
					if (typeof next !== "function") {
						return next;
					}
					const stored = document.documentElement.dataset.theme;
					return next(isTheme(stored) ? stored : theme);
				};
				const update = () => {
					const resolved = resolveNext();
					setCookie(resolved);
					setTheme(resolved);
					applyThemeToHtml(resolved, { forceTheme });
					notifyOtherTabs(resolved, {
						broadcastChannel: broadcastChannelRef.current,
						pingKey: `${THEME_STORAGE_KEY}__ping`,
					});
				};
				const prefersDarkMode = window.matchMedia(prefersDarkModeMediaQuery).matches;
				const nextAppliedTheme = forceTheme ?? resolveTheme(resolveNext(), { prefersDarkMode });
				// Why compare: a change the page does not show needs no reveal.
				if (nextAppliedTheme === document.documentElement.dataset.appliedTheme) {
					update();
				} else {
					swapTheme(update, { origin });
				}
			},
		],
		[forceTheme, theme],
	);

	return (
		<ForcedThemeContext.Provider value={forceTheme}>
			<ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>
		</ForcedThemeContext.Provider>
	);
}
/**
 * Returns the stored theme and a function to set it. A `setTheme` call that
 * changes the applied theme grows the new theme in a circle from
 * `options.origin` in a view transition. It swaps at once under reduced
 * motion, or when the browser has no view transitions. Pass an updater, such
 * as `(theme) => next`, when the next theme depends on the current one: it
 * reads the latest theme, even when a second call comes before the first
 * swap runs.
 *
 * @example
 * ```tsx
 * const [theme, setTheme] = useTheme();
 * <Button type="button" onClick={(event) => setTheme("dark", { origin: event.currentTarget })}>
 *   Dark
 * </Button>;
 * ```
 *
 * @see https://mantle.ngrok.com/components/primitives/theme
 *
 * @note This function will throw an error if used outside of a ThemeProvider context tree.
 */
function useTheme() {
	const context = useContext(ThemeProviderContext);

	invariant(context, "useTheme must be used within a ThemeProvider");

	return context;
}

/**
 * Applies the given theme to the `<html>` element.
 *
 * `forceTheme` pins what actually lands on the element: `data-theme` still
 * records the stored preference (so a theme switcher and the cookie stay
 * meaningful), while the class and `data-applied-theme` are the forced theme.
 */
function applyThemeToHtml(theme: Theme, { forceTheme }: { forceTheme?: ResolvedTheme } = {}) {
	if (!canUseDOM()) {
		return;
	}

	const html = window.document.documentElement;

	const prefersDarkMode = window.matchMedia(prefersDarkModeMediaQuery).matches;
	const resolvedTheme = forceTheme ?? resolveTheme(theme, { prefersDarkMode });

	const htmlTheme = html.dataset.theme;
	const htmlAppliedTheme = html.dataset.appliedTheme;

	const currentTheme = isTheme(htmlTheme) ? htmlTheme : undefined;
	const currentResolvedTheme = isResolvedTheme(htmlAppliedTheme) ? htmlAppliedTheme : undefined;

	if (currentTheme === theme && currentResolvedTheme === resolvedTheme) {
		return;
	}

	// Remove before add: `resolvedThemes` contains `resolvedTheme`, so the reverse order strips it.
	html.classList.remove(...resolvedThemes);
	html.classList.add(resolvedTheme);
	html.dataset.theme = theme;
	html.dataset.appliedTheme = resolvedTheme;
}

/**
 * Read the theme and applied theme from the `<html>` element.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme
 */
function readThemeFromHtmlElement() {
	if (!canUseDOM()) {
		return {
			appliedTheme: undefined,
			theme: undefined,
		};
	}

	const htmlElement = window.document.documentElement;
	const theme = isTheme(htmlElement.dataset.theme) ? htmlElement.dataset.theme : undefined;
	const appliedTheme = isResolvedTheme(htmlElement.dataset.appliedTheme)
		? htmlElement.dataset.appliedTheme
		: undefined;

	return {
		appliedTheme,
		theme,
	};
}

/**
 * Resolves `"system"` against the OS dark-mode preference, and returns any other theme unchanged.
 * The result mirrors what lands on the `<html>` element.
 */
function resolveTheme(
	theme: Theme,
	{ prefersDarkMode }: { prefersDarkMode: boolean },
): ResolvedTheme {
	if (theme === "system") {
		return prefersDarkMode ? "dark" : "light";
	}

	return theme;
}

/**
 * Returns the theme the page paints in: the provider's `forceTheme` when it
 * has one, else the stored theme with `"system"` resolved against the OS
 * dark-mode preference. The result mirrors what lands on the `<html>` element.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme
 */
function useAppliedTheme() {
	const themeContext = useContext(ThemeProviderContext);
	const forcedTheme = useForcedTheme();
	const theme = themeContext != null ? themeContext[0] : "system";

	const prefersDarkMode = useMatchesMediaQuery(prefersDarkModeMediaQuery);

	return forcedTheme ?? resolveTheme(theme, { prefersDarkMode });
}

/**
 * Returns the `forceTheme` of the nearest {@link ThemeProvider}, or
 * `undefined` when the page is not pinned. Internal: `ThemeSwitcher` reads it
 * to disable itself on a pinned page.
 */
function useForcedTheme() {
	return useContext(ForcedThemeContext);
}

/**
 * The FOUC-prevention bootstrap. `preventWrongThemeFlashScriptContent` inlines
 * this function into a blocking `<script>` in `<head>`. It puts the resolved
 * theme class on `<html>` before first paint, so the page never flashes the
 * wrong theme.
 *
 * It reads the theme cookie, resolves `"system"` against `prefers-color-scheme`,
 * and writes the class, `data-theme`, and `data-applied-theme`. It writes no
 * cookie: `ThemeProvider` owns the cookie.
 *
 * Why the arguments carry the constants: the inlined source is this function's
 * own text, so an imported helper or module constant is `undefined` at runtime.
 */
function preventThemeFlash({
	storageKey,
	themeByCookieValue,
	forceTheme,
}: {
	storageKey: string;
	themeByCookieValue: Readonly<Record<string, Theme>>;
	forceTheme: ResolvedTheme | undefined;
}) {
	let theme: Theme = "system";
	try {
		const pair = document.cookie
			.split(";")
			.map((cookie) => cookie.trim())
			.find((cookie) => cookie.startsWith(`${storageKey}=`));
		const value = decodeURIComponent(pair?.slice(storageKey.length + 1) ?? "");
		if (Object.hasOwn(themeByCookieValue, value)) {
			theme = themeByCookieValue[value] ?? "system";
		}
	} catch {
		// A blocked or malformed cookie falls back to "system".
	}

	let appliedTheme: ResolvedTheme = matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
	if (forceTheme != null) {
		appliedTheme = forceTheme;
	} else if (theme !== "system") {
		appliedTheme = theme;
	}

	const html = document.documentElement;
	html.classList.remove("light", "dark");
	html.classList.add(appliedTheme);
	html.dataset.theme = theme;
	html.dataset.appliedTheme = appliedTheme;
}

/**
 * preventWrongThemeFlashScriptContent generates a script that prevents the wrong theme from flashing on initial page load.
 * It checks cookies for a stored theme, and if none is found, it sets the default theme.
 * It also applies the correct theme to the `<html>` element based on the user's media query preferences.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme
 *
 * @param forceTheme - Pin the applied theme, bypassing the stored preference and
 * the OS. Mirror the value passed to `ThemeProvider` and `useInitialHtmlThemeProps`.
 *
 * @example
 * ```ts
 * // a page locked to light, rendered outside React (e.g. a Go template)
 * const scriptContent = preventWrongThemeFlashScriptContent("light");
 * ```
 */
function preventWrongThemeFlashScriptContent(forceTheme?: ResolvedTheme) {
	const args = {
		storageKey: THEME_STORAGE_KEY,
		themeByCookieValue,
		forceTheme,
	} satisfies Parameters<typeof preventThemeFlash>[0];

	return `(${preventThemeFlash.toString()})(${JSON.stringify(args)})`;
}

export type PreventWrongThemeFlashScriptProps = {
	/**
	 * Pin the theme this page paints in, bypassing the stored preference and the
	 * OS. Mirror the same value you pass `ThemeProvider` and
	 * `useInitialHtmlThemeProps`. This one writes the `<html>` class before first
	 * paint.
	 */
	forceTheme?: ResolvedTheme;
	/**
	 * An optional CSP nonce to allowlist this inline script. Using this can help
	 * you to avoid using the CSP `unsafe-inline` directive, which disables
	 * XSS protection and would allowlist all inline scripts or styles.
	 *
	 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/nonce
	 */
	nonce?: string;
};

/**
 * Renders an inline script that prevents Flash of Unstyled Content (FOUC) or the
 * wrong theme flashing on first paint.
 *
 * This is the preferred building block for SSR apps. Pair it with
 * {@link preloadFontLink} HTTP `Link` headers in your server entry so font fetches
 * begin before HTML is parsed. For client-only apps without header control, pair
 * it with {@link PreloadFont} elements in `<head>` instead.
 *
 * Place this as early as possible in the `<head>`.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme#preventwrongthemeflashscript
 *
 * @example
 * ```tsx
 * // entry.server.tsx — send font preloads as HTTP headers (preferred for SSR)
 * headers.set("Link", [
 *   `<${assetsCdnOrigin}>; rel=preconnect; crossorigin`,
 *   preloadFontLink("roobert"),
 *   preloadFontLink("jetbrains-mono"),
 * ].join(", "));
 *
 * // root.tsx — only the FOUC script in <head>
 * <head>
 *   <PreventWrongThemeFlashScript nonce={nonce} />
 * </head>
 * ```
 *
 * @param forceTheme - Optional theme to pin, mirroring `ThemeProvider` and `useInitialHtmlThemeProps`.
 * @param nonce - Optional CSP nonce to allowlist the inline script under a strict CSP.
 * @returns {JSX.Element} A script tag injected before first paint.
 * @see preloadFontLink
 * @see PreloadFont
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/nonce
 */
const PreventWrongThemeFlashScript = ({ forceTheme, nonce }: PreventWrongThemeFlashScriptProps) => (
	<script
		dangerouslySetInnerHTML={{
			__html: preventWrongThemeFlashScriptContent(forceTheme),
		}}
		nonce={nonce}
		suppressHydrationWarning
	/>
);
type InitialThemeProps = {
	className: string;
	"data-applied-theme": ResolvedTheme;
	"data-theme": Theme;
};

type UseInitialHtmlThemePropsOptions = {
	className?: string;
	/**
	 * Pin the resolved theme in the returned props, bypassing the cookie and the
	 * OS. Mirror the same value you pass `PreventWrongThemeFlashScript` and
	 * `ThemeProvider`.
	 */
	forceTheme?: ResolvedTheme;
	/**
	 * Theme cookie string for SSR theme resolution. Pass only the theme cookie
	 * pair (via {@link extractThemeCookie}) rather than the full raw `Cookie`
	 * header to avoid leaking sensitive cookies in serialized loader data.
	 */
	ssrCookie?: string;
};

/**
 * useInitialHtmlThemeProps returns the initial props that should be applied to the <html> element to prevent react hydration errors.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme#useinitialhtmlthemeprops
 */
function useInitialHtmlThemeProps(props: UseInitialHtmlThemePropsOptions = {}): InitialThemeProps {
	const { className = "", forceTheme, ssrCookie } = props ?? {};

	return useMemo(() => {
		let initialTheme: Theme;
		let resolvedTheme: ResolvedTheme;

		if (!canUseDOM()) {
			initialTheme = getStoredTheme({ cookie: ssrCookie });
			// Why assume light: the server cannot read media queries. The inline script
			// corrects a "system" page before paint.
			resolvedTheme = resolveTheme(initialTheme, { prefersDarkMode: false });
		} else {
			const prefersDarkMode = window.matchMedia(prefersDarkModeMediaQuery).matches;
			initialTheme = getStoredTheme({ cookie: document.cookie });
			resolvedTheme = resolveTheme(initialTheme, { prefersDarkMode });
		}

		const appliedTheme = forceTheme ?? resolvedTheme;

		return {
			className: cx(className, appliedTheme),
			"data-applied-theme": appliedTheme,
			"data-theme": initialTheme,
		};
	}, [className, forceTheme, ssrCookie]);
}

type GetStoredThemeOptions = {
	/**
	 * raw Cookie header (SSR) or document.cookie (client)
	 */
	cookie: string | null | undefined;
};

/**
 * Returns the persisted UI theme from a Cookie header string.
 *
 * Looks for a cookie named by {@link THEME_STORAGE_KEY}. A retired
 * high-contrast value returns its base theme (`"light"` or `"dark"`). Any other
 * value that is not a `Theme` returns {@link DEFAULT_THEME}. This function never
 * throws.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme
 *
 * @example
 * getStoredTheme({ cookie: `${THEME_STORAGE_KEY}=dark; session=abc` }) // "dark"
 * @example
 * getStoredTheme({ cookie: `${THEME_STORAGE_KEY}=dark-high-contrast` }) // "dark"
 * @example
 * getStoredTheme({ cookie: "" }) // DEFAULT_THEME
 */
function getStoredTheme({ cookie }: GetStoredThemeOptions): Theme {
	if (!cookie) {
		return DEFAULT_THEME;
	}

	const storedValue = readCookie(cookie, THEME_STORAGE_KEY);
	if (storedValue == null || !Object.hasOwn(themeByCookieValue, storedValue)) {
		return DEFAULT_THEME;
	}

	return themeByCookieValue[storedValue] ?? DEFAULT_THEME;
}

/**
 * Extract only the mantle theme cookie from a raw `Cookie` header string.
 *
 * Use this in SSR loaders to pass the theme cookie to {@link ThemeProvider}
 * and {@link useInitialHtmlThemeProps} without exposing
 * the full `Cookie` header (which may contain HttpOnly/session cookies) in
 * serialized loader data.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme#extractthemecookie
 *
 * @example
 * ```ts
 * // app/root.tsx loader
 * export const loader = async ({ request }: Route.LoaderArgs) => {
 *   const themeCookie = extractThemeCookie(request.headers.get("Cookie"));
 *   return { themeCookie };
 * };
 * ```
 *
 * @param cookieHeader - The raw `Cookie` header string from the request, or null/undefined.
 * @returns The `mantle-ui-theme=<value>` cookie string, or undefined if not found.
 */
function extractThemeCookie(cookieHeader: string | null | undefined): string | undefined {
	return findCookiePair(cookieHeader, THEME_STORAGE_KEY);
}

export {
	PreventWrongThemeFlashScript,
	ThemeProvider,
	//,
	extractThemeCookie,
	getStoredTheme,
	preventWrongThemeFlashScriptContent,
	readThemeFromHtmlElement,
	themeCookieDomain,
	useAppliedTheme,
	useForcedTheme,
	useInitialHtmlThemeProps,
	useTheme,
};

export type {
	//,
	SetThemeOptions,
};

/**
 * Notifies other open tabs (same origin) that the theme changed.
 *
 * Prefers a shared {@link BroadcastChannel} for immediate, reliable delivery.
 * Falls back to writing a unique “ping” value to `localStorage`, which triggers
 * the cross-tab `storage` event. Both mechanisms only work across the same origin.
 *
 * A timestamp in the ping value makes every write a new value, so the event fires.
 *
 * @remarks
 * - Same-origin only: BroadcastChannel and the `storage` event do not cross subdomains
 *   or different schemes/ports. For cross-subdomain sync, use a postMessage hub or server push.
 * - Fire-and-forget: it swallows every error on purpose.
 * - Receivers should re-read the cookie/source of truth and then apply the theme;
 *   don’t trust the payload blindly.
 *
 * @example
 * // Sender (inside your setter)
 * notifyOtherTabs(nextTheme, {
 *   broadcastChannel: broadcastChannelRef.current,
 *   pingKey: `${storageKey}__ping`,
 * });
 *
 * @example
 * // Receiver (setup once per tab)
 * const bc = new BroadcastChannel(storageKey);
 * bc.onmessage = () => syncThemeFromCookie();
 * window.addEventListener('storage', (e) => {
 *   if (e.key === `${storageKey}__ping`) syncThemeFromCookie();
 * });
 */
function notifyOtherTabs(
	theme: Theme,
	options: {
		broadcastChannel: BroadcastChannel | null;
		pingKey: `${string}__ping`;
	},
) {
	const { broadcastChannel, pingKey } = options;

	try {
		if (broadcastChannel) {
			// oxlint-disable unicorn/require-post-message-target-origin -- Why: BroadcastChannel.postMessage has no `targetOrigin` parameter, unlike Window.postMessage. A block, because the rule reports the closing line of the call.
			broadcastChannel.postMessage({
				theme,
				timestamp: Date.now(),
			});
			// oxlint-enable unicorn/require-post-message-target-origin
			return;
		}
	} catch {
		// silently swallow errors
	}

	// Why a separate ping key: the cookie stays the source of truth for the theme.
	try {
		localStorage.setItem(pingKey, JSON.stringify({ theme, timestamp: Date.now() }));
	} catch {
		// silently swallow errors
	}
}

/**
 * The ngrok sites that share one theme cookie. A cookie cannot span two
 * registrable domains, so each one keeps its own.
 */
const themeCookieDomains = ["ngrok.com", "ngrok.ai"] as const;

/**
 * Returns the `domain` attribute for the theme cookie on `hostname`: the ngrok
 * site that `hostname` is on or under, with a leading dot. Returns `undefined`
 * on every other host, so the cookie stays host-only there.
 *
 * Why a domain: the theme must follow the user across the subdomains of one
 * ngrok site, such as `ngrok.ai` and `app.ngrok.ai`.
 *
 * @example
 * themeCookieDomain("app.ngrok.ai"); // ".ngrok.ai"
 * themeCookieDomain("dashboard.ngrok.com"); // ".ngrok.com"
 * themeCookieDomain("localhost"); // undefined
 */
function themeCookieDomain(hostname: string) {
	const site = themeCookieDomains.find(
		(domain) => hostname === domain || hostname.endsWith(`.${domain}`),
	);

	return site == null ? undefined : `.${site}`;
}

function buildThemeCookie(value: string) {
	const expires = new Date();
	expires.setFullYear(expires.getFullYear() + 1);

	const { hostname, protocol } = window.location;
	const domain = themeCookieDomain(hostname);
	const domainAttribute = domain == null ? "" : `; domain=${domain}`;
	const secureAttribute = protocol === "https:" ? "; Secure" : "";

	return `${THEME_STORAGE_KEY}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/${domainAttribute}; SameSite=Lax${secureAttribute}` as const;
}

/**
 * Writes the theme cookie. Swallows the error when the environment blocks cookie writes.
 */
function setCookie(value: string) {
	if (!canUseDOM()) {
		return;
	}

	try {
		document.cookie = buildThemeCookie(value);
	} catch {
		// silently swallow errors
	}
}

/**
 * Closes the cross-tab channel. Swallows the error a channel in a torn-down
 * iframe throws, so the rest of the effect cleanup still runs.
 *
 * Why a module function: when a `try` inside a component holds a value block
 * (optional chaining, a ternary, or `&&`/`??`), React Compiler skips the whole
 * component. An `if` statement inside a `try` compiles, so the `BroadcastChannel`
 * feature test stays in the effect. This `try` therefore lives outside
 * `ThemeProvider`.
 */
function closeBroadcastChannel(channel: BroadcastChannel | null) {
	if (channel == null) {
		return;
	}

	try {
		channel.close();
	} catch {
		// silently swallow errors
	}
}
