import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useSessionStorage } from "./use-session-storage.js";

const key = "test-session-preference";
const defaultValue = "default-value";

function Probe() {
	const [value] = useSessionStorage(key, defaultValue);
	return <span>{value}</span>;
}

/**
 * Wraps `storage` so every `setItem` throws `QuotaExceededError`, the way a
 * full origin or Safari private browsing behaves. Reads pass through.
 *
 * Why a wrapper behind the `window.sessionStorage` getter: happy-dom binds each
 * `Storage` method onto the instance on first access. A prototype spy
 * installed later never reaches the hook's call, and an instance spy leaks
 * past `restoreMocks`.
 */
function refuseWrites(storage: Storage): Storage {
	return new Proxy(storage, {
		get(target, property) {
			if (property === "setItem") {
				return () => {
					throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
				};
			}
			return Reflect.get(target, property);
		},
	});
}

beforeEach(() => {
	window.sessionStorage.clear();
});

describe("useSessionStorage", () => {
	test("returns the default when nothing is stored, without seeding storage", () => {
		const { result } = renderHook(() => useSessionStorage(key, defaultValue));

		const [value] = result.current;
		expect(value).toBe(defaultValue);
		expect(window.sessionStorage.getItem(key)).toBeNull();
	});

	test("reads a JSON-encoded stored value", () => {
		window.sessionStorage.setItem(key, JSON.stringify("stored-value"));

		const { result } = renderHook(() => useSessionStorage(key, defaultValue));

		const [value] = result.current;
		expect(value).toBe("stored-value");
	});

	test("set() JSON-encodes the value and updates every hook instance in the tab", () => {
		const first = renderHook(() => useSessionStorage(key, defaultValue));
		const second = renderHook(() => useSessionStorage(key, defaultValue));

		act(() => {
			const [, setValue] = first.result.current;
			setValue("next-value");
		});

		expect(first.result.current[0]).toBe("next-value");
		expect(second.result.current[0]).toBe("next-value");
		expect(window.sessionStorage.getItem(key)).toBe(JSON.stringify("next-value"));
	});

	test("a storage event without a storageArea fails open and updates the value", () => {
		const { result } = renderHook(() => useSessionStorage(key, defaultValue));

		act(() => {
			window.sessionStorage.setItem(key, JSON.stringify("untagged-dispatch"));
			// dispatchers that omit storageArea must still notify the hook
			window.dispatchEvent(
				new StorageEvent("storage", { key, newValue: JSON.stringify("untagged-dispatch") }),
			);
		});

		const [value] = result.current;
		expect(value).toBe("untagged-dispatch");
	});

	test("ignores storage events for other keys and other storage areas", () => {
		window.sessionStorage.setItem(key, JSON.stringify("initial"));
		const { result } = renderHook(() => useSessionStorage(key, defaultValue));
		expect(result.current[0]).toBe("initial");

		// change the underlying entry WITHOUT a matching notification — a
		// filtered subscription must not re-read the snapshot
		act(() => {
			window.sessionStorage.setItem(key, JSON.stringify("changed-silently"));
			window.dispatchEvent(
				new StorageEvent("storage", {
					key: "unrelated-key",
					newValue: "x",
					storageArea: window.sessionStorage,
				}),
			);
			window.dispatchEvent(
				new StorageEvent("storage", { key, newValue: "x", storageArea: window.localStorage }),
			);
		});
		expect(result.current[0]).toBe("initial");

		// a matching notification picks the change up
		act(() => {
			window.dispatchEvent(
				new StorageEvent("storage", {
					key,
					newValue: JSON.stringify("changed-silently"),
					storageArea: window.sessionStorage,
				}),
			);
		});
		expect(result.current[0]).toBe("changed-silently");
	});

	test("a clear-all storage event (null key) refreshes the value", () => {
		window.sessionStorage.setItem(key, JSON.stringify("stored-value"));
		const { result } = renderHook(() => useSessionStorage(key, defaultValue));
		expect(result.current[0]).toBe("stored-value");

		act(() => {
			window.sessionStorage.clear();
			window.dispatchEvent(
				new StorageEvent("storage", { key: null, storageArea: window.sessionStorage }),
			);
		});

		expect(result.current[0]).toBe(defaultValue);
	});

	test("a corrupt (unparseable) entry resolves to the default instead of throwing", () => {
		window.sessionStorage.setItem(key, "not-json{");

		const { result } = renderHook(() => useSessionStorage(key, defaultValue));

		const [value] = result.current;
		expect(value).toBe(defaultValue);
	});

	test("a parseable non-string entry resolves to the default", () => {
		window.sessionStorage.setItem(key, JSON.stringify({ nested: true }));

		const { result } = renderHook(() => useSessionStorage(key, defaultValue));

		const [value] = result.current;
		expect(value).toBe(defaultValue);
	});

	test("a write that storage refuses still advances every hook instance in the tab", () => {
		// Why its own key: the memory fallback is module state, and a refused
		// write must not leak into the tests that share `key`.
		const quotaKey = "test-session-preference-quota";
		const storage = window.sessionStorage;
		vi.spyOn(window, "sessionStorage", "get").mockReturnValue(refuseWrites(storage));
		const first = renderHook(() => useSessionStorage(quotaKey, defaultValue));
		const second = renderHook(() => useSessionStorage(quotaKey, defaultValue));

		act(() => {
			const [, setValue] = first.result.current;
			setValue("dismissed");
		});

		expect(first.result.current[0]).toBe("dismissed");
		expect(second.result.current[0]).toBe("dismissed");
		expect(storage.getItem(quotaKey)).toBeNull();
	});

	test("a write that succeeds after a refused one makes storage the source of truth again", () => {
		const recoveryKey = "test-session-preference-recovery";
		const storage = window.sessionStorage;
		const getter = vi.spyOn(window, "sessionStorage", "get").mockReturnValue(refuseWrites(storage));
		const { result } = renderHook(() => useSessionStorage(recoveryKey, defaultValue));

		act(() => {
			result.current[1]("held-in-memory");
		});
		expect(result.current[0]).toBe("held-in-memory");
		expect(storage.getItem(recoveryKey)).toBeNull();

		// storage accepts writes again
		getter.mockRestore();
		act(() => {
			result.current[1]("persisted");
		});
		expect(result.current[0]).toBe("persisted");
		expect(storage.getItem(recoveryKey)).toBe(JSON.stringify("persisted"));

		// storage wins from here on: a cross-tab change replaces the value
		act(() => {
			storage.setItem(recoveryKey, JSON.stringify("other-tab-value"));
			window.dispatchEvent(
				new StorageEvent("storage", {
					key: recoveryKey,
					newValue: JSON.stringify("other-tab-value"),
					storageArea: storage,
				}),
			);
		});
		expect(result.current[0]).toBe("other-tab-value");
	});

	test("a denied storage read resolves to the default instead of throwing during render", () => {
		vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
			throw new DOMException("Access is denied for this document.", "SecurityError");
		});

		const { result } = renderHook(() => useSessionStorage(key, defaultValue));

		expect(result.current[0]).toBe(defaultValue);
	});

	test("a denied storage still lets the setter advance every hook instance in the tab", () => {
		const deniedKey = "test-session-preference-denied";
		vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
			throw new DOMException("Access is denied for this document.", "SecurityError");
		});
		const first = renderHook(() => useSessionStorage(deniedKey, defaultValue));
		const second = renderHook(() => useSessionStorage(deniedKey, defaultValue));

		act(() => {
			const [, setValue] = first.result.current;
			setValue("dismissed");
		});

		expect(first.result.current[0]).toBe("dismissed");
		expect(second.result.current[0]).toBe("dismissed");
	});

	test("server rendering returns the default and never touches sessionStorage (SSR regression)", () => {
		window.sessionStorage.setItem(key, JSON.stringify("client-only-value"));

		const html = renderToString(<Probe />);

		expect(html).toContain(defaultValue);
		expect(html).not.toContain("client-only-value");
	});
});
