/**
 * Shared viewport observation for chart Roots. Every chart under one scroll
 * root shares one trio of `IntersectionObserver`s, so a list of 100 charts
 * holds three observers instead of 300. The `visible` band tells a chart a
 * reader can see it, the `near` band tells it to paint, and the `far` band
 * tells it to release its canvas memory.
 *
 * This module is internal shared implementation — not exported from the package.
 */

/** Which band an entry reports: `visible` reveals, `near` paints, `far` releases memory. */
type VisibilityBand = "visible" | "near" | "far";

type VisibilityChange = {
	band: VisibilityBand;
	/** Whether the element intersects the band. */
	inView: boolean;
};

type VisibilityHandler = (change: VisibilityChange) => void;

/** The viewport itself: a chart here is on screen. */
const VISIBLE_MARGIN = "0px";

/** One full viewport in every direction, so a chart paints before a reader scrolls to it. */
const NEAR_MARGIN = "100%";

/** Three viewports: past this a chart releases its canvas memory. */
const FAR_MARGIN = "300%";

type SharedObservers = {
	visible: IntersectionObserver;
	near: IntersectionObserver;
	far: IntersectionObserver;
	/** Elements observed through this trio; the trio disconnects at zero. */
	count: number;
};

/** The scroll root a trio serves: the document for the viewport, else a scroll container. */
type ScrollRoot = Document | Element;

const observersByRoot = new WeakMap<ScrollRoot, SharedObservers>();
const handlersByElement = new WeakMap<Element, VisibilityHandler>();

let scrollMarginSupport: boolean | null = null;

/**
 * Whether this engine's observers take `scrollMargin`. Without it a margin
 * widens the viewport alone and every scroll container still clips at its
 * edge, so the fallback observes from the nearest scroll container instead.
 */
const supportsScrollMargin = (): boolean => {
	if (scrollMarginSupport == null) {
		const probe = new IntersectionObserver(() => {}, { scrollMargin: VISIBLE_MARGIN });
		scrollMarginSupport = "scrollMargin" in probe;
		probe.disconnect();
	}
	return scrollMarginSupport;
};

const SCROLLS = /auto|scroll/;

/**
 * The nearest ancestor that scrolls, or the document when the viewport is the
 * only scroller. Read once per chart, on engines without `scrollMargin`.
 */
const scrollRootOf = (element: Element): ScrollRoot => {
	const document = element.ownerDocument;
	const view = document.defaultView;
	if (view == null) {
		return document;
	}
	for (let node = element.parentElement; node != null; node = node.parentElement) {
		if (node === document.documentElement || node === document.body) {
			break;
		}
		const style = view.getComputedStyle(node);
		if (SCROLLS.test(style.overflowY) || SCROLLS.test(style.overflowX)) {
			return node;
		}
	}
	return document;
};

const createObserver = (
	band: VisibilityBand,
	margin: string,
	root: ScrollRoot,
): IntersectionObserver =>
	new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				handlersByElement.get(entry.target)?.({ band, inView: entry.isIntersecting });
			}
		},
		{
			root: root instanceof Element ? root : null,
			rootMargin: margin,
			// Why scrollMargin: `rootMargin` widens the viewport alone. A chart in a
			// scrolling panel also needs the panel's clip widened, or it paints only
			// once the panel has revealed it.
			scrollMargin: margin,
			threshold: 0,
		},
	);

/**
 * Observe how near `element` is to the viewport, through the shared observer
 * trio of its scroll root. `onChange` receives one entry per band whenever
 * that band's intersection flips, starting with the initial state. Without an
 * `IntersectionObserver` (a jsdom test) every band reports in view at once, so
 * a chart there paints and reveals at mount.
 *
 * @example
 * ```ts
 * const stop = observeChartVisibility(plot, ({ band, inView }) => {
 *   if (band === "near") {
 *     engine.setInView(inView);
 *   } else if (band === "visible" && inView) {
 *     engine.markSeen();
 *   } else if (band === "far" && !inView) {
 *     engine.releaseBackingStores();
 *   }
 * });
 * ```
 */
const observeChartVisibility = (element: Element, onChange: VisibilityHandler): (() => void) => {
	if (typeof IntersectionObserver === "undefined") {
		onChange({ band: "near", inView: true });
		onChange({ band: "far", inView: true });
		onChange({ band: "visible", inView: true });
		return () => {};
	}
	const root: ScrollRoot = supportsScrollMargin() ? element.ownerDocument : scrollRootOf(element);
	let shared = observersByRoot.get(root);
	if (shared == null) {
		shared = {
			near: createObserver("near", NEAR_MARGIN, root),
			far: createObserver("far", FAR_MARGIN, root),
			visible: createObserver("visible", VISIBLE_MARGIN, root),
			count: 0,
		};
		observersByRoot.set(root, shared);
	}
	const observers = shared;
	observers.count += 1;
	handlersByElement.set(element, onChange);
	observers.near.observe(element);
	observers.far.observe(element);
	observers.visible.observe(element);
	return () => {
		if (handlersByElement.get(element) !== onChange) {
			return;
		}
		handlersByElement.delete(element);
		observers.near.unobserve(element);
		observers.far.unobserve(element);
		observers.visible.unobserve(element);
		observers.count -= 1;
		if (observers.count === 0) {
			observers.near.disconnect();
			observers.far.disconnect();
			observers.visible.disconnect();
			if (observersByRoot.get(root) === observers) {
				observersByRoot.delete(root);
			}
		}
	};
};

export type {
	//,
	VisibilityBand,
	VisibilityChange,
};
export {
	//,
	observeChartVisibility,
};
