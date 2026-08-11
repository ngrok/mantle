"use client";

import { createContext, type ComponentProps, useContext, useState } from "react";
import { composeRefs } from "../compose-refs/compose-refs.js";

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
 * The nearest overlay's layer container, or `null` outside every overlay.
 * Pass the result to a portal's `container` prop — `null` falls back to
 * `document.body`.
 *
 * @example
 * ```tsx
 * const layerContainer = useLayerContainer();
 * return (
 *   <PopoverPrimitive.Portal container={layerContainer}>
 *     <PopoverPrimitive.Content>…</PopoverPrimitive.Content>
 *   </PopoverPrimitive.Portal>
 * );
 * ```
 */
function useLayerContainer(): Element | DocumentFragment | null {
	return useContext(LayerContainerContext);
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
 *     <DialogPrimitive.Content>…</DialogPrimitive.Content>
 *   </LayerContainer>
 * </Portal>
 * ```
 */
function LayerContainer({ children, ref, ...props }: ComponentProps<"div">) {
	const [element, setElement] = useState<HTMLDivElement | null>(null);

	return (
		<div ref={composeRefs(ref, setElement)} {...props}>
			<LayerContainerContext.Provider value={element}>{children}</LayerContainerContext.Provider>
		</div>
	);
}

export {
	//,
	LayerContainer,
	LayerContainerContext,
	useLayerContainer,
};
