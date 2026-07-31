import { useSyncExternalStore } from "react";

/**
 * Tailwind CSS breakpoints in descending order (largest → smallest).
 *
 * These correspond to Tailwind’s default `theme.screens` config and are used
 * to determine the current viewport size.
 *
 * @see https://tailwindcss.com/docs/screens
 *
 * @example
 * "2xl" // ≥96rem (1536px)
 * "xl"  // ≥80rem (1280px)
 * "lg"  // ≥64rem (1024px)
 * "md"  // ≥48rem (768px)
 * "sm"  // ≥40rem (640px)
 * "xs"  // ≥30rem (480px)
 * "2xs" // ≥22.5rem (360px)
 */
const tailwindBreakpoints = ["2xl", "xl", "lg", "md", "sm", "xs", "2xs"] as const;

/**
 * A valid Tailwind CSS breakpoint identifier.
 *
 * @example
 * const bp: TailwindBreakpoint = "md"; // ≥48rem (768px)
 *
 * @example
 * "2xl" // ≥96rem (1536px)
 * "xl"  // ≥80rem (1280px)
 * "lg"  // ≥64rem (1024px)
 * "md"  // ≥48rem (768px)
 * "sm"  // ≥40rem (640px)
 * "xs"  // ≥30rem (480px)
 * "2xs" // ≥22.5rem (360px)
 */
type TailwindBreakpoint = (typeof tailwindBreakpoints)[number];

/**
 * Mantle’s breakpoint set, extending Tailwind’s with `"default"`.
 *
 * `"default"` represents the base (0px and up) viewport,
 * useful for defining fallbacks or mobile-first styles.
 *
 * @example
 * "default" // ≥0rem (0px)
 * "2xs"     // ≥22.5rem (360px)
 * "xs"      // ≥30rem (480px)
 * "sm"      // ≥40rem (640px)
 * "md"      // ≥48rem (768px)
 * "lg"      // ≥64rem (1024px)
 * "xl"      // ≥80rem (1280px)
 * "2xl"     // ≥96rem (1536px)
 */
const breakpoints = ["default", ...tailwindBreakpoints] as const;

/**
 * A valid Mantle breakpoint identifier.
 *
 * Includes Tailwind’s standard breakpoints plus `"default"` for 0px+.
 *
 * @example
 * const bp: Breakpoint = "default"; // ≥0px
 *
 * @example
 * "default" // ≥0rem (0px)
 * "2xs"     // ≥22.5rem (360px)
 * "xs"      // ≥30rem (480px)
 * "sm"      // ≥40rem (640px)
 * "md"      // ≥48rem (768px)
 * "lg"      // ≥64rem (1024px)
 * "xl"      // ≥80rem (1280px)
 * "2xl"     // ≥96rem (1536px)
 */
type Breakpoint = (typeof breakpoints)[number];

/**
 * The largest Tailwind breakpoint the viewport width matches, or `"default"`
 * below `2xs`.
 *
 * Shares one app-wide subscription to the min-width media queries through
 * `useSyncExternalStore`.
 *
 * @returns {Breakpoint} The current breakpoint that matches the viewport width.
 *
 * @example
 * const breakpoint = useBreakpoint();
 * if (breakpoint === "lg") {
 *   // Do something for large screens and above
 * }
 */
function useBreakpoint(): Breakpoint {
	return useSyncExternalStore(
		subscribeToBreakpointChanges,
		getCurrentBreakpointSnapshot,
		() => "default", // SSR fallback
	);
}

/**
 * `true` while the viewport is narrower than the given breakpoint.
 *
 * Reads a `window.matchMedia` max-width query through `useSyncExternalStore`, so
 * the value stays correct under React's concurrent rendering.
 *
 * @param {TailwindBreakpoint} breakpoint - The breakpoint to check against (e.g., "md", "lg").
 *
 * @returns {boolean} `true` if the viewport width is below the breakpoint, otherwise `false`.
 *
 * @example
 * // Check if viewport is below medium (768px)
 * const isBelowMd = useIsBelowBreakpoint("md");
 */
