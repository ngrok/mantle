import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { mockMatchMedia } from "../test-utils/mock-match-media.js";
import { useScrollBehavior } from "./use-scroll-behavior.js";

const noPreferenceQuery = "(prefers-reduced-motion: no-preference)";

describe("useScrollBehavior", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('returns "smooth" when the user allows motion', () => {
		mockMatchMedia({ [noPreferenceQuery]: true });

		const { result } = renderHook(() => useScrollBehavior());

		expect(result.current).toBe("smooth");
	});

	test('returns "auto" when the user prefers reduced motion', () => {
		mockMatchMedia({ [noPreferenceQuery]: false });

		const { result } = renderHook(() => useScrollBehavior());

		expect(result.current).toBe("auto");
	});

	test("updates when the motion preference changes", () => {
		const media = mockMatchMedia({ [noPreferenceQuery]: true });

		const { result } = renderHook(() => useScrollBehavior());
		expect(result.current).toBe("smooth");

		act(() => {
			media.setMatches(noPreferenceQuery, false);
		});
		expect(result.current).toBe("auto");

		act(() => {
			media.setMatches(noPreferenceQuery, true);
		});
		expect(result.current).toBe("smooth");
	});
});
