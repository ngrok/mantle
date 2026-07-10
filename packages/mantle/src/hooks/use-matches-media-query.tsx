import { useCallback, useSyncExternalStore } from "react";

/**
 * React hook that subscribes to a CSS media query and returns whether it
 * currently matches, re-rendering whenever the result changes.
 *
 * Uses `window.matchMedia` under the hood and `useSyncExternalStore` for
 * compatibility with React's concurrent rendering model. Returns `false`
 * on the server; during hydration React uses that server snapshot before
 * updating to the client media-query value.
 *
 * For common viewport breakpoint checks, prefer the more specific
 * {@link useBreakpoint} or {@link useIsBelowBreakpoint} hooks.
 *
 * @param query - A valid CSS media query string
 *   (e.g. `"(max-width: 768px)"`, `"(prefers-color-scheme: dark)"`).
 * @returns `true` if the media query currently matches, otherwise `false`.
 *
 * @example
 * // Detect if the user prefers a dark color scheme
 * const prefersDark = useMatchesMediaQuery("(prefers-color-scheme: dark)");
 *
 * return <div className={prefersDark ? "dark" : "light"}>Hello</div>;
 *
 * @example
 * // Show a different layout on portrait orientation
 * const isPortrait = useMatchesMediaQuery("(orientation: portrait)");
 *
 * return isPortrait ? <PortraitLayout /> : <LandscapeLayout />;
 */
export function useMatchesMediaQuery(query: string) {
	const subscribe = useCallback(
		(callback: () => void) => {
			const matchMedia = window.matchMedia(query);

			matchMedia.addEventListener("change", callback);
			return () => {
				matchMedia.removeEventListener("change", callback);
			};
		},
		[query],
	);

	return useSyncExternalStore(
		subscribe,
		() => {
			return window.matchMedia(query).matches;
		},
		() => false,
	);
}
