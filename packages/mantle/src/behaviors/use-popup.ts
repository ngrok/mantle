"use client";

import { useState } from "react";
import type { RefCallback, RefObject } from "react";
import { canUseDOM } from "../components/browser-only/can-use-dom.js";
import { useIsHydrated } from "../hooks/use-is-hydrated.js";

/** The gap between the anchor and the popup, in pixels. */
const OFFSET = 8;

/** The space the popup keeps from the edge of the viewport, in pixels. */
const VIEWPORT_PADDING = 8;

/**
 * Places a fixed popup below its anchor, or above it when the space below is
 * too small, and returns the cleanup that stops following the anchor. It
 * writes straight to the popup's style, so a scroll costs no React render.
 */
const followAnchor = (
	anchorRef: RefObject<Element | null>,
	floating: HTMLElement,
	host: HTMLElement,
): (() => void) => {
	let observed: Element | null = null;
	const place = () => {
		// Why read the ref here: an anchor that renders after the popup attaches
		// its ref later in the same commit. The first resize observation places it.
		const anchor = anchorRef.current;
		if (anchor == null) {
			return;
		}
		if (observed !== anchor) {
			observer.observe(anchor);
			observed = anchor;
		}
		const anchorRect = anchor.getBoundingClientRect();
		floating.style.position = "fixed";
		floating.style.setProperty("--anchor-width", `${anchorRect.width}px`);
		floating.style.setProperty("--anchor-height", `${anchorRect.height}px`);
		// Why the host: a transformed ancestor, such as a dialog panel, moves the
		// origin of `position: fixed`, and the host sits at that origin. The offset
		// sizes ignore the open animation's scale.
		const origin = host.getBoundingClientRect();
		// Why the scroll height: it is the full height of a list that the cap
		// clips, so a list that grew while open picks the side that fits best.
		// Removing the cap to measure would reset the list's scroll position.
		const width = floating.offsetWidth;
		const height = floating.scrollHeight + floating.offsetHeight - floating.clientHeight;
		const viewportHeight = document.documentElement.clientHeight;
		const below = viewportHeight - anchorRect.bottom - OFFSET - VIEWPORT_PADDING;
		const above = anchorRect.top - OFFSET - VIEWPORT_PADDING;
		const side = height > below && above > below ? "top" : "bottom";
		const available = Math.max(side === "bottom" ? below : above, 0);
		// Why the capped height: the popup renders at most `available` tall, so a
		// top popup sits that far above the anchor, not its full content height.
		const top =
			side === "bottom"
				? anchorRect.bottom + OFFSET
				: anchorRect.top - OFFSET - Math.min(height, available);
		const maxLeft = document.documentElement.clientWidth - VIEWPORT_PADDING - width;
		const left = Math.max(VIEWPORT_PADDING, Math.min(anchorRect.left, maxLeft));
		floating.style.setProperty("--available-height", `${available}px`);
		floating.style.top = `${top - origin.top}px`;
		floating.style.left = `${left - origin.left}px`;
		floating.dataset.side = side;
	};
	const observer = new ResizeObserver(place);
	observer.observe(floating);
	place();
	// Why the check: a scroll inside the popup does not move its anchor.
	const onScroll = (event: Event) => {
		if (!(event.target instanceof Node && floating.contains(event.target))) {
			place();
		}
	};
	window.addEventListener("scroll", onScroll, { capture: true, passive: true });
	window.addEventListener("resize", place, { passive: true });
	return () => {
		observer.disconnect();
		window.removeEventListener("scroll", onScroll, { capture: true });
		window.removeEventListener("resize", place);
	};
};

/**
 * Owns a popup: a stable portal host, and a ref callback for the popup
 * element that, while `open`, joins the host to `container` and keeps the
 * popup under `anchorRef`. Render the popup only while `open`.
 *
 * A closed popup costs no layout because its host is out of the document. On the server and
 * during hydration `host` is `null`, so the server markup and the first client
 * render match; the popup mounts in the commit after hydration.
 *
 * The popup gets `data-side` (`bottom` or `top`) and the CSS variables
 * `--anchor-width`, `--anchor-height`, and `--available-height`.
 *
 * @example
 * ```tsx
 * const { host, popupRef } = usePopup({ open, anchorRef: triggerRef, container: useLayerContainer() });
 * return host != null && open && createPortal(<div ref={popupRef} role="listbox" />, host);
 * ```
 */
const usePopup = ({
	open,
	anchorRef,
	ownerRef,
	container,
	modal,
}: {
	open: boolean;
	anchorRef: RefObject<Element | null>;
	/**
	 * The control that keeps DOM focus while the popup is open, such as a
	 * select trigger. A popup that opens while focus is outside the anchor,
	 * such as from `defaultOpen`, focuses it, because its Escape and blur
	 * close the popup.
	 */
	ownerRef?: RefObject<HTMLElement | null>;
	container: Element | DocumentFragment | null;
	/**
	 * Makes the page behind the open popup inert, such as `enterModal`, and
	 * returns the cleanup. A popup that passes nothing ships no modal code.
	 */
	modal?: (keep: readonly Element[]) => () => void;
}): { host: HTMLElement | null; popupRef: RefCallback<HTMLElement> } => {
	const hydrated = useIsHydrated();
	const [host] = useState(() => {
		if (!canUseDOM()) {
			return null;
		}
		const element = document.createElement("div");
		// Why pointer-events: a modal overlay sets `pointer-events: none` on the body,
		// and a popup inside the overlay's layer container must stay clickable.
		element.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;pointer-events:auto";
		return element;
	});
	// Why a ref callback: React calls it again when `open` changes, so the host
	// joins the document and the popup follows its anchor only while open, with
	// no effect and no extra render.
	const popupRef: RefCallback<HTMLElement> = (floating) => {
		if (!open || floating == null || host == null) {
			return;
		}
		(container ?? document.body).append(host);
		const stopFollowing = followAnchor(anchorRef, floating, host);
		const anchor = anchorRef.current;
		const exitModal = modal != null && anchor != null ? modal([anchor, host]) : undefined;
		// Why the anchor: focus on another part of the control, such as a tag,
		// already keeps the popup's Escape and blur.
		const owner = ownerRef?.current;
		if (owner != null && !anchor?.contains(document.activeElement)) {
			owner.focus({ preventScroll: true });
		}
		return () => {
			exitModal?.();
			stopFollowing();
			host.remove();
		};
	};
	return { host: hydrated ? host : null, popupRef };
};

export {
	//,
	usePopup,
};
