"use client";

import type { ComponentProps, FocusEvent, PointerEvent, ReactNode, RefObject } from "react";
import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import invariant from "tiny-invariant";
import type { WithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { findTabbableDescendants } from "../alert/tabbable-neighbors.js";
import { FloatArrow } from "../../utils/float/parts.js";
import type { Align, Side } from "../../utils/float/position.js";
import {
	floatClassName,
	hasPopoverApi,
	useFloat,
	useReconcileOnTriggerChange,
	useTriggerRef,
} from "../../utils/float/use-float.js";
import { LayerContainer } from "../../utils/layer-container/layer-container.js";
import { Slot } from "../slot/index.js";

/** What holds a hover card open: a pointer on the trigger or the card, or a focus on the trigger. */
type HoldSource = "pointer" | "focus";

type HoverCardState = {
	open: boolean;
	setOpen: (open: boolean) => void;
	/** A pointer or a focus starts to hold the card: open after `openDelay`, or stay open. */
	hold: (source: HoldSource) => void;
	/** A pointer or a focus stops holding the card: close after `closeDelay` once neither holds it. */
	release: (source: HoldSource) => void;
	contentId: string;
	triggerRef: RefObject<HTMLElement | null>;
	/** The trigger's ref callback. It tells the open content about a new trigger element. */
	setTrigger: (element: HTMLElement | null) => void;
	onTriggerChangeRef: RefObject<(() => void) | null>;
	contentRef: RefObject<HTMLElement | null>;
};

const HoverCardContext = createContext<HoverCardState | null>(null);

function useHoverCardState(part: string): HoverCardState {
	const state = useContext(HoverCardContext);
	invariant(state != null, `\`HoverCard.${part}\` must be rendered inside \`HoverCard.Root\`.`);
	return state;
}

type HoverCardRootProps = {
	children?: ReactNode;
	/** The open state, for a controlled hover card. Pair it with `onOpenChange`. */
	open?: boolean;
	/**
	 * The open state on the first render, for an uncontrolled hover card.
	 * @default false
	 */
	defaultOpen?: boolean;
	/** Runs when the hover card opens or closes. */
	onOpenChange?: (open: boolean) => void;
	/**
	 * How long the pointer or focus rests on the trigger before the card opens, in milliseconds.
	 * @default 700
	 */
	openDelay?: number;
	/**
	 * How long the card stays open after the pointer or focus leaves, in milliseconds.
	 * @default 300
	 */
	closeDelay?: number;
};

/**
 * A card that previews the content behind a link when a pointer rests on the
 * link or the link takes focus. This is the root, stateful part that owns the
 * open state and the delays. It renders no element.
 *
 * Use it for sighted pointer users only: a touch never opens it, and a screen
 * reader does not announce it. Keep everything it shows reachable from the link.
 *
 * It opens `openDelay` after a pointer rests on the link or the link takes
 * focus, and stays open while a pointer rests on the link or the card, or the
 * link has focus (WCAG 1.4.13). It closes `closeDelay` after neither holds it.
 *
 * `HoverCard.Content` is a native `popover="hint"` in the browser's top layer,
 * so it paints above the page and every overlay, and no `overflow` or `z-index`
 * clips it. It closes when an overlay that does not hold it opens.
 *
 * @see https://mantle.ngrok.com/components/overlays/hover-card#hovercardroot
 *
 * @example
 * ```tsx
 * <HoverCard.Root>
 *   <HoverCard.Trigger asChild>
 *     <a href="https://ngrok.com">ngrok</a>
 *   </HoverCard.Trigger>
 *   <HoverCard.Content>
 *     <p>Unified ingress for developers.</p>
 *   </HoverCard.Content>
 * </HoverCard.Root>
 * ```
 */
function Root({
	children,
	closeDelay = 300,
	defaultOpen = false,
	onOpenChange,
	open: openProp,
	openDelay = 700,
}: HoverCardRootProps) {
	const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
	const open = openProp ?? uncontrolledOpen;
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const { triggerRef, setTrigger, onTriggerChangeRef } = useTriggerRef();
	const contentRef = useRef<HTMLElement | null>(null);
	const held = useRef<Record<HoldSource, boolean>>({ pointer: false, focus: false });
	useEffect(() => () => clearTimeout(timer.current), []);

	const contentId = useId();
	const state = useMemo<HoverCardState>(() => {
		const setOpen = (next: boolean) => {
			clearTimeout(timer.current);
			if (next === open) {
				return;
			}
			if (openProp === undefined) {
				setUncontrolledOpen(next);
			}
			onOpenChange?.(next);
		};
		return {
			open,
			setOpen,
			hold: (source) => {
				held.current[source] = true;
				clearTimeout(timer.current);
				if (!open) {
					timer.current = setTimeout(() => setOpen(true), openDelay);
				}
			},
			// Why only once neither holds it: the card stays while its hover or its
			// focus stays (WCAG 1.4.13), so a pointer that leaves a focused link
			// does not close it.
			release: (source) => {
				held.current[source] = false;
				if (held.current.pointer || held.current.focus) {
					return;
				}
				clearTimeout(timer.current);
				timer.current = setTimeout(() => {
					// Why: closing would clear text the user selected in the card. An
					// outside press clears the selection and closes the card.
					const content = contentRef.current;
					const selection = content?.ownerDocument.getSelection();
					if (
						content != null &&
						selection != null &&
						!selection.isCollapsed &&
						content.contains(selection.anchorNode)
					) {
						return;
					}
					setOpen(false);
				}, closeDelay);
			},
			contentId,
			triggerRef,
			setTrigger,
			onTriggerChangeRef,
			contentRef,
		};
	}, [
		closeDelay,
		contentId,
		onOpenChange,
		onTriggerChangeRef,
		open,
		openDelay,
		openProp,
		setTrigger,
		triggerRef,
	]);
	return <HoverCardContext.Provider value={state}>{children}</HoverCardContext.Provider>;
}

/**
 * The link that opens the hover card when a pointer rests on it or it takes focus.
 *
 * @see https://mantle.ngrok.com/components/overlays/hover-card#hovercardtrigger
 *
 * @example
 * ```tsx
 * <HoverCard.Root>
 *   <HoverCard.Trigger asChild>
 *     <a href="https://ngrok.com">ngrok</a>
 *   </HoverCard.Trigger>
 *   <HoverCard.Content>
 *     <p>Unified ingress for developers.</p>
 *   </HoverCard.Content>
 * </HoverCard.Root>
 * ```
 */
const Trigger = ({
	asChild = false,
	"data-slot": dataSlot,
	onBlur,
	onFocus,
	onPointerDown,
	onPointerEnter,
	onPointerLeave,
	ref,
	...props
}: ComponentProps<"a"> & WithAsChild & WithDataSlot) => {
	const state = useHoverCardState("Trigger");
	const composedRef = useComposedRefs(ref, state.setTrigger);
	/** The touch pointers pressed on the trigger now. */
	const touches = useRef(new Set<number>());
	const Component = asChild ? Slot : "a";
	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "hover-card-trigger")}
			ref={composedRef}
			{...props}
			onPointerEnter={(event: PointerEvent<HTMLAnchorElement>) => {
				onPointerEnter?.(event);
				if (event.defaultPrevented) {
					return;
				}
				if (event.pointerType !== "touch") {
					state.hold("pointer");
				}
			}}
			onPointerLeave={(event: PointerEvent<HTMLAnchorElement>) => {
				onPointerLeave?.(event);
				if (event.defaultPrevented) {
					return;
				}
				if (event.pointerType !== "touch") {
					state.release("pointer");
				}
			}}
			// Why: a tap focuses the link, and the card is for pointers. React adds
			// `touchstart` as a passive listener, so a `preventDefault()` there cannot
			// stop that focus. The focus that a touch press causes opens nothing.
			onPointerDown={(event: PointerEvent<HTMLAnchorElement>) => {
				onPointerDown?.(event);
				if (event.defaultPrevented || event.pointerType !== "touch") {
					return;
				}
				// Why a set: one touch that cancels must not clear another that is
				// still down.
				const pressed = touches.current;
				const first = pressed.size === 0;
				pressed.add(event.pointerId);
				if (!first) {
					return;
				}
				// Why `click`: a tap focuses the link after `pointerup`, and the click
				// ends the tap.
				// Why `pointercancel` too: a touch scroll ends with it.
				// Why the window's capture phase: mantle stops an outside click there,
				// such as the one that closes a menu.
				const view = event.currentTarget.ownerDocument.defaultView ?? window;
				const stop = () => {
					pressed.clear();
					view.removeEventListener("click", stop, true);
					view.removeEventListener("pointercancel", onCancel, true);
				};
				const onCancel = (cancel: globalThis.PointerEvent) => {
					pressed.delete(cancel.pointerId);
					if (pressed.size === 0) {
						stop();
					}
				};
				view.addEventListener("click", stop, true);
				view.addEventListener("pointercancel", onCancel, true);
			}}
			onFocus={(event: FocusEvent<HTMLAnchorElement>) => {
				onFocus?.(event);
				if (!event.defaultPrevented && touches.current.size === 0) {
					state.hold("focus");
				}
			}}
			onBlur={(event: FocusEvent<HTMLAnchorElement>) => {
				onBlur?.(event);
				if (!event.defaultPrevented) {
					state.release("focus");
				}
			}}
		/>
	);
};

