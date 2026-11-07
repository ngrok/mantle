/**
 * Re-exports for the Theme component — the provider and hooks that carry the
 * applied theme, plus the document tags that stop a wrong-theme flash.
 *
 * @useWhen Apply the light or dark theme to an app, follow the operating system by default, and
 * stop a wrong-theme flash on load.
 *
 * @siblings
 * - `ThemeSwitcher`: the user changes the theme from a control in the UI.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme
 */

export {
	//,
	extractThemeCookie,
	getStoredTheme,
	PreventWrongThemeFlashScript,
	preventWrongThemeFlashScriptContent,
	readThemeFromHtmlElement,
	ThemeProvider,
	useAppliedTheme,
	useInitialHtmlThemeProps,
	useTheme,
} from "./theme-provider.js";

export {
	//,
	$theme,
	$resolvedTheme,
	isResolvedTheme,
	isTheme,
	resolvedThemes,
	themes,
} from "./themes.js";

export {
	//,
	assetsCdnOrigin,
	fontHref,
	preloadFontLink,
	PreloadFont,
} from "./fonts.js";

export type {
	//,
	CoreFontName,
} from "./fonts.js";

export type {
	//,
	Theme,
	ResolvedTheme,
} from "./themes.js";

export type {
	//,
	SetThemeOptions,
} from "./theme-provider.js";
