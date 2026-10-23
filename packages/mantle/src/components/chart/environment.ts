/**
 * Per-window state the chart engines share. A page of 100 charts holds one
 * reduced-motion query, one device-pixel-ratio watcher, one pair of print
 * listeners, and one font-load listener per window instead of one of each per
 * chart.
 *
 * This module is internal shared implementation — not exported from the package.
 */

// Why keyed by the function: a test that stubs `matchMedia` swaps the function, and the
// next read must build a fresh query from the stub instead of serving a cached one.
const reducedMotionQueries = new WeakMap<Window["matchMedia"], MediaQueryList>();

/**
 * Whether the viewer prefers reduced motion. `matches` is live, so a
 * preference toggled mid-session reads correctly on the next call.
 *
 * @example
 * ```ts
 * const duration = prefersReducedMotion(window) ? 0 : CHART_TWEEN_DURATION_MS;
 * ```
 */
const prefersReducedMotion = (view: Window): boolean => {
	if (typeof view.matchMedia !== "function") {
		return false;
	}
	// oxlint-disable-next-line typescript/unbound-method -- Why: the method is a cache key and is never called unbound.
	const cacheKey = view.matchMedia;
	let query = reducedMotionQueries.get(cacheKey);
	if (query == null) {
		query = view.matchMedia("(prefers-reduced-motion: reduce)");
		reducedMotionQueries.set(cacheKey, query);
	}
	return query.matches;
};

type RatioWatch = {
	listeners: Set<() => void>;
	disarm: () => void;
};

const ratioWatches = new WeakMap<Window, RatioWatch>();

/**
 * Arm one `change` listener on a resolution query that matches the current
 * ratio. The query stops matching when the ratio changes, which fires once;
 * the watch then re-arms at the new ratio and notifies every listener.
 */
const armRatioWatch = (view: Window, watch: RatioWatch): void => {
	const media = view.matchMedia(`(resolution: ${view.devicePixelRatio}dppx)`);
	const onChange = (): void => {
		media.removeEventListener("change", onChange);
		if (watch.listeners.size === 0) {
			return;
		}
		armRatioWatch(view, watch);
		for (const listener of watch.listeners) {
			listener();
		}
	};
	media.addEventListener("change", onChange);
	watch.disarm = () => media.removeEventListener("change", onChange);
};

/**
 * Call `onChange` whenever the window's device pixel ratio changes: browser
 * zoom, or a move to another monitor. Every chart in a window shares one
 * query. Returns the function that stops listening.
 *
 * @example
 * ```ts
 * const stop = watchDevicePixelRatio(window, () => engine.handleRatioChange());
 * ```
 */
const watchDevicePixelRatio = (view: Window, onChange: () => void): (() => void) => {
	if (typeof view.matchMedia !== "function") {
		return () => {};
	}
	let watch = ratioWatches.get(view);
	if (watch == null) {
		const created: RatioWatch = { listeners: new Set(), disarm: () => {} };
		armRatioWatch(view, created);
		ratioWatches.set(view, created);
		watch = created;
	}
	watch.listeners.add(onChange);
	return () => {
		watch.listeners.delete(onChange);
		if (watch.listeners.size === 0) {
			watch.disarm();
			ratioWatches.delete(view);
		}
	};
};

type PrintListeners = {
	/** Runs on `beforeprint`, before the print snapshot. */
	before: () => void;
	/** Runs on `afterprint`. */
	after: () => void;
};

type PrintWatch = {
	listeners: Set<PrintListeners>;
	onBefore: () => void;
	onAfter: () => void;
};

const printWatches = new WeakMap<Window, PrintWatch>();

/**
 * Run `listeners` around the window's print events. Every chart in a window
 * shares one `beforeprint` and one `afterprint` listener. Returns the function
 * that unsubscribes.
 *
 * @example
 * ```ts
 * const stop = onPrint(window, { before: () => engine.paintForPrint(), after: () => engine.releaseIfHidden() });
 * ```
 */
