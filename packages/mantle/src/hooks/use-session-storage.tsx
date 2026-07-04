import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Builds the subscribe function for one sessionStorage key. It notifies only
 * for `storage` events that could change that key: a matching `key` (or a
 * clear-all event, where `key` is null) in sessionStorage — or an event
 * whose `storageArea` is unknown, from dispatchers that omit it. Unrelated
 * keys and localStorage events never wake the hook, so instances don't pay
 * a snapshot re-read for churn they can't be affected by.
 */
function subscribeToSessionStorageKey(key: string): (onStoreChange: () => void) => () => void {
	return function subscribe(onStoreChange: () => void): () => void {
		function handleStorageEvent(event: StorageEvent): void {
			const matchesStore = event.storageArea == null || event.storageArea === window.sessionStorage;
			const matchesKey = event.key == null || event.key === key;
			if (matchesStore && matchesKey) {
				onStoreChange();
			}
		}

		window.addEventListener("storage", handleStorageEvent);
		return () => {
			window.removeEventListener("storage", handleStorageEvent);
		};
	};
}

/**
 * The server never has a stored value — rendering on the server always
 * resolves to the caller's default. This is what makes the hook SSR-safe:
 * sessionStorage is a client-only API and must never be touched during
 * server rendering.
 */
function getSessionStorageServerSnapshot(): null {
	return null;
}

/**
 * Decodes a raw sessionStorage entry written by this hook. A corrupt or
 * non-string entry resolves to the default instead of throwing, so a bad
 * stored value can never crash the render.
 */
function parseStoredValue(raw: string, defaultValue: string): string {
	try {
		const parsed: unknown = JSON.parse(raw);
		return typeof parsed === "string" ? parsed : defaultValue;
	} catch {
		return defaultValue;
	}
}

/**
 * SSR-safe `useSyncExternalStore`-backed sessionStorage string state. The
 * per-tab sibling of {@link useLocalStorage}, with the same contract:
 *
 * - Server rendering returns `defaultValue` and never touches sessionStorage.
 * - Values are JSON-encoded on write and JSON-decoded on read.
 * - The setter dispatches a synthetic `storage` event (tagged with its
 *   `storageArea`) so every same-key hook instance in the tab stays in
 *   sync. Subscriptions are filtered per key and per storage area, so
 *   unrelated keys and localStorage churn never wake this hook.
 * - Missing, corrupt, or non-string entries resolve to `defaultValue`; the
 *   hook never seeds `defaultValue` into storage on its own (reading is
 *   side-effect free).
 *
 * @param key - The sessionStorage key to read and write.
 * @param defaultValue - Returned when no valid entry exists for `key` and
 *   during server rendering.
 * @returns A `[value, setValue]` tuple. `setValue` persists the value for
 *   the rest of the tab session and notifies every same-key hook instance.
 *
 * @example
 * ```tsx
 * const [showWarning, setShowWarning] = useSessionStorage("show-warning", "true");
 * // showWarning === "true" until this tab stores a preference
 * setShowWarning("false"); // persists for the rest of the tab session
 * ```
 */
function useSessionStorage(
	key: string,
	defaultValue: string,
): readonly [value: string, setValue: (next: string) => void] {
	const subscribe = useMemo(() => subscribeToSessionStorageKey(key), [key]);

	const rawValue = useSyncExternalStore(
		subscribe,
		() => window.sessionStorage.getItem(key),
		getSessionStorageServerSnapshot,
	);

	const value = rawValue == null ? defaultValue : parseStoredValue(rawValue, defaultValue);

	const setValue = useCallback(
		(next: string) => {
			const encoded = JSON.stringify(next);
			window.sessionStorage.setItem(key, encoded);
			window.dispatchEvent(
				new StorageEvent("storage", { key, newValue: encoded, storageArea: window.sessionStorage }),
			);
		},
		[key],
	);

	return [value, setValue];
}

export {
	//,
	useSessionStorage,
};
