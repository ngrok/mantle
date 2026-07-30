import { renderHook, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { useIsApplePlatform } from "./use-is-apple-platform.js";

function Probe() {
	const isApple = useIsApplePlatform();
	return <span>{String(isApple)}</span>;
}

describe("useIsApplePlatform", () => {
	test("renders the non-Apple answer on the server, even on an Apple host", () => {
		// The whole point of the hook: the server cannot know the platform, so it
		// must not read it during render. Reading `isApplePlatform()` there would
		// disagree with the client and produce a hydration mismatch — and asserting
		// only post-mount state cannot see the render path at all.
		vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");

		expect(renderToString(<Probe />)).toContain("false");
	});

	test("corrects itself to true after mount on an Apple host", async () => {
		vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");

		const { result } = renderHook(() => useIsApplePlatform());

		await waitFor(() => {
			expect(result.current).toBe(true);
		});
	});

	test("stays false after mount on a non-Apple host", async () => {
		vi.spyOn(navigator, "platform", "get").mockReturnValue("Win32");

		const { result } = renderHook(() => useIsApplePlatform());

		// Polled rather than asserted once: the effect has already flushed by the
		// time `renderHook` returns, so a value that flipped would be visible here.
		await waitFor(() => {
			expect(result.current).toBe(false);
		});
	});
});
