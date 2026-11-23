"use client";

import type {
	ComponentProps,
	FocusEvent,
	MouseEvent,
	PointerEvent,
	ReactNode,
	RefObject,
} from "react";
import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import invariant from "tiny-invariant";
import { useCallbackRef } from "../../hooks/use-callback-ref.js";
import type { WithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import type { Align, Side } from "../../utils/float/position.js";
import { floatClassName, useFloat } from "../../utils/float/use-float.js";
import { LayerContainer } from "../../utils/layer-container/layer-container.js";
import { Slot } from "../slot/index.js";

/**
 * The open delay, how long a closed tooltip lets the next one open without the
 * delay, and whether a pointer can move onto the content.
 */
type TooltipTiming = {
	delayDuration: number;
	skipDelayDuration: number;
	disableHoverableContent: boolean;
	/** Whether the next tooltip waits `delayDuration`. A tooltip that closed less than `skipDelayDuration` ago skips it. */
	isOpenDelayed: RefObject<boolean>;
	skipTimer: RefObject<ReturnType<typeof setTimeout> | undefined>;
};

/** The timing a tooltip with no `TooltipProvider` uses. */
const defaultTiming: TooltipTiming = {
	delayDuration: 0,
	skipDelayDuration: 300,
	disableHoverableContent: false,
	isOpenDelayed: { current: true },
	skipTimer: { current: undefined },
};

const TooltipTimingContext = createContext<TooltipTiming>(defaultTiming);

/** A tooltip opened: the next one opens with no delay. */
function skipNextDelays(timing: TooltipTiming): void {
	clearTimeout(timing.skipTimer.current);
	timing.isOpenDelayed.current = false;
}

/** A tooltip closed: the next one waits the delay again after `skipDelayDuration`. */
function restoreDelaysSoon(timing: TooltipTiming): void {
	clearTimeout(timing.skipTimer.current);
	timing.skipTimer.current = setTimeout(() => {
		timing.isOpenDelayed.current = true;
	}, timing.skipDelayDuration);
}

/** The tooltip that is open now, so that opening another one closes it. */
let openTooltip: { id: string; close: () => void } | undefined;

type TooltipProviderProps = {
	children?: ReactNode;
	/**
	 * How long the pointer rests on a trigger before its tooltip opens, in milliseconds.
	 * @default 0
	 */
	delayDuration?: number;
	/**
	 * How long after one tooltip closes the next one opens with no delay, in milliseconds.
	 * @default 300
	 */
	skipDelayDuration?: number;
	/**
	 * Closes each tooltip as soon as the pointer leaves its trigger, so a
	 * pointer cannot move onto the content.
	 * @default false
	 */
	disableHoverableContent?: boolean;
};

/**
 * Sets the timing of the tooltips inside it: the open delay, the window in
 * which the next tooltip skips that delay, and whether a pointer can move onto
 * the content. It is optional: a tooltip outside every provider opens at once.
 * A nested provider applies its own timing to its subtree.
 *
 * @see https://mantle.ngrok.com/components/overlays/tooltip#tooltipprovider
 *
 * @example
 * ```tsx
 * <TooltipProvider delayDuration={300}>
 *   <Tooltip.Root>
 *     <Tooltip.Trigger asChild>
 *       <Button type="button" appearance="outlined" intent="neutral">
 *         Hover me
 *       </Button>
 *     </Tooltip.Trigger>
 *     <Tooltip.Content>
 *       This is a tooltip
 *     </Tooltip.Content>
 *   </Tooltip.Root>
 * </TooltipProvider>
 * ```
 */
function TooltipProvider({
	children,
	delayDuration = 0,
	disableHoverableContent = false,
	skipDelayDuration = 300,
}: TooltipProviderProps) {
	const isOpenDelayed = useRef(true);
	const skipTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	useEffect(() => () => clearTimeout(skipTimer.current), []);
	const timing = useMemo<TooltipTiming>(
		() => ({ delayDuration, skipDelayDuration, disableHoverableContent, isOpenDelayed, skipTimer }),
		[delayDuration, disableHoverableContent, skipDelayDuration],
	);
	return <TooltipTimingContext.Provider value={timing}>{children}</TooltipTimingContext.Provider>;
}

/** The open state of a tooltip, as `data-state` writes it. */
type TooltipOpenState = "closed" | "delayed-open" | "instant-open";

type TooltipState = {
	state: TooltipOpenState;
	contentId: string;
	triggerRef: RefObject<HTMLElement | null>;
	/** The pointer reached the trigger: open after the delay. */
	onTriggerEnter: () => void;
	/** The pointer left the trigger: close, or wait for it to reach the content. */
	onTriggerLeave: () => void;
	/** The pointer reached the content: stay open. */
	onContentEnter: () => void;
	open: () => void;
	close: () => void;
};

const TooltipContext = createContext<TooltipState | null>(null);

function useTooltipState(part: string): TooltipState {
	const state = useContext(TooltipContext);
	invariant(state != null, `\`Tooltip.${part}\` must be rendered inside \`Tooltip.Root\`.`);
	return state;
}

/** Whether the pointer is inside the smallest box that holds both elements. */
function isInsideBoth(event: globalThis.PointerEvent, a: Element, b: Element): boolean {
	const boxA = a.getBoundingClientRect();
	const boxB = b.getBoundingClientRect();
	return (
		event.clientX >= Math.min(boxA.left, boxB.left) &&
		event.clientX <= Math.max(boxA.right, boxB.right) &&
		event.clientY >= Math.min(boxA.top, boxB.top) &&
		event.clientY <= Math.max(boxA.bottom, boxB.bottom)
	);
}

type TooltipRootProps = {
	children?: ReactNode;
	/** The open state, for a controlled tooltip. Pair it with `onOpenChange`. */
	open?: boolean;
	/**
	 * The open state on the first render, for an uncontrolled tooltip.
	 * @default false
	 */
	defaultOpen?: boolean;
	/** Runs when the tooltip opens or closes. */
	onOpenChange?: (open: boolean) => void;
	/** The open delay for this tooltip, in milliseconds. It overrides `TooltipProvider`. */
	delayDuration?: number;
	/** Closes the tooltip as soon as the pointer leaves the trigger. It overrides `TooltipProvider`. */
	disableHoverableContent?: boolean;
};

/**
 * A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.
 * This is the root, stateful part that owns the open state. It renders no element.
 *
 * `Tooltip.Content` is a native `popover="hint"` in the browser's top layer, so
 * it paints above the page and every overlay, and no `overflow` or `z-index`
 * clips it. It closes when an overlay that does not hold it opens. Only one
 * tooltip is open at a time.
 *
 * @see https://mantle.ngrok.com/components/overlays/tooltip#tooltiproot
 *
 * @example
 * ```tsx
 * <Tooltip.Root>
 *   <Tooltip.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Hover me
 *     </Button>
 *   </Tooltip.Trigger>
 *   <Tooltip.Content>
 *     This is a tooltip
 *   </Tooltip.Content>
 * </Tooltip.Root>
 * ```
 */
function Root({
	children,
	defaultOpen = false,
	delayDuration,
	disableHoverableContent,
	onOpenChange,
	open: openProp,
}: TooltipRootProps) {
	const timing = useContext(TooltipTimingContext);
	const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
	const [openedAfterDelay, setOpenedAfterDelay] = useState(true);
	const open = openProp ?? uncontrolledOpen;
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const stopGrace = useRef<(() => void) | undefined>(undefined);
	// Why a ref: a timer can open the tooltip, and a press can close it before
	// React renders the open state. `setOpen` skips only a request that matches
	// both the rendered state and the latest request.
	const requestedOpen = useRef(open);
	useEffect(() => {
		requestedOpen.current = open;
	}, [open]);
	const triggerRef = useRef<HTMLElement | null>(null);
	useEffect(
		() => () => {
			clearTimeout(timer.current);
			stopGrace.current?.();
		},
		[],
	);

	const contentId = useId();
	const closeFromOther = useCallbackRef(() => {
		if (openProp === undefined) {
			setUncontrolledOpen(false);
		}
		onOpenChange?.(false);
	});
	// Why an effect: it follows every way the tooltip opens and closes, including
	// a parent that closes a controlled tooltip and an unmount while open.
	useEffect(() => {
		if (!open) {
			return;
		}
		const entry = { id: contentId, close: closeFromOther };
		openTooltip = entry;
		skipNextDelays(timing);
		return () => {
			if (openTooltip === entry) {
				openTooltip = undefined;
			}
			restoreDelaysSoon(timing);
		};
	}, [closeFromOther, contentId, open, timing]);

	let openState: TooltipOpenState = "closed";
	if (open) {
		openState = openedAfterDelay ? "delayed-open" : "instant-open";
	}
	const state = useMemo<TooltipState>(() => {
		const setOpen = (next: boolean) => {
			clearTimeout(timer.current);
			stopGrace.current?.();
			if (next === open && next === requestedOpen.current) {
				return;
			}
			requestedOpen.current = next;
			if (next && openTooltip != null && openTooltip.id !== contentId) {
				openTooltip.close();
			}
			if (openProp === undefined) {
				setUncontrolledOpen(next);
			}
			onOpenChange?.(next);
		};
		const close = () => setOpen(false);

		return {
			state: openState,
			contentId,
			triggerRef,
			onTriggerEnter: () => {
				clearTimeout(timer.current);
				stopGrace.current?.();
				if (open) {
					return;
				}
				if (!timing.isOpenDelayed.current) {
					setOpenedAfterDelay(false);
					setOpen(true);
					return;
				}
				timer.current = setTimeout(() => {
					setOpenedAfterDelay(true);
					setOpen(true);
				}, delayDuration ?? timing.delayDuration);
			},
			onTriggerLeave: () => {
				clearTimeout(timer.current);
				stopGrace.current?.();
				const trigger = triggerRef.current;
				const content = trigger?.ownerDocument.getElementById(contentId);
				if (
					(disableHoverableContent ?? timing.disableHoverableContent) ||
					trigger == null ||
					content == null
				) {
					setOpen(false);
					return;
				}
				// Why a box and not a deadline: a slow pointer on its way from the
				// trigger to the content keeps the tooltip open. It closes when the
				// pointer leaves the box that holds both.
				const document = trigger.ownerDocument;
				const onMove = (event: globalThis.PointerEvent) => {
					if (!isInsideBoth(event, trigger, content)) {
						close();
					}
				};
				document.addEventListener("pointermove", onMove);
				stopGrace.current = () => {
					document.removeEventListener("pointermove", onMove);
					stopGrace.current = undefined;
				};
			},
			onContentEnter: () => {
				clearTimeout(timer.current);
				stopGrace.current?.();
			},
			open: () => {
				setOpenedAfterDelay(false);
				setOpen(true);
			},
			close,
		};
	}, [
		contentId,
		delayDuration,
		disableHoverableContent,
		onOpenChange,
		open,
		openProp,
		openState,
		timing,
	]);
	return <TooltipContext.Provider value={state}>{children}</TooltipContext.Provider>;
}

/**
 * The element that opens the tooltip on hover and on keyboard focus. A press
 * on it closes the tooltip, and a focus that a press causes does not open it.
 *
 * @see https://mantle.ngrok.com/components/overlays/tooltip#tooltiptrigger
 *
 * @example
 * ```tsx
 * <Tooltip.Root>
 *   <Tooltip.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Hover me
 *     </Button>
 *   </Tooltip.Trigger>
 *   <Tooltip.Content>
 *     This is a tooltip
 *   </Tooltip.Content>
 * </Tooltip.Root>
 * ```
 */
function Trigger({
	"aria-describedby": ariaDescribedBy,
	asChild = false,
	"data-slot": dataSlot,
	onBlur,
	onClick,
	onFocus,
	onPointerDown,
	onPointerLeave,
	onPointerMove,
	ref,
	...props
}: ComponentProps<"button"> & WithAsChild & WithDataSlot) {
	const state = useTooltipState("Trigger");
	const composedRef = useComposedRefs(ref, state.triggerRef);
	const hoverOpened = useRef(false);
	const pressed = useRef(false);
	const Component = asChild ? Slot : "button";
	return (
		<Component
			aria-describedby={
				state.state === "closed"
					? ariaDescribedBy
					: [ariaDescribedBy, state.contentId].filter(Boolean).join(" ")
			}
			data-slot={joinDataSlot(dataSlot, "tooltip-trigger")}
			data-state={state.state}
			ref={composedRef}
			// Why also under `asChild`: a slotted `<button>` with no type would submit its form.
			type="button"
			{...props}
			onPointerMove={(event: PointerEvent<HTMLButtonElement>) => {
				onPointerMove?.(event);
				if (event.defaultPrevented || event.pointerType === "touch" || hoverOpened.current) {
					return;
				}
				hoverOpened.current = true;
				state.onTriggerEnter();
			}}
			onPointerLeave={(event: PointerEvent<HTMLButtonElement>) => {
				onPointerLeave?.(event);
				if (event.defaultPrevented) {
					return;
				}
				hoverOpened.current = false;
				state.onTriggerLeave();
			}}
			onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
				onPointerDown?.(event);
				if (event.defaultPrevented) {
					return;
				}
				state.close();
				pressed.current = true;
				// Why the owner document: a press can end outside the trigger, or in a frame.
				// Why `pointercancel` too: a touch scroll ends with it, not with `pointerup`.
				const document = event.currentTarget.ownerDocument;
				const release = () => {
					pressed.current = false;
					document.removeEventListener("pointerup", release);
					document.removeEventListener("pointercancel", release);
				};
				document.addEventListener("pointerup", release);
				document.addEventListener("pointercancel", release);
			}}
			onFocus={(event: FocusEvent<HTMLButtonElement>) => {
				onFocus?.(event);
				if (!event.defaultPrevented && !pressed.current) {
					state.open();
				}
			}}
			onBlur={(event: FocusEvent<HTMLButtonElement>) => {
				onBlur?.(event);
				if (!event.defaultPrevented) {
					state.close();
				}
			}}
			onClick={(event: MouseEvent<HTMLButtonElement>) => {
				onClick?.(event);
				if (!event.defaultPrevented) {
					state.close();
				}
			}}
		/>
	);
}

