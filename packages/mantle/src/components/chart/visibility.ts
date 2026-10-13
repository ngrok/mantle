/**
 * Shared viewport observation for chart Roots. Every chart in one document
 * shares one trio of `IntersectionObserver`s, so a list of 100 charts holds
 * three observers instead of 300. The `visible` band tells a chart a reader
 * can see it, the `near` band tells it to paint, and the `far` band tells it
 * to release its canvas memory.
 *
 * This module is internal shared implementation — not exported from the package.
 */
import { cancelActivation, flushActivations } from "./activation.js";

/** Which band an entry reports: `visible` reveals, `near` paints, `far` releases memory. */
type VisibilityBand = "visible" | "near" | "far";

type VisibilityChange = {
	band: VisibilityBand;
	/** Whether the element intersects the band. */
	inView: boolean;
	/** The element's rect at the time of the report; `null` without an observer. */
	rect: DOMRectReadOnly | null;
};

type VisibilityHandler = (change: VisibilityChange) => void;

/** The viewport itself: a chart here is on screen. */
const VISIBLE_MARGIN = "0px";

/** One full viewport in every direction, so a chart paints before a reader scrolls to it. */
const NEAR_MARGIN = "100%";

/** Three viewports: past this a chart releases its canvas memory. */
const FAR_MARGIN = "300%";

/** The trio rooted at one document's viewport. */
type ViewportObservers = {
	visible: IntersectionObserver;
	near: IntersectionObserver;
	far: IntersectionObserver;
	/** Charts and panels observed through this trio; the trio disconnects at zero. */
	count: number;
};

/** The bands a panel gates. The `visible` band observes from the viewport on every engine. */
type PanelBand = "near" | "far";

const PANEL_BANDS: readonly PanelBand[] = ["near", "far"];

/**
 * The fallback for an engine without `scrollMargin`. A panel's charts observe
 * the `near` and `far` bands from the panel, which widens the panel's clip,
 * and the panel itself observes the same bands from the viewport. A band
 * observes a chart only while the panel is inside that band, so a panel below
 * the fold activates nothing and releases its charts when it scrolls away.
 */
type PanelObservers = {
	near: IntersectionObserver;
	far: IntersectionObserver;
	/** Whether the panel is inside the viewport's band of the same name. */
	open: Record<PanelBand, boolean>;
	/** The charts inside the panel. */
	elements: Set<Element>;
};

const viewportObserversByDocument = new WeakMap<Document, ViewportObservers>();
const panelObserversByPanel = new WeakMap<Element, PanelObservers>();
const handlersByElement = new WeakMap<Element, VisibilityHandler>();

let scrollMarginSupport: boolean | null = null;

/**
 * Whether this engine's observers take `scrollMargin`. Without it a margin
 * widens the viewport alone and every scroll container still clips at its
 * edge, so a chart inside one observes from the panel instead.
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
 * The nearest ancestor that scrolls, or `null` when the viewport is the only
 * scroller. Read once per chart, on engines without `scrollMargin`.
 */
const scrollPanelOf = (element: Element): Element | null => {
	const document = element.ownerDocument;
	const view = document.defaultView;
	if (view == null) {
		return null;
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
	return null;
};

const createObserver = (
	band: VisibilityBand,
	margin: string,
	root: Element | null,
): IntersectionObserver =>
	new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				handlersByElement.get(entry.target)?.({
					band,
					inView: entry.isIntersecting,
					rect: entry.boundingClientRect,
				});
			}
			// Why after the loop: one delivery's charts queue together, so the
			// on-screen ones run first.
			flushActivations();
		},
		{
			root,
			rootMargin: margin,
			// Why scrollMargin: `rootMargin` widens the viewport alone. A chart in a
			// scrolling panel also needs the panel's clip widened, or it paints only
			// once the panel has revealed it.
			scrollMargin: margin,
			threshold: 0,
		},
	);

