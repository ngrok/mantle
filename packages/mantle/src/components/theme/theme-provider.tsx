"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import invariant from "tiny-invariant";
import { useMatchesMediaQuery } from "../../hooks/use-matches-media-query.js";
import { cx } from "../../utils/cx/cx.js";
import { canUseDOM } from "../browser-only/browser-only.js";
import {
	type ResolvedTheme,
	type Theme,
	isResolvedTheme,
	isTheme,
	resolvedThemes,
	themes,
} from "./themes.js";

/**
 * prefersDarkModeMediaQuery is the media query used to detect if the user prefers dark mode.
 */
const prefersDarkModeMediaQuery = "(prefers-color-scheme: dark)";

/**
 * prefersHighContrastMediaQuery is the media query used to detect if the user prefers high contrast mode.
 */
const prefersHighContrastMediaQuery = "(prefers-contrast: more)";

/**
 * THEME_STORAGE_KEY is the key used to store the theme in cookies.
 */
const THEME_STORAGE_KEY = "mantle-ui-theme";

/**
 * DEFAULT_THEME is the initial theme to apply if no value is found in storage.
 * {@link themes}
 */
const DEFAULT_THEME = "system" satisfies Theme;

/**
 * ThemeProviderState is the shape of the state returned by the ThemeProviderContext.
 */
type ThemeProviderState = [theme: Theme, setTheme: (theme: Theme) => void];

/**
 * Initial state for the ThemeProviderContext.
 */
const initialState: ThemeProviderState = ["system", () => null];

/**
 * ThemeProviderContext is a React Context that provides the current theme and a function to set the theme.
 */
const ThemeProviderContext = createContext<ThemeProviderState | null>(initialState);

type ThemeProviderProps = PropsWithChildren;

/**
 * ThemeProvider is a React Context Provider that provides the current theme and a function to set the theme.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme#themeprovider
 *
 * @example
 * ```tsx
 * <ThemeProvider defaultTheme="system" storageKey="app-theme">
 *   <App />
 * </ThemeProvider>
 * ```
 */
function ThemeProvider({ children }: ThemeProviderProps) {
	// Init once from cookie and apply immediately to avoid flashes
	const [theme, setTheme] = useState<Theme>(() => {
		const storedTheme = getStoredTheme({
			cookie: canUseDOM() ? document.cookie : null,
		});
		applyThemeToHtml(storedTheme);
		return storedTheme;
	});

	const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

	useEffect(() => {
		function syncThemeFromCookie(next?: Theme) {
			const newTheme = next ?? getStoredTheme({ cookie: document.cookie });
			setTheme(newTheme);
			applyThemeToHtml(newTheme);
		}

		// initial sync in case defaultTheme or storageKey changed
		syncThemeFromCookie();

		// add cross-tab listeners (prefer broadcast channel, use localStorage as fallback)
		try {
			if ("BroadcastChannel" in window) {
				broadcastChannelRef.current = new BroadcastChannel(THEME_STORAGE_KEY);
				broadcastChannelRef.current.addEventListener("message", (event) => {
					const value: unknown = event?.data?.theme;
					if (isTheme(value)) {
						syncThemeFromCookie(value);
					}
				});
			}
		} catch {
			// silently swallow errors
		}

		function onStorage(event: StorageEvent) {
			if (event.key === `${THEME_STORAGE_KEY}__ping`) {
				syncThemeFromCookie();
			}
		}
		window.addEventListener("storage", onStorage);

		// add media query listeners for system theme changes
		const prefersDarkMql = window.matchMedia(prefersDarkModeMediaQuery);
		const prefersHighContrastMql = window.matchMedia(prefersHighContrastMediaQuery);

		function onChange() {
			syncThemeFromCookie();
		}

		function onVisibilityChange() {
			if (document.visibilityState === "visible") {
				syncThemeFromCookie();
			}
		}

		prefersDarkMql.addEventListener("change", onChange);
		prefersHighContrastMql.addEventListener("change", onChange);

		// pageshow fires on bfcache restore (event.persisted === true) and some restore-from-freeze cases.
		window.addEventListener("pageshow", onChange);

		// visibilitychange to handle coming back to a tab
		document.addEventListener("visibilitychange", onVisibilityChange);

		// don't forget to clean up your slop!
		return () => {
			window.removeEventListener("storage", onStorage);
			prefersDarkMql.removeEventListener("change", onChange);
			prefersHighContrastMql.removeEventListener("change", onChange);
			window.removeEventListener("pageshow", onChange);
			document.removeEventListener("visibilitychange", onVisibilityChange);

			try {
				broadcastChannelRef.current?.close();
			} catch {
				// silently swallow errors
			}
			broadcastChannelRef.current = null;
		};
	}, []);

	const value: ThemeProviderState = useMemo(
		() => [
			theme,
			(next: Theme) => {
				setCookie(next);
				setTheme(next);
				applyThemeToHtml(next);
				notifyOtherTabs(next, {
					broadcastChannel: broadcastChannelRef.current,
					pingKey: `${THEME_STORAGE_KEY}__ping`,
				});
			},
		],
		[theme],
	);

	return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>;
}
/**
 * useTheme returns the current theme and a function to set the theme.
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
 */
