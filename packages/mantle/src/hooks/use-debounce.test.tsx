import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useDebounce } from "./use-debounce.js";

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("useDebounce", () => {
	test("returns the initial value immediately", () => {
		const { result } = renderHook(() => useDebounce("initial", { waitMs: 300 }));

		expect(result.current).toBe("initial");
	});

	test("holds the previous value until the delay elapses, then updates", () => {
		const { result, rerender } = renderHook(({ value }) => useDebounce(value, { waitMs: 300 }), {
			initialProps: { value: "first" },
		});

		rerender({ value: "second" });
		expect(result.current).toBe("first");

		act(() => {
			vi.advanceTimersByTime(299);
		});
		expect(result.current).toBe("first");

		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(result.current).toBe("second");
	});

	test("rapid successive changes collapse into a single trailing update", () => {
		const { result, rerender } = renderHook(({ value }) => useDebounce(value, { waitMs: 300 }), {
			initialProps: { value: "a" },
		});

		rerender({ value: "ab" });
		act(() => {
			vi.advanceTimersByTime(200);
		});
		rerender({ value: "abc" });
		act(() => {
			vi.advanceTimersByTime(200);
		});
		// each change restarted the timer — still the original value
		expect(result.current).toBe("a");

		act(() => {
			vi.advanceTimersByTime(300);
		});
		expect(result.current).toBe("abc");
	});

	test("unmounting cancels the pending update", () => {
		const { result, rerender, unmount } = renderHook(
			({ value }) => useDebounce(value, { waitMs: 300 }),
			{ initialProps: { value: "kept" } },
		);

		rerender({ value: "dropped" });
		unmount();

		act(() => {
			vi.advanceTimersByTime(1_000);
		});
		expect(result.current).toBe("kept");
	});
});
