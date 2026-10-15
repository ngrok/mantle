import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useDebouncedCallback } from "./use-debounced-callback.js";

type Callback = (...args: unknown[]) => void;

describe("useDebouncedCallback", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test("collapses rapid calls into one trailing invocation with the last arguments", () => {
		const callback = vi.fn<Callback>();
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

	test("every call restarts the wait, so the callback only runs after a full quiet period", () => {
		const callback = vi.fn<Callback>();
		const { result } = renderHook(() => useDebouncedCallback(callback, { waitMs: 100 }));

		result.current("first");
		vi.advanceTimersByTime(99);
		result.current("second");
		vi.advanceTimersByTime(99);
		// 198ms have elapsed since the first call, but never 100ms of quiet.
		expect(callback).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1);

		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenLastCalledWith("second");
	});

	test("invokes the latest callback reference, not the one captured when the call was scheduled", () => {
		const staleCallback = vi.fn<Callback>();
		const latestCallback = vi.fn<Callback>();
		const { result, rerender } = renderHook(
			({ callback }: { callback: Callback }) => useDebouncedCallback(callback, { waitMs: 100 }),
			{ initialProps: { callback: staleCallback } },
		);

		result.current("typed");
		rerender({ callback: latestCallback });
		vi.advanceTimersByTime(100);

		expect(staleCallback).not.toHaveBeenCalled();
		expect(latestCallback).toHaveBeenCalledTimes(1);
		expect(latestCallback).toHaveBeenLastCalledWith("typed");
	});

	test("keeps a stable identity across renders and only changes when waitMs changes", () => {
		const { result, rerender } = renderHook(
			// Why fresh arguments: a new callback and a new options object on every
			// render must not change the returned function's identity.
			({ waitMs }: { waitMs: number }) => useDebouncedCallback(() => {}, { waitMs }),
			{ initialProps: { waitMs: 100 } },
		);
		const initial = result.current;

		rerender({ waitMs: 100 });
		expect(result.current).toBe(initial);

		rerender({ waitMs: 200 });
		expect(result.current).not.toBe(initial);
	});

	test("uses the newest waitMs for calls made after it changes", () => {
		const callback = vi.fn<Callback>();
		const { result, rerender } = renderHook(
			({ waitMs }: { waitMs: number }) => useDebouncedCallback(callback, { waitMs }),
			{ initialProps: { waitMs: 100 } },
		);

		rerender({ waitMs: 500 });
		result.current("slow");
		vi.advanceTimersByTime(100);
		expect(callback).not.toHaveBeenCalled();

		vi.advanceTimersByTime(400);

		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenLastCalledWith("slow");
	});

	test("unmounting cancels the pending invocation", () => {
		const callback = vi.fn<Callback>();
		const { result, unmount } = renderHook(() => useDebouncedCallback(callback, { waitMs: 100 }));
		result.current();
		unmount();
		vi.advanceTimersByTime(100);
		expect(callback).not.toHaveBeenCalled();
	});
});
