import { act, renderHook } from "@testing-library/react";
import { useRef } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useInView } from "./use-in-view.js";

describe("useInView", () => {
	let intersectionCallback: IntersectionObserverCallback;
	let intersectionOptions: IntersectionObserverInit | undefined;
	let mockObserve: ReturnType<typeof vi.fn>;
	let mockUnobserve: ReturnType<typeof vi.fn>;
	let mockDisconnect: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockObserve = vi.fn<(target: Element) => void>();
		mockUnobserve = vi.fn<(target: Element) => void>();
		mockDisconnect = vi.fn<() => void>();
		intersectionOptions = undefined;

		// vi.fn() produces an arrow function which cannot be used as a constructor with `new`,
		// so we use a class to create a proper constructor mock.
		class MockIntersectionObserver {
			observe = mockObserve;
			unobserve = mockUnobserve;
			disconnect = mockDisconnect;

			constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
				intersectionCallback = callback;
				intersectionOptions = options;
			}
		}

		vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
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
		expect(mockObserve).toHaveBeenCalledTimes(1);
		expect(mockObserve).toHaveBeenCalledWith(element);
	});

	test("returns true when element enters the viewport", () => {
		const element = document.createElement("div");
		const { result } = renderHook(() => useInView(useRef(element)));

		triggerIntersection(element, true);
		expect(result.current).toBe(true);
	});

	test("returns to false when the element leaves the viewport again", () => {
		const element = document.createElement("div");
		const { result } = renderHook(() => useInView(useRef(element)));

		triggerIntersection(element, true);
		expect(result.current).toBe(true);

		triggerIntersection(element, false);
		expect(result.current).toBe(false);

		// the element is still observed, so a second entry is tracked too
		triggerIntersection(element, true);
		expect(result.current).toBe(true);
		expect(mockUnobserve).not.toHaveBeenCalled();
	});

	test("with once=true, unobserves on the first enter and stays true afterwards", () => {
		const element = document.createElement("div");
		const { result } = renderHook(() => useInView(useRef(element), { once: true }));

		triggerIntersection(element, true);
		expect(result.current).toBe(true);
		expect(mockUnobserve).toHaveBeenCalledWith(element);

		// a later leave must not reset a one-shot observation
		triggerIntersection(element, false);
		expect(result.current).toBe(true);
	});

	test("unobserves and disconnects the observer on unmount", () => {
		const element = document.createElement("div");
		const { unmount } = renderHook(() => useInView(useRef(element)));

		unmount();
		expect(mockUnobserve).toHaveBeenCalledWith(element);
		expect(mockDisconnect).toHaveBeenCalledTimes(1);
	});

	describe("observation options", () => {
		test("default to a threshold of 0 with no root or rootMargin", () => {
			const element = document.createElement("div");
			renderHook(() => useInView(useRef(element)));

			expect(intersectionOptions?.threshold).toBe(0);
			expect(intersectionOptions?.root).toBeUndefined();
			expect(intersectionOptions?.rootMargin).toBeUndefined();
		});

		test('amount="some" maps to a threshold of 0', () => {
			const element = document.createElement("div");
			renderHook(() => useInView(useRef(element), { amount: "some" }));

			expect(intersectionOptions?.threshold).toBe(0);
		});

		test('amount="all" maps to a threshold of 1', () => {
			const element = document.createElement("div");
			renderHook(() => useInView(useRef(element), { amount: "all" }));

			expect(intersectionOptions?.threshold).toBe(1);
		});

		test("a numeric amount is passed through as the threshold", () => {
			const element = document.createElement("div");
			renderHook(() => useInView(useRef(element), { amount: 0.5 }));

			expect(intersectionOptions?.threshold).toBe(0.5);
		});

		test("margin is passed through as rootMargin", () => {
			const element = document.createElement("div");
			renderHook(() => useInView(useRef(element), { margin: "10px 20px" }));

			expect(intersectionOptions?.rootMargin).toBe("10px 20px");
		});

		test("a root ref resolves to the referenced element, not the ref object", () => {
			const element = document.createElement("div");
			const container = document.createElement("section");
			renderHook(() => useInView(useRef(element), { root: useRef(container) }));

			expect(intersectionOptions?.root).toBe(container);
		});

		test("an unattached root ref falls back to the viewport", () => {
			const element = document.createElement("div");
			renderHook(() => useInView(useRef(element), { root: useRef<Element | null>(null) }));

			// `intersectionOptions` starts each test as `undefined`, so an optional chain
			// alone would also report `undefined` for a hook that skipped observation
			// entirely. Pin that an observer was constructed and observing first.
			expect(mockObserve).toHaveBeenCalledTimes(1);
			expect(intersectionOptions).toBeDefined();
			expect(intersectionOptions?.root).toBeUndefined();
		});
	});
});
