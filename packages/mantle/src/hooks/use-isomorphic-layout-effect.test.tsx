import { renderHook } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect.js";

describe("useIsomorphicLayoutEffect", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("resolves to useLayoutEffect in a browser environment", () => {
		expect(useIsomorphicLayoutEffect).toBe(useLayoutEffect);
	});

	test("resolves to useEffect when window is undefined (server rendering)", async () => {
		vi.resetModules();
		vi.stubGlobal("window", undefined);

		// Re-import within the reset module registry so both sides of the
		// comparison resolve from the same React instance.
		const [serverModule, react] = await Promise.all([
			import("./use-isomorphic-layout-effect.js"),
			import("react"),
		]);

		expect(serverModule.useIsomorphicLayoutEffect).toBe(react.useEffect);
		expect(serverModule.useIsomorphicLayoutEffect).not.toBe(react.useLayoutEffect);
	});

	test("runs the effect and its cleanup", () => {
		const effect = vi.fn<() => void>();
		const cleanup = vi.fn<() => void>();

		const { unmount } = renderHook(() => {
			useIsomorphicLayoutEffect(() => {
				effect();
				return cleanup;
			}, []);
		});

		expect(effect).toHaveBeenCalledTimes(1);
		expect(cleanup).not.toHaveBeenCalled();

		unmount();

		expect(cleanup).toHaveBeenCalledTimes(1);
	});
});