function useIsBelowBreakpoint(breakpoint: TailwindBreakpoint): boolean {
	return useSyncExternalStore(
		createBelowBreakpointSubscribe(breakpoint),
		createBelowBreakpointGetSnapshot(breakpoint),
		() => false, // SSR fallback - assume desktop
	);
}

export {
	//,
	breakpoints,
	useBreakpoint,
	useIsBelowBreakpoint,
};

export type {
	//,
	Breakpoint,
	TailwindBreakpoint,
};

/**
 * A CSS media query string representing a minimum width in `rem` units.
 *
 * @example
 * const query: MinWidthQuery = "(min-width: 48rem)";
 *
 * @private
 */
type MinWidthQuery = `(min-width: ${number}rem)`;

/**
 * A CSS media query string representing a maximum width in `rem` units.
 *
 * @example
 * const query: MaxWidthQuery = "(max-width: 47.99rem)";
 *
 * @private
 */
type MaxWidthQuery = `(max-width: ${number}rem)`;

/**
 * Precomputed min-width media query strings for each Tailwind breakpoint.
 *
 * Constants avoid template string work in hot paths. The `satisfies` clause
 * checks each value against the `MinWidthQuery` template literal type.
 *
 * @remarks
 * These are expressed in `rem`. If your CSS breakpoints are in `px`, consider
 * aligning units to avoid JS/CSS drift when `html{font-size}` changes.
 *
 * @private
 */
const breakpointQueries = {
	"2xl": "(min-width: 96rem)" as const,
	xl: "(min-width: 80rem)" as const,
	lg: "(min-width: 64rem)" as const,
	md: "(min-width: 48rem)" as const,
	sm: "(min-width: 40rem)" as const,
	xs: "(min-width: 30rem)" as const,
	"2xs": "(min-width: 22.5rem)" as const,
} as const satisfies Record<TailwindBreakpoint, MinWidthQuery>;

/**
 * Precomputed max-width media query strings used by `useIsBelowBreakpoint`.
 *
 * The `-0.01rem` offset avoids overlap at exact boundaries.
 *
 * @private
 */
const belowBreakpointQueries = {
	"2xl": "(max-width: 95.99rem)" as const, // 96 - 0.01
	xl: "(max-width: 79.99rem)" as const, // 80 - 0.01
	lg: "(max-width: 63.99rem)" as const, // 64 - 0.01
	md: "(max-width: 47.99rem)" as const, // 48 - 0.01
	sm: "(max-width: 39.99rem)" as const, // 40 - 0.01
	xs: "(max-width: 29.99rem)" as const, // 30 - 0.01
	"2xs": "(max-width: 22.49rem)" as const, // 22.5 - 0.01
} as const satisfies Record<TailwindBreakpoint, MaxWidthQuery>;

/**
 * Lazily-initialized cache of `MediaQueryList` objects for min-width queries.
 *
 * Initialized on first access to remain SSR-safe (no `window` at import time).
 *
 * @private
 */
let minWidthMQLs: Record<TailwindBreakpoint, MediaQueryList> | null = null;

/**
 * Lazily-initialized cache of `MediaQueryList` objects for max-width queries.
 *
 * Used by `useIsBelowBreakpoint`. Also SSR-safe by lazy access.
 *
 * @private
 */
let maxWidthMQLs: Record<TailwindBreakpoint, MediaQueryList> | null = null;

/**
 * Get (and lazily create) the cached `MediaQueryList` objects for min-width queries.
 *
 * @returns A record of `MediaQueryList` keyed by Tailwind breakpoint.
 * @private
 */
