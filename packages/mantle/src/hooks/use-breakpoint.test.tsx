import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { mockMatchMedia } from "../test-utils/mock-match-media.js";
import type { Breakpoint, TailwindBreakpoint } from "./use-breakpoint.js";

// Why a fresh module per test: the hooks cache their `MediaQueryList`s, the
// last breakpoint, and the per-breakpoint subscribe functions at module level,
// and `mockMatchMedia` installs a new stub per test. A cache filled under one
// test's stub would answer the next test.
async function loadUseBreakpoint() {
	vi.resetModules();
	return import("./use-breakpoint.js");
}

/**
 * Both change paths coalesce through `requestAnimationFrame`. Running the
 * frame callback synchronously keeps the resulting re-render inside `act`.
 */
function runAnimationFramesSynchronously() {
	vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
		callback(0);
		return 0;
	});
}

/**
 * The documented min-width query per Tailwind breakpoint. The table drives
 * the `matchMedia` stub, so a query the hook spells differently never matches.
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

const tailwindBreakpoints = [
	"2xl",
	"xl",
	"lg",
	"md",
	"sm",
	"xs",
	"2xs",
] as const satisfies readonly TailwindBreakpoint[];

describe("useBreakpoint", () => {
	/** Every min-width query up to `lg` matches: a 1024px-wide viewport. */
	const largeViewport = {
		[minWidthQueries.lg]: true,
		[minWidthQueries.md]: true,
		[minWidthQueries.sm]: true,
		[minWidthQueries.xs]: true,
		[minWidthQueries["2xs"]]: true,
	};

	test("renders the current breakpoint in the first render of a client mount", async () => {
		mockMatchMedia(largeViewport);
		const { useBreakpoint } = await loadUseBreakpoint();
		const renderedValues: Breakpoint[] = [];

		renderHook(() => {
			renderedValues.push(useBreakpoint());
		});

		// One render with the real value. A snapshot that returns the cached value
		// without recomputing records `["default", "lg"]`: the first frame paints
		// the mobile layout and React forces a second render after subscribe.
		expect(renderedValues).toEqual(["lg"]);
	});

	test("returns `default` when no min-width query matches", async () => {
		mockMatchMedia();
		const { useBreakpoint } = await loadUseBreakpoint();

		const { result } = renderHook(() => useBreakpoint());

		expect(result.current).toBe("default");
	});

	test("scans largest-to-smallest, so a larger match wins over a smaller one", async () => {
		mockMatchMedia({ [minWidthQueries["2xs"]]: true, [minWidthQueries["2xl"]]: true });
		const { useBreakpoint } = await loadUseBreakpoint();

		const { result } = renderHook(() => useBreakpoint());

		expect(result.current).toBe("2xl");
	});

	test.each(tailwindBreakpoints)(
		"reads `%s` from its documented min-width query",
		async (breakpoint) => {
			mockMatchMedia({ [minWidthQueries[breakpoint]]: true });
			const { useBreakpoint } = await loadUseBreakpoint();

			const { result } = renderHook(() => useBreakpoint());

			expect(result.current).toBe(breakpoint);
		},
	);

	test("recomputes the breakpoint on a mount after every subscriber left", async () => {
		const media = mockMatchMedia(largeViewport);
		const { useBreakpoint } = await loadUseBreakpoint();

		const first = renderHook(() => useBreakpoint());
		expect(first.result.current).toBe("lg");
		first.unmount();

		// The viewport grows while nothing listens, so no change event reaches the store.
		media.setMatches(minWidthQueries.xl, true);

		const renderedValues: Breakpoint[] = [];
		renderHook(() => {
			renderedValues.push(useBreakpoint());
		});

		// A snapshot that trusts the cached value records the stale `["lg", "xl"]`.
		expect(renderedValues).toEqual(["xl"]);
	});

	test("re-renders with the new breakpoint when a min-width query changes", async () => {
		runAnimationFramesSynchronously();
		const media = mockMatchMedia(largeViewport);
		const { useBreakpoint } = await loadUseBreakpoint();

		const { result } = renderHook(() => useBreakpoint());
		expect(result.current).toBe("lg");

		act(() => {
			media.setMatches(minWidthQueries.xl, true);
		});
		expect(result.current).toBe("xl");

		act(() => {
			media.setMatches(minWidthQueries.xl, false);
			media.setMatches(minWidthQueries.lg, false);
		});
		expect(result.current).toBe("md");
	});

	test("attaches one shared set of listeners no matter how many components subscribe", async () => {
		const media = mockMatchMedia();
		const { useBreakpoint } = await loadUseBreakpoint();

		const first = renderHook(() => useBreakpoint());
		const second = renderHook(() => useBreakpoint());
		expect(media.listenerCount(minWidthQueries.md)).toBe(1);

		first.unmount();
		// one subscriber remains, so the shared listeners must stay attached
		expect(media.listenerCount(minWidthQueries.md)).toBe(1);

		second.unmount();
		expect(media.listenerCount(minWidthQueries.md)).toBe(0);
	});

	test("removes every min-width listener once the last subscriber unmounts", async () => {
		const media = mockMatchMedia();
		const { useBreakpoint } = await loadUseBreakpoint();

		const { unmount } = renderHook(() => useBreakpoint());
		for (const query of Object.values(minWidthQueries)) {
			expect(media.listenerCount(query)).toBe(1);
		}

		unmount();

		for (const query of Object.values(minWidthQueries)) {
			expect(media.listenerCount(query)).toBe(0);
		}
	});

	test("returns default during server rendering even when the client viewport is large", async () => {
		mockMatchMedia(largeViewport);
		const { useBreakpoint } = await loadUseBreakpoint();
		function Probe() {
			return <span>{useBreakpoint()}</span>;
		}

		// A server snapshot that read the media queries would put `lg` in the HTML.
		const html = renderToString(<Probe />);

		expect(html).toContain("default");
		expect(html).not.toContain("lg");
	});
});

