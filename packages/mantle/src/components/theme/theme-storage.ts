import { findCookiePair, readCookie } from "../../utils/cookie.js";
import type { ResolvedTheme, Theme } from "./themes.js";

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
	//,
	DEFAULT_THEME,
	THEME_STORAGE_KEY,
	extractThemeCookie,
	getStoredTheme,
	preventWrongThemeFlashScriptContent,
	themeByCookieValue,
};
