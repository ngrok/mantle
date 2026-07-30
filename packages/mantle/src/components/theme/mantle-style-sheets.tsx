"use client";

import { useEffect } from "react";
import { getStoredTheme } from "./theme-provider.js";
import type { ResolvedTheme } from "./themes.js";
import { isResolvedTheme } from "./themes.js";

/**
 * Stable IDs for the three lazy-loaded theme `<link>` elements.
 * Used to locate them in the DOM for media attribute updates.
 */
const DARK_LINK_ID = "mantle-dark-styles";
const LIGHT_HIGH_CONTRAST_LINK_ID = "mantle-light-high-contrast-styles";
const DARK_HIGH_CONTRAST_LINK_ID = "mantle-dark-high-contrast-styles";

/**
 * Default `media` attribute values for each lazy-loaded stylesheet.
 * Each one matches only the OS preference for that theme, making them
 * non-render-blocking for users whose OS does not match.
 */
const MEDIA_DARK = "(prefers-color-scheme: dark)";
const MEDIA_LIGHT_HC = "(prefers-contrast: more) and (prefers-color-scheme: light)";
const MEDIA_DARK_HC = "(prefers-contrast: more) and (prefers-color-scheme: dark)";

type MediaValues = {
	dark: string;
	lightHighContrast: string;
	darkHighContrast: string;
};

/**
 * Compute the `media` attribute value for each stylesheet given the active theme.
 * When a theme is active (either from the resolved applied theme or a forced override),
 * its stylesheet's `media` is set to `"all"` so the CSS is applied regardless of OS preference.
 *
 * Theme *pairs* activate together (light with dark, light-high-contrast with
 * dark-high-contrast): the `invert-theme` class renders a subtree in the
 * opposite theme, so the pair partner's stylesheet must be applied too. The
 * light base ships in `mantle.css` and is always applied, so the light ⇄ dark
 * pair only needs the dark stylesheet forced.
 */
function computeMediaValues(
	appliedTheme: ResolvedTheme | undefined,
	forceTheme: ResolvedTheme | undefined,
): MediaValues {
	const theme = forceTheme ?? appliedTheme;
	const standardPair = theme === "light" || theme === "dark";
	const highContrastPair = theme === "light-high-contrast" || theme === "dark-high-contrast";
	return {
		dark: standardPair ? "all" : MEDIA_DARK,
		lightHighContrast: highContrastPair ? "all" : MEDIA_LIGHT_HC,
		darkHighContrast: highContrastPair ? "all" : MEDIA_DARK_HC,
	};
}

/**
 * Browser-accessible URLs for mantle's three lazy-loaded theme stylesheets.
 *
 * Use {@link mantleStyleSheetUrls} to create this object from Vite `?url` imports.
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
	/**
	 * Browser-accessible URL for `mantle-light-high-contrast.css`.
	 * @example
	 * ```tsx
	 * // in vite app
	 * import lightHighContrastCssUrl from "@ngrok/mantle/mantle-light-high-contrast.css?url"
	 * ```
	 */
	lightHighContrastCssUrl: string;
	/**
	 * Browser-accessible URL for `mantle-dark-high-contrast.css`.
	 * @example
	 * ```tsx
	 * // in vite app
	 * import darkHighContrastCssUrl from "@ngrok/mantle/mantle-dark-high-contrast.css?url"
	 * ```
	 */
	darkHighContrastCssUrl: string;
};

/**
 * Collects the three Vite `?url` imports for mantle's theme stylesheets into a typed object
 * that can be spread directly into `<MantleStyleSheets>`.
 *
 * Call this once at the top of your app entry (e.g. `root.tsx`) and spread the result:
 *
 * ```ts
 * import darkCssUrl from "@ngrok/mantle/mantle-dark.css?url";
 * import darkHighContrastCssUrl from "@ngrok/mantle/mantle-dark-high-contrast.css?url";
 * import lightHighContrastCssUrl from "@ngrok/mantle/mantle-light-high-contrast.css?url";
 *
 * const themeUrls = mantleStyleSheetUrls({ darkCssUrl, lightHighContrastCssUrl, darkHighContrastCssUrl });
 *
 * // In JSX:
 * <MantleStyleSheets {...themeUrls} nonce={nonce} ssrCookie={ssrCookie} />
 * ```
 *
 * @see https://mantle.ngrok.com/components/primitives/theme#mantlestylesheeturls
 */
function mantleStyleSheetUrls(urls: MantleThemeCssUrls): MantleThemeCssUrls {
	return urls;
}

