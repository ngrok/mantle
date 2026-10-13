/** The stub's constructor plus the controls that deliver a later change. */
type IntersectionObserverStub = {
	Observer: typeof IntersectionObserver;
	/** Report `targets` as intersecting, in one delivery, to every observer that holds them. */
	enter: (...targets: Element[]) => void;
	/** Report `targets` as no longer intersecting, in one delivery, to every observer that holds them. */
	leave: (...targets: Element[]) => void;
};

const entryFor = (target: Element, isIntersecting: boolean): IntersectionObserverEntry => ({
	target,
	isIntersecting,
	intersectionRatio: isIntersecting ? 1 : 0,
	boundingClientRect: target.getBoundingClientRect(),
	intersectionRect: target.getBoundingClientRect(),
	rootBounds: null,
	time: 0,
});

/**
 * A controllable `IntersectionObserver` for happy-dom, whose own observer
 * never calls back. The stub reports every observed element as `intersecting`
 * says, synchronously inside `observe()`, and `enter`/`leave` deliver a later
 * change to every observer that holds the elements. Several elements in one
 * call arrive in one delivery, the way one scroll reports a row of charts.
 *
 * @example
 * ```ts
 * const stub = createIntersectionObserverStub({ intersecting: false });
 * vi.stubGlobal("IntersectionObserver", stub.Observer);
 * render(<LineChart.Root … />);
 * stub.enter(plot); // the chart paints
 * ```
 */
const createIntersectionObserverStub = ({
	intersecting,
}: {
	/** What `observe()` reports at once for every element. */
	intersecting: boolean;
}): IntersectionObserverStub => {
	const observers = new Set<StubObserver>();

	class StubObserver implements IntersectionObserver {
		readonly root = null;
		readonly rootMargin: string;
		readonly scrollMargin: string;
		readonly thresholds: readonly number[];
		#callback: IntersectionObserverCallback;
		#targets = new Set<Element>();

		constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
			this.#callback = callback;
			this.rootMargin = options.rootMargin ?? "0px";
			this.scrollMargin = options.scrollMargin ?? "0px";
			const threshold = options.threshold ?? 0;
			this.thresholds = Array.isArray(threshold) ? threshold : [threshold];
			observers.add(this);
		}

		observe(target: Element): void {
			this.#targets.add(target);
			// A browser reports the initial state of every observed element, in
			// view or not, so a chart's visibility flags start from a real report.
			this.deliver([target], intersecting);
		}

		unobserve(target: Element): void {
			this.#targets.delete(target);
		}

		disconnect(): void {
			this.#targets.clear();
			observers.delete(this);
		}

		takeRecords(): IntersectionObserverEntry[] {
			return [];
		}

		deliver(targets: readonly Element[], isIntersecting: boolean): void {
			const held = targets.filter((target) => this.#targets.has(target));
			if (held.length === 0) {
				return;
			}
			this.#callback(
				held.map((target) => entryFor(target, isIntersecting)),
				this,
			);
		}
	}

	const dispatch = (targets: readonly Element[], isIntersecting: boolean): void => {
		for (const observer of observers) {
			observer.deliver(targets, isIntersecting);
		}
	};

	return {
		Observer: StubObserver,
		enter: (...targets) => dispatch(targets, true),
		leave: (...targets) => dispatch(targets, false),
	};
};

export type {
	//,
	IntersectionObserverStub,
};
export {
	//,
	createIntersectionObserverStub,
};