function getMinWidthMQLs(): Record<TailwindBreakpoint, MediaQueryList> {
	if (!minWidthMQLs) {
		minWidthMQLs = {
			"2xl": window.matchMedia(breakpointQueries["2xl"]),
			xl: window.matchMedia(breakpointQueries.xl),
			lg: window.matchMedia(breakpointQueries.lg),
			md: window.matchMedia(breakpointQueries.md),
			sm: window.matchMedia(breakpointQueries.sm),
			xs: window.matchMedia(breakpointQueries.xs),
			"2xs": window.matchMedia(breakpointQueries["2xs"]),
		};
	}
	return minWidthMQLs;
}

/**
 * Get (and lazily create) the cached `MediaQueryList` for a specific max-width breakpoint.
 *
 * @param breakpoint - Tailwind breakpoint identifier (e.g., "md").
 * @returns The corresponding `MediaQueryList`.
 * @private
 */
function getMaxWidthMQL(breakpoint: TailwindBreakpoint): MediaQueryList {
	if (!maxWidthMQLs) {
		maxWidthMQLs = {
			"2xl": window.matchMedia(belowBreakpointQueries["2xl"]),
			xl: window.matchMedia(belowBreakpointQueries.xl),
			lg: window.matchMedia(belowBreakpointQueries.lg),
			md: window.matchMedia(belowBreakpointQueries.md),
			sm: window.matchMedia(belowBreakpointQueries.sm),
			xs: window.matchMedia(belowBreakpointQueries.xs),
			"2xs": window.matchMedia(belowBreakpointQueries["2xs"]),
		};
	}
	return maxWidthMQLs[breakpoint];
}

/**
 * Current breakpoint value used by the singleton store backing `useBreakpoint`.
 *
 * Initialized to `"default"` and updated on media-query change events.
 *
 * @private
 */
let currentBreakpointValue: Breakpoint = "default";

/**
 * Set of component listeners subscribed to the singleton breakpoint store.
 *
 * Each listener is invoked when the current breakpoint value changes.
 *
 * @private
 */
const breakpointListeners = new Set<() => void>();

/**
 * Flag indicating whether global media-query listeners are currently attached.
 *
 * Prevents duplicate registrations and allows full teardown when unused.
 *
 * @private
 */
let breakpointSubscriptionActive = false;

/**
 * Compute the current breakpoint by checking the cached min-width
 * `MediaQueryList` objects from largest to smallest.
 *
 * @returns {Breakpoint} The largest matching breakpoint, or `"default"`.
 * @private
 */
function getCurrentBreakpoint(): Breakpoint {
	const mqls = getMinWidthMQLs();
	for (const breakpoint of tailwindBreakpoints) {
		if (mqls[breakpoint].matches) {
			return breakpoint;
		}
	}
	return "default";
}

/**
 * Update the current breakpoint value and notify all listeners.
 *
 * Uses `requestAnimationFrame` to coalesce rapid resize events and minimize
 * re-renders during active window resizing.
 *
 * @private
 */
let breakpointUpdatePending = false;
function updateCurrentBreakpoint() {
	if (!breakpointUpdatePending) {
		breakpointUpdatePending = true;
		requestAnimationFrame(() => {
			breakpointUpdatePending = false;
			const newBreakpoint = getCurrentBreakpoint();
			if (newBreakpoint !== currentBreakpointValue) {
				currentBreakpointValue = newBreakpoint;
				for (const listener of breakpointListeners) {
					listener();
				}
			}
		});
	}
}

/**
 * Subscribe a component to breakpoint changes (singleton pattern).
 *
 * Only one set of `MediaQueryList` listeners exists app-wide. The callback also
 * runs once on mount, which reconciles the `useSyncExternalStore` initial
 * snapshot/subscribe race.
 *
 * @param callback - Listener invoked when the breakpoint value may have changed.
 * @returns Cleanup function to unsubscribe the listener.
 * @private
 */