function applyThemeToHtml(theme: Theme) {
	if (!canUseDOM()) {
		return;
	}

	const html = window.document.documentElement;

	const prefersDarkMode = window.matchMedia(prefersDarkModeMediaQuery).matches;
	const prefersHighContrast = window.matchMedia(prefersHighContrastMediaQuery).matches;

	const resolvedTheme = resolveTheme(theme, {
		prefersDarkMode,
		prefersHighContrast,
	});

	const htmlTheme = html.dataset.theme;
	const htmlAppliedTheme = html.dataset.appliedTheme;

	const currentTheme = isTheme(htmlTheme) ? htmlTheme : undefined;
	const currentResolvedTheme = isResolvedTheme(htmlAppliedTheme) ? htmlAppliedTheme : undefined;

	if (currentTheme === theme && currentResolvedTheme === resolvedTheme) {
		// nothing to do: input theme and resolved class already match
		return;
	}

	// Clear any stale theme class, then apply the new one
	html.classList.remove(...resolvedThemes); // ✅ remove all potential theme classes
	html.classList.add(resolvedTheme);
	html.dataset.theme = theme;
	html.dataset.appliedTheme = resolvedTheme;
}

/**
 * Read the theme and applied theme from the `<html>` element.
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
 * If the theme is "system", it will resolve the theme based on the user's media query preferences, otherwise it will return the theme as is.
 * This will mirror the result that gets applied to the <html> element.
 */
function resolveTheme(
	theme: Theme,
	{
		prefersDarkMode,
		prefersHighContrast,
	}: { prefersDarkMode: boolean; prefersHighContrast: boolean },
) {
	if (theme === "system") {
		return determineThemeFromMediaQuery({
			prefersDarkMode,
			prefersHighContrast,
		});
	}

	return theme;
}

/**
 * If the theme is "system", it will resolve the theme based on the user's media query preferences, otherwise it will return the theme as is.
 * This will mirror the result that gets applied to the <html> element.
 */
function useAppliedTheme() {
	const themeContext = useContext(ThemeProviderContext);
	const theme = themeContext != null ? themeContext[0] : "system";

	const prefersDarkMode = useMatchesMediaQuery(prefersDarkModeMediaQuery);
	const prefersHighContrast = useMatchesMediaQuery(prefersHighContrastMediaQuery);

	return resolveTheme(theme, { prefersDarkMode, prefersHighContrast });
}

/**
 * determineThemeFromMediaQuery returns the theme that should be used based on the user's media query preferences.
 * @private
 *
 * @example
 * ```tsx
 * const theme = determineThemeFromMediaQuery({
 *   prefersDarkMode: true,
 *   prefersHighContrast: false
 * });
 * // Returns: "dark"
 *
 * const themeWithContrast = determineThemeFromMediaQuery({
 *   prefersDarkMode: false,
 *   prefersHighContrast: true
 * });
 * // Returns: "light-high-contrast"
 * ```
 */
export function determineThemeFromMediaQuery({
	prefersDarkMode,
	prefersHighContrast,
}: {
	prefersDarkMode: boolean;
	prefersHighContrast: boolean;
}): ResolvedTheme {
	if (prefersHighContrast) {
		return prefersDarkMode ? "dark-high-contrast" : "light-high-contrast";
	}

	return prefersDarkMode ? "dark" : "light";
}

