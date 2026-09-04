import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * The JSON-encoded value of the last refused write, per key. A write lands
 * here when `setItem` throws, so the hook still advances until the page
 * reloads. A later write that succeeds deletes the entry.
 */
const memoryFallback = new Map<string, string>();

/**
 * Lets a matching `storage` event outrank the memory fallback. Another
 * document changed storage, so the event's `newValue` replaces the refused
 * write, and a null `newValue` (a remove) deletes it. A clear-all event
 * (`key` is null) empties the whole fallback. The hook's own echo of a
 * refused write carries the fallback value, so it changes nothing.
 */
function reconcileMemoryFallback(event: StorageEvent): void {
	if (event.key == null) {
		memoryFallback.clear();
		return;
	}
	if (!memoryFallback.has(event.key)) {
		return;
	}
	if (event.newValue == null) {
		memoryFallback.delete(event.key);
	} else {
		memoryFallback.set(event.key, event.newValue);
	}
}

/**
 * Resolves `window.localStorage`, or null where the browser denies access.
 *
 * Why a guard on the property read: with site data blocked, Chrome throws a
 * `SecurityError` from the `localStorage` getter itself, before any method
 * call.
 */
function getLocalStorageArea(): Storage | null {
	try {
		return window.localStorage;
	} catch {
		return null;
	}
}

/**
 * Builds the subscribe function for one localStorage key. It notifies only
 * for `storage` events that could change that key: a matching `key` (or a
 * clear-all event, where `key` is null) in localStorage — or an event whose
 * `storageArea` is unknown, from dispatchers that omit it. Unrelated keys
 * and sessionStorage events never wake the hook, so instances don't pay a
 * snapshot re-read for churn they can't be affected by.
 */
function subscribeToLocalStorageKey(key: string): (onStoreChange: () => void) => () => void {
	return function subscribe(onStoreChange: () => void): () => void {
		function handleStorageEvent(event: StorageEvent): void {
			const matchesStore = event.storageArea == null || event.storageArea === getLocalStorageArea();
			const matchesKey = event.key == null || event.key === key;
			if (matchesStore && matchesKey) {
				reconcileMemoryFallback(event);
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
 * localStorage is a client-only API and must never be touched during
 * server rendering.
 */
function getLocalStorageServerSnapshot(): null {
	return null;
}

/**
 * Reads the raw entry for `key`. If the memory fallback holds an entry, it
 * wins: storage refused that write and still returns the older entry. If
 * storage access throws, the entry resolves to null, so a denied storage
 * can never crash the render.
 */
function readLocalStorageItem(key: string): string | null {
	const fallback = memoryFallback.get(key);
	if (fallback != null) {
		return fallback;
	}

	try {
		return window.localStorage.getItem(key);
	} catch {
		return null;
	}
}

/**
 * Writes the raw entry for `key`. If `setItem` throws (a full origin,
 * Safari private browsing, blocked site data), the value lands in the
 * memory fallback instead, so the hook still advances. A write that
 * succeeds deletes the fallback, so storage is the source of truth again.
 */
function writeLocalStorageItem(key: string, encoded: string): void {
	try {
		window.localStorage.setItem(key, encoded);
		memoryFallback.delete(key);
	} catch {
		memoryFallback.set(key, encoded);
	}
}

/**
 * Decodes a raw localStorage entry written by this hook. A corrupt or
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
 * SSR-safe `useSyncExternalStore`-backed localStorage string state.
 *
 * Contract:
 *
 * - Server rendering returns `defaultValue` and never touches localStorage.
 * - Values are JSON-encoded on write and JSON-decoded on read: the same
 *   wire format popular hooks libraries (e.g. `@uidotdev/usehooks`) use,
 *   so existing stored entries remain readable.
 * - The setter dispatches a synthetic `storage` event (tagged with its
 *   `storageArea`) so every same-key hook instance in the tab stays in
 *   sync; the native `storage` event covers other tabs. Subscriptions are
 *   filtered per key and per storage area, so unrelated keys and
 *   sessionStorage churn never wake this hook.
 * - Missing, corrupt, or non-string entries resolve to `defaultValue`; the
 *   hook never seeds `defaultValue` into storage on its own (reading is
 *   side-effect free).
 * - Reads and writes never throw. If the browser denies storage access,
 *   the value resolves to `defaultValue`. If `setItem` throws (a full
 *   origin, Safari private browsing, blocked site data), the hook keeps
 *   the value in memory, so every same-key instance still advances until
 *   the page reloads. A later write that succeeds, or a `storage` event
 *   from another document, restores storage as the source of truth.
 *
 * @param key - The localStorage key to read and write.
 * @param defaultValue - Returned when no valid entry exists for `key` and
 *   during server rendering.
 * @returns A `[value, setValue]` tuple. `setValue` persists the value and
 *   notifies every same-key hook instance.
 *
 * @example
 * ```tsx
 * const [dateFormat, setDateFormat] = useLocalStorage("dateFormat", "MMM d, y");
 * // dateFormat === "MMM d, y" until a preference is stored
 * setDateFormat("y-MM-dd"); // persists + syncs every subscribed instance
 * ```
 */
function useLocalStorage(
	key: string,
	defaultValue: string,
): readonly [value: string, setValue: (next: string) => void] {
	const subscribe = useMemo(() => subscribeToLocalStorageKey(key), [key]);

	const rawValue = useSyncExternalStore(
		subscribe,
		() => readLocalStorageItem(key),
		getLocalStorageServerSnapshot,
	);

	const value = rawValue == null ? defaultValue : parseStoredValue(rawValue, defaultValue);

	const setValue = useCallback(
		(next: string) => {
			const encoded = JSON.stringify(next);
			writeLocalStorageItem(key, encoded);
			window.dispatchEvent(
				new StorageEvent("storage", { key, newValue: encoded, storageArea: getLocalStorageArea() }),
			);
		},
		[key],
	);

	return [value, setValue];
}

export {
	//,
	useLocalStorage,
};
