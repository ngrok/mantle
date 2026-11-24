const TOP = "data-overflow-top";
const BOTTOM = "data-overflow-bottom";
// Why the labels too: a group label above the first item can scroll out of
// view while that item still shows in full, and the edge must cue it.
const ROWS = [
	'[role="option"]',
	'[role^="menuitem"]',
	'[data-slot~="select-label"]',
	'[data-slot~="combobox-group-label"]',
	'[data-slot~="multi-select-group-label"]',
	'[data-slot~="dropdown-menu-label"]',
	'[data-slot~="command-group-heading"]',
	'[data-slot~="query-group-label"]',
].join();

/**
 * A ref callback for a scrolling listbox or menu. An item is an option, a
 * menu item, or a group label. While the first item sits partly or fully past
 * the top edge, the list has `data-overflow-top`; while the last item sits
 * past the bottom edge, it has `data-overflow-bottom`. The `scroll-cue-y`
 * utility shows a fade at each marked edge.
 *
 * An `IntersectionObserver` reports only when an item crosses an edge, so a
 * scroll runs no script and restyles nothing until an edge flips. A
 * `MutationObserver` watches again when the items change, such as when a
 * filter drops or hides some. An item that is hidden, or sits in a hidden
 * group, does not count. The cleanup disconnects both and keeps the
 * attributes, so a ref that attaches again to the same list does not blink
 * the cue off for a frame. An item taller than the list never shows in full,
 * so its edge keeps the state it had when it came into view. A list that
 * mounts in a hidden panel watches again when the panel shows.
 *
 * @example
 * ```tsx
 * const ref = useComposedRefs(props.ref, observeScrollEdges);
 * return <div ref={ref} role="listbox" className="scroll-cue-y overflow-y-auto">{options}</div>;
 * ```
 */
const observeScrollEdges = (list: HTMLElement | null): (() => void) | undefined => {
	// Why the observer checks: jsdom has neither, and a throw here would break
	// the whole list in a consumer's test. The list then shows no cue.
	if (
		list == null ||
		typeof IntersectionObserver === "undefined" ||
		typeof ResizeObserver === "undefined"
	) {
		return undefined;
	}
	let first: Element | undefined;
	let last: Element | undefined;
	// Why: a list in a hidden panel has no box, so its first report says
	// nothing, and the observer does not report again while an item stays out
	// of view. The resize when the panel shows watches again.
	let blind = false;
	const intersection = new IntersectionObserver(
		(entries) => {
			for (const { target, boundingClientRect: box, rootBounds } of entries) {
				if (rootBounds == null || rootBounds.height === 0) {
					blind = true;
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
		const rows = [...list.querySelectorAll(ROWS)];
		// Why `contains`: only a `hidden` inside the list hides a row. A hidden
		// ancestor of the list hides it whole.
		const shown = (row: Element) => {
			const hidden = row.closest("[hidden]");
			return hidden == null || hidden.contains(list);
		};
		const nextFirst = rows.find(shown);
		const nextLast = rows.findLast(shown);
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
	const resize = new ResizeObserver(() => {
		if (blind) {
			blind = false;
			first = undefined;
			last = undefined;
			watch();
		}
	});
	resize.observe(list);
	watch();
	return () => {
		mutation.disconnect();
		intersection.disconnect();
		resize.disconnect();
	};
};

export {
	//,
	observeScrollEdges,
};
