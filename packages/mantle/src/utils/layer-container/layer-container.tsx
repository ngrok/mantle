"use client";

import {
	createContext,
	type ComponentProps,
	useContext,
	useEffect,
	useLayoutEffect,
	useState,
} from "react";
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
	// Why here: each float and each overlay calls this hook, so the listeners are
	// on the document before the ones that Radix adds for the layer.
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
 * renders it as its positioner (the fixed element that lays out its content),
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
 * An open overlay. It can take an Escape from a float it covers, and it yields
 * to a layer that covers it.
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
 * Registers an open overlay, so a float it covers can hand it Escape, and so
 * the overlay on top can find a layer that covers it. Pass `null` for
 * `container` or `content` while the overlay is closed or not yet mounted, and
 * it stays out of the registry.
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

/**
 * What a hit test can find that is not a covering layer: the backdrop of an
 * overlay, the content of an overlay that plays its exit animation, and a
 * floating prompt.
 */
const notCoveringLayers = "[data-overlay], [data-mantle-modal-content], .overlay-prompt";

/**
 * The layer that covers the open overlay whose content is `content`: a child
 * of `<body>` that holds a frame, is on top at the center of the viewport,
 * takes pointer input there, and is stacked at or above the overlay. A script
 * can put such a layer on `<body>`, for example a payment script that shows a
 * 3-D Secure challenge.
 *
 * Returns `null` when mantle renders what is on top (an open overlay, one of
 * its floats, or a floating prompt), and when another overlay is open above
 * this one.
 *
 * Why a hit test: an open modal overlay sets `pointer-events: none` on
 * `<body>`, so only a layer that turns pointer input back on is on top. That
 * layer is one the user can use, and the page behind the overlay never is.
 *
 * Why a frame: a frame is another document, so its key presses and its focus
 * moves never reach the page. A layer of page elements shares each Escape with
 * the overlay. The overlay yields a key when it prevents the event, and such a
 * layer then ignores the prevented event too.
 *
 * @example
 * ```ts
 * // a payment challenge fills the viewport above the open sheet
 * getCoveringLayer(sheetContent); // the wrapper the script put on `<body>`
 * ```
 */
function getCoveringLayer(content: Element | null): Element | null {
	const overlay = openOverlays.at(-1);
	// Why the top overlay only: Radix already sends Escape, focus, and presses
	// to an overlay that is open above this one.
	if (content == null || overlay?.content !== content) {
		return null;
	}
	// Why the shadow root: the hit test of the document stops at the host of a
	// shadow tree, and an overlay in that tree is then never on top.
	const root = content.getRootNode();
	const scope = root instanceof ShadowRoot ? root : content.ownerDocument;
	// Why the `elementFromPoint` guard: jsdom has no layout and leaves the method
	// out, so a test that runs there counts the overlay as on top.
	if (typeof scope.elementFromPoint !== "function") {
		return null;
	}
	const { clientHeight, clientWidth } = content.ownerDocument.documentElement;
	const topElement = scope.elementFromPoint(clientWidth / 2, clientHeight / 2);
	const layer = topElement?.closest("body > *");
	if (
		topElement == null ||
		layer == null ||
		topElement.closest(notCoveringLayers) != null ||
		// Why each open overlay: an overlay that is not modal has no backdrop, so
		// the hit test can find the overlay that holds it.
		openOverlays.some((open) => layer.contains(open.container)) ||
		getFrame(layer) == null
	) {
		return null;
	}
	// Why the `z-index` of the layer: page chrome can turn pointer input on and
	// paint above the overlay, and its `<body>` child is the page itself.
	return stackLevel(layer) >= stackLevel(overlay.container) ? layer : null;
}

/**
 * The frame of `layer`: the layer itself, or the first frame in it.
 */
function getFrame(layer: Element): HTMLIFrameElement | null {
	return layer instanceof HTMLIFrameElement ? layer : layer.querySelector("iframe");
}

