import { useLayoutEffect } from "react";
import { describe, expect, test, vi } from "vitest";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect.js";

describe("useIsomorphicLayoutEffect", () => {
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
});
