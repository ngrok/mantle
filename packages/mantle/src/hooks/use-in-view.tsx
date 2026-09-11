"use client";

import { type RefObject, useEffect, useState } from "react";
import type { InViewOptions, MarginType } from "../utils/in-view.js";
import { inView } from "../utils/in-view.js";

/**
 * Options for the `useInView` hook.
 */
type UseInViewOptions = {
	/**
	 * A ref to a scrollable container element to use as the intersection root.
	 * Defaults to the browser viewport.
	 */
	root?: RefObject<Element | null>;

	/**
	 * Expand or contract the detected area from each side of the root's bounding box.
	 * Uses the same syntax as the CSS `margin` shorthand (e.g. `"10px"`, `"10% 20px"`).
	 */
	margin?: MarginType;

	/**
	 * How much of the element must be visible before it is considered in view.
	 * - `"some"` (default): Any part of the element is visible.
	 * - `"all"`: The entire element is visible.
	 * - `number`: An intersection ratio between `0` and `1` (e.g. `0.5` for 50%).
	 */
	amount?: "some" | "all" | number;

	/**
	 * If `true`, stop observing once the element enters the viewport for the
	 * first time. Useful for one-shot entrance animations.
	 * Defaults to `false`.
	 */
	once?: boolean;

	/**
	 * The initial visibility state returned before the observer has attached.
	 * Defaults to `false`.
	 */
	initial?: boolean;
};

/**
 * React hook that tracks whether a DOM element is visible within the viewport
 * (or a scrollable container) using the `IntersectionObserver` API.
 *
 * @param ref - A ref attached to the element to observe.
 * @param options - Options controlling the scroll root, margin, threshold,
 *   initial state, and one-time detection.
 * @returns `true` if the element is currently in view, otherwise `false`.
 *
 * @example
 * // Basic usage
 * const ref = useRef<HTMLDivElement>(null);
 * const isInView = useInView(ref);
 *
 * return <div ref={ref}>{isInView ? "Visible!" : "Hidden"}</div>;
 *
 * @example
 * // Trigger once when the element first enters the viewport
 * const ref = useRef<HTMLDivElement>(null);
 * const isInView = useInView(ref, { once: true });
 *
 * return (
 *   <div
 *     ref={ref}
 *     style={{ opacity: isInView ? 1 : 0, transition: "opacity 0.5s" }}
 *   />
 * );
 *
 * @example
 * // Require 50% of the element to be visible
 * const ref = useRef<HTMLDivElement>(null);
 * const isInView = useInView(ref, { amount: 0.5 });
 */
function useInView(
	ref: RefObject<Element | null>,
	{ root, margin, amount, once = false, initial = false }: UseInViewOptions = {},
): boolean {
	const [isInView, setInView] = useState(initial);

	// Why the effect never reads `isInView`: `inView` unobserves the element itself
	// after a `once` entry, and a later enter only sets `true` again. Reading the
	// state here would need it in the deps, which restarts the observer on every
	// enter or leave, or a `react-hooks/exhaustive-deps` suppression, which opts
	// the hook out of the React Compiler.
	useEffect(() => {
		const element = ref.current;
		if (element == null) {
			return;
		}

		function onEnter() {
			setInView(true);
			return once ? undefined : () => setInView(false);
		}

		const options: InViewOptions = {
			root: root?.current ?? undefined,
			margin,
			amount,
		};

		return inView(element, onEnter, options);
	}, [root, ref, margin, once, amount]);

	return isInView;
}

export { useInView };
export type { UseInViewOptions };