const onPrint = (view: Window, listeners: PrintListeners): (() => void) => {
	let watch = printWatches.get(view);
	if (watch == null) {
		const created: PrintWatch = {
			listeners: new Set(),
			onBefore: () => {
				for (const entry of created.listeners) {
					entry.before();
				}
			},
			onAfter: () => {
				for (const entry of created.listeners) {
					entry.after();
				}
			},
		};
		view.addEventListener("beforeprint", created.onBefore);
		view.addEventListener("afterprint", created.onAfter);
		printWatches.set(view, created);
		watch = created;
	}
	watch.listeners.add(listeners);
	return () => {
		watch.listeners.delete(listeners);
		if (watch.listeners.size === 0) {
			view.removeEventListener("beforeprint", watch.onBefore);
			view.removeEventListener("afterprint", watch.onAfter);
			printWatches.delete(view);
		}
	};
};

type FontWatch = {
	listeners: Set<() => void>;
	onLoad: () => void;
};

const fontWatches = new WeakMap<FontFaceSet, FontWatch>();

/**
 * Call `onLoad` each time the document finishes loading a web font. A chart
 * measures its labels with the font it has at that time, so a font that
 * swaps in later makes those measurements stale. Every chart in a document
 * shares one `loadingdone` listener. Returns the function that stops
 * listening.
 *
 * @example
 * ```ts
 * const stop = onFontsLoaded(document, () => engine.remeasureLabels());
 * ```
 */
const onFontsLoaded = (document: Document, onLoad: () => void): (() => void) => {
	const fonts = document.fonts;
	// Why the guard: a test DOM can have no `FontFaceSet`.
	if (fonts == null || typeof fonts.addEventListener !== "function") {
		return () => {};
	}
	let watch = fontWatches.get(fonts);
	if (watch == null) {
		const created: FontWatch = {
			listeners: new Set(),
			onLoad: () => {
				for (const listener of created.listeners) {
					listener();
				}
			},
		};
		fonts.addEventListener("loadingdone", created.onLoad);
		fontWatches.set(fonts, created);
		watch = created;
	}
	watch.listeners.add(onLoad);
	return () => {
		watch.listeners.delete(onLoad);
		if (watch.listeners.size === 0) {
			fonts.removeEventListener("loadingdone", watch.onLoad);
			fontWatches.delete(fonts);
		}
	};
};

type ResizeHandler = (entry: ResizeObserverEntry) => void;

type ResizeWatch = {
	observer: ResizeObserver;
	handlers: Map<Element, ResizeHandler>;
};

const resizeWatches = new WeakMap<Document, ResizeWatch>();

/**
 * Report size changes of `element` through the one `ResizeObserver` its
 * document holds. Every chart in a document shares it, so a page of 200
 * sparklines constructs one observer instead of 200. Returns the function
 * that stops the reports; the observer disconnects after the last one. A
 * second call for the same element replaces its handler. Without a
 * `ResizeObserver` (a test DOM) nothing reports.
 *
 * @example
 * ```ts
 * const stop = observeResize(plot, (entry) => engine.resize(entry.contentRect));
 * ```
 */
const observeResize = (element: Element, onResize: ResizeHandler): (() => void) => {
	if (typeof ResizeObserver === "undefined") {
		return () => {};
	}
	const document = element.ownerDocument;
	let watch = resizeWatches.get(document);
	if (watch == null) {
		const handlers = new Map<Element, ResizeHandler>();
		watch = {
			handlers,
			observer: new ResizeObserver((entries) => {
				for (const entry of entries) {
					handlers.get(entry.target)?.(entry);
				}
			}),
		};
		resizeWatches.set(document, watch);
	}
	const current = watch;
	current.handlers.set(element, onResize);
	current.observer.observe(element);
	return () => {
		if (current.handlers.get(element) !== onResize) {
			return;
		}
		current.handlers.delete(element);
		current.observer.unobserve(element);
		if (current.handlers.size === 0) {
			current.observer.disconnect();
			if (resizeWatches.get(document) === current) {
				resizeWatches.delete(document);
			}
		}
	};
};

export type {
	//,
	PrintListeners,
};
export {
	//,
	observeResize,
	onFontsLoaded,
	onPrint,
	prefersReducedMotion,
	watchDevicePixelRatio,
};