/**
 * Props for `Tooltip.Content`. `asChild` is omitted: the content renders its own
 * arrow next to `children`, so a slot would receive more than one element.
 * `id` is omitted: the trigger's `aria-describedby` points at the id the root
 * owns. A `data-slot` from a composing part joins ahead of `tooltip-content`.
 */
type TooltipContentProps = Omit<ComponentProps<"div">, "id"> &
	WithDataSlot & {
		/**
		 * The side of the trigger the tooltip prefers. It flips to the opposite
		 * side when only that side has room.
		 * @default "top"
		 */
		side?: Side;
		/**
		 * How the tooltip lines up with the trigger along `side`.
		 * @default "center"
		 */
		align?: Align;
		/**
		 * The gap between the trigger and the tooltip, in pixels.
		 * @default 4
		 */
		sideOffset?: number;
		/** Runs on Escape while the tooltip is the top float. Call `event.preventDefault()` to keep it open. */
		onEscapeKeyDown?: (event: KeyboardEvent) => void;
	};

/**
 * The content of the tooltip. It mounts while the tooltip is open, as a
 * `popover="hint"` element in the top layer next to `Tooltip.Trigger`, with
 * `role="tooltip"`; the trigger's `aria-describedby` points at it. It closes on
 * Escape. It portals into the overlay or float that holds it, else into
 * `document.body`.
 *
 * **Structure.** `children` render inside a
 * `<div data-slot="tooltip-label">`. The arrow is a permanent element sibling,
 * so without the wrapper a bare text body is never a lone child: a browser
 * translation engine reparents that text node, and the removal React runs when
 * the body changes shape or goes away throws. The wrapper is a `<div>` because a
 * tooltip body is often a `<p>`, which a `<span>` may not contain. It is
 * `display: contents`, so it adds no box and every child of the body stays a
 * layout child of the surface.
 *
 * **Data attributes:**
 *
 * | Data Attribute   | Value                                              | Description                                       |
 * | ---------------- | -------------------------------------------------- | ------------------------------------------------- |
 * | `data-slot`      | `"tooltip-content"`                                | On the tooltip surface, with any composing part's chain ahead of it. |
 * | `data-slot`      | `"tooltip-label"`                                  | On the `<div>` wrapping `children`.               |
 * | `data-state`     | `"delayed-open"` \| `"instant-open"` \| `"closed"` | `"instant-open"` when the tooltip skipped its delay; `"closed"` while the exit plays. |
 * | `data-side`      | `"top"` \| `"right"` \| `"bottom"` \| `"left"`     | Which side of the trigger the surface resolved to. |
 *
 * @see https://mantle.ngrok.com/components/overlays/tooltip#tooltipcontent
 *
 * @example
 * ```tsx
 * <Tooltip.Root>
 *   <Tooltip.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Hover me
 *     </Button>
 *   </Tooltip.Trigger>
 *   <Tooltip.Content>
 *     This is a tooltip
 *   </Tooltip.Content>
 * </Tooltip.Root>
 * ```
 */
