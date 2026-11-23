const TOP = "data-overflow-top";
const BOTTOM = "data-overflow-bottom";

/**
 * A ref callback for a scrolling listbox. While its first option sits partly
 * or fully past the top edge, the list has `data-overflow-top`; while its last
 * option sits past the bottom edge, it has `data-overflow-bottom`. The
 * `scroll-cue-y` utility shows a fade at each marked edge.
 *
 * An `IntersectionObserver` reports only when an option crosses an edge, so a
 * scroll runs no script and restyles nothing until an edge flips. A
 * `MutationObserver` watches again when the options change, such as when a
 * filter drops or hides some. Hidden options do not count. The cleanup
 * disconnects both and removes the attributes.
 *
 * @example
 * ```tsx
 * const ref = useComposedRefs(props.ref, observeScrollEdges);
 * return <div ref={ref} role="listbox" className="scroll-cue-y overflow-y-auto">{options}</div>;
 * ```
 */
const observeScrollEdges = (list: HTMLElement | null): (() => void) | undefined => {
	if (list == null) {
		return undefined;
	}
	let first: Element | undefined;
	let last: Element | undefined;
	const intersection = new IntersectionObserver(
		(entries) => {
			for (const { target, boundingClientRect: box, rootBounds } of entries) {
				if (rootBounds == null) {
					continue;
				}
				if (target === first) {
					list.toggleAttribute(TOP, box.top < rootBounds.top);
				}
				if (target === last) {
					list.toggleAttribute(BOTTOM, box.bottom > rootBounds.bottom);
				}
			}
		},
		// Why the margins: 1px lets an option that ends on a fractional pixel at
		// the edge count as in full view. The wide side margins ignore the
		// horizontal clip, so an option wider than the list still reaches the
		// threshold and only the vertical edges count.
		{ root: list, rootMargin: "1px 100000px", threshold: 1 },
	);
	const watch = () => {
		const options = list.querySelectorAll('[role="option"]:not([hidden])');
		const nextFirst = options[0];
		const nextLast = options[options.length - 1];
		if (nextFirst === first && nextLast === last) {
			return;
		}
		first = nextFirst;
		last = nextLast;
		// Why disconnect: observing an option again reports its state, so the
		// attributes keep their values until the report and do not flicker.
		intersection.disconnect();
		if (first == null || last == null) {
			list.removeAttribute(TOP);
			list.removeAttribute(BOTTOM);
			return;
		}
		intersection.observe(first);
		if (last !== first) {
			intersection.observe(last);
		}
	};
	const mutation = new MutationObserver(watch);
	mutation.observe(list, { childList: true, subtree: true, attributeFilter: ["hidden"] });
	watch();
	return () => {
		mutation.disconnect();
		intersection.disconnect();
		list.removeAttribute(TOP);
		list.removeAttribute(BOTTOM);
	};
};

export {
	//,
	observeScrollEdges,
};
