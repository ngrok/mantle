import { useSyncExternalStore } from "react";

function subscribeToHash(onChange: () => void) {
	window.addEventListener("hashchange", onChange);
	return () => window.removeEventListener("hashchange", onChange);
}

function subscribeToNothing() {
	return () => {};
}

/**
 * The location fragment, such as `#code=…`, or `null` on the server: the
 * browser never sends the fragment. With `enabled: false` the hook returns
 * `null` and does not listen for `hashchange`.
 *
 * @example
 * const hash = useLocationHash();
 * const { theme } = parsePreviewHash(hash ?? "");
 */
export function useLocationHash({ enabled = true }: { enabled?: boolean } = {}): string | null {
	return useSyncExternalStore(
		enabled ? subscribeToHash : subscribeToNothing,
		() => (enabled ? window.location.hash : null),
		() => null,
	);
}