describe("useIsBelowBreakpoint", () => {
	test.each(tailwindBreakpoints)(
		"reads `%s` from its documented max-width query",
		async (breakpoint) => {
			mockMatchMedia({ [maxWidthQueries[breakpoint]]: true });
			const { useIsBelowBreakpoint } = await loadUseBreakpoint();

			const { result } = renderHook(() => useIsBelowBreakpoint(breakpoint));

			expect(result.current).toBe(true);
		},
	);

	test("does not read a neighbouring breakpoint's max-width query", async () => {
		// a viewport below lg but not below md must report false for md
		mockMatchMedia({ [maxWidthQueries.lg]: true, [maxWidthQueries.md]: false });
		const { useIsBelowBreakpoint } = await loadUseBreakpoint();

		const { result } = renderHook(() => useIsBelowBreakpoint("md"));

		expect(result.current).toBe(false);
	});

	test("re-renders when the max-width query changes", async () => {
		runAnimationFramesSynchronously();
		const media = mockMatchMedia({ [maxWidthQueries.md]: false });
		const { useIsBelowBreakpoint } = await loadUseBreakpoint();

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
		const { useIsBelowBreakpoint } = await loadUseBreakpoint();

		const { unmount } = renderHook(() => useIsBelowBreakpoint("lg"));
		expect(media.listenerCount(maxWidthQueries.lg)).toBe(1);

		unmount();

		expect(media.listenerCount(maxWidthQueries.lg)).toBe(0);
	});

	test("returns false during server rendering even when the client query matches", async () => {
		mockMatchMedia({ [maxWidthQueries.md]: true });
		const { useIsBelowBreakpoint } = await loadUseBreakpoint();
		function Probe() {
			return <span>{String(useIsBelowBreakpoint("md"))}</span>;
		}

		expect(renderToString(<Probe />)).toContain("false");
	});
});
