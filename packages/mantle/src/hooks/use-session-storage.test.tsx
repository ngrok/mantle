import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useSessionStorage } from "./use-session-storage.js";

const key = "test-session-preference";
const otherKey = "other-test-session-preference";
const defaultValue = "default-value";

function Probe() {
	const [value] = useSessionStorage(key, defaultValue);
	return <span>{value}</span>;
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

	test("switching keys re-reads, resubscribes, and writes under the new key", () => {
		window.sessionStorage.setItem(key, JSON.stringify("first-key-value"));
		window.sessionStorage.setItem(otherKey, JSON.stringify("second-key-value"));

		const { result, rerender } = renderHook(
			({ activeKey }) => useSessionStorage(activeKey, defaultValue),
			{ initialProps: { activeKey: key } },
		);
		expect(result.current[0]).toBe("first-key-value");

		rerender({ activeKey: otherKey });
		expect(result.current[0]).toBe("second-key-value");

		// the subscription now filters on the new key, so the old key's
		// notifications must be ignored
		act(() => {
			window.sessionStorage.setItem(key, JSON.stringify("stale"));
			window.dispatchEvent(
				new StorageEvent("storage", {
					key,
					newValue: JSON.stringify("stale"),
					storageArea: window.sessionStorage,
				}),
			);
		});
		expect(result.current[0]).toBe("second-key-value");

		// ...and the new key's notifications must be honored
		act(() => {
			window.sessionStorage.setItem(otherKey, JSON.stringify("updated"));
			window.dispatchEvent(
				new StorageEvent("storage", {
					key: otherKey,
					newValue: JSON.stringify("updated"),
					storageArea: window.sessionStorage,
				}),
			);
		});
		expect(result.current[0]).toBe("updated");

		act(() => {
			const [, setValue] = result.current;
			setValue("written-after-switch");
		});
		expect(window.sessionStorage.getItem(otherKey)).toBe(JSON.stringify("written-after-switch"));
		expect(window.sessionStorage.getItem(key)).toBe(JSON.stringify("stale"));
	});

	test("removes its storage listener on unmount", () => {
		const addEventListenerSpy = vi.spyOn(window, "addEventListener");
		const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

		const { unmount } = renderHook(() => useSessionStorage(key, defaultValue));
		const added = addEventListenerSpy.mock.calls.filter(([type]) => type === "storage");
		expect(added).toHaveLength(1);

		unmount();

		const removed = removeEventListenerSpy.mock.calls.filter(([type]) => type === "storage");
		expect(removed).toHaveLength(1);
		// the exact handler that was attached must be the one detached
		expect(removed[0]?.[1]).toBe(added[0]?.[1]);
	});

	test("server rendering returns the default and never touches sessionStorage (SSR regression)", () => {
		window.sessionStorage.setItem(key, JSON.stringify("client-only-value"));

		const html = renderToString(<Probe />);

		expect(html).toContain(defaultValue);
		expect(html).not.toContain("client-only-value");
	});
});
