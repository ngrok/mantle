import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { VisibilityChange } from "./visibility.js";
import { observeChartVisibility } from "./visibility.js";

/** Every observer the module constructs in a test, in construction order. */
const instances: FakeIntersectionObserver[] = [];

/**
 * An observer that records its options and delivers entries only when a test
 * asks, so the test decides which band flips for which element.
 */
class FakeIntersectionObserver implements IntersectionObserver {
	readonly root: Element | Document | null;
	readonly rootMargin: string;
	readonly scrollMargin: string;
	readonly thresholds: readonly number[];
	readonly targets = new Set<Element>();
	disconnected = false;
	#callback: IntersectionObserverCallback;

	constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
		this.#callback = callback;
		this.root = options.root ?? null;
		this.rootMargin = options.rootMargin ?? "0px";
		this.scrollMargin = options.scrollMargin ?? "0px";
		const threshold = options.threshold ?? 0;
		this.thresholds = Array.isArray(threshold) ? threshold : [threshold];
		instances.push(this);
	}

	observe(target: Element): void {
		this.targets.add(target);
	}

	unobserve(target: Element): void {
		this.targets.delete(target);
	}

	disconnect(): void {
		this.targets.clear();
		this.disconnected = true;
	}

	takeRecords(): IntersectionObserverEntry[] {
		return [];
	}

	/** Deliver one entry for `target`, as the browser does when its intersection flips. */
	report(target: Element, isIntersecting: boolean): void {
		if (!this.targets.has(target)) {
			return;
		}
		this.#callback(
			[
				{
					target,
					isIntersecting,
					intersectionRatio: isIntersecting ? 1 : 0,
					boundingClientRect: target.getBoundingClientRect(),
					intersectionRect: target.getBoundingClientRect(),
					rootBounds: null,
					time: 0,
				},
			],
			this,
		);
	}
}

/** Every observation a test started, released after it so the shared pair resets. */
const stops: Array<() => void> = [];

const observe = () => {
	const element = document.createElement("div");
	const handler = vi.fn<(change: VisibilityChange) => void>();
	const stop = observeChartVisibility(element, handler);
	stops.push(stop);
	return { element, handler, stop };
};

/** The observer for one band. The one-off support probe holds no target, so it never matches. */
const observerWithMargin = (margin: string): FakeIntersectionObserver => {
	const observer = instances.find(
		(instance) => instance.rootMargin === margin && instance.targets.size > 0,
	);
	if (observer == null) {
		throw new Error(`expected an observer with a ${margin} root margin`);
	}
	return observer;
};

beforeEach(() => {
	instances.length = 0;
	vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
});

afterEach(() => {
	for (const stop of stops) {
		stop();
	}
	stops.length = 0;
});

test("every element shares one observer per band: visible, near at one viewport, far at three", () => {
	const first = observe();
	observe();
	observe();
	// A per-call trio would hold nine observers for three charts.
	expect(instances.filter((instance) => instance.targets.size > 0)).toHaveLength(3);
	const visible = observerWithMargin("0px");
	const near = observerWithMargin("100%");
	const far = observerWithMargin("300%");
	// A scrolling panel clips the band too; `rootMargin` alone widens only the viewport.
	expect(near.scrollMargin).toBe("100%");
	expect(far.scrollMargin).toBe("300%");
	expect(near.root).toBeNull();

	near.report(first.element, true);
	expect(first.handler).toHaveBeenLastCalledWith({ band: "near", inView: true });
	visible.report(first.element, true);
	expect(first.handler).toHaveBeenLastCalledWith({ band: "visible", inView: true });
	far.report(first.element, false);
	expect(first.handler).toHaveBeenLastCalledWith({ band: "far", inView: false });
	expect(first.handler).toHaveBeenCalledTimes(3);
});

test("one element's cleanup stops its entries and keeps the others observed", () => {
	const first = observe();
	const second = observe();
	const near = observerWithMargin("100%");

	first.stop();
	near.report(first.element, true);
	near.report(second.element, true);
	expect(first.handler).toHaveBeenCalledTimes(0);
	expect(second.handler).toHaveBeenCalledTimes(1);
	// A cleanup that disconnects the shared observer would silence `second`.
	expect(near.disconnected).toBe(false);
});

test("the last cleanup disconnects every observer and the next observation builds a new trio", () => {
	const first = observe();
	const second = observe();
	const trio = instances.filter((instance) => instance.targets.size > 0);
	expect(trio).toHaveLength(3);
	first.stop();
	second.stop();
	expect(trio.map((instance) => instance.disconnected)).toEqual([true, true, true]);

	observe();
	// A leaked cache would hand the new element to the disconnected trio.
	const fresh = instances.filter((instance) => instance.targets.size > 0);
	expect(fresh).toHaveLength(3);
	expect(fresh.some((instance) => trio.includes(instance))).toBe(false);
});

test("with no IntersectionObserver every band reports in view at once", () => {
	vi.stubGlobal("IntersectionObserver", undefined);
	const { handler } = observe();
	expect(handler).toHaveBeenCalledTimes(3);
	expect(handler).toHaveBeenNthCalledWith(1, { band: "near", inView: true });
	expect(handler).toHaveBeenNthCalledWith(2, { band: "far", inView: true });
	expect(handler).toHaveBeenNthCalledWith(3, { band: "visible", inView: true });
});

test("without scrollMargin support the observers root at the nearest scroll container", async () => {
	// An engine that ignores `scrollMargin` exposes no such property on its observers.
	class LegacyIntersectionObserver extends FakeIntersectionObserver {
		constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
			super(callback, options);
			Reflect.deleteProperty(this, "scrollMargin");
		}
	}
	vi.stubGlobal("IntersectionObserver", LegacyIntersectionObserver);
	// Why a fresh module: the support probe runs once per module and is cached.
	vi.resetModules();
	const fresh = await import("./visibility.js");
	const panel = document.createElement("div");
	panel.style.overflowY = "auto";
	const element = document.createElement("div");
	panel.append(element);
	document.body.append(panel);
	const stop = fresh.observeChartVisibility(element, () => {});
	stops.push(stop);
	// A viewport root would clip the bands at the panel's edge on this engine.
	expect(observerWithMargin("100%").root).toBe(panel);
	expect(observerWithMargin("300%").root).toBe(panel);
	panel.remove();
});
