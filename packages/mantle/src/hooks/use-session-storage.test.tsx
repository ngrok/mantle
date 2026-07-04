import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, test } from "vitest";
import { useSessionStorage } from "./use-session-storage.js";

const key = "test-session-preference";
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

	test("server rendering returns the default and never touches sessionStorage (SSR regression)", () => {
		window.sessionStorage.setItem(key, JSON.stringify("client-only-value"));

		const html = renderToString(<Probe />);

		expect(html).toContain(defaultValue);
		expect(html).not.toContain("client-only-value");
	});
});
