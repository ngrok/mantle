/**
 * Browser-accessible URL for mantle's lazy-loaded dark theme stylesheet.
 *
 * Use {@link mantleStyleSheetUrls} to create this object from a Vite `?url` import.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme
 */
export type MantleThemeCssUrls = {
	/**
	 * Browser-accessible URL for `mantle-dark.css`.
	 * @example
	 * ```tsx
	 * // in vite app
	 * import darkCssUrl from "@ngrok/mantle/mantle-dark.css?url"
	 * ```
	 */
	darkCssUrl: string;
};

/**
 * Collects the Vite `?url` import for mantle's dark theme stylesheet into a typed object
 * that can be spread directly into `<MantleStyleSheets>`.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme#mantlestylesheeturls
 *
 * @example
 * ```tsx
 * import darkCssUrl from "@ngrok/mantle/mantle-dark.css?url";
 *
 * const themeUrls = mantleStyleSheetUrls({ darkCssUrl });
 *
 * <MantleStyleSheets {...themeUrls} />
 * ```
 */
function mantleStyleSheetUrls(urls: MantleThemeCssUrls): MantleThemeCssUrls {
	return urls;
}

/**
 * Props for {@link MantleStyleSheets}: the dark theme stylesheet URL.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme#mantlestylesheets
 */
export type MantleStyleSheetsProps = MantleThemeCssUrls;

/**
 * Renders the `<link rel="stylesheet">` for mantle's dark theme. Every page
 * needs it, light pages included: light and dark are a pair, and an
 * `invert-theme` subtree on a light page paints in dark. The sheet scopes each
 * rule to the dark theme class, so it changes nothing on a light page outside
 * those subtrees.
 *
 * Place this component in `<head>`, after `<PreventWrongThemeFlashScript>`.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme#mantlestylesheets
 *
 * @example
 * ```tsx
 * // root.tsx
 * import darkCssUrl from "@ngrok/mantle/mantle-dark.css?url";
 * import { mantleStyleSheetUrls, MantleStyleSheets, PreventWrongThemeFlashScript } from "@ngrok/mantle/theme";
 *
 * const themeUrls = mantleStyleSheetUrls({ darkCssUrl });
 *
 * <head>
 *   <PreventWrongThemeFlashScript nonce={nonce} />
 *   <MantleStyleSheets {...themeUrls} />
 * </head>
 * ```
 */
function MantleStyleSheets({ darkCssUrl }: MantleStyleSheetsProps) {
	return <link rel="stylesheet" id="mantle-dark-styles" href={darkCssUrl} />;
}

export {
	//,
	mantleStyleSheetUrls,
	MantleStyleSheets,
};
