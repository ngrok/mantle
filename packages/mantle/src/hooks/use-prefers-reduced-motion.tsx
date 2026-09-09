import { canUseDOM } from "../components/browser-only/browser-only.js";
import { useMatchesMediaQuery } from "./use-matches-media-query.js";

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
 * Returns `true` (reduce motion) on the server and during the hydration
 * render, so nothing animates before hydration. React then re-renders once
 * with the real preference. A client mount after hydration reads the real
 * preference in its first render, so a dialog or carousel that opens later
 * starts with the right duration. The underlying media query is
 * `(prefers-reduced-motion: no-preference)` inverted: if the system has not
 * opted out, animations are allowed.
 *
 * @returns `true` when the user prefers reduced motion (animations should be
 *   shortened or skipped), `false` when full motion is acceptable.
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
	// Why invert: `useMatchesMediaQuery` answers `false` on the server and in the
	// hydration render, so reduced motion stays the conservative default there.
	return !useMatchesMediaQuery(query);
}
