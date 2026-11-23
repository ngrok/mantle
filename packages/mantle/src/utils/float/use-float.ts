"use client";

import { useCallback, useEffect, useInsertionEffect, useRef, useState } from "react";
import type { RefCallback, RefObject } from "react";
import { canUseDOM } from "../../components/browser-only/can-use-dom.js";
import { useCallbackRef } from "../../hooks/use-callback-ref.js";
import { useIsHydrated } from "../../hooks/use-is-hydrated.js";
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js";
import { useIsCoveredByOverlay, useLayerContainer } from "../layer-container/layer-container.js";
import { trackFloat } from "./position.js";
import type { Align, Side } from "./position.js";

/**
 * How long a closed float stays mounted for its exit transition, in
 * milliseconds. It matches `data-state-closed:duration-150` in `floatClassName`.
 */
const EXIT_DURATION = 150;

/**
 * The classes every native float shares. The float is a `popover` in the top
 * layer: these classes undo the browser's centered `[popover]` box. It fades
 * and scales in from `@starting-style` and out on `data-state="closed"`.
 * Chromium keeps the float in the top layer for the exit (`overlay`). Firefox
 * and Safari hide it at once, because they do not transition `overlay`.
 *
 * Why `data-state`, `fixed`, and `z-50`, not `:popover-open`: a browser with no
 * popover API (Safari before 17, Chrome before 114, Firefox before 125) does
 * not know `:popover-open` and has no top layer. There the float is a plain
 * fixed box at the float tier, as before mantle used the popover API. The top
 * layer ignores `z-index`.
 *
 * Why `pointer-events-auto`: a modal Radix menu sets `pointer-events: none` on
 * `<body>`, and a float that portals there would inherit it.
 */
const floatClassName =
	"pointer-events-auto fixed z-50 m-0 inset-auto overflow-visible starting:opacity-0 starting:scale-95 data-state-closed:opacity-0 data-state-closed:scale-95 transition-[opacity,scale,display,overlay] transition-discrete duration-200 ease-out-strong data-state-closed:duration-150 motion-reduce:transition-none";

/**
 * Whether the browser has the popover API. Without it, `useFloat` shows the
 * float as a plain fixed box and runs every behavior from script.
 *
 * Why a float sets `popover` only when this is true: jsdom hides `[popover]`
 * in its default stylesheet but has no `showPopover`, so a float with the
 * attribute never shows, and a test cannot find it by its role.
 */
const hasPopoverApi = canUseDOM() && "togglePopover" in HTMLElement.prototype;

/** A pointer press or a focus move outside a float, which closes it unless a handler prevents that. */
type PointerDownOutsideEvent = CustomEvent<{ originalEvent: PointerEvent }>;
type FocusOutsideEvent = CustomEvent<{ originalEvent: FocusEvent }>;

/** The handlers a float that closes on an outside press or focus move takes. */
type OutsideHandlers = {
	/** Runs when a pointer press starts outside the float. Call `event.preventDefault()` to keep it open. */
	onPointerDownOutside?: (event: PointerDownOutsideEvent) => void;
	/** Runs when focus moves outside the float. Call `event.preventDefault()` to keep it open. */
	onFocusOutside?: (event: FocusOutsideEvent) => void;
	/** Runs for both an outside press and an outside focus move. Call `event.preventDefault()` to keep it open. */
	onInteractOutside?: (event: PointerDownOutsideEvent | FocusOutsideEvent) => void;
};

/** Why a float closed without the caller asking. */
/** What an open float is placed against: its anchor, its arrow, its direction when the placement reads it, and the call that places it again. */
type PlacedFor = {
	floating: HTMLElement;
	anchor: HTMLElement;
	arrow: HTMLElement | null;
	rtl: boolean | null;
	retrack: (anchor: HTMLElement) => void;
};

type DismissReason = "escape" | "outside" | "browser" | "covered";

/** An open float that can take Escape. */
type OpenFloat = {
	element: HTMLElement;
	/** Replaced when the float's ref callback runs again, so the float keeps its place in the stack. */
	escape: (event: KeyboardEvent) => void;
};

/** The open floats in the order they opened. The last one takes Escape. */
const openFloats: OpenFloat[] = [];

/**
 * A layer that a float holds and that handles its own Escape: a Radix popper,
 * an overlay, or an expanded popup owner such as a combobox input. An expanded
 * accordion trigger also sets `aria-controls`, but it does not take Escape.
 */
