import { useEffect, useState } from "react";

/**
 * Returns `false` on the server, in the hydration render, and in the mount
 * commit, then `true` from the next animation frame.
 *
 * Use it to gate a CSS transition that must not run on a post-hydration
 * state correction. `useIsHydrated` flips in the hydration commit, where a
 * `useLocalStorage` or any other `useSyncExternalStore` correction also lands,
 * and CSS starts a transition from that commit's after-change style. One frame
 * later the correction has painted, so a gate keyed on this result opens on
 * settled values. For every other client-only branch, `useIsHydrated` is the
 * right hook: it costs no extra render.
 *
 * @example
 * ```tsx
 * function Panel({ open }: { open: boolean }) {
 *   const isHydrated = useIsHydratedAfterPaint();
 *   // A persisted-collapsed `open` snaps on load and animates on every later toggle.
 *   return (
 *     <div
 *       data-state={open ? "expanded" : "collapsed"}
 *       data-hydrated={isHydrated ? "" : undefined}
 *       className="w-52 transition-[width] data-[state=collapsed]:w-13 not-data-hydrated:transition-none"
 *     />
 *   );
 * }
 * ```
 */
function useIsHydratedAfterPaint(): boolean {
	const [isHydrated, setIsHydrated] = useState(false);
	// Why useEffect: the frame registers in the same passive flush that commits
	// a store correction, so it fires after that commit paints.
	useEffect(() => {
		const frame = requestAnimationFrame(() => {
			setIsHydrated(true);
		});
		return () => {
			cancelAnimationFrame(frame);
		};
	}, []);
	return isHydrated;
}

export {
	//,
	useIsHydratedAfterPaint,
};
