import { useEffect, useState } from "react";
import { canUseDOM } from "../components/browser-only/browser-only.js";

/**
 * no-preference is the default value for the prefers-reduced-motion media query.
 * Users who have never fiddled with their a11y settings will still see animations
 * (no explicit opt-in required from a user's perspective)
 */
const query = "(prefers-reduced-motion: no-preference)";

/**
 * Imperatively reads the current `prefers-reduced-motion` preference once at
 * the time of the call.
 *
 * Useful in event handlers, animation entrypoints, or plain functions where
 * a React hook cannot be called. Prefer {@link usePrefersReducedMotion}
 * inside components — it subscribes to live changes.
 *
 * @returns `true` when the user has opted out of animations or when called
 *   outside a browser environment (SSR), `false` when motion is allowed.
 *
 * @remarks
 * The conservative SSR default of `true` matches
 * {@link usePrefersReducedMotion}: animations stay off until we can verify
 * the user's preference on the client.
 *
 * @example
 * // Skip a one-off entrance animation in a click handler
 * function onOpen() {
 *   if (getPrefersReducedMotion()) {
 *     element.style.opacity = "1";
 *     return;
 *   }
 *   element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
 * }
 */
export function getPrefersReducedMotion(): boolean {
	if (!canUseDOM()) {
		return true;
	}
	return !window.matchMedia(query).matches;
}

/**
 * React hook that subscribes to the user's `prefers-reduced-motion` media
 * query and re-renders when it changes.
 *
 * Defaults to `true` (reduce motion) on the server and during the first
 * client render to avoid animating before hydration. The initial client
 * effect reads the *real* preference and updates state. The underlying
 * media query used is `(prefers-reduced-motion: no-preference)` inverted —
 * "if the system hasn't opted out, animations are allowed."
 *
 * @returns `true` when the user prefers reduced motion (animations should be
 *   shortened or skipped), `false` when full motion is acceptable.
 *
 * @remarks
 * If you need to support very old browsers that lack
 * `MediaQueryList.addEventListener`, consider falling back to
 * `addListener` / `removeListener`.
 *
 * @example
 * // Conditionally shorten or skip transitions
 * const prefersReducedMotion = usePrefersReducedMotion();
 * const duration = prefersReducedMotion ? 0 : 200;
 *
 * return <Modal transitionDuration={duration} />;
 *
 * @example
 * // Disable an autoplaying carousel when motion is reduced
 * const prefersReducedMotion = usePrefersReducedMotion();
 *
 * return <Carousel autoplay={!prefersReducedMotion} />;
 */
export function usePrefersReducedMotion(): boolean {
	// Default to no animations on SSR/first paint; update on mount with the real value.
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(true);

	useEffect(() => {
		const mediaQueryList = window.matchMedia(query);

		// set the _real_ initial value now that we're on the client
		setPrefersReducedMotion(getPrefersReducedMotion());

		// register for updates
		function listener(event: MediaQueryListEvent) {
			setPrefersReducedMotion(!event.matches);
		}

		mediaQueryList.addEventListener("change", listener);

		return () => {
			mediaQueryList.removeEventListener("change", listener);
		};
	}, []);

	return prefersReducedMotion;
}