const nestedLayerSelector =
	"[data-radix-popper-content-wrapper], [data-mantle-modal-content], [aria-expanded='true'][aria-controls]:is([role='combobox'], [aria-haspopup]:not([aria-haspopup='false']))";

/** Whether an Escape at `target` belongs to a layer inside `floating`. */
function belongsToNestedLayer(floating: HTMLElement, target: EventTarget | null): boolean {
	if (!(target instanceof Element) || !floating.contains(target)) {
		return false;
	}
	const layer = target.closest(nestedLayerSelector);
	return layer != null && layer !== floating && floating.contains(layer);
}

/**
 * Gives Escape to the float that opened last. Why the capture phase on
 * `window`: it runs before the document listeners of a Radix overlay under the
 * float, and a prevented Escape keeps that overlay and the browser's own close
 * request from closing anything else.
 */
function handleEscape(event: KeyboardEvent): void {
	const top = openFloats.at(-1);
	if (event.key !== "Escape" || top == null || belongsToNestedLayer(top.element, event.target)) {
		return;
	}
	top.escape(event);
}

/** Adds `float` to the top of the Escape stack and returns the cleanup. */
function pushOpenFloat(float: OpenFloat): () => void {
	if (openFloats.length === 0) {
		window.addEventListener("keydown", handleEscape, { capture: true });
	}
	openFloats.push(float);
	return () => {
		openFloats.splice(openFloats.indexOf(float), 1);
		if (openFloats.length === 0) {
			window.removeEventListener("keydown", handleEscape, { capture: true });
		}
	};
}

/**
 * Where a float portals: into the content of the overlay that holds it, so the
 * overlay's focus trap and outside-press check count the float as inside; into
 * the float that holds it; else into `document.body`. The float paints in the
 * top layer wherever it sits in the DOM.
 */
function resolvePortalTarget(
	layerContainer: Element | DocumentFragment | null,
): Element | DocumentFragment {
	if (layerContainer == null) {
		return document.body;
	}
	if (layerContainer instanceof Element) {
		// Why a child: an overlay's content is a child of its positioner. A dialog
		// further down, such as one opened from a popover, does not hold the float.
		return layerContainer.querySelector(":scope > [data-mantle-modal-content]") ?? layerContainer;
	}
	return layerContainer;
}

/**
 * The session of each shown float. A ref callback that runs again while the
 * float stays open, such as for a new placement, continues the session, so the
 * float does not hide, show, move focus, or move in the Escape stack again.
 */
type FloatSession = {
	entry: OpenFloat;
	popEscape: () => void;
};
const floatSessions = new WeakMap<HTMLElement, FloatSession>();

/** Whether a native modal `<dialog>` that does not hold `element` is open: the float would paint over it. */
/** The arrow of a float: its direct child with `data-float-arrow`. */
function arrowOf(floating: HTMLElement): HTMLElement | null {
	return floating.querySelector<HTMLElement>(":scope > [data-float-arrow]");
}

function isUnderNativeModal(element: HTMLElement): boolean {
	return Array.from(element.ownerDocument.querySelectorAll("dialog[open]")).some(
		(dialog) => !dialog.contains(element) && dialog.matches(":modal"),
	);
}

type UseFloatOptions = OutsideHandlers & {
	/** Whether the float is open. */
	open: boolean;
	/** Closes the float, with the reason: Escape, an outside interaction, the browser hid it, or an overlay covers it. */
	onDismiss: (reason: DismissReason) => void;
	/** The element the float sits next to. */
	getAnchor: () => HTMLElement | null;
	/** Elements a press or a focus move may reach without closing the float, such as its trigger. */
	getInsideElements?: () => readonly (Element | null)[];
	/** Whether outside presses and focus moves close the float. */
	dismissOnOutside: boolean;
	/** Whether the float closes, rather than hides until it shows again, when an overlay covers it. */
	dismissWhenCovered: boolean;
	side: Side;
	align: Align;
	sideOffset: number;
	/** The reading direction that `start` and `end` follow. Defaults to the anchor's direction. */
	dir?: "ltr" | "rtl";
	/** Runs on Escape while the float is on top. Call `event.preventDefault()` to keep it open. */
	onEscapeKeyDown?: (event: KeyboardEvent) => void;
	/** Runs after the float shows. */
	onShow?: (floating: HTMLElement) => void;
	/** Runs before the float hides, with whether focus was inside it. */
	onHide?: (floating: HTMLElement, focusWasInside: boolean) => void;
};