/**
 * The FOUC-prevention bootstrap. This entire function is stringified and inlined
 * into a blocking `<script>` in the document head; it runs synchronously before
 * React mounts (and before first paint) so the resolved theme class is on
 * `<html>` by the time the browser paints, avoiding a light→dark (or vice-versa)
 * flash.
 *
 * Resolution order:
 *  1. Read the stored preference: cookie first, then `localStorage` (legacy fallback).
 *  2. Validate it against the configured `themes`; fall back to `defaultTheme` otherwise.
 *  3. If the preference is `"system"`, resolve against the OS media queries
 *     (`prefers-color-scheme`, `prefers-contrast`).
 *  4. Apply the resolved class to `<html>` and refresh the cookie so subsequent
 *     SSRs see the same value.
 *
 * Why nested helpers: this function is serialized verbatim into the inlined
 * script, so it must be hermetic — every helper it calls has to travel with it.
 * Hoisting them to module scope would leave dangling references in the inlined
 * source. All catches are intentionally swallowing to keep the script crash-free
 * in environments where cookies / `localStorage` / `matchMedia` throw (sandboxed
 * iframes, privacy modes, SSR-style polyfills).
 *
 * @param args.storageKey                    Cookie + localStorage key for the persisted theme.
 * @param args.defaultTheme                  Theme to use when no valid preference is stored.
 * @param args.themes                        Allowed `Theme` values (used to validate stored input).
 * @param args.resolvedThemes                Allowed `ResolvedTheme` class names applied to `<html>`.
 * @param args.prefersDarkModeMediaQuery     Media query string for OS dark-mode detection.
 * @param args.prefersHighContrastMediaQuery Media query string for OS high-contrast detection.
 */
function preventThemeFlash(args: {
	storageKey: string;
	defaultTheme: Theme;
	themes: readonly Theme[];
	resolvedThemes: readonly ResolvedTheme[];
	prefersDarkModeMediaQuery: string;
	prefersHighContrastMediaQuery: string;
}) {
	const {
		storageKey,
		defaultTheme,
		themes,
		resolvedThemes,
		prefersDarkModeMediaQuery,
		prefersHighContrastMediaQuery,
	} = args;

	function isTheme(value: unknown): value is Theme {
		return typeof value === "string" && themes.includes(value as Theme);
	}

	// Nested helpers below must stay inside `preventThemeFlash` so they are
	// included when the function is stringified into the inlined FOUC-prevention
	// script. Hoisting them would leave dangling references at runtime.
	// oxlint-disable-next-line unicorn/consistent-function-scoping
	function getThemeFromCookie(name: string): string | null {
		const cookie = document.cookie;
		if (!cookie) {
			return null;
		}

		try {
			const cookies = cookie.split(";");
			const themeCookie = cookies.find((c) => c.trim().startsWith(`${name}=`));
			const cookieValue = themeCookie?.split("=")[1];
			const storedTheme = cookieValue ? decodeURIComponent(cookieValue) : null;
			return storedTheme;
		} catch {
			return null;
		}
	}

	// oxlint-disable-next-line unicorn/consistent-function-scoping -- stringified into the inlined FOUC script; see note above.
	function buildCookie(name: string, val: string): string {
		const expires = new Date();
		expires.setFullYear(expires.getFullYear() + 1);
		const hostname = window.location.hostname;
		const protocol = window.location.protocol;
		const domainAttribute =
			hostname === "ngrok.com" || hostname.endsWith(".ngrok.com") ? "; domain=.ngrok.com" : "";
		const secureAttribute = protocol === "https:" ? "; Secure" : "";
		return `${name}=${encodeURIComponent(val)}; expires=${expires.toUTCString()}; path=/${domainAttribute}; SameSite=Lax${secureAttribute}`;
	}

	function writeCookie(name: string, val: string): void {
		try {
			document.cookie = buildCookie(name, val);
		} catch {
			// silently swallow errors
		}
	}

	// oxlint-disable-next-line unicorn/consistent-function-scoping -- stringified into the inlined FOUC script; see note above.
	function resolveThemeValue(
		theme: Theme,
		isDark: boolean,
		isHighContrast: boolean,
	): ResolvedTheme {
		if (theme === "system") {
			if (isHighContrast) {
				return isDark ? "dark-high-contrast" : "light-high-contrast";
			}
			return isDark ? "dark" : "light";
		}
		return theme;
	}

	// 1) Read preference: cookie first, fallback to localStorage (migration support)
	let cookieTheme: string | null = null;
	let lsTheme: string | null = null;
	let storedTheme: Theme | null = null;

	try {
		cookieTheme = getThemeFromCookie(storageKey);
	} catch {
		// silently swallow errors
	}

	if (isTheme(cookieTheme)) {
		storedTheme = cookieTheme;
	} else {
		try {
			lsTheme = window.localStorage?.getItem(storageKey) ?? null;
		} catch {
			// silently swallow errors
		}
		if (isTheme(lsTheme)) {
			storedTheme = lsTheme;
		}
	}

	const preference = isTheme(storedTheme) ? storedTheme : defaultTheme;

	// 2) Resolve theme based on media queries
	const isDark = matchMedia(prefersDarkModeMediaQuery).matches;
	const isHighContrast = matchMedia(prefersHighContrastMediaQuery).matches;
	const resolvedTheme = resolveThemeValue(preference, isDark, isHighContrast);

	const html = document.documentElement;
	// 3) Apply theme to DOM (same order as applyThemeToHtml)
	if (html.dataset.appliedTheme !== resolvedTheme || html.dataset.theme !== preference) {
		// Remove all theme classes
		for (const themeClass of resolvedThemes as readonly string[]) {
			html.classList.remove(themeClass);
		}
		// Add resolved theme class
		html.classList.add(resolvedTheme);
		// Set data attributes
		html.dataset.theme = preference;
		html.dataset.appliedTheme = resolvedTheme;
	}

	// 4) Handle persistence/migration synchronously to prevent FOUC
	const hadValidCookie = isTheme(cookieTheme);
	try {
		if (isTheme(lsTheme) && !hadValidCookie) {
			// Migrate from localStorage to cookie
			writeCookie(storageKey, lsTheme);
			try {
				window.localStorage.removeItem(storageKey);
			} catch {
				// silently swallow errors
			}
		} else if (!hadValidCookie) {
			// Set default cookie if none existed
			writeCookie(storageKey, preference);
		}
	} catch {
		// silently swallow errors
	}
}

