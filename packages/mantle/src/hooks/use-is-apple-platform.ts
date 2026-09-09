"use client";

import { useSyncExternalStore } from "react";
import { isApplePlatform } from "../utils/platform.js";

/**
 * The platform never changes after page load, so there is nothing to
 * subscribe to.
 */
function subscribeToNothing(): () => void {
	return () => {
		// Why empty: the snapshot is constant per page load.
	};
}

/**
 * Snapshot for the server render and the hydration render. The server cannot
 * know the platform, so both answer `false`, the non-Apple default.
 */
function getServerSnapshot(): boolean {
	return false;
}

/**
 * Whether the host is an Apple platform.
 *
 * Internal: not re-exported from `hooks/index.ts`. It lives here rather than
 * beside its first consumer because three unrelated components need it
 * (`MetaKey` for its glyph, `Command.SearchTrigger` and `Sidebar.Trigger` for
 * their `aria-keyshortcuts`), and none should have to import from another.
 *
 * The server cannot know the platform and there is no cookie to persist it, so
 * this returns `false` (the non-Apple answer) for the server render and the
 * hydration render. React then re-renders once with the real value after
 * hydration. A client mount after hydration reads the platform in its first
 * render, so a `MetaKey` that mounts when a palette opens commits `⌘` once.
 * Every consumer picks the matching non-Apple default, so the post-hydration
 * correction is a glyph and an `aria-keyshortcuts` value, never a layout
 * change: in the server HTML `MetaKey` renders `⌃`, `Command.SearchTrigger`
 * advertises `Control+K`, and `Sidebar.Trigger` advertises `Control+B`.
 *
 * Why `useSyncExternalStore` over `useState` plus an effect: React reads
 * `getServerSnapshot` for the hydration render, so the HTML still matches the
 * server. A client mount needs no second commit to show the real value.
 *
 * @example
 * ```tsx
 * const isApple = useIsApplePlatform();
 * const shortcut = isApple ? "Meta+K" : "Control+K";
 * ```
 */
function useIsApplePlatform(): boolean {
	return useSyncExternalStore(subscribeToNothing, isApplePlatform, getServerSnapshot);
}

export {
	//,
	useIsApplePlatform,
};