/**
 * Runs a native float: a `popover` element in the top layer next to its
 * anchor. The caller renders the float only while `present`, into `portalTarget`, with
 * `floatingRef`, and owns the open state.
 *
 * While the float is open, it shows in the top layer, follows its anchor
 * (`trackFloat`), takes Escape when it opened last, and calls `onDismiss` for
 * each way it closes that the caller did not ask for. It stays mounted for
 * `EXIT_DURATION` after it closes, so its exit transition can play. While an
 * overlay covers its anchor, it does not show, because the top layer would
 * paint it over that overlay.
 *
 * @example
 * ```tsx
 * const { present, portalTarget, floatingRef } = useFloat({ open, onDismiss: () => setOpen(false), ... });
 * return present && portalTarget != null && createPortal(<div popover={hasPopoverApi ? "manual" : undefined} ref={floatingRef} />, portalTarget);
 * ```
 */
function useFloat({
	align,
	dir,
	dismissOnOutside,
	dismissWhenCovered,
	getAnchor,
	getInsideElements,
	onDismiss,
	onEscapeKeyDown,
	onFocusOutside,
	onHide,
	onInteractOutside,
	onPointerDownOutside,
	onShow,
	open,
	side,
	sideOffset,
}: UseFloatOptions): {
	present: boolean;
	portalTarget: Element | DocumentFragment | null;
	floatingRef: RefCallback<HTMLElement>;
	reconcile: () => void;
} {
	const layerContainer = useLayerContainer();
	const hydrated = useIsHydrated();
	const floatElement = useRef<HTMLElement | null>(null);
	const covered = useIsCoveredByOverlay(layerContainer, floatElement);
	const [present, setPresent] = useState(open);
	if (open && !present) {
		setPresent(true);
	}

	const dismiss = useCallbackRef(onDismiss);
	const escape = useCallbackRef(onEscapeKeyDown);
	const pointerDownOutside = useCallbackRef(onPointerDownOutside);
	const focusOutside = useCallbackRef(onFocusOutside);
	const interactOutside = useCallbackRef(onInteractOutside);
	// Why an insertion effect: the ref callback calls these during this commit,
	// before a passive effect would update them, so they must be this render's.
	const latestShow = useRef(onShow);
	const latestHide = useRef(onHide);
	useInsertionEffect(() => {
		latestShow.current = onShow;
		latestHide.current = onHide;
	});
	const anchorOf = useCallbackRef(getAnchor);
	const insideElementsOf = useCallbackRef(getInsideElements);

	useEffect(() => {
		if (open || !present) {
			return;
		}
		const timer = setTimeout(() => setPresent(false), EXIT_DURATION);
		return () => clearTimeout(timer);
	}, [open, present]);

	useEffect(() => {
		if (open && covered && dismissWhenCovered) {
			dismiss("covered");
		}
	}, [covered, dismiss, dismissWhenCovered, open]);

	const visible = open && !covered;
	/** What the open float is placed against, and the call that places it again. */
	const placedFor = useRef<PlacedFor | null>(null);
	/** Starts an open float that had no anchor, or was not in the document, when its ref callback ran. */
	const attachLate = useRef<(() => boolean) | null>(null);
	// Why: the ref callback keeps one identity while the float is open, so it
	// does not see a new anchor element, such as a replaced trigger or an Anchor
	// that mounts later, a new inherited direction, or a new arrow element. This
	// starts or places the float again only when one changes.
	const reconcile = () => {
		const anchor = anchorOf();
		if (anchor == null) {
			return;
		}
		const placed = placedFor.current;
		if (placed == null) {
			attachLate.current?.();
			return;
		}
		if (
			anchor !== placed.anchor ||
			arrowOf(placed.floating) !== placed.arrow ||
			(placed.rtl != null && (getComputedStyle(anchor).direction === "rtl") !== placed.rtl)
		) {
			placed.retrack(anchor);
		}
	};
	// Why a layout effect: the float moves before the browser paints.
	useIsomorphicLayoutEffect(reconcile);
	const reconcileNow = useCallbackRef(reconcile);
	// Why a passive effect too: an Anchor after the content in the tree attaches
	// its ref after the content's layout effects run.
	useEffect(reconcile);

	/** Shows an open float on `anchor` and tracks it there. Returns the cleanup that hides it. */
	const attach = useCallback(
		(floating: HTMLElement, anchor: HTMLElement) => {
			// Why only with the popover API: without it the float has no top layer,
			// so it paints under a modal dialog anyway.
			if (hasPopoverApi && isUnderNativeModal(floating)) {
				if (dismissWhenCovered) {
					dismiss("covered");
				}
				return;
			}
			// Why only for `start` and `end` above or below: only that placement follows the direction.
			const readsDirection =
				dir == null && align !== "center" && (side === "top" || side === "bottom");
			let shown = true;
			let dismissed = false;
			// Why once: the browser can hide a `hint` float on the same press that the outside check sees.
			const dismissOnce = (reason: DismissReason) => {
				if (!dismissed) {
					dismissed = true;
					dismiss(reason);
				}
			};
			// Why: the browser hides a `hint` float when the user presses outside it,
			// presses Escape, or opens another one.
			const onBeforeToggle = (event: Event) => {
				if (shown && Reflect.get(event, "newState") === "closed") {
					shown = false;
					dismissOnce("browser");
				}
			};
			const onEscape = (event: KeyboardEvent) => {
				escape(event);
				if (!event.defaultPrevented) {
					event.preventDefault();
					dismissOnce("escape");
				}
			};
			const previous = floatSessions.get(floating);
			const continuing = previous != null;
			let session: FloatSession;
			if (previous == null) {
				const entry = { element: floating, escape: onEscape };
				session = { entry, popEscape: pushOpenFloat(entry) };
			} else {
				previous.entry.escape = onEscape;
				session = { entry: previous.entry, popEscape: previous.popEscape };
			}
			floatSessions.set(floating, session);
			floating.addEventListener("beforetoggle", onBeforeToggle);
			if (!continuing && hasPopoverApi) {
				floating.showPopover();
			}
			const track = (target: HTMLElement) =>
				trackFloat({
					align,
					anchor: target,
					dir,
					floating,
					side,
					sideOffset,
					releaseAnchorAfter: EXIT_DURATION,
				});
			let stopTracking = track(anchor);
			const placed: PlacedFor = {
				floating,
				anchor,
				arrow: arrowOf(floating),
				rtl: readsDirection ? getComputedStyle(anchor).direction === "rtl" : null,
				retrack: (next) => {
					stopTracking();
					stopTracking = track(next);
					placed.anchor = next;
					placed.arrow = arrowOf(floating);
					placed.rtl = readsDirection ? getComputedStyle(next).direction === "rtl" : null;
				},
			};
			placedFor.current = placed;

			const isInside = (target: EventTarget | null) =>
				target instanceof Node &&
				(floating.contains(target) ||
					(insideElementsOf()?.some((element) => element?.contains(target) === true) ?? false));
			const onOutside = <TEvent extends PointerEvent | FocusEvent>(
				originalEvent: TEvent,
				handler: (event: CustomEvent<{ originalEvent: TEvent }>) => void,
			) => {
				const target = originalEvent.target;
				if (target == null || isInside(target)) {
					return;
				}
				const event = new CustomEvent("mantle.float.outside", {
					cancelable: true,
					detail: { originalEvent },
				});
				// Why dispatch on the target: a handler reads `event.target` to keep the
				// float open for one outside control, as it could with Radix.
				const runHandlers = () => {
					handler(event);
					interactOutside(event);
				};
				target.addEventListener(event.type, runHandlers, { once: true });
				target.dispatchEvent(event);
				if (!event.defaultPrevented) {
					dismissOnce("outside");
				}
			};
			const onPointerDown = (event: PointerEvent) => onOutside(event, pointerDownOutside);
			const onFocusIn = (event: FocusEvent) => onOutside(event, focusOutside);
			const document = floating.ownerDocument;
			if (dismissOnOutside) {
				document.addEventListener("pointerdown", onPointerDown);
				document.addEventListener("focusin", onFocusIn);
			}
			if (!continuing) {
				latestShow.current?.(floating);
			}

			return () => {
				placedFor.current = null;
				document.removeEventListener("pointerdown", onPointerDown);
				document.removeEventListener("focusin", onFocusIn);
				stopTracking();
				floating.removeEventListener("beforetoggle", onBeforeToggle);
				// Why now: the closed float turns `inert` in this commit, and the browser
				// then moves focus out of it.
				const focusWasInside = floating.contains(document.activeElement);
				// Why a microtask: React runs this cleanup inside its commit, and at the
				// end of the commit it moves focus back to the element that had it
				// before. A focus move here would not hold.
				queueMicrotask(() => {
					if (floatSessions.get(floating) !== session) {
						return;
					}
					floatSessions.delete(floating);
					session.popEscape();
					// Why: under `asChild`, an open float can get a new element. The new
					// element shows in the same commit, so the old one has not closed.
					const next = floatElement.current;
					const replaced = next != null && next !== floating && floatSessions.has(next);
					if (!replaced) {
						latestHide.current?.(floating, focusWasInside);
					} else if (focusWasInside && !next.contains(document.activeElement)) {
						next.focus({ preventScroll: true });
					}
					if (shown && hasPopoverApi) {
						shown = false;
						floating.hidePopover();
					}
				});
			};
		},
		[
			align,
			dir,
			dismiss,
			dismissOnOutside,
			dismissWhenCovered,
			escape,
			focusOutside,
			insideElementsOf,
			interactOutside,
			pointerDownOutside,
			side,
			sideOffset,
		],
	);

	// Why a ref callback: React calls it again when `visible` or the placement
	// changes, so the float shows and follows its anchor only while visible.
	// Why `useCallback`: a new callback on each render would place the open
	// float again, with a forced layout, each time its owner renders.
	const floatingRef = useCallback<RefCallback<HTMLElement>>(
		(floating) => {
			floatElement.current = floating;
			if (!visible || floating == null) {
				return;
			}
			const anchor = anchorOf();
			if (anchor != null && floating.isConnected) {
				return attach(floating, anchor);
			}
			// Why wait: an Anchor can mount later, and a float can portal into a
			// menu that is not in the document yet, where `showPopover` throws.
			let stop: (() => void) | undefined;
			let frame = 0;
			const tryAttach = () => {
				const late = anchorOf();
				// Why check the owner: a queued frame can run after a render attached the float.
				if (attachLate.current !== tryAttach || late == null || !floating.isConnected) {
					return false;
				}
				attachLate.current = null;
				stop = attach(floating, late);
				return true;
			};
			attachLate.current = tryAttach;
			// Why each frame: nothing renders this float again when its container connects.
			const retry = () => {
				if (attachLate.current === tryAttach && !floating.isConnected) {
					frame = requestAnimationFrame(() => {
						tryAttach();
						retry();
					});
				}
			};
			retry();
			return () => {
				cancelAnimationFrame(frame);
				if (attachLate.current === tryAttach) {
					attachLate.current = null;
				}
				stop?.();
			};
		},
		[anchorOf, attach, visible],
	);

	return {
		present,
		// Why after hydration: the server renders no portal, so a float that is
		// open on the first render portals one render later instead of mismatching.
		portalTarget: present && hydrated ? resolvePortalTarget(layerContainer) : null,
		floatingRef,
		// Why: an anchor can get a new element in a render this hook does not see.
		reconcile: reconcileNow,
	};
}