type HoverCardContentProps = ComponentProps<"div"> &
	WithDataSlot & {
		/**
		 * The side of the trigger the card prefers. It flips to the opposite side
		 * when only that side has room.
		 * @default "bottom"
		 */
		side?: Side;
		/**
		 * How the card lines up with the trigger along `side`.
		 * @default "center"
		 */
		align?: Align;
		/**
		 * The gap between the trigger and the card, in pixels.
		 * @default 4
		 */
		sideOffset?: number;
		/** Runs on Escape while the card is the top float. Call `event.preventDefault()` to keep it open. */
		onEscapeKeyDown?: (event: KeyboardEvent) => void;
	};

/**
 * The card. It mounts while the hover card is open, as a `popover="hint"`
 * element in the top layer next to `HoverCard.Trigger`. A pointer that moves
 * from the trigger onto the card keeps it open. It closes on Escape and on a
 * press outside it. The keyboard never enters it: its links and buttons leave
 * the Tab order. It portals into the overlay or float that holds it, else
 * into `document.body`.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value                                          | Description                                     |
 * | -------------- | ---------------------------------------------- | ----------------------------------------------- |
 * | `data-slot`    | `"hover-card-content"`                         | On the card, with any composing part's chain ahead of it. |
 * | `data-open`    | present while open | Presence-only. Absent while the exit transition plays. |
 * | `data-side`    | `"top"` \| `"right"` \| `"bottom"` \| `"left"` | The side of the trigger the card resolved to.   |
 *
 * @see https://mantle.ngrok.com/components/overlays/hover-card#hovercardcontent
 *
 * @example
 * ```tsx
 * <HoverCard.Root>
 *   <HoverCard.Trigger asChild>
 *     <a href="https://ngrok.com">ngrok</a>
 *   </HoverCard.Trigger>
 *   <HoverCard.Content>
 *     <p>Unified ingress for developers.</p>
 *   </HoverCard.Content>
 * </HoverCard.Root>
 * ```
 */
