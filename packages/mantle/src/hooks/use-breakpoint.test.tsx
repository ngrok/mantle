import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { mockMatchMedia } from "../test-utils/mock-match-media.js";
import { breakpoints } from "./use-breakpoint.js";
import type { Breakpoint, TailwindBreakpoint } from "./use-breakpoint.js";

/**
 * Pinned as a `satisfies` list so `pnpm -w run typecheck` fails if the
 * `TailwindBreakpoint` union gains, loses, or renames a member.
 */
const tailwindBreakpointList = [
	"2xl",
	"xl",
	"lg",
	"md",
	"sm",
	"xs",
	"2xs",
] as const satisfies readonly TailwindBreakpoint[];

/**
 * The media query strings each hook must use, spelled out from the documented
 * Tailwind breakpoints. They drive the `matchMedia` stub, so a query the
 * implementation spells differently simply never matches and the test fails.
 */
const minWidthQueries = {
	"2xl": "(min-width: 96rem)",
	xl: "(min-width: 80rem)",
	lg: "(min-width: 64rem)",
	md: "(min-width: 48rem)",
	sm: "(min-width: 40rem)",
	xs: "(min-width: 30rem)",
	"2xs": "(min-width: 22.5rem)",
} as const satisfies Record<TailwindBreakpoint, string>;

/** The `-0.01rem` offset keeps "below" from overlapping the breakpoint itself. */
const maxWidthQueries = {
	"2xl": "(max-width: 95.99rem)",
	xl: "(max-width: 79.99rem)",
	lg: "(max-width: 63.99rem)",
	md: "(max-width: 47.99rem)",
	sm: "(max-width: 39.99rem)",
	xs: "(max-width: 29.99rem)",
	"2xs": "(max-width: 22.49rem)",
} as const satisfies Record<TailwindBreakpoint, string>;

/**
 * The hooks are backed by module-level singletons (the `MediaQueryList` caches,
 * the current breakpoint value, the listener set, and the per-breakpoint
 * subscribe/snapshot caches), so every case needs its own module instance to
 * observe a fresh subscription against a fresh `matchMedia` stub.
 */
async function loadFreshModule() {
	vi.resetModules();
	return import("./use-breakpoint.js");
}

/**
 * Both change paths are `requestAnimationFrame`-coalesced; running the frame
 * callback synchronously keeps the resulting re-render inside `act`.
 */
function runAnimationFramesSynchronously() {
	vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
		callback(0);
		return 0;
	});
}

describe("breakpoints", () => {
	test("exports every breakpoint largest-to-smallest, with `default` first", () => {
		expect(breakpoints).toEqual(["default", "2xl", "xl", "lg", "md", "sm", "xs", "2xs"]);
	});

	test("`default` is the only Mantle breakpoint that is not a Tailwind breakpoint", () => {
		const extras = breakpoints.filter(
			(breakpoint: Breakpoint) => !tailwindBreakpointList.includes(breakpoint),
		);

		expect(extras).toEqual(["default"]);
	});
});

