/**
 * Calls `onMove` when `element` moves in the viewport for any cause, such as a
 * layout shift above it, or a transform or animation on an ancestor, and
 * returns the cleanup. Why an `IntersectionObserver`: its root margin crops the
 * viewport to the element's box, so any move changes the visible ratio, and the
 * browser checks it with no script while nothing moves. After each report it
 * crops to the new box again.
 */
function observeMove(element: HTMLElement, onMove: () => void): () => void {
	// Why: jsdom has neither observer. The float then places on scroll and resize only.
	if (typeof IntersectionObserver === "undefined" || typeof ResizeObserver === "undefined") {
		return () => {};
	}
	let observer: IntersectionObserver | undefined;
	let stopped = false;
	const watch = (threshold = 1) => {
		observer?.disconnect();
		const { left, top, width, height } = element.getBoundingClientRect();
		if (width === 0 || height === 0) {
			return;
		}
		const root = document.documentElement;
		const crop = [top, root.clientWidth - left - width, root.clientHeight - top - height, left].map(
			(inset) => `${-Math.floor(inset)}px`,
		);
		let first = true;
		observer = new IntersectionObserver(
			([entry]) => {
				if (stopped) {
					return;
				}
				const ratio = entry?.intersectionRatio ?? threshold;
				// Why the first report: the browser reports the start state, and a
				// ratio other than the threshold means the element moved since the
				// crop, or that the viewport clips it. Then the observer watches for
				// a change from that ratio.
				if (first) {
					first = false;
					if (ratio !== threshold) {
						onMove();
						watch(ratio);
					}
					return;
				}
				onMove();
				watch();
			},
			{ rootMargin: crop.join(" "), threshold },
		);
		observer.observe(element);
	};
	// Why a size observer too: a box that shrinks inside the crop shows all of
	// itself, so the ratio does not change, and a box with no size has no crop.
	const sizeObserver = new ResizeObserver(() => {
		if (!stopped) {
			onMove();
			watch();
		}
	});
	sizeObserver.observe(element);
	return () => {
		stopped = true;
		sizeObserver.disconnect();
		observer?.disconnect();
	};
}

/**
 * The zoom that scales `element` from viewport pixels, its own `zoom` times
 * that of each ancestor. Why the walk: Safari has no `currentCSSZoom`.
 */
function zoomOf(element: HTMLElement): number {
	// Why `typeof`: the DOM types declare it in each browser.
	if (typeof element.currentCSSZoom === "number") {
		return element.currentCSSZoom;
	}
	let zoom = 1;
	for (let node: Element | null = element; node != null; node = node.parentElement) {
		zoom *= Number.parseFloat(getComputedStyle(node).zoom) || 1;
	}
	return zoom;
}

export {
	//,
	observeMove,
	zoomOf,
};
