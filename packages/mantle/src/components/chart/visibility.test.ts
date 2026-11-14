import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
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

const observe = (options: { far?: boolean } = {}) => {
	const element = document.createElement("div");
	const handler = vi.fn<(change: VisibilityChange) => void>();
	const stop = observeChartVisibility(element, { onChange: handler, ...options });
	stops.push(stop);
	return { element, handler, stop };
};

/** The observer for one band. The one-off support probe holds no target, so it never matches. */
const observerWithMargin = (margin: string): FakeIntersectionObserver => {
	const observer = instances.find(
		(instance) => instance.scrollMargin === margin && instance.targets.size > 0,
	);
	if (observer == null) {
		throw new Error(`expected an observer with a ${margin} scroll margin`);
	}
	return observer;
};

/** The live observer for one band and root. The disconnected support probe never matches. */
const observerFor = (margin: string, root: Element | null): FakeIntersectionObserver => {
	const observer = instances.find(
		(instance) =>
			instance.rootMargin === margin && instance.root === root && !instance.disconnected,
	);
	if (observer == null) {
		throw new Error(
			`expected an observer with a ${margin} root margin at ${root?.nodeName ?? "the viewport"}`,
		);
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
	// The scroll margin also widens the document's scroller. A root margin beside it widens
	// the viewport twice (100% of each reaches four viewports in Chromium).
	expect([visible.rootMargin, near.rootMargin, far.rootMargin]).toEqual(["0px", "0px", "0px"]);
	expect(near.root).toBeNull();

	// The rect rides along so an activation can seed the engine's size.
	near.report(first.element, true);
	expect(first.handler).toHaveBeenLastCalledWith({
		band: "near",
		inView: true,
		rect: expect.objectContaining({ top: 0 }),
	});
	visible.report(first.element, true);
	expect(first.handler).toHaveBeenLastCalledWith({
		band: "visible",
		inView: true,
		rect: expect.objectContaining({ top: 0 }),
	});
	far.report(first.element, false);
	expect(first.handler).toHaveBeenLastCalledWith({
		band: "far",
		inView: false,
		rect: expect.objectContaining({ top: 0 }),
	});
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
	expect(handler).toHaveBeenNthCalledWith(1, { band: "near", inView: true, rect: null });
	expect(handler).toHaveBeenNthCalledWith(2, { band: "far", inView: true, rect: null });
	expect(handler).toHaveBeenNthCalledWith(3, { band: "visible", inView: true, rect: null });
});

describe("an element that leaves out the far band", () => {
	test("joins the visible and the near observer alone", () => {
		const { element } = observe({ far: false });
		const margins = instances
			.filter((instance) => instance.targets.has(element))
			.map((instance) => instance.scrollMargin);
		// A surface with no bitmap has nothing to release three viewports away.
		expect(margins.toSorted()).toEqual(["0px", "100%"]);
	});

	test("gets no far report when there is no IntersectionObserver", () => {
		vi.stubGlobal("IntersectionObserver", undefined);
		const { handler } = observe({ far: false });
		expect(handler.mock.calls.map(([change]) => change.band)).toEqual(["near", "visible"]);
	});
});

