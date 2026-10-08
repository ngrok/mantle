/**
 * Per-window state the chart engines share. A page of 100 charts holds one
 * reduced-motion query, one device-pixel-ratio watcher, and one pair of print
 * listeners per window instead of one of each per chart.
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
	let query = reducedMotionQueries.get(view.matchMedia);
	if (query == null) {
		query = view.matchMedia("(prefers-reduced-motion: reduce)");
		reducedMotionQueries.set(view.matchMedia, query);
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

export type {
	//,
	PrintListeners,
};
export {
	//,
	onPrint,
	prefersReducedMotion,
	watchDevicePixelRatio,
};