/**
 * Props for {@link MantleStyleSheets} — the three theme stylesheet URLs plus optional
 * `forceTheme`, `ssrCookie`, and `nonce`.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme#mantlestylesheets
 */
export type MantleStyleSheetsProps = MantleThemeCssUrls & {
	/**
	 * Force a specific resolved theme's stylesheet *pair* to load unconditionally
	 * (`media="all"`), regardless of the user's OS preference. Use this when your app is locked
	 * to a single theme (e.g. a dark-only page) so the required CSS is render-blocking as
	 * intended.
	 *
	 * Pairs, not single themes: the partner stylesheet (light ⇄ dark, light-high-contrast ⇄
	 * dark-high-contrast) is what `invert-theme` islands resolve against, so it is loaded and
	 * applied too. `forceTheme="light"` therefore renders the dark link (light itself is the
	 * base theme in `mantle.css`), and `forceTheme="light-high-contrast"` renders both
	 * high-contrast links. Only the *other* pair is omitted.
	 *
	 * Because the partner is *applied*, this prop only controls half the picture: which
	 * theme block wins is decided by the class on `<html>`. Mirror the same value into
	 * `PreventWrongThemeFlashScript` and `ThemeProvider` (and `useInitialHtmlThemeProps`
	 * if you use it) — those own that class. Forcing here alone leaves a user whose stored
	 * preference is dark with `<html class="dark">` and the dark sheet applied, so a
	 * `forceTheme="light"` page paints dark.
	 *
	 * When omitted, each stylesheet uses its OS media query and becomes non-render-blocking
	 * for users whose OS preference does not match.
	 *
	 * @example
	 * // Dark-only app — always load the dark/light pair eagerly, and pin the root class
	 * <PreventWrongThemeFlashScript forceTheme="dark" nonce={nonce} />
	 * <MantleStyleSheets forceTheme="dark" {...themeUrls} />
	 * // …and <ThemeProvider forceTheme="dark"> around the app
	 */
	forceTheme?: ResolvedTheme;
	/**
	 * The theme cookie string from the incoming HTTP request (e.g. `request.headers.get("Cookie")`
	 * or the pre-extracted value from {@link extractThemeCookie}). When provided, the server can
	 * resolve the stored theme and render the correct `media` attribute directly in the SSR HTML,
	 * eliminating the need for the inline fix script in cases where the user has a non-system
	 * theme stored in their cookie.
	 *
	 * @example
	 * ```tsx
	 * // root.tsx loader
	 * export async function loader({ request }: Route.LoaderArgs) {
	 *   return { ssrCookie: extractThemeCookie(request.headers.get("Cookie")) };
	 * }
	 *
	 * // root.tsx component
	 * <MantleStyleSheets {...themeUrls} ssrCookie={loaderData.ssrCookie} nonce={nonce} />
	 * ```
	 */
	ssrCookie?: string;
	/**
	 * An optional CSP nonce to allowlist the inline script that fixes `media` attributes
	 * synchronously after the `<link>` tags are parsed. Mirror the same nonce you pass
	 * to {@link PreventWrongThemeFlashScript}.
	 *
	 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/nonce
	 */
	nonce?: string;
};

/**
 * Inline script that runs synchronously after the `<link>` tags are parsed to fix their
 * `media` attributes based on the applied theme already written to `html[data-applied-theme]`
 * by `PreventWrongThemeFlashScript`. This eliminates FOUC for users who have manually
 * selected a theme that differs from their OS preference.
 */
function fixMediaAttributes(args: {
	darkLinkId: string;
	lightHcLinkId: string;
	darkHcLinkId: string;
	mediaDark: string;
	mediaLightHc: string;
	mediaDarkHc: string;
	forceTheme: ResolvedTheme | undefined;
}) {
	const {
		darkLinkId,
		lightHcLinkId,
		darkHcLinkId,
		mediaDark,
		mediaLightHc,
		mediaDarkHc,
		forceTheme,
	} = args;
	const appliedTheme = document.documentElement.dataset.appliedTheme;
	const theme = forceTheme ?? appliedTheme;
	// Theme pairs activate together so `.invert-theme` subtrees always have
	// their opposite theme's stylesheet applied (light pairs with dark,
	// light-high-contrast with dark-high-contrast).
	const standardPair = theme === "light" || theme === "dark";
	const highContrastPair = theme === "light-high-contrast" || theme === "dark-high-contrast";

	const darkLink = document.getElementById(darkLinkId) as HTMLLinkElement | null;
	const lightHcLink = document.getElementById(lightHcLinkId) as HTMLLinkElement | null;
	const darkHcLink = document.getElementById(darkHcLinkId) as HTMLLinkElement | null;

	if (darkLink) {
		darkLink.media = standardPair ? "all" : mediaDark;
	}
	if (lightHcLink) {
		lightHcLink.media = highContrastPair ? "all" : mediaLightHc;
	}
	if (darkHcLink) {
		darkHcLink.media = highContrastPair ? "all" : mediaDarkHc;
	}
}

