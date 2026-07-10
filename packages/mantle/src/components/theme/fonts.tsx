/**
 * @file Helpers for preloading ngrok brand fonts from the CDN.
 * All font URLs resolve to `${assetsCdnOrigin}/fonts`.
 */

/**
 * The origin for the assets CDN where custom ngrok fonts and assets are hosted.
 *
 * Keep this stable across the app so we can preconnect/DNS-prefetch consistently.
 * @public
 */
const assetsCdnOrigin = "https://assets.ngrok.com";

/**
 * Base path for font assets on the CDN.
 * @internal
 */
const cdnBase = `${assetsCdnOrigin}/fonts`;

const coreFontNames = [
	"roobert",
	"jetbrains-mono",
	"jetbrains-mono-italic",
	"family-regular",
	"family-italic",
] as const;
/**
 * Named keys identifying each individual core font.
 * @public
 */
type CoreFontName = (typeof coreFontNames)[number];

/**
 * Maps each {@link CoreFontName} to its CDN font path (relative to the fonts base).
 * @internal
 */
const coreFontPathByName = {
	roobert: "/roobert/roobert-proportional-vf.woff2",
	"jetbrains-mono": "/jetbrains/jetbrainsmono-wght.woff2",
	"jetbrains-mono-italic": "/jetbrains/jetbrainsmono-italic-wght.woff2",
	"family-regular": "/family/family-regular.woff2",
	"family-italic": "/family/family-italic.woff2",
} as const satisfies Record<CoreFontName, `/${string}`>;

type FontPath = `/${string}` | (string & {});

/**
 * Builds an absolute CDN URL for a given font.
 *
 * @returns {`https://assets.ngrok.com/fonts${T}`} An absolute, literal-typed CDN URL.
 *
 * @example
 * const href = fontHref("/roobert/roobert-proportional-vf.woff2");
 * // -> "https://assets.ngrok.com/fonts/roobert/roobert-proportional-vf.woff2"
 */
function fontHref<T extends FontPath = FontPath>(font: T) {
	const path = font.startsWith("/") ? font : `/${font}`;
	return `${cdnBase}${path}` as const;
}

/**
 * Props for {@link PreloadFont}.
 * @public
 */
type PreloadFontProps = {
	/**
	 * The name of the individual core font to preload.
	 *
	 * - `"roobert"` — Roobert proportional variable font
	 * - `"jetbrains-mono"` — JetBrains Mono variable weight
	 * - `"jetbrains-mono-italic"` — JetBrains Mono italic variable weight
	 * - `"family-regular"` — Family regular
	 * - `"family-italic"` — Family italic
	 */
	name: CoreFontName;
};

/**
 * Returns an HTTP `Link` header value that preloads a single core font by name.
 *
 * Identical in intent to {@link PreloadFont}, but for server-side use where
 * you want to send the preload hint as an HTTP header instead of (or in
 * addition to) an HTML `<link>` element. Sending this as a `Link` header lets
 * the browser start the font fetch before it has parsed any HTML.
 *
 * @remarks
 * For best performance, also send a `preconnect` hint to {@link assetsCdnOrigin}
 * in the same `Link` header.
 *
 * @example
 * ```ts
 * // In an HTTP handler / server entry:
 * headers.append("Link", preloadFontLink("roobert"));
 * headers.append("Link", preloadFontLink("jetbrains-mono"));
 *
 * // Or as a single combined header:
 * headers.set("Link", [
 *   `<${assetsCdnOrigin}>; rel=preconnect; crossorigin`,
 *   preloadFontLink("roobert"),
 * ].join(", "));
 * ```
 */
function preloadFontLink(name: CoreFontName): string {
	const href = fontHref(coreFontPathByName[name]);
	return `<${href}>; rel=preload; as=font; type="font/woff2"; crossorigin`;
}

/**
 * Preloads a single core font by name.
 *
 * Use this when you only need one or two specific fonts rather than all core
 * fonts. Include it as early as possible in the document `<head>`.
 *
 * @remarks
 * For best performance, pair this with preconnect/dns-prefetch hints to the CDN.
 *
 * @example
 * ```tsx
 * <head>
 *   <link rel="preconnect" href={assetsCdnOrigin} crossOrigin="anonymous" />
 *   <link rel="dns-prefetch" href={assetsCdnOrigin} />
 *   <PreloadFont name="roobert" />
 *   <PreloadFont name="jetbrains-mono" />
 * </head>
 * ```
 */
const PreloadFont = ({ name }: PreloadFontProps) => (
	<link
		rel="preload"
		href={fontHref(coreFontPathByName[name])}
		as="font"
		type="font/woff2"
		crossOrigin="anonymous"
	/>
);
PreloadFont.displayName = "PreloadFont";

export type { CoreFontName };

export {
	//,
	assetsCdnOrigin,
	fontHref,
	preloadFontLink,
	PreloadFont,
};
