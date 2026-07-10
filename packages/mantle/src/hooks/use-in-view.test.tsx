import { act, renderHook } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useInView } from "./use-in-view.js";

describe("useInView", () => {
	let intersectionCallback: IntersectionObserverCallback;
	let mockObserve: ReturnType<typeof vi.fn>;
	let mockUnobserve: ReturnType<typeof vi.fn>;
	let mockDisconnect: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockObserve = vi.fn<(target: Element) => void>();
		mockUnobserve = vi.fn<(target: Element) => void>();
		mockDisconnect = vi.fn<() => void>();

		// vi.fn() produces an arrow function which cannot be used as a constructor with `new`,
		// so we use a class to create a proper constructor mock.
		class MockIntersectionObserver {
			observe = mockObserve;
			unobserve = mockUnobserve;
			disconnect = mockDisconnect;

			constructor(callback: IntersectionObserverCallback) {
				intersectionCallback = callback;
			}
		}

		vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function triggerIntersection(element: Element, isIntersecting: boolean) {
		act(() => {
			intersectionCallback(
				[{ target: element, isIntersecting } as IntersectionObserverEntry],
				{} as IntersectionObserver,
			);
		});
	}

	test("returns false initially by default", () => {
		const element = document.createElement("div");
		const { result } = renderHook(() => useInView(useRef(element)));
		expect(result.current).toBe(false);
	});

	test("returns the initial option value before observer fires", () => {
		const element = document.createElement("div");
		const { result } = renderHook(() => useInView(useRef(element), { initial: true }));
		expect(result.current).toBe(true);
	});

	test("starts observing the element immediately", () => {
		const element = document.createElement("div");
		renderHook(() => useInView(useRef(element)));
		expect(mockObserve).toHaveBeenCalledWith(element);
	});

	test("returns true when element enters the viewport", () => {
		const element = document.createElement("div");
		const { result } = renderHook(() => useInView(useRef(element)));

		triggerIntersection(element, true);
		expect(result.current).toBe(true);
	});

	test("with once=true, stays true after element enters the viewport", () => {
		const element = document.createElement("div");
		const { result } = renderHook(() => useInView(useRef(element), { once: true }));

		triggerIntersection(element, true);
		expect(result.current).toBe(true);

		// After once=true fires, the observer unobserves internally; state must remain true
		expect(result.current).toBe(true);
	});

	test("unobserves and disconnects the observer on unmount", () => {
		const element = document.createElement("div");
		const { unmount } = renderHook(() => useInView(useRef(element)));

		unmount();
		expect(mockUnobserve).toHaveBeenCalledWith(element);
		expect(mockDisconnect).toHaveBeenCalled();
	});
});
