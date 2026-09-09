import { renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { mockMatchMedia } from "../test-utils/mock-match-media.js";
import { breakpoints } from "./use-breakpoint.js";
import type { Breakpoint, TailwindBreakpoint } from "./use-breakpoint.js";

describe("breakpoints configuration", () => {
	test("includes all expected breakpoints including 2xs", () => {
		expect(breakpoints).toEqual(["default", "2xl", "xl", "lg", "md", "sm", "xs", "2xs"]);
	});

	test("has correct length", () => {
		expect(breakpoints).toHaveLength(8);
	});

	test("includes 2xs as a valid breakpoint", () => {
		expect(breakpoints).toContain("2xs");
	});

	test("2xs is positioned correctly in array", () => {
		expect(breakpoints[7]).toBe("2xs");
	});
});

describe("TailwindBreakpoint type", () => {
	test("2xs is a valid TailwindBreakpoint value", () => {
		const breakpoint: TailwindBreakpoint = "2xs";
		expect(breakpoint).toBe("2xs");
	});

	test("all tailwind breakpoints are valid", () => {
		const validBreakpoints: TailwindBreakpoint[] = ["2xl", "xl", "lg", "md", "sm", "xs", "2xs"];
		expect(validBreakpoints).toHaveLength(7);
	});
});

describe("Breakpoint type", () => {
	test("includes default and all tailwind breakpoints", () => {
		const allBreakpoints: Breakpoint[] = ["default", "2xl", "xl", "lg", "md", "sm", "xs", "2xs"];
		expect(allBreakpoints).toHaveLength(8);
	});
});

describe("useBreakpoint", () => {
	// Why a fresh module per test: the hook caches its `MediaQueryList`s and the
	// last breakpoint at module level, and `mockMatchMedia` installs a new stub
	// per test. A cache filled under one test's stub would answer the next test.
	async function loadUseBreakpoint() {
		vi.resetModules();
		const module = await import("./use-breakpoint.js");
		return module.useBreakpoint;
	}

	/** Every min-width query up to `lg` matches: a 1024px-wide viewport. */
	const largeViewport = {
		"(min-width: 64rem)": true,
		"(min-width: 48rem)": true,
		"(min-width: 40rem)": true,
		"(min-width: 30rem)": true,
		"(min-width: 22.5rem)": true,
	};

	test("renders the current breakpoint in the first render of a client mount", async () => {
		mockMatchMedia(largeViewport);
		const useBreakpoint = await loadUseBreakpoint();
		const renderedValues: Breakpoint[] = [];

		renderHook(() => {
			renderedValues.push(useBreakpoint());
		});

		// One render with the real value. A snapshot that returns the cached value
		// without recomputing records `["default", "lg"]`: the first frame paints
		// the mobile layout and React forces a second render after subscribe.
		expect(renderedValues).toEqual(["lg"]);
	});

	test("recomputes the breakpoint on a mount after every subscriber left", async () => {
		const media = mockMatchMedia(largeViewport);
		const useBreakpoint = await loadUseBreakpoint();

		const first = renderHook(() => useBreakpoint());
		expect(first.result.current).toBe("lg");
		first.unmount();

		// The viewport grows while nothing listens, so no change event reaches the store.
		media.setMatches("(min-width: 80rem)", true);

		const renderedValues: Breakpoint[] = [];
		renderHook(() => {
			renderedValues.push(useBreakpoint());
		});

		// A snapshot that trusts the cached value records the stale `["lg", "xl"]`.
		expect(renderedValues).toEqual(["xl"]);
	});

	test("returns default during server rendering even when the client viewport is large", async () => {
		mockMatchMedia(largeViewport);
		const useBreakpoint = await loadUseBreakpoint();
		function Probe() {
			return <span>{useBreakpoint()}</span>;
		}

		// A server snapshot that read the media queries would put `lg` in the HTML.
		const html = renderToString(<Probe />);

		expect(html).toContain("default");
		expect(html).not.toContain("lg");
	});
});