/**
 * preventWrongThemeFlashScriptContent generates a script that prevents the wrong theme from flashing on initial page load.
 * It checks cookies for a stored theme, and if none is found, it sets the default theme.
 * It also applies the correct theme to the `<html>` element based on the user's media query preferences.
 */
function preventWrongThemeFlashScriptContent() {
	const args = {
		storageKey: THEME_STORAGE_KEY,
		defaultTheme: DEFAULT_THEME,
		themes,
		resolvedThemes,
		prefersDarkModeMediaQuery,
		prefersHighContrastMediaQuery,
	} as const satisfies Parameters<typeof preventThemeFlash>[0];

	return `(${preventThemeFlash.toString()})(${JSON.stringify(args)})`;
}

export type PreventWrongThemeFlashScriptProps = {
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
 * @param nonce - Optional CSP nonce to allowlist the inline script under a strict CSP.
 * @returns {JSX.Element} A script tag injected before first paint.
 * @see preloadFontLink
 * @see PreloadFont
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/nonce
 */
const PreventWrongThemeFlashScript = ({ nonce }: PreventWrongThemeFlashScriptProps) => (
	<script
		dangerouslySetInnerHTML={{
			__html: preventWrongThemeFlashScriptContent(),
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
	 * Theme cookie string for SSR theme resolution. Pass only the theme cookie
	 * pair (via {@link extractThemeCookie}) rather than the full raw `Cookie`
	 * header to avoid leaking sensitive cookies in serialized loader data.
	 */
	ssrCookie?: string;
};

/**
 * useInitialHtmlThemeProps returns the initial props that should be applied to the <html> element to prevent react hydration errors.
 */
function useInitialHtmlThemeProps(props: UseInitialHtmlThemePropsOptions = {}): InitialThemeProps {
	const { className = "", ssrCookie } = props ?? {};

	return useMemo(() => {
		let initialTheme: Theme;
		let resolvedTheme: ResolvedTheme;

		if (!canUseDOM()) {
			initialTheme = getStoredTheme({ cookie: ssrCookie });
			resolvedTheme = resolveTheme(initialTheme, {
				// During SSR we can't detect media queries, so assume light/no high contrast.
				// The inline script will correct this before paint for "system" theme users.
				prefersDarkMode: false,
				prefersHighContrast: false,
			});
		} else {
			const prefersDarkMode = window.matchMedia(prefersDarkModeMediaQuery).matches;
			const prefersHighContrast = window.matchMedia(prefersHighContrastMediaQuery).matches;
			initialTheme = getStoredTheme({ cookie: document.cookie });
			resolvedTheme = resolveTheme(initialTheme, {
				prefersDarkMode,
				prefersHighContrast,
			});
		}

		return {
			className: cx(className, resolvedTheme),
			"data-applied-theme": resolvedTheme,
			"data-theme": initialTheme,
		};
	}, [className, ssrCookie]);
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
 * Looks for a cookie named by {@link THEME_STORAGE_KEY} and returns its value **iff**
 * it’s a valid `Theme` per `isTheme`. Otherwise, falls back to
 * {@link DEFAULT_THEME}. This function never throws; malformed encodings or
 * missing cookies quietly return the default.
 *
 * @example
 * getStoredTheme({ cookie: `${THEME_STORAGE_KEY}=dark; session=abc` }) // "dark"
 * @example
 * getStoredTheme({ cookie: "" }) // DEFAULT_THEME
 */
function getStoredTheme({ cookie }: GetStoredThemeOptions): Theme {
	if (!cookie) {
		return DEFAULT_THEME;
	}

	try {
		const cookies = cookie.split(";");
		const themeCookie = cookies.find((cookieStr) =>
			cookieStr.trim().startsWith(`${THEME_STORAGE_KEY}=`),
		);
		const cookieValue = themeCookie?.split("=")[1];
		const storedTheme = cookieValue ? globalThis.decodeURIComponent(cookieValue) : null;

		return isTheme(storedTheme) ? storedTheme : DEFAULT_THEME;
	} catch {
		return DEFAULT_THEME;
	}
}

/**
 * Extract just the mantle theme cookie from a raw `Cookie` header string.
 *
 * Use this in SSR loaders to safely pass the theme cookie to
 * {@link useInitialHtmlThemeProps} without exposing the full `Cookie` header
 * (which may contain HttpOnly/session cookies) in serialized loader data.
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
	if (!cookieHeader) {
		return undefined;
	}

	return cookieHeader
		.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith(`${THEME_STORAGE_KEY}=`));
}

export {
	PreventWrongThemeFlashScript,
	ThemeProvider,
	//,
	extractThemeCookie,
	getStoredTheme,
	preventWrongThemeFlashScriptContent,
	readThemeFromHtmlElement,
	useAppliedTheme,
	useInitialHtmlThemeProps,
	useTheme,
};

/**
 * Notifies other open tabs (same origin) that the theme changed.
 *
 * Prefers a shared {@link BroadcastChannel} for immediate, reliable delivery.
 * Falls back to writing a unique “ping” value to `localStorage`, which triggers
 * the cross-tab `storage` event. Both mechanisms only work across the same origin.
 *
 * Uses a timestamp to ensure the storage value always changes so the event fires.
 *
 * @remarks
 * - Same-origin only: BroadcastChannel and the `storage` event do not cross subdomains
 *   or different schemes/ports. For cross-subdomain sync, use a postMessage hub or server push.
 * - This function is fire-and-forget and intentionally swallows errors.
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

	// first try BroadcastChannel
	try {
		if (broadcastChannel) {
			// BroadcastChannel.postMessage has no `targetOrigin` parameter (unlike Window.postMessage); the rule can't distinguish the two.
			// oxlint-disable unicorn/require-post-message-target-origin
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

	// fallback to storage event: write a "ping" key (not the real storageKey)
	try {
		localStorage.setItem(pingKey, JSON.stringify({ theme, timestamp: Date.now() }));
	} catch {
		// silently swallow errors
	}
}

function buildThemeCookie(value: string) {
	const expires = new Date();
	expires.setFullYear(expires.getFullYear() + 1); // 1 year expiration

	// Only set .ngrok.com domain for ngrok domains, otherwise let it default to current domain
	const { hostname, protocol } = window.location;
	const domainAttribute =
		hostname === "ngrok.com" || hostname.endsWith(".ngrok.com") ? "; domain=.ngrok.com" : "";
	const secureAttribute = protocol === "https:" ? "; Secure" : "";

	return `${THEME_STORAGE_KEY}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/${domainAttribute}; SameSite=Lax${secureAttribute}` as const;
}

/**
 * Sets a cookie with appropriate domain for the current hostname.
 * Uses .ngrok.com for ngrok domains, otherwise no domain (current domain only).
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