const Content = ({
	align = "center",
	className,
	"data-slot": dataSlot,
	onClick,
	onEscapeKeyDown,
	onPointerEnter,
	onPointerLeave,
	ref,
	side = "bottom",
	sideOffset = 4,
	...props
}: HoverCardContentProps) => {
	const state = useHoverCardState("Content");
	const { portalTarget, floatingRef, reconcile } = useFloat({
		open: state.open,
		onDismiss: () => state.setOpen(false),
		getAnchor: () => state.triggerRef.current,
		getInsideElements: () => [state.triggerRef.current],
		dismissOnOutside: true,
		dismissWhenCovered: true,
		side,
		align,
		sideOffset,
		onEscapeKeyDown,
		// Why: a focus move closes the card through the trigger's blur, after
		// `closeDelay` and only once no pointer holds it.
		onFocusOutside: (event) => event.preventDefault(),
		// Why: the keyboard never enters the card, so its links and buttons leave
		// the Tab order. Everything in it is reachable from the trigger's link.
		onShow: (floating) => {
			for (const tabbable of findTabbableDescendants(floating)) {
				tabbable.tabIndex = -1;
			}
		},
	});
	useReconcileOnTriggerChange(state.onTriggerChangeRef, reconcile);
	const composedRef = useComposedRefs(ref, floatingRef, state.contentRef);

	return (
		portalTarget != null &&
		createPortal(
			<LayerContainer
				modal={false}
				id={state.contentId}
				popover={hasPopoverApi ? "hint" : undefined}
				data-slot={joinDataSlot(dataSlot, "hover-card-content")}
				data-open={state.open ? "" : undefined}
				inert={!state.open}
				className={cx(
					floatClassName,
					"bg-popover border-popover w-64 rounded-md border p-4 shadow-md outline-hidden",
					className,
				)}
				ref={composedRef}
				{...props}
				onClick={(event) => {
					// Why: a click in the card must not reach a clickable parent of the trigger.
					event.stopPropagation();
					onClick?.(event);
				}}
				onPointerEnter={(event) => {
					onPointerEnter?.(event);
					if (!event.defaultPrevented && event.pointerType !== "touch") {
						state.hold("pointer");
					}
				}}
				onPointerLeave={(event) => {
					onPointerLeave?.(event);
					if (event.defaultPrevented) {
						return;
					}
					if (event.pointerType !== "touch") {
						state.release("pointer");
					}
				}}
			/>,
			portalTarget,
		)
	);
};

