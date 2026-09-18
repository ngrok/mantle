import { renderHook } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { useCallbackRef } from "./use-callback-ref.js";

describe("useCallbackRef", () => {
	test("returns a stable function identity across re-renders", () => {
		const { result, rerender } = renderHook(
			({ callback }: { callback: () => string }) => useCallbackRef(callback),
			{ initialProps: { callback: () => "first" } },
		);
		const first = result.current;

		rerender({ callback: () => "second" });

		expect(result.current).toBe(first);
	});

	test("invokes the latest callback passed on the most recent render", () => {
		const initialCallback = vi.fn<() => void>();
		const latestCallback = vi.fn<() => void>();
		const { result, rerender } = renderHook(({ callback }) => useCallbackRef(callback), {
			initialProps: { callback: initialCallback },
		});

		rerender({ callback: latestCallback });
		result.current();

		expect(initialCallback).not.toHaveBeenCalled();
		expect(latestCallback).toHaveBeenCalledTimes(1);
	});

	test("forwards arguments and returns the callback's result", () => {
		// Why `string` and not `unknown`: `pnpm typecheck` compiles this file, so this call
		// pins the `never[]` constraint. `(...args: unknown[]) => unknown` rejects a typed
		// parameter under `strictFunctionTypes`.
		const callback = vi.fn<(value: string) => string>((value) => `got:${value}`);
		const { result } = renderHook(() => useCallbackRef(callback));

		expect(result.current("x")).toBe("got:x");
		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenLastCalledWith("x");
	});

	test("is a safe no-op when no callback is provided", () => {
		const { result } = renderHook(() => useCallbackRef(undefined));

		expect(() => result.current()).not.toThrow();
		expect(result.current()).toBeUndefined();
	});

	test("becomes live once a callback is provided on a later render", () => {
		const callback = vi.fn<() => void>();
		const initialProps: { callback: (() => void) | undefined } = { callback: undefined };
		const { result, rerender } = renderHook(
			({ callback }: { callback: (() => void) | undefined }) => useCallbackRef(callback),
			{ initialProps },
		);

		result.current();
		expect(callback).not.toHaveBeenCalled();

		rerender({ callback });
		result.current();

		expect(callback).toHaveBeenCalledTimes(1);
	});
});