/**
 * The `z-index` of `element` as a number, or `NaN` for `auto`. `NaN` is not at
 * or above a level, so an element with no `z-index` never covers an overlay.
 */
function stackLevel(element: Element): number {
	return Number(getComputedStyle(element).zIndex);
}

/**
 * The frame of the layer that covers the open overlay whose content is
 * `content`, or `null` when no layer covers it. A key press reaches the layer
 * only while focus is in this frame. See {@link getCoveringLayer}.
 *
 * @example
 * ```ts
 * // send the keyboard to a payment challenge above the open sheet
 * getCoveringFrame(sheetContent)?.focus();
 * ```
 */
function getCoveringFrame(content: Element | null): HTMLIFrameElement | null {
	const layer = getCoveringLayer(content);
	return layer == null ? null : getFrame(layer);
}

/**
 * The layer that covers the top open overlay, for an event that goes to
 * `node`. Returns `null` when `node` is in that overlay.
 *
 * Why the container check first: most events stay in the overlay, and the hit
 * test makes the browser lay out the page.
 */
function getCoveringLayerFor(node: EventTarget | null): Element | null {
	const overlay = openOverlays.at(-1);
	if (overlay == null || (node instanceof Node && overlay.container.contains(node))) {
		return null;
	}
	return getCoveringLayer(overlay.content);
}

/**
 * Runs for each focus event of the document. When focus leaves the top open
 * overlay while a layer covers it, the overlay yields to the layer:
 *
 * - The layer loses its `aria-hidden`. Radix sets that attribute on each
 *   `<body>` child that is on the page as a modal overlay opens, and a wallet
 *   popup stays on the page between uses.
 * - A focus move into the layer stops here, so the focus trap of the overlay
 *   does not take focus back.
 *
 * Why stop the event: the trap is a later listener on the document. Radix
 * lets only a React child of the content keep focus outside the content.
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
 * Why a record: Radix reports an outside press on the click that follows it,
 * and a layer that closes on the press is gone by then.
 */
const coveringLayerPresses = new WeakSet<Event>();

/**
 * Records a pointer down that lands in the layer that covers the top open
 * overlay.
 */
function recordCoveringLayerPress(event: PointerEvent): void {
	const layer = getCoveringLayerFor(event.target);
	if (event.target instanceof Node && layer?.contains(event.target)) {
		coveringLayerPresses.add(event);
	}
}

/**
 * Whether the pointer down `event` landed in the layer that covered the top
 * open overlay at that time. The overlay then does not count it as a press
 * outside.
 *
 * @example
 * ```ts
 * // a press on the backdrop of a payment challenge above the open sheet
 * isCoveringLayerPress(event.detail.originalEvent); // true
 * ```
 */
function isCoveringLayerPress(event: Event): boolean {
	return coveringLayerPresses.has(event);
}

/**
 * Adds the document listeners that let the layer above the top open overlay
 * keep focus and take presses. Each float and each overlay calls it on mount,
 * through {@link useLayerContainer}.
 *
 * A click in a frame, and a frame that focuses itself, never reach the focus
 * trap. The focus case this handles is a page script that calls `focus()` on
 * the frame of the layer, as a wallet popup does when it opens.
 *
 * Why no removal: the focus listener must run before the listeners of each
 * Radix layer on the page. A popover that holds the overlay has a listener
 * that is older than the overlay. It closes the popover, and the overlay with
 * it, when focus moves to the frame. The document keeps one copy of a listener,
 * in its first place, so each call after the first does nothing.
 */
function listenForCoveringLayer(): void {
	document.addEventListener("focusin", yieldFocusToCoveringLayer);
	document.addEventListener("focusout", yieldFocusToCoveringLayer);
	document.addEventListener("pointerdown", recordCoveringLayerPress, true);
}

export {
	//,
	getCoveringFrame,
	isCoveringLayerPress,
	LayerContainer,
	LayerContainerContext,
	useFloatEscapeKeyDown,
	useFloatOpenAutoFocus,
	useIsInsideModalLayer,
	useLayerContainer,
	useRegisterOverlay,
};
