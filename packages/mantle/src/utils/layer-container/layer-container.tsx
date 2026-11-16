"use client";

import { createContext, type ComponentProps, useContext, useEffect, useState } from "react";
import { useCallbackRef } from "../../hooks/use-callback-ref.js";
import { useComposedRefs } from "../compose-refs/use-composed-refs.js";

/**
 * The portal target for floating layers composed inside an overlay.
 *
 * Mantle stacks floating UI in two tiers: overlays (`Dialog`, `AlertDialog`,
 * `Sheet`) render at `z-60`, floats (`Popover`, `Tooltip`, `Select`,
 * `DropdownMenu`, `HoverCard`) at `z-50`. An overlay's content provides its
 * positioner element through this context. A float composed inside the overlay
 * portals into that positioner instead of `document.body`, so it paints above
 * the overlay that owns it. A float outside every overlay reads `null`,
 * portals to `document.body`, and stays below the overlay tier no matter when
 * it opens.
 *
 * Why the positioner and not a sibling element: Radix marks the portal's
 * other children `aria-hidden` when a modal overlay opens, so a float portaled
 * into a sibling would be hidden from screen readers. The positioner is on the
 * overlay content's ancestor chain, which the marking skips.
 */
const LayerContainerContext = createContext<Element | DocumentFragment | null>(null);

/**
 * `true` inside a modal overlay's layer container. A non-modal layer, such as
 * `Sandbar`, does not lock body scroll, so it does not set this.
 */
const ModalLayerContext = createContext(false);

/**
 * The nearest overlay's layer container, or `null` outside every overlay.
 * Pass the result to a portal's `container` prop — `null` falls back to
 * `document.body`.
 *
 * @example
 * ```tsx
 * const layerContainer = useLayerContainer();
 * return (
 *   <PopoverPrimitivePortal container={layerContainer}>
 *     <PopoverPrimitiveContent>…</PopoverPrimitiveContent>
 *   </PopoverPrimitivePortal>
 * );
 * ```
 */
function useLayerContainer(): Element | DocumentFragment | null {
	return useContext(LayerContainerContext);
}

/**
 * `true` when a modal overlay (`Dialog`, `AlertDialog`, `Sheet`) encloses the
 * caller. That overlay already locks body scroll, so a float inside it must not
 * add its own lock.
 */
function useIsInsideModalLayer(): boolean {
	return useContext(ModalLayerContext);
}

/**
 * The provider half of {@link LayerContainerContext}: a `div` that registers
 * itself as the layer container for every float composed inside it. An overlay
 * renders it as its positioner — the fixed element that lays out its content —
 * so floats portaled into it later land on the content's ancestor chain and
 * paint above the content. The caller passes the positioning classes and the
 * `data-slot`; this component carries none of its own.
 *
 * @example
 * ```tsx
 * <Portal>
 *   <Overlay />
 *   <LayerContainer data-slot="dialog-positioner" className="fixed inset-4 z-60 flex items-center justify-center">
 *     <DialogPrimitiveContent>…</DialogPrimitiveContent>
 *   </LayerContainer>
 * </Portal>
 * ```
 */
function LayerContainer({
	children,
	modal = true,
	ref,
	...props
}: ComponentProps<"div"> & {
	/**
	 * Whether the layer belongs to a modal overlay that locks body scroll.
	 * A non-modal layer inside a modal one stays modal.
	 * @default true
	 */
	modal?: boolean;
}) {
	const [element, setElement] = useState<HTMLDivElement | null>(null);
	const composedRef = useComposedRefs(ref, setElement);
	const isInsideModal = useIsInsideModalLayer();

	return (
		<div ref={composedRef} {...props}>
			<ModalLayerContext.Provider value={isInsideModal || modal}>
				<LayerContainerContext.Provider value={element}>{children}</LayerContainerContext.Provider>
			</ModalLayerContext.Provider>
		</div>
	);
}

/**
 * An open overlay that can take an Escape from a float it covers.
 */
type OpenOverlay = {
	/** The overlay's layer container: its positioner. */
	container: Element;
	/** The overlay's content element, inside `container`. Floats the overlay owns sit beside it. */
	content: Element;
	/** Runs the overlay's own Escape handling, then closes it unless a handler prevents that. */
	escape: (event: KeyboardEvent) => void;
};

/**
 * The open overlays in mount order. The last one paints on top.
 */
const openOverlays: OpenOverlay[] = [];

/**
 * Registers an open overlay, so a float it covers can hand it Escape. Pass
 * `null` for `container` or `content` while the overlay is closed or not yet
 * mounted, and it stays out of the registry.
 */
function useRegisterOverlay({
	container,
	content,
	escape,
}: {
	container: Element | DocumentFragment | null;
	content: Element | null;
	escape: (event: KeyboardEvent) => void;
}): void {
	const stableEscape = useCallbackRef(escape);

	useEffect(() => {
		if (!(container instanceof Element) || content == null) {
			return;
		}
		const overlay: OpenOverlay = { container, content, escape: stableEscape };
		openOverlays.push(overlay);
		return () => {
			openOverlays.splice(openOverlays.indexOf(overlay), 1);
		};
	}, [container, content, stableEscape]);
}

/**
 * Whether `overlay` covers a float that portals into `floatContainer`: the
 * float sits outside the overlay, so it paints under it.
 */
function coversFloat(
	overlay: OpenOverlay,
	floatContainer: Element | DocumentFragment | null,
): boolean {
	return floatContainer == null || !overlay.container.contains(floatContainer);
}

/**
 * Returns the `onOpenAutoFocus` handler for a float. A float that opens under
 * the top overlay keeps focus in that overlay, because the user cannot see
 * the float.
 */
function useFloatOpenAutoFocus(
	onOpenAutoFocus: ((event: Event) => void) | undefined,
): (event: Event) => void {
	const floatContainer = useLayerContainer();

	return (event) => {
		onOpenAutoFocus?.(event);
		const topOverlay = openOverlays.at(-1);
		if (topOverlay != null && coversFloat(topOverlay, floatContainer)) {
			event.preventDefault();
		}
	};
}

/**
 * Returns the `onEscapeKeyDown` handler for a float. Radix sends Escape to the
 * layer that mounted last. A float outside an overlay can mount after the
 * overlay and paint under it, and Escape then closes a float the user cannot
 * see. While focus is in the content of an overlay that does not contain the
 * float, this handler gives Escape to that overlay and keeps the float open.
 *
 * Focus in a float that the overlay owns is outside the overlay's content, so
 * Radix keeps the Escape: the overlay cannot close that float, and it must
 * not close itself under the float.
 */
function useFloatEscapeKeyDown(
	onEscapeKeyDown: ((event: KeyboardEvent) => void) | undefined,
): (event: KeyboardEvent) => void {
	const floatContainer = useLayerContainer();

	return (event) => {
		const coveringOverlay = openOverlays.findLast(
			(overlay) =>
				event.target instanceof Node &&
				overlay.content.contains(event.target) &&
				coversFloat(overlay, floatContainer),
		);
		if (coveringOverlay == null) {
			onEscapeKeyDown?.(event);
			return;
		}
		coveringOverlay.escape(event);
		event.preventDefault();
	};
}

export {
	//,
	LayerContainer,
	LayerContainerContext,
	useFloatEscapeKeyDown,
	useFloatOpenAutoFocus,
	useIsInsideModalLayer,
	useLayerContainer,
	useRegisterOverlay,
};