describe("useBreakpoint", () => {
	test("returns `default` when no min-width query matches", async () => {
		mockMatchMedia();
		const { useBreakpoint } = await loadFreshModule();

		const { result } = renderHook(() => useBreakpoint());

		expect(result.current).toBe("default");
	});

	test("returns the largest matching breakpoint", async () => {
		// a ~48rem viewport matches every min-width query up to and including md
		mockMatchMedia({
			[minWidthQueries["2xs"]]: true,
			[minWidthQueries.xs]: true,
			[minWidthQueries.sm]: true,
			[minWidthQueries.md]: true,
		});
		const { useBreakpoint } = await loadFreshModule();

		const { result } = renderHook(() => useBreakpoint());

		expect(result.current).toBe("md");
	});

	test("scans largest-to-smallest, so a larger match wins over a smaller one", async () => {
		mockMatchMedia({ [minWidthQueries["2xs"]]: true, [minWidthQueries["2xl"]]: true });
		const { useBreakpoint } = await loadFreshModule();

		const { result } = renderHook(() => useBreakpoint());

		expect(result.current).toBe("2xl");
	});

	test.each(tailwindBreakpointList)(
		"reads `%s` from its documented min-width query",
		async (breakpoint) => {
			mockMatchMedia({ [minWidthQueries[breakpoint]]: true });
			const { useBreakpoint } = await loadFreshModule();

			const { result } = renderHook(() => useBreakpoint());

			expect(result.current).toBe(breakpoint);
		},
	);

	test("re-renders with the new breakpoint when a min-width query changes", async () => {
		runAnimationFramesSynchronously();
		const media = mockMatchMedia({
			[minWidthQueries["2xs"]]: true,
			[minWidthQueries.xs]: true,
			[minWidthQueries.sm]: true,
			[minWidthQueries.md]: true,
		});
		const { useBreakpoint } = await loadFreshModule();

		const { result } = renderHook(() => useBreakpoint());
		expect(result.current).toBe("md");

		act(() => {
			media.setMatches(minWidthQueries.lg, true);
		});
		expect(result.current).toBe("lg");

		act(() => {
			media.setMatches(minWidthQueries.lg, false);
			media.setMatches(minWidthQueries.md, false);
		});
		expect(result.current).toBe("sm");
	});

	test("attaches one shared set of listeners no matter how many components subscribe", async () => {
		const media = mockMatchMedia();
		const { useBreakpoint } = await loadFreshModule();

		const first = renderHook(() => useBreakpoint());
		const second = renderHook(() => useBreakpoint());
		expect(media.listenerCount(minWidthQueries.md)).toBe(1);

		first.unmount();
		// one subscriber remains, so the singleton listeners must stay attached
		expect(media.listenerCount(minWidthQueries.md)).toBe(1);

		second.unmount();
		expect(media.listenerCount(minWidthQueries.md)).toBe(0);
	});

	test("removes every min-width listener once the last subscriber unmounts", async () => {
		const media = mockMatchMedia();
		const { useBreakpoint } = await loadFreshModule();

		const { unmount } = renderHook(() => useBreakpoint());
		for (const query of Object.values(minWidthQueries)) {
			expect(media.listenerCount(query)).toBe(1);
		}

		unmount();

		for (const query of Object.values(minWidthQueries)) {
			expect(media.listenerCount(query)).toBe(0);
		}
	});

	test("returns `default` during server rendering even when a larger query matches", async () => {
		mockMatchMedia({ [minWidthQueries["2xl"]]: true });
		const { useBreakpoint } = await loadFreshModule();

		function Probe() {
			return <span>{useBreakpoint()}</span>;
		}

		expect(renderToString(<Probe />)).toContain("default");
	});
});

describe("useIsBelowBreakpoint", () => {
	test("returns true when the breakpoint's max-width query matches", async () => {
		mockMatchMedia({ [maxWidthQueries.md]: true });
		const { useIsBelowBreakpoint } = await loadFreshModule();

		const { result } = renderHook(() => useIsBelowBreakpoint("md"));

		expect(result.current).toBe(true);
	});

	test("returns false when the breakpoint's max-width query does not match", async () => {
		mockMatchMedia({ [maxWidthQueries.md]: false });
		const { useIsBelowBreakpoint } = await loadFreshModule();

		const { result } = renderHook(() => useIsBelowBreakpoint("md"));

		expect(result.current).toBe(false);
	});

	test.each(tailwindBreakpointList)(
		"reads `%s` from its documented max-width query",
		async (breakpoint) => {
			mockMatchMedia({ [maxWidthQueries[breakpoint]]: true });
			const { useIsBelowBreakpoint } = await loadFreshModule();

			const { result } = renderHook(() => useIsBelowBreakpoint(breakpoint));

			expect(result.current).toBe(true);
		},
	);

	test("does not read a neighbouring breakpoint's max-width query", async () => {
		// a viewport below lg but not below md must report false for md
		mockMatchMedia({ [maxWidthQueries.lg]: true, [maxWidthQueries.md]: false });
		const { useIsBelowBreakpoint } = await loadFreshModule();

		const { result } = renderHook(() => useIsBelowBreakpoint("md"));

		expect(result.current).toBe(false);
	});

	test("re-renders when the max-width query changes", async () => {
		runAnimationFramesSynchronously();
		const media = mockMatchMedia({ [maxWidthQueries.md]: false });
		const { useIsBelowBreakpoint } = await loadFreshModule();

		const { result } = renderHook(() => useIsBelowBreakpoint("md"));
		expect(result.current).toBe(false);

		act(() => {
			media.setMatches(maxWidthQueries.md, true);
		});
		expect(result.current).toBe(true);

		act(() => {
			media.setMatches(maxWidthQueries.md, false);
		});
		expect(result.current).toBe(false);
	});

	test("removes its change listener on unmount", async () => {
		const media = mockMatchMedia({ [maxWidthQueries.lg]: true });
		const { useIsBelowBreakpoint } = await loadFreshModule();

		const { unmount } = renderHook(() => useIsBelowBreakpoint("lg"));
		expect(media.listenerCount(maxWidthQueries.lg)).toBe(1);

		unmount();

		expect(media.listenerCount(maxWidthQueries.lg)).toBe(0);
	});

	test("returns false during server rendering even when the client query matches", async () => {
		mockMatchMedia({ [maxWidthQueries.md]: true });
		const { useIsBelowBreakpoint } = await loadFreshModule();

		function Probe() {
			return <span>{String(useIsBelowBreakpoint("md"))}</span>;
		}

		expect(renderToString(<Probe />)).toContain("false");
	});
});
