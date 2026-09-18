import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useDebouncedCallback } from "./use-debounced-callback.js";

describe("useDebouncedCallback", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test("collapses rapid calls into one trailing invocation with the last arguments", () => {
		const callback = vi.fn<(...args: unknown[]) => void>();
		const { result } = renderHook(() => useDebouncedCallback(callback, { waitMs: 100 }));
		result.current(1);
		result.current(2);
		result.current(3);
		vi.advanceTimersByTime(99);
		expect(callback).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenLastCalledWith(3);
	});

	test("unmounting cancels the pending invocation", () => {
		const callback = vi.fn<(...args: unknown[]) => void>();
		const { result, unmount } = renderHook(() => useDebouncedCallback(callback, { waitMs: 100 }));
		result.current();
		unmount();
		vi.advanceTimersByTime(100);
		expect(callback).not.toHaveBeenCalled();
	});
});
