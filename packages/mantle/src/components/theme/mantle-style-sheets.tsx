// oxlint-disable typescript/no-deprecated -- Why: this module defines the deprecated exports.
/**
 * Browser-accessible URL for mantle's former dark theme stylesheet.
 *
 * @deprecated `mantle.css` holds both themes. Delete the
 * `@ngrok/mantle/mantle-dark.css?url` import. A future minor release removes
 * this type.
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
 * Returns the URLs you pass it. It has no other effect.
 *
 * @deprecated `mantle.css` holds both themes. Delete this call and the
 * `@ngrok/mantle/mantle-dark.css?url` import. A future minor release removes
 * this function.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme
 *
 * @example
 * ```tsx
 * // Before: delete these lines.
 * import darkCssUrl from "@ngrok/mantle/mantle-dark.css?url";
 *
 * const themeUrls = mantleStyleSheetUrls({ darkCssUrl });
 * ```
 */
function mantleStyleSheetUrls(urls: MantleThemeCssUrls): MantleThemeCssUrls {
	return urls;
}

/**
 * Props for {@link MantleStyleSheets}: the dark theme stylesheet URL.
 *
 * @deprecated `mantle.css` holds both themes. A future minor release removes
 * this type.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme
 */
export type MantleStyleSheetsProps = MantleThemeCssUrls;

/**
 * Renders nothing. `mantle.css` holds both themes, so no second stylesheet is
 * necessary.
 *
 * @deprecated Delete `<MantleStyleSheets />` from `<head>`. A future minor
 * release removes this component.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme
 *
 * @example
 * ```tsx
 * // root.tsx: keep only the flash script in <head>.
 * import { PreventWrongThemeFlashScript } from "@ngrok/mantle/theme";
 *
 * <head>
 *   <PreventWrongThemeFlashScript nonce={nonce} />
 * </head>
 * ```
 */
function MantleStyleSheets(_props: MantleStyleSheetsProps) {
	return null;
}

export {
	//,
	mantleStyleSheetUrls,
	MantleStyleSheets,
};
