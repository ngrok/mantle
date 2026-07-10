import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useDebouncedCallback } from "./use-debounced-callback.js";

describe("useDebouncedCallback", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("debounces callback with given delay", () => {
		const callback = vi.fn<(...args: unknown[]) => void>();
		const { result } = renderHook(() => useDebouncedCallback(callback, { waitMs: 100 }));
		result.current();
		result.current();
		result.current();
		expect(callback).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100);
		expect(callback).toHaveBeenCalled();
	});

	test("calls callback with correct arguments", () => {
		const callback = vi.fn<(...args: unknown[]) => void>();
		const { result } = renderHook(() => useDebouncedCallback(callback, { waitMs: 100 }));
		result.current(1);
		result.current(2);
		result.current(3);
		vi.advanceTimersByTime(100);
		expect(callback).toHaveBeenCalledWith(3);
	});
});
