"use client";

import {
	createContext,
	type ComponentProps,
	type RefObject,
	useContext,
	useLayoutEffect,
	useState,
	useSyncExternalStore,
} from "react";
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
 * Why the positioner and not a sibling element: a modal `<dialog>` makes the
 * page outside it inert, so a float portaled into a sibling would take no input
 * and leave the accessibility tree. The positioner is inside the `<dialog>`.
 */
const LayerContainerContext = createContext<Element | DocumentFragment | null>(null);

/**
 * `true` inside a modal overlay's layer container. A non-modal layer, such as
 * `Sandbar`, does not lock body scroll, so it does not set this.
 */
const ModalLayerContext = createContext(false);

/**
 * The nearest overlay's layer container, or `null` outside every overlay.
 * Pass the result to a portal's `container` prop; `null` falls back to
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
	// Why here: each float and each overlay calls this hook on mount, so these
	// listeners are on the document before the ones the layer adds as it opens.
	useLayoutEffect(listenForCoveringLayer, []);
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
 * renders it inside its `<dialog>`, around its content, so floats portaled
 * into it later land on the content's ancestor chain and
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
	active = true,
	children,
	modal = true,
	ref,
	...props
}: ComponentProps<"div"> & {
	/**
	 * Whether floats inside portal into this layer. Pass `false` while the
	 * layer is not in the top layer, such as a closed `<dialog>` that CSS shows
	 * in the page. Its floats then portal as if the layer were not there, and
	 * the subtree does not remount when the value changes.
	 * @default true
	 */
	active?: boolean;
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
	const outerContainer = useContext(LayerContainerContext);

	return (
		<div ref={composedRef} {...props}>
			<ModalLayerContext.Provider value={isInsideModal || (active && modal)}>
				<LayerContainerContext.Provider value={active ? element : outerContainer}>
					{children}
				</LayerContainerContext.Provider>
			</ModalLayerContext.Provider>
		</div>
	);
}

/**
 * An open overlay. It hides the floats it covers, and it yields to a frame
 * that covers it.
 */
type OpenOverlay = {
	/** The overlay's layer container: its positioner. */
	container: Element;
	/** The overlay's content element, inside `container`. Floats the overlay owns sit beside it. */
	content: Element;
};

/**
 * The open overlays in mount order. The last one paints on top.
 */
const openOverlays: OpenOverlay[] = [];

/** Listeners that run when an overlay opens or closes. */
const overlayListeners = new Set<() => void>();

function subscribeToOverlays(listener: () => void): () => void {
	overlayListeners.add(listener);
	return () => {
		overlayListeners.delete(listener);
	};
}

/**
 * Registers an open overlay, so a float it covers can hide, and so the
 * overlay on top can find a frame that covers it. Call it when the
 * overlay opens; it returns the function to call when it closes.
 */
function registerOverlay(overlay: OpenOverlay): () => void {
	openOverlays.push(overlay);
	for (const listener of overlayListeners) {
		listener();
	}
	return () => {
		openOverlays.splice(openOverlays.indexOf(overlay), 1);
		for (const listener of overlayListeners) {
			listener();
		}
	};
}

/**
 * Whether the top open overlay covers a float that sits in `floatContainer`.
 * A native float paints in the top layer, above every overlay, so a covered
 * float must not show: it would paint over a dialog that hides its anchor. An
 * overlay that opened from inside the float (`float`) does not cover it.
 *
 * @example
 * ```tsx
 * const covered = useIsCoveredByOverlay(useLayerContainer(), floatRef);
 * const visible = open && !covered;
 * ```
 */
function useIsCoveredByOverlay(
	floatContainer: Element | DocumentFragment | null,
	float: RefObject<HTMLElement | null>,
): boolean {
	return useSyncExternalStore(
		subscribeToOverlays,
		() => {
			const topOverlay = openOverlays.at(-1);
			return (
				topOverlay != null &&
				coversFloat(topOverlay, floatContainer) &&
				float.current?.contains(topOverlay.container) !== true
			);
		},
		() => false,
	);
}

/**
 * Whether the top open modal overlay covers `floatContainer` now, for a layer
 * that decides at open whether to open as a modal of its own. An overlay that
 * plays its exit does not count: the overlay under it is on top.
 *
 * @example
 * ```ts
 * // a sheet is open, and the popover's trigger is on the page under it
 * isCoveredByOverlay(null); // true
 * ```
 */