/**
 * The element of a float's trigger or anchor, and the ref callback that sets
 * it. The callback runs `onTriggerChangeRef` for each new element. Why: a
 * custom trigger can replace its own element with no render of the float, so
 * the open float must place itself again, with the `reconcile` that
 * `useFloat` returns.
 *
 * @example
 * ```tsx
 * const { triggerRef, setTrigger, onTriggerChangeRef } = useTriggerRef();
 * // In the content, after useFloat:
 * useReconcileOnTriggerChange(onTriggerChangeRef, reconcile);
 * ```
 */
function useTriggerRef() {
	const triggerRef = useRef<HTMLElement | null>(null);
	const onTriggerChangeRef = useRef<(() => void) | null>(null);
	// Why only for an element: a replaced trigger detaches before the new one
	// attaches, and a modal menu must not let its boundary go between them.
	const setTrigger = useCallback((element: HTMLElement | null) => {
		triggerRef.current = element;
		if (element != null) {
			onTriggerChangeRef.current?.();
		}
	}, []);
	return { triggerRef, setTrigger, onTriggerChangeRef };
}

/**
 * Runs `reconcile` when the trigger behind `onTriggerChangeRef` gets a new
 * element, while the content is mounted.
 */
function useReconcileOnTriggerChange(
	onTriggerChangeRef: RefObject<(() => void) | null>,
	reconcile: () => void,
) {
	useEffect(() => {
		onTriggerChangeRef.current = reconcile;
		return () => {
			onTriggerChangeRef.current = null;
		};
	}, [onTriggerChangeRef, reconcile]);
}

export {
	//,
	floatClassName,
	hasPopoverApi,
	resolvePortalTarget,
	useFloat,
	useReconcileOnTriggerChange,
	useTriggerRef,
};

export type {
	//,
	DismissReason,
	FocusOutsideEvent,
	OutsideHandlers,
	PointerDownOutsideEvent,
};