function Content({
	align = "center",
	children,
	className,
	"data-slot": dataSlot,
	onEscapeKeyDown,
	onPointerEnter,
	onPointerLeave,
	ref,
	side = "top",
	sideOffset = 4,
	...props
}: TooltipContentProps) {
	const state = useTooltipState("Content");
	const { portalTarget, floatingRef } = useFloat({
		open: state.state !== "closed",
		onDismiss: state.close,
		getAnchor: () => state.triggerRef.current,
		getInsideElements: () => [state.triggerRef.current],
		// Why: a browser without `popover="hint"` treats the tooltip as `manual`,
		// which an outside press does not close.
		dismissOnOutside: true,
		dismissWhenCovered: true,
		side,
		align,
		sideOffset,
		onEscapeKeyDown,
	});
	const composedRef = useComposedRefs(ref, floatingRef);

	return (
		portalTarget != null &&
		createPortal(
			<LayerContainer
				modal={false}
				id={state.contentId}
				popover="hint"
				role="tooltip"
				data-slot={joinDataSlot(dataSlot, "tooltip-content")}
				data-state={state.state}
				inert={state.state === "closed"}
				className={cx(
					floatClassName,
					"bg-tooltip text-tooltip max-w-72 wrap-break-word rounded-md px-3 py-1.5 text-sm font-sans shadow",
					className,
				)}
				ref={composedRef}
				{...props}
				onPointerEnter={(event) => {
					onPointerEnter?.(event);
					if (!event.defaultPrevented) {
						state.onContentEnter();
					}
				}}
				onPointerLeave={(event) => {
					onPointerLeave?.(event);
					if (!event.defaultPrevented) {
						state.onTriggerLeave();
					}
				}}
			>
				{/* Why the label div: decisions/2026-08-04-translation-safe-label-wrappers.md
				    Why a div and not a span: a documented tooltip body is a `<p>`, which a
				    `<span>` may not contain. */}
				<div data-slot="tooltip-label" className="contents">
					{children}
				</div>
				<span data-float-arrow="" aria-hidden="true" className="block h-1.25 w-2.5">
					<span className="bg-tooltip block size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-xs" />
				</span>
			</LayerContainer>,
			portalTarget,
		)
	);
}

export {
	//,
	Root,
	Content,
	Trigger,
	TooltipProvider,
};
