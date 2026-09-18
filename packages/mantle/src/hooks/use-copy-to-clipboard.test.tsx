import { renderHook } from "@testing-library/react";
import { expect, test } from "vitest";
import { useCopyToClipboard } from "./use-copy-to-clipboard.js";

test("returns a stable reference across renders", () => {
	const { result, rerender } = renderHook(() => useCopyToClipboard());
	const first = result.current;
	rerender();
	expect(result.current).toBe(first);
});
