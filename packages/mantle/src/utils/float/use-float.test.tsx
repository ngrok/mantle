import { renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { useOpenedOnce } from "./use-float.js";

describe("useOpenedOnce", () => {
	test("is false until the first open, then stays true after a close", () => {
		// A closed float that never opened skips its setup. Once it opens, it
		// stays mounted, so its exit transition can play.
		const { result, rerender } = renderHook(({ open }) => useOpenedOnce(open), {
			initialProps: { open: false },
		});
		expect(result.current).toBe(false);
		rerender({ open: true });
		expect(result.current).toBe(true);
		rerender({ open: false });
		expect(result.current).toBe(true);
	});
});