/**
 * Returns the raw JavaScript string for the inline `<script>` that runs synchronously
 * after the `<link>` tags are parsed to fix their `media` attributes based on the applied
 * theme already written to `html[data-applied-theme]` by `PreventWrongThemeFlashScript`.
 * This eliminates FOUC for users who have manually selected a theme that differs from
 * their OS preference.
 *
 * Use this when you need to inline the script directly into SSR HTML outside of a React
 * context — for example, in a legacy Go service that renders the initial HTML response.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme#fixmediascriptcontent
 *
 * @example
 * ```go
 * // In a Go template, inline script content that was pre-generated by mantle
 * // (e.g., via fixMediaScriptContent(undefined) in a JS/Node build step)
 * fmt.Fprintf(w, `<script nonce="%s">%s</script>`, nonce, scriptContent)
 * ```
 */
function fixMediaScriptContent(forceTheme?: ResolvedTheme): string {
	const args = {
		darkLinkId: DARK_LINK_ID,
		lightHcLinkId: LIGHT_HIGH_CONTRAST_LINK_ID,
		darkHcLinkId: DARK_HIGH_CONTRAST_LINK_ID,
		mediaDark: MEDIA_DARK,
		mediaLightHc: MEDIA_LIGHT_HC,
		mediaDarkHc: MEDIA_DARK_HC,
		forceTheme,
	} satisfies Parameters<typeof fixMediaAttributes>[0];
	return `(${fixMediaAttributes.toString()})(${JSON.stringify(args)})`;
}

/**
 * Renders `<link rel="stylesheet">` tags for the dark, light-high-contrast, and
 * dark-high-contrast theme CSS files. Each stylesheet is gated behind a `media` attribute
 * matching its OS preference so it is non-render-blocking for users who do not need it.
 *
 * Use {@link mantleStyleSheetUrls} to collect the required CSS URL props from Vite `?url`
 * imports and spread them in:
 *
 * ```ts
 * import darkCssUrl from "@ngrok/mantle/mantle-dark.css?url";
 * import darkHighContrastCssUrl from "@ngrok/mantle/mantle-dark-high-contrast.css?url";
 * import lightHighContrastCssUrl from "@ngrok/mantle/mantle-light-high-contrast.css?url";
 *
 * const themeUrls = mantleStyleSheetUrls({ darkCssUrl, lightHighContrastCssUrl, darkHighContrastCssUrl });
 * ```
 *
 * Place this component in `<head>`, after `<PreventWrongThemeFlashScript>`.
 *
 * On the client, a `MutationObserver` watches `html[data-applied-theme]` (kept in sync by
 * `ThemeProvider`) and updates the `media` attributes to `"all"` when the user manually
 * selects a theme that differs from their OS preference, ensuring the correct CSS is applied.
 *
 * Theme pairs load together — the active theme's pair partner (light ⇄ dark,
 * light-high-contrast ⇄ dark-high-contrast) also gets `media="all"` — so
 * `invert-theme` subtrees always have their opposite theme's CSS applied.
 *
 * When `forceTheme` is set, only the link tags for that theme's pair are rendered — the other
 * pair is omitted entirely to avoid unnecessary network requests. Note the pair partner is
 * applied (`media="all"`), not merely fetched, so it is render-blocking; that is what lets
 * `invert-theme` islands resolve under a forced theme.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme#mantlestylesheets
 *
 * @example
 * ```tsx
 * // root.tsx
 * import darkCssUrl from "@ngrok/mantle/mantle-dark.css?url";
 * import darkHighContrastCssUrl from "@ngrok/mantle/mantle-dark-high-contrast.css?url";
 * import lightHighContrastCssUrl from "@ngrok/mantle/mantle-light-high-contrast.css?url";
 * import { mantleStyleSheetUrls, MantleStyleSheets, PreventWrongThemeFlashScript } from "@ngrok/mantle/theme";
 *
 * const themeUrls = mantleStyleSheetUrls({ darkCssUrl, lightHighContrastCssUrl, darkHighContrastCssUrl });
 *
 * <head>
 *   <PreventWrongThemeFlashScript nonce={nonce} />
 *   <MantleStyleSheets {...themeUrls} nonce={nonce} ssrCookie={loaderData?.ssrCookie} />
 * </head>
 * ```
 */