type HoverCardArrowProps = Omit<ComponentProps<"svg">, "children" | "width" | "height"> &
	WithDataSlot & {
		/**
		 * The width of the arrow, in pixels.
		 * @default 14
		 */
		width?: number;
		/**
		 * The height of the arrow, in pixels.
		 * @default 7
		 */
		height?: number;
	};

/**
 * An optional tip that points from `HoverCard.Content` at its trigger. Render
 * it as a direct child of `HoverCard.Content`. It moves to the edge of the card
 * that faces the trigger and centers on the trigger, also after the card flips
 * or shifts.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-float-arrow` | `""` | On the `<span>` around the arrow's `<svg>`. The float moves it to the edge that faces the anchor. |
 *
 * @see https://mantle.ngrok.com/components/overlays/hover-card#hovercardarrow
 *
 * @example
 * ```tsx
 * <HoverCard.Root>
 *   <HoverCard.Trigger asChild>
 *     <a href="https://ngrok.com">ngrok</a>
 *   </HoverCard.Trigger>
 *   <HoverCard.Content>
 *     <HoverCard.Arrow />
 *     <p>Unified ingress for developers.</p>
 *   </HoverCard.Content>
 * </HoverCard.Root>
 * ```
 */
const Arrow = ({ "data-slot": dataSlot, ...props }: HoverCardArrowProps) => (
	<FloatArrow data-slot={joinDataSlot(dataSlot, "hover-card-arrow")} {...props} />
);

export {
	//,
	Root,
	Arrow,
	Content,
	Trigger,
};
