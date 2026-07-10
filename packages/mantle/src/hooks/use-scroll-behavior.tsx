import { useMemo } from "react";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion.js";

/**
 * `scroll-behavior` values:
 *
 * - `"auto"`   — scrolling happens instantly (no animation).
 * - `"smooth"` — scrolling animates smoothly using a user-agent–defined easing and duration.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-behavior#values
 */
export type ScrollBehavior = "auto" | "smooth";

/**
 * React hook that returns a {@link ScrollBehavior} value (`"auto"` or
 * `"smooth"`) that respects the user's motion preference.
 *
 * Internally calls {@link usePrefersReducedMotion}: when reduced motion is
 * preferred, this returns `"auto"` (no animated scroll); otherwise it
 * returns `"smooth"`. Pair this with `window.scrollTo`,
 * `Element.scrollIntoView`, or any other scroll API that accepts a
 * `behavior` option to avoid forcing animations on users who have opted
 * out of motion. The conservative SSR default also prevents "first paint"
 * scroll animations.
 *
 * @returns `"auto"` when the user prefers reduced motion, otherwise
 *   `"smooth"`.
 *
 * @example
 * // Scroll to the top of the page on a button click
 * const behavior = useScrollBehavior();
 *
 * return (
 *   <button onClick={() => window.scrollTo({ top: 0, behavior })}>
 *     Back to top
 *   </button>
 * );
 *
 * @example
 * // Bring a referenced section into view
 * const behavior = useScrollBehavior();
 * const sectionRef = useRef<HTMLElement>(null);
 *
 * function focusSection() {
 *   sectionRef.current?.scrollIntoView({ behavior, block: "start" });
 * }
 *
 * @see {@link usePrefersReducedMotion}
 * @see CSS `scroll-behavior` property (values: `"auto"`, `"smooth"`).
 */
export function useScrollBehavior(): ScrollBehavior {
	const prefersReducedMotion = usePrefersReducedMotion();

	return useMemo(() => (prefersReducedMotion ? "auto" : "smooth"), [prefersReducedMotion]);
}