function isCoveredByOverlay(floatContainer: Element | DocumentFragment | null): boolean {
	// Why `:modal`: a non-modal dialog paints under a modal one that opened first.
	const topOverlay = openOverlays.findLast(
		({ container }) => container.hasAttribute("data-open") && container.matches(":modal"),
	);
	return topOverlay != null && coversFloat(topOverlay, floatContainer);
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
 * Where a frame is not a covering frame: in the content of an overlay that
 * plays its exit animation, and in a floating prompt, which takes clicks only.
 */
const notCoveringLayers = "[data-mantle-modal-content], .overlay-prompt";

/**
 * The frame that covers the top open overlay: an `<iframe>` that is on top at
 * the center of the viewport and takes pointer input there, in a child of
 * `<body>` that is stacked at or above the overlay. A script can put such a
 * frame on `<body>`, for example a payment script that shows a 3-D Secure
 * challenge.
 *
 * Returns `null` when no overlay is open, when what is on top is not a frame,
 * and when mantle renders the layer of the frame (an open overlay, one of its
 * floats, or a floating prompt).
 *
 * Why a hit test: `elementFromPoint` returns what paints on top at the center
 * of the viewport, so a frame under the overlay or hidden does not count.
 *
 * Why a frame: its key presses and its focus moves never reach the page, so
 * the overlay must yield them. A layer of page elements gets the same Escape
 * as the overlay, and it ignores an Escape that the overlay prevented.
 *
 * @example
 * ```ts
 * // a payment challenge fills the viewport above the open sheet
 * getCoveringFrame(); // the frame the script put on `<body>`
 * ```
 */
function getCoveringFrame(): HTMLIFrameElement | null {
	const overlay = openOverlays.at(-1);
	if (overlay == null) {
		return null;
	}
	const { ownerDocument } = overlay.content;
	// Why the `elementFromPoint` guard: jsdom has no layout and leaves the method
	// out, so a test that runs there counts the overlay as on top.
	if (typeof ownerDocument.elementFromPoint !== "function") {
		return null;
	}
	const { clientHeight, clientWidth } = ownerDocument.documentElement;
	const frame = ownerDocument.elementFromPoint(clientWidth / 2, clientHeight / 2);
	const layer = frame?.closest("body > *");
	if (
		!(frame instanceof HTMLIFrameElement) ||
		layer == null ||
		frame.closest(notCoveringLayers) != null ||
		// Why each open overlay: a float of an overlay can hold a frame, and an
		// overlay that is not modal shows the overlay under it.
		openOverlays.some((open) => layer.contains(open.container))
	) {
		return null;
	}
	// Why the stack level of the layer: a frame in the page can take pointer
	// input, and its `<body>` child is the page itself.
	return stackLevel(layer) >= stackLevel(overlay.container) ? frame : null;
}

/**
 * The level that `element` is stacked at: its `z-index`, or `NaN` when it has
 * none. A box that is not positioned has no level, because `z-index` does
 * nothing there. `NaN` is not at or above a level, so such an element never
 * covers an overlay.
 */
function stackLevel(element: Element): number {
	const { position, zIndex } = getComputedStyle(element);
	return position === "static" ? Number.NaN : Number.parseInt(zIndex, 10);
}

/**
 * The layer that covers the top open overlay, for an event that goes to
 * `node`: the child of `<body>` that holds the covering frame. Returns `null`
 * when `node` is in that overlay.
 *
 * Why the container check first: most events stay in the overlay, and the hit
 * test makes the browser lay out the page.
 */
function getCoveringLayerFor(node: EventTarget | null): Element | null {
	if (node instanceof Node && openOverlays.at(-1)?.container.contains(node)) {
		return null;
	}
	return getCoveringFrame()?.closest("body > *") ?? null;
}

/**
 * Runs for each focus event of the document. When focus leaves the top open
 * overlay while a layer covers it, the overlay yields to the layer:
 *
 * - The layer loses its `aria-hidden`. A modal from another library, such as
 *   Radix, sets that attribute on each `<body>` child as it opens, and a
 *   wallet popup stays on the page between uses.
 * - A focus move into the layer stops here, so no float or overlay reads it
 *   as focus that left. A page script makes that move when it calls `focus()`
 *   on the frame, as a wallet popup does when it opens.
 *
 * Why stop the event: the outside-focus listener of a float is a later
 * listener on the document, and it closes the float.
 */
function yieldFocusToCoveringLayer(event: FocusEvent): void {
	const destination = event.type === "focusin" ? event.target : event.relatedTarget;
	const layer = getCoveringLayerFor(destination);
	if (layer == null) {
		return;
	}
	// Why also with no destination: Firefox reports a `focus()` call on a frame
	// as a `focusout` with no `relatedTarget`.
	layer.removeAttribute("aria-hidden");
	if (destination instanceof Node && layer.contains(destination)) {
		event.stopImmediatePropagation();
	}
}

/**
 * The presses that landed in a covering layer.
 *
 * Why a record: a layer can close on the press, and the outside-press
 * listeners of the overlays and floats run after the layer is gone.
 */
const coveringLayerPresses = new WeakSet<Event>();

/**
 * Records a pointer down that lands in the layer that covers the top open
 * overlay. It runs in the capture phase, before the layer gets the event.
 */
function recordCoveringLayerPress(event: PointerEvent): void {
	const layer = getCoveringLayerFor(event.target);
	if (event.target instanceof Node && layer?.contains(event.target)) {
		coveringLayerPresses.add(event);
	}
}

/**
 * Stops a recorded pointer down before the later listeners on the document get
 * it, so no float counts it as a press outside.
 */
function stopCoveringLayerPress(event: PointerEvent): void {
	if (coveringLayerPresses.has(event)) {
		event.stopImmediatePropagation();
	}
}

/**
 * Adds the document listeners that give focus and presses to the layer above
 * the top open overlay. Each float and each overlay calls it on mount, through
 * {@link useLayerContainer}.
 *
 * Why no removal: a popover that holds the overlay adds its outside-press
 * listeners before the overlay opens, and these listeners must run before those. The
 * document keeps one copy of a listener, in its first place, so each call
 * after the first does nothing.
 */
function listenForCoveringLayer(): void {
	document.addEventListener("focusin", yieldFocusToCoveringLayer);
	document.addEventListener("focusout", yieldFocusToCoveringLayer);
	document.addEventListener("pointerdown", recordCoveringLayerPress, true);
	document.addEventListener("pointerdown", stopCoveringLayerPress);
}

export {
	//,
	getCoveringFrame,
	isCoveredByOverlay,
	LayerContainer,
	LayerContainerContext,
	useIsCoveredByOverlay,
	useIsInsideModalLayer,
	useLayerContainer,
	registerOverlay,
};
