import { renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { useIsApplePlatform } from "./use-is-apple-platform.js";

function Probe() {
	const isApple = useIsApplePlatform();
	return <span>{String(isApple)}</span>;
}

describe("useIsApplePlatform", () => {
	test("renders the non-Apple answer on the server, even on an Apple host", () => {
		// The server cannot know the platform, so the server snapshot must not
		// read it. A server snapshot that read `isApplePlatform()` would put `true`
		// in the HTML from an Apple build host and mismatch every other client.
		// Post-mount state cannot see this render path, so `renderToString` must.
		vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");

		expect(renderToString(<Probe />)).toContain("false");
	});

	test("renders true in the first render of a client mount on an Apple host", () => {
		vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
		const renderedValues: boolean[] = [];

		renderHook(() => {
			renderedValues.push(useIsApplePlatform());
		});

		// One render with the real value. A `useState(false)` seed corrected in an
		// effect records `[false, true]` and commits twice.
		expect(renderedValues).toEqual([true]);
	});

	test("renders false in the first render of a client mount on a non-Apple host", () => {
		vi.spyOn(navigator, "platform", "get").mockReturnValue("Win32");
		const renderedValues: boolean[] = [];

		renderHook(() => {
			renderedValues.push(useIsApplePlatform());
		});

		expect(renderedValues).toEqual([false]);
	});
});
