import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, test } from "vitest";
import { useLocalStorage } from "./use-local-storage.js";

const key = "test-preference";
const defaultValue = "default-value";

function Probe() {
	const [value] = useLocalStorage(key, defaultValue);
	return <span>{value}</span>;
}

beforeEach(() => {
	window.localStorage.clear();
});

describe("useLocalStorage", () => {
	test("returns the default when nothing is stored, without seeding storage", () => {
		const { result } = renderHook(() => useLocalStorage(key, defaultValue));

		const [value] = result.current;
		expect(value).toBe(defaultValue);
		// reading is side-effect free — no default seeding
		expect(window.localStorage.getItem(key)).toBeNull();
	});

	test("reads a JSON-encoded stored value", () => {
		window.localStorage.setItem(key, JSON.stringify("stored-value"));

		const { result } = renderHook(() => useLocalStorage(key, defaultValue));

		const [value] = result.current;
		expect(value).toBe("stored-value");
	});

	test("set() JSON-encodes the value and updates the hook", () => {
		const { result } = renderHook(() => useLocalStorage(key, defaultValue));

		act(() => {
			const [, setValue] = result.current;
			setValue("next-value");
		});

		const [value] = result.current;
		expect(value).toBe("next-value");
		expect(window.localStorage.getItem(key)).toBe(JSON.stringify("next-value"));
	});

	test("all hook instances for a key stay in sync within the same tab", () => {
		const first = renderHook(() => useLocalStorage(key, defaultValue));
		const second = renderHook(() => useLocalStorage(key, defaultValue));

		act(() => {
			const [, setValue] = first.result.current;
			setValue("synced-value");
		});

		expect(first.result.current[0]).toBe("synced-value");
		expect(second.result.current[0]).toBe("synced-value");
	});

	test("a cross-tab storage event updates the value", () => {
		const { result } = renderHook(() => useLocalStorage(key, defaultValue));

		act(() => {
			window.localStorage.setItem(key, JSON.stringify("other-tab-value"));
			window.dispatchEvent(
				new StorageEvent("storage", {
					key,
					newValue: JSON.stringify("other-tab-value"),
					storageArea: window.localStorage,
				}),
			);
		});

		const [value] = result.current;
		expect(value).toBe("other-tab-value");
	});

	test("a storage event without a storageArea fails open and updates the value", () => {
		const { result } = renderHook(() => useLocalStorage(key, defaultValue));

		act(() => {
			window.localStorage.setItem(key, JSON.stringify("untagged-dispatch"));
			// dispatchers that omit storageArea must still notify the hook
			window.dispatchEvent(
				new StorageEvent("storage", { key, newValue: JSON.stringify("untagged-dispatch") }),
			);
		});

		const [value] = result.current;
		expect(value).toBe("untagged-dispatch");
	});

	test("ignores storage events for other keys and other storage areas", () => {
		window.localStorage.setItem(key, JSON.stringify("initial"));
		const { result } = renderHook(() => useLocalStorage(key, defaultValue));
		expect(result.current[0]).toBe("initial");

		// change the underlying entry WITHOUT a matching notification — a
		// filtered subscription must not re-read the snapshot
		act(() => {
			window.localStorage.setItem(key, JSON.stringify("changed-silently"));
			window.dispatchEvent(
				new StorageEvent("storage", {
					key: "unrelated-key",
					newValue: "x",
					storageArea: window.localStorage,
				}),
			);
			window.dispatchEvent(
				new StorageEvent("storage", { key, newValue: "x", storageArea: window.sessionStorage }),
			);
		});
		expect(result.current[0]).toBe("initial");

		// a matching notification picks the change up
		act(() => {
			window.dispatchEvent(
				new StorageEvent("storage", {
					key,
					newValue: JSON.stringify("changed-silently"),
					storageArea: window.localStorage,
				}),
			);
		});
		expect(result.current[0]).toBe("changed-silently");
	});

	test("a clear-all storage event (null key) refreshes the value", () => {
		window.localStorage.setItem(key, JSON.stringify("stored-value"));
		const { result } = renderHook(() => useLocalStorage(key, defaultValue));
		expect(result.current[0]).toBe("stored-value");

		act(() => {
			window.localStorage.clear();
			window.dispatchEvent(
				new StorageEvent("storage", { key: null, storageArea: window.localStorage }),
			);
		});

		expect(result.current[0]).toBe(defaultValue);
	});

	test("a corrupt (unparseable) entry resolves to the default instead of throwing", () => {
		window.localStorage.setItem(key, "not-json{");

		const { result } = renderHook(() => useLocalStorage(key, defaultValue));

		const [value] = result.current;
		expect(value).toBe(defaultValue);
	});

	test("a parseable non-string entry resolves to the default", () => {
		window.localStorage.setItem(key, JSON.stringify({ nested: true }));

		const { result } = renderHook(() => useLocalStorage(key, defaultValue));

		const [value] = result.current;
		expect(value).toBe(defaultValue);
	});

	test("server rendering returns the default and never touches localStorage (SSR regression)", () => {
		window.localStorage.setItem(key, JSON.stringify("client-only-value"));

		const html = renderToString(<Probe />);

		expect(html).toContain(defaultValue);
		expect(html).not.toContain("client-only-value");
	});
});
