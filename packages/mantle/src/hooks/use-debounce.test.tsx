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

	test("a re-render with an unchanged value does not restart the timer", () => {
		const { result, rerender } = renderHook(({ value }) => useDebounce(value, { waitMs: 300 }), {
			initialProps: { value: "first" },
		});

		rerender({ value: "second" });
		act(() => {
			vi.advanceTimersByTime(200);
		});
		// a fresh `options` object identity on an otherwise identical render must
		// not restart the pending timer
		rerender({ value: "second" });
		act(() => {
			vi.advanceTimersByTime(100);
		});

		expect(result.current).toBe("second");
	});

	test("changing waitMs mid-flight restarts the timer with the new delay", () => {
		const { result, rerender } = renderHook(({ value, waitMs }) => useDebounce(value, { waitMs }), {
			initialProps: { value: "first", waitMs: 300 },
		});

		rerender({ value: "second", waitMs: 300 });
		act(() => {
			vi.advanceTimersByTime(200);
		});

		rerender({ value: "second", waitMs: 1_000 });
		act(() => {
			vi.advanceTimersByTime(300);
		});
		// the original 300ms timer was cancelled, so 500ms in nothing has landed
		expect(result.current).toBe("first");

		act(() => {
			vi.advanceTimersByTime(700);
		});
		expect(result.current).toBe("second");
	});

	test("unmounting cancels the pending update", () => {
		const { rerender, unmount } = renderHook(({ value }) => useDebounce(value, { waitMs: 300 }), {
			initialProps: { value: "kept" },
		});

		rerender({ value: "dropped" });
		expect(vi.getTimerCount()).toBe(1);

		unmount();

		// `result.current` only advances on a committed render, so the pending
		// timer itself is the observable state here
		expect(vi.getTimerCount()).toBe(0);
	});
});
