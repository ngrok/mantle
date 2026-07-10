import { act, renderHook } from "@testing-library/react";
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

	test("defaults to true on the first render before the real preference is read", () => {
		mockMatchMedia({ [noPreferenceQuery]: true });
		const renderedValues: boolean[] = [];

		renderHook(() => {
			renderedValues.push(usePrefersReducedMotion());
		});

		// conservative default first, then the real (motion-allowed) value
		expect(renderedValues[0]).toBe(true);
		expect(renderedValues[renderedValues.length - 1]).toBe(false);
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

	test("returns true during server rendering", () => {
		const html = renderToString(<Probe />);

		expect(html).toContain("true");
	});
});
