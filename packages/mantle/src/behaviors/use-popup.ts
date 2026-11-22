"use client";

import { useCallback } from "react";
import type { RefCallback, RefObject } from "react";
import { useIsHydrated } from "../hooks/use-is-hydrated.js";
import { useLayerContainer } from "../utils/layer-container/layer-container.js";
import { trackFloat } from "../utils/float/position.js";
import { hasPopoverApi, resolvePortalTarget } from "../utils/float/use-float.js";

/** The gap between the anchor and the popup, in pixels. */
const OFFSET = 8;

/**
 * Owns an open popup: a `popover="manual"` element in the top layer that
 * follows its anchor. Render the popup only while it is open, into
 * `portalTarget`, with `popupRef` and `popover="manual"`.
 *
 * `trackFloat` places the popup from script below its anchor, or above it
 * when it does not fit below and the space above is larger. The popup gets `data-side` (`bottom` or `top`)
 * and the CSS variables `--anchor-width`, `--anchor-height`, and
 * `--available-height`. With no popover API, the popup is a fixed box.
 *
 * On the server and during hydration `portalTarget` is `null`, so the server
 * markup and the first client render match; the popup mounts in the commit
 * after hydration.
 *
 * @example
 * ```tsx
 * const { portalTarget, popupRef } = usePopup({ anchorRef: triggerRef });
 * return portalTarget != null && createPortal(<div popover="manual" ref={popupRef} role="listbox" />, portalTarget);
 * ```
 */
const usePopup = ({
	anchorRef,
	ownerRef,
	modal,
}: {
	anchorRef: RefObject<Element | null>;
	/**
	 * The control that keeps DOM focus while the popup is open, such as a
	 * select trigger. A popup that opens while focus is outside the anchor,
	 * such as from `defaultOpen`, focuses it, because its Escape and blur
	 * close the popup.
	 */
	ownerRef?: RefObject<HTMLElement | null>;
	/**
	 * Makes the page behind the open popup inert, such as `enterModal`, and
	 * returns the cleanup. A popup that passes nothing ships no modal code.
	 */
	modal?: (keep: readonly Element[]) => () => void;
}): { portalTarget: Element | DocumentFragment | null; popupRef: RefCallback<HTMLElement> } => {
	const layerContainer = useLayerContainer();
	const hydrated = useIsHydrated();
	// Why `useCallback`: a new callback on each render would place the popup
	// again on each keystroke.
	const popupRef = useCallback<RefCallback<HTMLElement>>(
		(floating) => {
			if (floating == null) {
				return;
			}
			if (hasPopoverApi) {
				floating.showPopover();
			}
			let stop: (() => void) | undefined;
			let stopped = false;
			const start = () => {
				const anchor = anchorRef.current;
				if (stopped || !(anchor instanceof HTMLElement)) {
					return;
				}
				const stopTracking = trackFloat({
					anchor,
					floating,
					side: "bottom",
					align: "start",
					sideOffset: OFFSET,
					fallback: "larger",
					placeWith: "script",
					releaseAnchorAfter: 0,
				});
				const exitModal = modal?.([anchor, floating]);
				stop = () => {
					exitModal?.();
					stopTracking();
				};
				// Why the anchor: focus on another part of the control, such as a tag,
				// already keeps the popup's Escape and blur.
				const owner = ownerRef?.current;
				if (owner != null && !anchor.contains(document.activeElement)) {
					owner.focus({ preventScroll: true });
				}
			};
			// Why a microtask: an anchor that renders after the popup attaches its ref
			// later in the same commit, and the microtask runs before the paint.
			if (anchorRef.current == null) {
				queueMicrotask(start);
			} else {
				start();
			}
			return () => {
				stopped = true;
				stop?.();
				// Why: focus on a control in the popup, such as a footer button, would
				// fall to the body when the popup unmounts.
				if (floating.contains(document.activeElement)) {
					ownerRef?.current?.focus({ preventScroll: true });
				}
			};
		},
		[anchorRef, ownerRef, modal],
	);
	return {
		portalTarget: hydrated ? resolvePortalTarget(layerContainer) : null,
		popupRef,
	};
};

export {
	//,
	usePopup,
};