function MantleStyleSheets({
	darkCssUrl,
	lightHighContrastCssUrl,
	darkHighContrastCssUrl,
	forceTheme,
	nonce,
	ssrCookie,
}: MantleStyleSheetsProps) {
	useEffect(() => {
		function getAppliedTheme(): ResolvedTheme | undefined {
			const value = document.documentElement.dataset.appliedTheme;
			return isResolvedTheme(value) ? value : undefined;
		}

		function updateMediaAttributes() {
			const { dark, lightHighContrast, darkHighContrast } = computeMediaValues(
				getAppliedTheme(),
				forceTheme,
			);

			const darkLink = document.getElementById(DARK_LINK_ID) as HTMLLinkElement | null;
			const lightHighContrastLink = document.getElementById(
				LIGHT_HIGH_CONTRAST_LINK_ID,
			) as HTMLLinkElement | null;
			const darkHighContrastLink = document.getElementById(
				DARK_HIGH_CONTRAST_LINK_ID,
			) as HTMLLinkElement | null;

			if (darkLink) {
				darkLink.media = dark;
			}
			if (lightHighContrastLink) {
				lightHighContrastLink.media = lightHighContrast;
			}
			if (darkHighContrastLink) {
				darkHighContrastLink.media = darkHighContrast;
			}
		}

		// Sync immediately on mount in case the applied theme diverges from the SSR-rendered media values
		updateMediaAttributes();

		// Watch for theme changes driven by ThemeProvider
		const observer = new MutationObserver(updateMediaAttributes);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-applied-theme"],
		});

		return () => {
			observer.disconnect();
		};
	}, [forceTheme]);

	// On SSR (and as the initial React render), emit the link tags with media values
	// derived from the cookie-stored theme (if available) and forceTheme.
	// The useEffect above will correct them on the client before the user can interact.
	const ssrStoredTheme = ssrCookie != null ? getStoredTheme({ cookie: ssrCookie }) : undefined;
	const ssrAppliedTheme = ssrStoredTheme !== "system" ? ssrStoredTheme : undefined;
	const { dark, lightHighContrast, darkHighContrast } = computeMediaValues(
		ssrAppliedTheme,
		forceTheme,
	);

	// The inline fix script corrects media attributes for users whose stored theme differs from
	// their OS preference. It is only needed when the SSR HTML may have been rendered with
	// incorrect media values — i.e. when neither ssrCookie (with a non-system theme) nor
	// forceTheme provide a deterministic answer at render time.
	const needsFixScript = !forceTheme && ssrAppliedTheme == null;

	// When forceTheme is set, only render the link tags for that theme's *pair*
	// (light with dark, light-high-contrast with dark-high-contrast) — the pair
	// partner's stylesheet must be applied so `.invert-theme` subtrees can render
	// in the opposite theme. Light is the base theme with no dedicated lazy
	// stylesheet, so forceTheme="light" renders only the dark link. When
	// forceTheme is unset, all three are rendered.
	//
	// Both high-contrast links share one predicate on purpose: they are a pair, so
	// they are always rendered together or not at all.
	const renderDark =
		!forceTheme || (forceTheme !== "light-high-contrast" && forceTheme !== "dark-high-contrast");
	const renderHighContrastPair =
		!forceTheme || forceTheme === "light-high-contrast" || forceTheme === "dark-high-contrast";

	return (
		<>
			{renderDark && (
				<link
					rel="stylesheet"
					id={DARK_LINK_ID}
					href={darkCssUrl}
					media={dark}
					suppressHydrationWarning
				/>
			)}
			{renderHighContrastPair && (
				<link
					rel="stylesheet"
					id={LIGHT_HIGH_CONTRAST_LINK_ID}
					href={lightHighContrastCssUrl}
					media={lightHighContrast}
					suppressHydrationWarning
				/>
			)}
			{renderHighContrastPair && (
				<link
					rel="stylesheet"
					id={DARK_HIGH_CONTRAST_LINK_ID}
					href={darkHighContrastCssUrl}
					media={darkHighContrast}
					suppressHydrationWarning
				/>
			)}
			{needsFixScript && (
				<script
					dangerouslySetInnerHTML={{ __html: fixMediaScriptContent(forceTheme) }}
					nonce={nonce}
					suppressHydrationWarning
				/>
			)}
		</>
	);
}
export {
	//,
	fixMediaScriptContent,
	mantleStyleSheetUrls,
	MantleStyleSheets,
};
