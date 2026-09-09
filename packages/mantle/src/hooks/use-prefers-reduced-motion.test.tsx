import { act, render, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import { mockMatchMedia } from "../test-utils/mock-match-media.js";
import { getPrefersReducedMotion, usePrefersReducedMotion } from "./use-prefers-reduced-motion.js";

const noPreferenceQuery = "(prefers-reduced-motion: no-preference)";

function Probe() {
	const prefersReducedMotion = usePrefersReducedMotion();
	return <span>{String(prefersReducedMotion)}</span>;
}

describe("getPrefersReducedMotion", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	test("returns false when the user has no motion preference (animations allowed)", () => {
		mockMatchMedia({ [noPreferenceQuery]: true });

		expect(getPrefersReducedMotion()).toBe(false);
	});

	test("returns true when the user prefers reduced motion", () => {
		mockMatchMedia({ [noPreferenceQuery]: false });

		expect(getPrefersReducedMotion()).toBe(true);
	});

	test("returns true (conservative default) outside a DOM environment", () => {
		vi.stubGlobal("window", undefined);

		expect(getPrefersReducedMotion()).toBe(true);
	});
});

describe("usePrefersReducedMotion", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("returns false once mounted when the user allows motion", () => {
		mockMatchMedia({ [noPreferenceQuery]: true });

		const { result } = renderHook(() => usePrefersReducedMotion());

		expect(result.current).toBe(false);
	});

	test("returns true once mounted when the user prefers reduced motion", () => {
		mockMatchMedia({ [noPreferenceQuery]: false });

		const { result } = renderHook(() => usePrefersReducedMotion());

		expect(result.current).toBe(true);
	});

	test("renders the real preference in the first render of a client mount", () => {
		mockMatchMedia({ [noPreferenceQuery]: true });
		const renderedValues: boolean[] = [];

		renderHook(() => {
			renderedValues.push(usePrefersReducedMotion());
		});

		// One render with the real value. A `useState(true)` seed corrected in an
		// effect records `[true, false]`, and a dialog that opens after hydration
		// starts with the wrong duration for a frame.
		expect(renderedValues).toEqual([false]);
	});

	test("hydrates with the server's true, then re-renders once with the real preference", () => {
		mockMatchMedia({ [noPreferenceQuery]: true });
		const renderedValues: boolean[] = [];
		function RecordingProbe() {
			const prefersReducedMotion = usePrefersReducedMotion();
			renderedValues.push(prefersReducedMotion);
			return <span>{String(prefersReducedMotion)}</span>;
		}

		// The client allows motion, so a server snapshot that read the real
		// preference would put `false` in the HTML and animate before hydration.
		const container = document.createElement("div");
		container.innerHTML = renderToString(<RecordingProbe />);
		document.body.append(container);
		expect(container.textContent).toBe("true");
		renderedValues.length = 0;

		render(<RecordingProbe />, { container, hydrate: true });

		// The hydration render repeats the server's `true`, so the markup matches.
		// React then re-renders once with the real value.
		expect(renderedValues).toEqual([true, false]);
		expect(container.textContent).toBe("false");
	});

	test("re-renders when the motion preference changes", () => {
		const media = mockMatchMedia({ [noPreferenceQuery]: true });

		const { result } = renderHook(() => usePrefersReducedMotion());
		expect(result.current).toBe(false);

		// user turns on "reduce motion": no-preference stops matching
		act(() => {
			media.setMatches(noPreferenceQuery, false);
		});
		expect(result.current).toBe(true);

		act(() => {
			media.setMatches(noPreferenceQuery, true);
		});
		expect(result.current).toBe(false);
	});

	test("removes its change listener on unmount", () => {
		const media = mockMatchMedia({ [noPreferenceQuery]: true });

		const { unmount } = renderHook(() => usePrefersReducedMotion());
		expect(media.listenerCount(noPreferenceQuery)).toBe(1);

		unmount();

		expect(media.listenerCount(noPreferenceQuery)).toBe(0);
	});

	test("constructs one MediaQueryList per instance across re-renders", () => {
		mockMatchMedia({ [noPreferenceQuery]: true });

		const { rerender } = renderHook(() => usePrefersReducedMotion());
		for (let renderCount = 0; renderCount < 5; renderCount += 1) {
			rerender();
		}

		// A `getSnapshot` that calls `window.matchMedia` directly constructs one
		// list per read, at least six here.
		expect(window.matchMedia).toHaveBeenCalledTimes(1);
		expect(window.matchMedia).toHaveBeenLastCalledWith(noPreferenceQuery);
	});

	test("returns true during server rendering even when the client allows motion", () => {
		mockMatchMedia({ [noPreferenceQuery]: true });

		const html = renderToString(<Probe />);

		expect(html).toContain("true");
	});
});
