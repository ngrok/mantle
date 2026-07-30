"use client";

import { useEffect, useState } from "react";
import { isApplePlatform } from "../utils/platform.js";

/**
 * Whether the host is an Apple platform, resolved after hydration.
 *
 * Internal: not re-exported from `hooks/index.ts`. It lives here rather than
 * beside its first consumer because two unrelated components need it — `MetaKey`
 * for its glyph and `Sidebar.Trigger` for its `aria-keyshortcuts` — and neither
 * should have to import from the other.
 *
 * The server cannot know the platform and there is no cookie to persist it, so
 * this returns `false` (the non-Apple answer) for the server render and the
 * hydration render, then corrects itself in an effect. Both consumers pick the
 * matching non-Apple default so the correction is a glyph and an
 * `aria-keyshortcuts` value, never a layout change: `MetaKey` renders `⌃` and
 * `Command.SearchTrigger` advertises `Control+K` until the effect runs.
 *
 * Reading `isApplePlatform()` during render instead would disagree with the
 * server on Apple platforms and produce a hydration mismatch.
 *
 * @example
 * ```tsx
 * const isApple = useIsApplePlatform();
 * const shortcut = isApple ? "Meta+K" : "Control+K";
 * ```
 */
function useIsApplePlatform(): boolean {
	const [isApple, setIsApple] = useState(false);

	useEffect(() => {
		setIsApple(isApplePlatform());
	}, []);

	return isApple;
}

export {
	//,
	useIsApplePlatform,
};
