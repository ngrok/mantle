import { act, renderHook } from "@testing-library/react";
import { useRef } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Mock } from "vitest";
import { useInView } from "./use-in-view.js";

describe("useInView", () => {
	let dispatchEntries: (entries: IntersectionObserverEntry[]) => void;
	// Why a holder: the constructor records the instance it built, and oxlint forbids
	// assigning `this` to a bare variable.
	const built: { observer: IntersectionObserver | undefined } = { observer: undefined };
	let mockObserve: Mock<(target: Element) => void>;
	let mockUnobserve: Mock<(target: Element) => void>;
	let mockDisconnect: Mock<() => void>;

	beforeEach(() => {
		mockObserve = vi.fn<(target: Element) => void>();
		mockUnobserve = vi.fn<(target: Element) => void>();
		mockDisconnect = vi.fn<() => void>();
		built.observer = undefined;

		// vi.fn() produces an arrow function which cannot be used as a constructor with `new`,
		// so we use a class to create a proper constructor mock.
		class MockIntersectionObserver implements IntersectionObserver {
			// Why these mirror the real read-only properties: a test reads the
			// options through the instance, so an assertion on `root` or
			// `thresholds` fails when no observer was built at all.
			root: Element | Document | null;
			rootMargin: string;
			scrollMargin = "";
			thresholds: number[];
			observe = mockObserve;
			unobserve = mockUnobserve;
			disconnect = mockDisconnect;
			takeRecords = () => [];

			constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
				this.root = options?.root ?? null;
				this.rootMargin = options?.rootMargin ?? "";
				const threshold = options?.threshold ?? 0;
				this.thresholds = Array.isArray(threshold) ? threshold : [threshold];
				dispatchEntries = (entries) => callback(entries, this);
				built.observer = this;
			}
		}

		vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
	});

	function triggerIntersection({
		element,
		isIntersecting,
	}: {
		element: Element;
		isIntersecting: boolean;
	}) {
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

		triggerIntersection({ element, isIntersecting: true });
		expect(result.current).toBe(true);
	});

	test("returns false again when the element leaves the viewport", () => {
		const element = document.createElement("div");
		const { result } = renderHook(() => useInView(useRef(element)));

		triggerIntersection({ element, isIntersecting: true });
		triggerIntersection({ element, isIntersecting: false });
		expect(result.current).toBe(false);

		// the element stays observed, so a second entry is tracked too
		triggerIntersection({ element, isIntersecting: true });
		expect(result.current).toBe(true);
		expect(mockUnobserve).not.toHaveBeenCalled();
	});

	test("with once=true, unobserves on the first entry and stays true after the element leaves", () => {
		const element = document.createElement("div");
		const { result } = renderHook(() => useInView(useRef(element), { once: true }));

		triggerIntersection({ element, isIntersecting: true });
		expect(result.current).toBe(true);
		expect(mockUnobserve).toHaveBeenCalledExactlyOnceWith(element);

		// Why a leave entry: with `once` the hook stores no leave handler, so the entry changes nothing.
		triggerIntersection({ element, isIntersecting: false });
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
		triggerIntersection({ element, isIntersecting: true });
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

	describe("observer options", () => {
		test("observes the viewport at a threshold of 0 with no margin by default", () => {
			const element = document.createElement("div");
			renderHook(() => useInView(useRef(element)));

			// `null` is the real observer's viewport root, so an unbuilt observer
			// (`undefined`) fails here instead of passing by absence.
			expect(built.observer?.root).toBeNull();
			expect(built.observer?.rootMargin).toBe("");
			expect(built.observer?.thresholds).toEqual([0]);
		});

		test.each([
			["some", 0],
			["all", 1],
			[0.5, 0.5],
		] as const)("amount=%s observes at a threshold of %s", (amount, threshold) => {
			const element = document.createElement("div");
			renderHook(() => useInView(useRef(element), { amount }));

			expect(built.observer?.thresholds).toEqual([threshold]);
		});

		test("passes margin through as the root margin", () => {
			const element = document.createElement("div");
			renderHook(() => useInView(useRef(element), { margin: "10px 20px" }));

			expect(built.observer?.rootMargin).toBe("10px 20px");
		});

		test("a root ref resolves to the referenced element, not the ref object", () => {
			const element = document.createElement("div");
			const container = document.createElement("section");
			renderHook(() => useInView(useRef(element), { root: useRef(container) }));

			expect(built.observer?.root).toBe(container);
		});

		test("an unattached root ref falls back to the viewport", () => {
			const element = document.createElement("div");
			renderHook(() => useInView(useRef(element), { root: useRef<Element | null>(null) }));

			expect(mockObserve).toHaveBeenCalledExactlyOnceWith(element);
			expect(built.observer?.root).toBeNull();
		});
	});
});