describe("without scrollMargin support", () => {
	// An engine that ignores `scrollMargin` exposes no such property on its observers.
	class LegacyIntersectionObserver extends FakeIntersectionObserver {
		constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
			super(callback, options);
			Reflect.deleteProperty(this, "scrollMargin");
		}
	}

	/**
	 * A chart inside a wrapper, observed through a fresh module whose support
	 * probe sees the legacy engine. The wrapper scrolls on the block axis unless
	 * `overflow` says otherwise.
	 */
	const observeInPanel = async (
		config: { far?: boolean; overflow?: { x: string; y: string } } = {},
	) => {
		vi.stubGlobal("IntersectionObserver", LegacyIntersectionObserver);
		// Why a fresh module: the support probe runs once per module and is cached.
		vi.resetModules();
		const fresh = await import("./visibility.js");
		const panel = document.createElement("div");
		panel.style.overflowX = config.overflow?.x ?? "visible";
		panel.style.overflowY = config.overflow?.y ?? "auto";
		document.body.append(panel);
		/** Observe one more chart in the panel. */
		const add = (options: { far?: boolean } = {}) => {
			const element = document.createElement("div");
			panel.append(element);
			const handler = vi.fn<(change: VisibilityChange) => void>();
			const stop = fresh.observeChartVisibility(element, { onChange: handler, far: options.far });
			stops.push(stop);
			return { element, handler, stop };
		};
		const first = add({ far: config.far });
		stops.push(() => {
			panel.remove();
		});
		return { panel, ...first, add };
	};

	test("a panel's chart observes the near band from the panel, and only while the panel is near the viewport", async () => {
		const { panel, element, handler } = await observeInPanel();
		const viewportNear = observerFor("100%", null);
		const panelNear = observerFor("100%", panel);
		// The panel is the viewport's target; the chart waits for the panel to open the band.
		expect(viewportNear.targets.has(panel)).toBe(true);
		expect(panelNear.targets.has(element)).toBe(false);

		viewportNear.report(panel, true);
		expect(panelNear.targets.has(element)).toBe(true);
		panelNear.report(element, true);
		expect(handler).toHaveBeenLastCalledWith({
			band: "near",
			inView: true,
			rect: expect.objectContaining({ top: 0 }),
		});

		// A panel that scrolls away takes its charts out of view, whatever the panel-relative band says.
		viewportNear.report(panel, false);
		expect(handler).toHaveBeenLastCalledWith({ band: "near", inView: false, rect: null });
		expect(panelNear.targets.has(element)).toBe(false);
		expect(handler).toHaveBeenCalledTimes(2);
	});

	test("a panel beyond the far band releases its charts, and reopening the band observes them again", async () => {
		const { panel, element, handler } = await observeInPanel();
		const viewportFar = observerFor("300%", null);
		const panelFar = observerFor("300%", panel);
		viewportFar.report(panel, true);
		panelFar.report(element, true);
		viewportFar.report(panel, false);
		expect(handler).toHaveBeenLastCalledWith({ band: "far", inView: false, rect: null });
		viewportFar.report(panel, true);
		// The band observes the chart again, so the engine reports its real state.
		expect(panelFar.targets.has(element)).toBe(true);
		expect(handler).toHaveBeenCalledTimes(2);
	});

	test("the visible band observes from the viewport, so a reveal never plays offscreen", async () => {
		const { element } = await observeInPanel();
		expect(observerFor("0px", null).targets.has(element)).toBe(true);
		expect(
			instances.some((instance) => instance.rootMargin === "0px" && instance.root != null),
		).toBe(false);
	});

	test("a panel's chart that leaves out the far band stays off the panel's far observer", async () => {
		const { panel, element, handler } = await observeInPanel({ far: false });
		const viewportFar = observerFor("300%", null);
		const panelFar = observerFor("300%", panel);
		viewportFar.report(panel, true);
		expect(panelFar.targets.has(element)).toBe(false);
		// A band that closes reports each of its charts out of view, and this chart is not one.
		viewportFar.report(panel, false);
		expect(handler).toHaveBeenCalledTimes(0);
	});

	test("a wrapper that scrolls on the inline axis alone is not a panel", async () => {
		// A mantle Table scrolls on x and is as tall as its rows, so a band around
		// the table's own box holds the chart of every row.
		const { panel, element } = await observeInPanel({ overflow: { x: "auto", y: "hidden" } });
		expect(observerFor("100%", null).targets.has(element)).toBe(true);
		expect(instances.some((instance) => instance.root === panel)).toBe(false);
	});

	test("the cleanup of one of a panel's two charts keeps the other chart observed", async () => {
		// An SVG chart, which leaves out the far band, and a canvas chart share the panel.
		const { panel, element, add } = await observeInPanel({ far: false });
		const canvasChart = add({ far: true });
		const panelNear = observerFor("100%", panel);
		observerFor("100%", null).report(panel, true);

		canvasChart.stop();

		expect(panelNear.disconnected).toBe(false);
		expect(panelNear.targets.has(element)).toBe(true);
	});

	test("a far band that opens again does not observe a chart that left the panel", async () => {
		const { panel, add } = await observeInPanel({ far: false });
		const canvasChart = add({ far: true });
		const viewportFar = observerFor("300%", null);
		const panelFar = observerFor("300%", panel);
		viewportFar.report(panel, true);
		// Guards the check below: the band held the chart before the chart left.
		expect(panelFar.targets.has(canvasChart.element)).toBe(true);
		canvasChart.stop();

		viewportFar.report(panel, false);
		viewportFar.report(panel, true);

		expect(panelFar.targets.has(canvasChart.element)).toBe(false);
	});

	test("the last chart's cleanup releases the panel's observers and its viewport entries", async () => {
		const { panel, stop } = await observeInPanel();
		const panelNear = observerFor("100%", panel);
		const viewportNear = observerFor("100%", null);
		stop();
		expect(panelNear.disconnected).toBe(true);
		expect(viewportNear.targets.has(panel)).toBe(false);
		expect(viewportNear.disconnected).toBe(true);
	});
});
