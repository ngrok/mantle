import { useSyncExternalStore } from "react";

/**
 * Hydration state never changes after mount, so there is nothing to
 * subscribe to.
 */
function subscribeToNothing(): () => void {
	return () => {
		// Why: intentionally empty — the snapshot is constant per environment.
	};
}

/**
 * Snapshot read on the client: by the time React reads it, hydration has
 * happened (or the tree was client-rendered from the start), so it is
 * always `true`.
 */
function getClientSnapshot(): boolean {
	return true;
}

/**
 * Snapshot read during server rendering and the hydration pass, so the
 * initial client render matches the server HTML: always `false`.
 */
function getServerSnapshot(): boolean {
	return false;
}

/**
 * Returns `false` during server rendering and the initial hydration render,
 * then `true` on the client — without hydration mismatches, because React
 * uses the server snapshot for the hydration pass and re-renders once with
 * the client snapshot afterwards.
 *
 * Use it to gate UI whose initial state only the client can know (for
 * example, uncontrolled inputs whose mount-time defaults come from
 * localStorage): render a same-size placeholder until hydration so the real
 * UI mounts exactly once, with the real client-side values.
 *
 * @example
 * ```tsx
 * function PreferencesPanel() {
 *   const isHydrated = useIsHydrated();
 *   // localStorage-backed defaults are only correct on the client
 *   return isHydrated ? <PreferenceControls /> : <PreferencesSkeleton />;
 * }
 * ```
 */
function useIsHydrated(): boolean {
	return useSyncExternalStore(subscribeToNothing, getClientSnapshot, getServerSnapshot);
}

export {
	//,
	useIsHydrated,
};
