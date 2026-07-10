type MarginValue = `${number}${"px" | "%"}`;

/**
 * Margin string used to expand or contract the intersection root's bounding box.
 * Follows the same syntax as the CSS `margin` shorthand (1–4 values).
 *
 * @example "10px"
 * @example "10% 20px"
 * @example "10px 20px 10px 20px"
 */
type MarginType =
	| MarginValue
	| `${MarginValue} ${MarginValue}`
	| `${MarginValue} ${MarginValue} ${MarginValue}`
	| `${MarginValue} ${MarginValue} ${MarginValue} ${MarginValue}`;

/**
 * Options for the `inView` helper.
 */
type InViewOptions = {
	/**
	 * The scrollable container element (or `Document`) to use as the intersection root.
	 * Defaults to the browser viewport.
	 */
	root?: Element | Document;

	/**
	 * Expand or contract the detected area from each side of the root's bounding box.
	 * Uses the same syntax as the CSS `margin` shorthand (e.g. `"10px"`, `"10% 20px"`).
	 */
	margin?: MarginType;

	/**
	 * How much of the element must be visible before it is considered in view.
	 * - `"some"` (default): Any part of the element is visible.
	 * - `"all"`: The entire element is visible.
	 * - `number`: An intersection ratio between `0` and `1` (e.g. `0.5` for 50%).
	 */
	amount?: "some" | "all" | number;
};

/**
 * Callback invoked when an observed element leaves the viewport.
 * Receives the `IntersectionObserverEntry` for the departing element.
 */
type ViewChangeHandler = (entry: IntersectionObserverEntry) => void;

const thresholds = {
	some: 0,
	all: 1,
};

/**
 * Observe when a DOM element enters or leaves the viewport (or a scrollable
 * container) using the `IntersectionObserver` API.
 *
 * When the element enters the viewport, `onStart` is called. If `onStart`
 * returns a function, that function is called when the element leaves the
 * viewport. If `onStart` returns nothing, the element is unobserved after
 * the first entry.
 *
 * @param element - The DOM element to observe.
 * @param onStart - Called when the element enters the viewport. Optionally
 *   returns a cleanup function called when the element leaves.
 * @param options - Options for the intersection root, margin, and threshold.
 * @returns A cleanup function that disconnects the observer.
 *
 * @example
 * const stop = inView(element, (el) => {
 *   el.classList.add("visible");
 *   return () => el.classList.remove("visible");
 * });
 *
 * // Later, stop observing:
 * stop();
 */
function inView(
	element: Element,
	// `void | ViewChangeHandler` mirrors React's `EffectCallback` pattern so callers can
	// optionally return a cleanup handler without TS complaining about implicit-void returns.
	// oxlint-disable-next-line typescript/no-invalid-void-type
	onStart: (element: Element, entry: IntersectionObserverEntry) => void | ViewChangeHandler,
	{ root, margin: rootMargin, amount = "some" }: InViewOptions = {},
): VoidFunction {
	const activeIntersections = new WeakMap<Element, ViewChangeHandler>();

	const onIntersectionChange: IntersectionObserverCallback = (entries) => {
		entries.forEach((entry) => {
			const onEnd = activeIntersections.get(entry.target);

			/**
			 * If there's no change to the intersection, we don't need to
			 * do anything here.
			 */
			if (entry.isIntersecting === Boolean(onEnd)) {
				return;
			}

			if (entry.isIntersecting) {
				const newOnEnd = onStart(entry.target, entry);
				if (typeof newOnEnd === "function") {
					activeIntersections.set(entry.target, newOnEnd);
				} else {
					observer.unobserve(entry.target);
				}
			} else if (typeof onEnd === "function") {
				onEnd(entry);
				activeIntersections.delete(entry.target);
			}
		});
	};

	const observer = new IntersectionObserver(onIntersectionChange, {
		root,
		rootMargin,
		threshold: typeof amount === "number" ? amount : thresholds[amount],
	});

	observer.observe(element);

	return () => {
		observer.unobserve(element);
		observer.disconnect();
	};
}

export { inView };
export type { InViewOptions, MarginType, ViewChangeHandler };
