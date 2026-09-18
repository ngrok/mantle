import { act, renderHook } from "@testing-library/react";
import { useRef } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Mock } from "vitest";
import { useInView } from "./use-in-view.js";

describe("useInView", () => {
	let dispatchEntries: (entries: IntersectionObserverEntry[]) => void;
	let mockObserve: Mock<(target: Element) => void>;
	let mockUnobserve: Mock<(target: Element) => void>;
	let mockDisconnect: Mock<() => void>;

	beforeEach(() => {
		mockObserve = vi.fn<(target: Element) => void>();
		mockUnobserve = vi.fn<(target: Element) => void>();
		mockDisconnect = vi.fn<() => void>();

		// vi.fn() produces an arrow function which cannot be used as a constructor with `new`,
		// so we use a class to create a proper constructor mock.
		class MockIntersectionObserver implements IntersectionObserver {
			root = null;
			rootMargin = "";
			scrollMargin = "";
			thresholds: number[] = [];
			observe = mockObserve;
			unobserve = mockUnobserve;
			disconnect = mockDisconnect;
			takeRecords = () => [];

			constructor(callback: IntersectionObserverCallback) {
				dispatchEntries = (entries) => callback(entries, this);
			}
		}

		vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
	});

	function triggerIntersection(element: Element, isIntersecting: boolean) {
		const entry: IntersectionObserverEntry = {
			target: element,
			isIntersecting,
			intersectionRatio: isIntersecting ? 1 : 0,
			boundingClientRect: new DOMRectReadOnly(),
			intersectionRect: new DOMRectReadOnly(),
			rootBounds: null,
			time: 0,
		};
		act(() => {
			dispatchEntries([entry]);
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
		expect(mockObserve).toHaveBeenCalledExactlyOnceWith(element);
	});

	test("returns true when element enters the viewport", () => {
		const element = document.createElement("div");
		const { result } = renderHook(() => useInView(useRef(element)));

		triggerIntersection(element, true);
		expect(result.current).toBe(true);
	});

	test("returns false again when the element leaves the viewport", () => {
		const element = document.createElement("div");
		const { result } = renderHook(() => useInView(useRef(element)));

		triggerIntersection(element, true);
		triggerIntersection(element, false);
		expect(result.current).toBe(false);
	});

	test("with once=true, stays true after the element leaves the viewport", () => {
		const element = document.createElement("div");
		const { result } = renderHook(() => useInView(useRef(element), { once: true }));

		triggerIntersection(element, true);
		// Why a leave entry: with `once` the hook stores no leave handler, so the entry changes nothing.
		triggerIntersection(element, false);
		expect(result.current).toBe(true);
	});

	test("with once=true, a later option change does not observe the element again", () => {
		// `once` promises to stop observing after the first entry. A guard that forgets the
		// entry re-runs the effect on the option change and observes a second time.
		const element = document.createElement("div");
		const { result, rerender } = renderHook(
			({ amount }: { amount: number }) => useInView(useRef(element), { once: true, amount }),
			{ initialProps: { amount: 0.5 } },
		);
		triggerIntersection(element, true);
		expect(result.current).toBe(true);
		expect(mockObserve).toHaveBeenCalledTimes(1);

		rerender({ amount: 1 });

		expect(mockObserve).toHaveBeenCalledTimes(1);
		expect(result.current).toBe(true);
	});

	test("unobserves and disconnects the observer on unmount", () => {
		const element = document.createElement("div");
		const { unmount } = renderHook(() => useInView(useRef(element)));

		unmount();
		expect(mockUnobserve).toHaveBeenCalledExactlyOnceWith(element);
		expect(mockDisconnect).toHaveBeenCalledTimes(1);
	});
});