function subscribeToBreakpointChanges(callback: () => void) {
	breakpointListeners.add(callback);

	// Attach global listeners once
	if (!breakpointSubscriptionActive) {
		breakpointSubscriptionActive = true;
		const mqls = getMinWidthMQLs();

		// Initialize current value synchronously
		currentBreakpointValue = getCurrentBreakpoint();

		// Attach listeners to every breakpoint's `MediaQueryList`
		for (const mql of Object.values(mqls)) {
			mql.addEventListener("change", updateCurrentBreakpoint);
		}
	}

	// Reconcile initial getSnapshot vs subscribe ordering
	callback();

	// Cleanup
	return () => {
		breakpointListeners.delete(callback);

		// Tear down global listeners when no one is listening
		if (breakpointListeners.size === 0 && breakpointSubscriptionActive) {
			breakpointSubscriptionActive = false;
			const mqls = getMinWidthMQLs();
			for (const mql of Object.values(mqls)) {
				mql.removeEventListener("change", updateCurrentBreakpoint);
			}
		}
	};
}

/**
 * Return the current breakpoint value from the singleton store.
 *
 * Used as the `getSnapshot` for `useSyncExternalStore`.
 *
 * @returns {Breakpoint} The latest computed breakpoint.
 * @private
 */
function getCurrentBreakpointSnapshot(): Breakpoint {
	return currentBreakpointValue;
}

/**
 * Cached `subscribe` functions keyed by breakpoint.
 *
 * Without caching, `useSyncExternalStore` receives a new function reference on
 * every render, causing it to tear down and re-attach the `MediaQueryList`
 * listener each time — the primary source of resize sluggishness.
 *
 * @private
 */
const belowBreakpointSubscribeCache = new Map<
	TailwindBreakpoint,
	(callback: () => void) => () => void
>();

/**
 * Get (or create and cache) a `subscribe` function for a specific "below" breakpoint.
 *
 * Uses a cached `MediaQueryList` and rAF-throttled change handler to avoid
 * bursty updates during resize.
 *
 * @param breakpoint - Tailwind breakpoint identifier (e.g., "lg").
 * @returns A stable `subscribe` function suitable for `useSyncExternalStore`.
 * @private
 */
function createBelowBreakpointSubscribe(breakpoint: TailwindBreakpoint) {
	let cached = belowBreakpointSubscribeCache.get(breakpoint);
	if (cached) {
		return cached;
	}

	cached = (callback: () => void) => {
		const mediaQuery = getMaxWidthMQL(breakpoint);

		// rAF throttle the change callback during active resize
		let pending = false;
		const onChange = () => {
			if (!pending) {
				pending = true;
				requestAnimationFrame(() => {
					pending = false;
					callback();
				});
			}
		};

		mediaQuery.addEventListener("change", onChange);
		return () => {
			mediaQuery.removeEventListener("change", onChange);
		};
	};

	belowBreakpointSubscribeCache.set(breakpoint, cached);
	return cached;
}

/**
 * Cached `getSnapshot` functions keyed by breakpoint.
 *
 * Gives `useSyncExternalStore` a referentially stable function, which avoids
 * needless subscription churn.
 *
 * @private
 */
const belowBreakpointSnapshotCache = new Map<TailwindBreakpoint, () => boolean>();

/**
 * Get (or create and cache) a `getSnapshot` function for a specific "below" breakpoint.
 *
 * Uses the cached `MediaQueryList` for the target breakpoint.
 *
 * @param breakpoint - Tailwind breakpoint identifier (e.g., "lg").
 * @returns A stable function that returns `true` when the viewport is below the breakpoint.
 * @private
 */
function createBelowBreakpointGetSnapshot(breakpoint: TailwindBreakpoint) {
	let cached = belowBreakpointSnapshotCache.get(breakpoint);
	if (cached) {
		return cached;
	}

	cached = () => {
		const mediaQuery = getMaxWidthMQL(breakpoint);
		return mediaQuery.matches;
	};

	belowBreakpointSnapshotCache.set(breakpoint, cached);
	return cached;
}
