import { useCallback, useRef, useSyncExternalStore } from "react";

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
	// Why one list per instance: `getSnapshot` runs on every render and on every
	// store notification, and each `window.matchMedia` call parses the query and
	// allocates a list. A module-level cache keyed on `query` grows with every
	// distinct string a consumer passes, and it pins a stale list when a test
	// swaps `window.matchMedia` between cases, so the cache lives on the instance.
	const cache = useRef<{ query: string; list: MediaQueryList } | null>(null);

	const getMediaQueryList = useCallback(() => {
		if (cache.current == null || cache.current.query !== query) {
			cache.current = { query, list: window.matchMedia(query) };
		}
		return cache.current.list;
	}, [query]);

	const subscribe = useCallback(
		(callback: () => void) => {
			// Why capture the list: the cleanup must remove from the list it added to,
			// and the cache moves on when `query` changes.
			const list = getMediaQueryList();
			list.addEventListener("change", callback);
			return () => {
				list.removeEventListener("change", callback);
			};
		},
		[getMediaQueryList],
	);

	const getSnapshot = useCallback(() => getMediaQueryList().matches, [getMediaQueryList]);

	return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
