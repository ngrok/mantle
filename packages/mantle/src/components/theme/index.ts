/**
 * Re-exports for the Theme component — the provider and hooks that carry the
 * applied theme, plus the document tags that stop a wrong-theme flash.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme
 */

export {
	//,
	fixMediaScriptContent,
	mantleStyleSheetUrls,
	MantleStyleSheets,
} from "./mantle-style-sheets.js";

export type {
	//,
	MantleStyleSheetsProps,
	MantleThemeCssUrls,
} from "./mantle-style-sheets.js";

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