const viewportObserversFor = (document: Document): ViewportObservers => {
	let observers = viewportObserversByDocument.get(document);
	if (observers == null) {
		observers = {
			near: createObserver("near", NEAR_MARGIN, null),
			far: createObserver("far", FAR_MARGIN, null),
			visible: createObserver("visible", VISIBLE_MARGIN, null),
			count: 0,
		};
		viewportObserversByDocument.set(document, observers);
	}
	observers.count += 1;
	return observers;
};

const releaseViewportObservers = (document: Document, observers: ViewportObservers): void => {
	observers.count -= 1;
	if (observers.count > 0) {
		return;
	}
	observers.near.disconnect();
	observers.far.disconnect();
	observers.visible.disconnect();
	if (viewportObserversByDocument.get(document) === observers) {
		viewportObserversByDocument.delete(document);
	}
};

const panelObserversFor = (panel: Element, viewport: ViewportObservers): PanelObservers => {
	const observers = panelObserversByPanel.get(panel);
	if (observers != null) {
		return observers;
	}
	const created: PanelObservers = {
		near: createObserver("near", NEAR_MARGIN, panel),
		far: createObserver("far", FAR_MARGIN, panel),
		open: { near: false, far: false },
		elements: new Set(),
	};
	// The panel's own entries open and close its bands for every chart inside.
	// A closed band reports each chart out of view once and stops observing it.
	handlersByElement.set(panel, ({ band, inView }) => {
		if (band === "visible" || created.open[band] === inView) {
			return;
		}
		created.open[band] = inView;
		for (const element of created.elements) {
			if (inView) {
				created[band].observe(element);
			} else {
				created[band].unobserve(element);
				handlersByElement.get(element)?.({ band, inView: false, rect: null });
			}
		}
	});
	viewport.near.observe(panel);
	viewport.far.observe(panel);
	viewport.count += 1;
	panelObserversByPanel.set(panel, created);
	return created;
};

const releasePanelObservers = (
	panel: Element,
	observers: PanelObservers,
	viewport: ViewportObservers,
	document: Document,
): void => {
	if (observers.elements.size > 0) {
		return;
	}
	observers.near.disconnect();
	observers.far.disconnect();
	viewport.near.unobserve(panel);
	viewport.far.unobserve(panel);
	handlersByElement.delete(panel);
	if (panelObserversByPanel.get(panel) === observers) {
		panelObserversByPanel.delete(panel);
	}
	releaseViewportObservers(document, viewport);
};

/**
 * Observe how near `element` is to the viewport, through the shared observer
 * trio of its document. `onChange` receives one entry per band whenever that
 * band's intersection flips, starting with the initial state. Without an
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
		onChange({ band: "near", inView: true, rect: null });
		onChange({ band: "far", inView: true, rect: null });
		onChange({ band: "visible", inView: true, rect: null });
		flushActivations();
		return () => {
			cancelActivation(element);
		};
	}
	const document = element.ownerDocument;
	const viewport = viewportObserversFor(document);
	handlersByElement.set(element, onChange);
	viewport.visible.observe(element);
	const panel = supportsScrollMargin() ? null : scrollPanelOf(element);
	if (panel == null) {
		viewport.near.observe(element);
		viewport.far.observe(element);
		return () => {
			if (handlersByElement.get(element) !== onChange) {
				return;
			}
			handlersByElement.delete(element);
			cancelActivation(element);
			viewport.near.unobserve(element);
			viewport.far.unobserve(element);
			viewport.visible.unobserve(element);
			releaseViewportObservers(document, viewport);
		};
	}
	const panelObservers = panelObserversFor(panel, viewport);
	panelObservers.elements.add(element);
	for (const band of PANEL_BANDS) {
		if (panelObservers.open[band]) {
			panelObservers[band].observe(element);
		}
	}
	return () => {
		if (handlersByElement.get(element) !== onChange) {
			return;
		}
		handlersByElement.delete(element);
		cancelActivation(element);
		panelObservers.elements.delete(element);
		panelObservers.near.unobserve(element);
		panelObservers.far.unobserve(element);
		viewport.visible.unobserve(element);
		releaseViewportObservers(document, viewport);
		releasePanelObservers(panel, panelObservers, viewport, document);
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
