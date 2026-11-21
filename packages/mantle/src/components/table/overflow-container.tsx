"use client";

import type { ComponentProps } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";

/**
 * The scroll container of `Table.Root`. It stamps the overflow data attributes on its
 * outer element and puts `ref` on the inner scroll element.
 *
 * Why a separate part: `Table.Root` merges its classes with `cx` on the server and passes
 * the result here, so the browser gets this observer and not `cx`.
 *
 * @private
 */
const OverflowContainer = ({ children, ref, ...props }: ComponentProps<"div">) => {
	const horizontalOverflow = useHorizontalOverflowObserver();
	const scrollContainerRef = useComposedRefs(horizontalOverflow.ref, ref);

	// The `scroll-fade-x` utility (a CSS scroll-driven animation) draws the edge fade. When the
	// table holds a sticky right column (DataTable.ActionCell / DataTable.ActionHeader), the
	// inner element turns off its right-side fade so the pinned column stays opaque. The pinned
	// column draws its own left-side gradient for the scroll-under effect.
	return (
		<div
			data-sticky-active={
				(horizontalOverflow.state.hasOverflow && !horizontalOverflow.state.scrolledToEnd) ||
				undefined
			}
			data-x-overflow={horizontalOverflow.state.hasOverflow}
			data-x-scroll-end={
				horizontalOverflow.state.hasOverflow && horizontalOverflow.state.scrolledToEnd
			}
			{...props}
		>
			<div
				className="scrollbar scroll-fade-x overflow-x-auto overflow-y-clip overscroll-x-none has-data-mantle-table-sticky-right:[--_fade-right:black]"
				ref={scrollContainerRef}
			>
				{children}
			</div>
		</div>
	);
};

/**
 * A custom hook that observes the horizontal overflow of an element and determines
 * if it has overflow and if it is scrolled to the end.
 *
 * @private
 */
function useHorizontalOverflowObserver() {
	const ref = useRef<HTMLDivElement>(null);
	const [state, setState] = useState({ hasOverflow: false, scrolledToEnd: false });

	useLayoutEffect(() => {
		const element = ref.current;
		if (!element) {
			return;
		}

		let frameId = 0;

		const checkState = () => {
			const hasOverflow = element.scrollWidth > element.clientWidth;
			const scrolledToEnd =
				Math.abs(element.scrollWidth - element.scrollLeft - element.clientWidth) < 1;

			setState((previous) =>
				previous.hasOverflow === hasOverflow && previous.scrolledToEnd === scrolledToEnd
					? previous
					: { hasOverflow, scrolledToEnd },
			);
		};

		// Coalesce rapid-fire events (scroll, mutation) into a single
		// layout read per animation frame to avoid redundant work.
		const scheduleCheck = () => {
			if (frameId === 0) {
				frameId = requestAnimationFrame(() => {
					frameId = 0;
					checkState();
				});
			}
		};

		// Why the observer does the first read: inside this effect, a `scrollWidth`
		// read forces a layout of the whole table during React's commit. `observe()`
		// delivers one notification after the browser's own layout, so the same read
		// there costs nothing. Observer callbacks run before paint, so `flushSync`
		// lands the new attributes in the first painted frame.
		const resizeObserver = new ResizeObserver(() => {
			flushSync(checkState);
		});
		resizeObserver.observe(element);

		const mutationObserver = new MutationObserver(scheduleCheck);
		mutationObserver.observe(element, { childList: true, subtree: true });

		element.addEventListener("scroll", scheduleCheck, { passive: true });

		return () => {
			cancelAnimationFrame(frameId);
			resizeObserver.disconnect();
			mutationObserver.disconnect();
			element.removeEventListener("scroll", scheduleCheck);
		};
	}, []);

	return { ref, state };
}

export {
	//,
	OverflowContainer,
};
