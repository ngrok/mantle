/**
 * The activation queue chart Roots share. One intersection delivery can name
 * forty charts at once, and activating every one in that task blocks input
 * for a frame or more on a slow device. The queue runs the on-screen charts
 * first, in slices of a few milliseconds, and yields to the browser between
 * slices, so the page keeps painting and answering input while the rest fill.
 *
 * This module is internal shared implementation — not exported from the package.
 */

type Activation = {
	/** Builds the chart's engine; receives the plot rect the observer reported. */
	run: (rect: DOMRectReadOnly | null) => void;
	rect: DOMRectReadOnly | null;
	/** Whether the plot intersects the viewport: on-screen charts run first. */
	onScreen: boolean;
	/** The plot's top edge, for document order within a band. */
	top: number;
};

/** The main-thread budget of one slice before the queue yields. */
const SLICE_MS = 4;

const queue = new Map<Element, Activation>();
/** Whether a yielded continuation is already scheduled. */
let continuationPending = false;

const hasYield = (value: unknown): value is { yield: () => Promise<void> } =>
	typeof value === "object" &&
	value != null &&
	"yield" in value &&
	typeof Reflect.get(value, "yield") === "function";

/**
 * Give the browser a task boundary: `scheduler.yield()` where it exists, else
 * a message-channel hop, else a zero timeout.
 */
const yieldToBrowser = (): Promise<void> => {
	const scheduler: unknown = Reflect.get(globalThis, "scheduler");
	if (hasYield(scheduler)) {
		return scheduler.yield();
	}
	return new Promise((resolve) => {
		if (typeof MessageChannel !== "undefined") {
			const channel = new MessageChannel();
			channel.port1.addEventListener(
				"message",
				() => {
					channel.port1.close();
					resolve();
				},
				{ once: true },
			);
			channel.port1.start();
			channel.port2.postMessage(null);
			return;
		}
		setTimeout(resolve, 0);
	});
};

const isOnScreen = (element: Element, rect: DOMRectReadOnly | null): boolean => {
	const view = element.ownerDocument.defaultView;
	if (rect == null || view == null) {
		return true;
	}
	return (
		rect.bottom > 0 && rect.top < view.innerHeight && rect.right > 0 && rect.left < view.innerWidth
	);
};

/**
 * Run one slice: at least one activation, then more until the budget is
 * spent. Whatever remains runs after a yield, unless a later flush gets to
 * it first.
 */
const drain = (): void => {
	const start = performance.now();
	const ordered = [...queue.entries()].toSorted(
		([, a], [, b]) => Number(b.onScreen) - Number(a.onScreen) || a.top - b.top,
	);
	for (const [element, activation] of ordered) {
		// A cancel or a re-queue during the slice drops the stale entry.
		if (queue.get(element) !== activation) {
			continue;
		}
		queue.delete(element);
		activation.run(activation.rect);
		if (queue.size > 0 && performance.now() - start >= SLICE_MS) {
			break;
		}
	}
	if (queue.size > 0 && !continuationPending) {
		continuationPending = true;
		void continueAfterYield();
	}
};

const continueAfterYield = async (): Promise<void> => {
	await yieldToBrowser();
	continuationPending = false;
	drain();
};

/**
 * Queue a chart's activation. Nothing runs until {@link flushActivations};
 * the observer calls it once per delivery, so one delivery's charts sort
 * together. A second call for the same element replaces the first.
 *
 * @example
 * ```ts
 * queueActivation(plot, { rect: entry.boundingClientRect, run: activate });
 * ```
 */
const queueActivation = (
	element: Element,
	activation: { rect: DOMRectReadOnly | null; run: Activation["run"] },
): void => {
	queue.set(element, {
		run: activation.run,
		rect: activation.rect,
		onScreen: isOnScreen(element, activation.rect),
		top: activation.rect?.top ?? 0,
	});
};

/**
 * Move a queued chart ahead of the off-screen ones: the viewport reached it
 * before its slice ran.
 *
 * @example
 * ```ts
 * promoteActivation(plot);
 * ```
 */
const promoteActivation = (element: Element): void => {
	const queued = queue.get(element);
	if (queued != null) {
		queued.onScreen = true;
	}
};

/**
 * Drop a queued chart, because its Root unmounted before its slice ran.
 *
 * @example
 * ```ts
 * cancelActivation(plot);
 * ```
 */
const cancelActivation = (element: Element): void => {
	queue.delete(element);
};

/**
 * Run the queue: the first slice now, inside the caller's task, and the rest
 * after a yield each.
 *
 * @example
 * ```ts
 * for (const entry of entries) {
 *   handlerFor(entry.target)?.(entry);
 * }
 * flushActivations();
 * ```
 */
const flushActivations = (): void => {
	if (queue.size === 0) {
		return;
	}
	drain();
};

export {
	//,
	cancelActivation,
	flushActivations,
	promoteActivation,
	queueActivation,
};
