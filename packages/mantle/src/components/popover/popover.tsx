"use client";

import type { ComponentProps, MouseEvent, PointerEvent, ReactNode, RefObject } from "react";
import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import invariant from "tiny-invariant";
import type { WithAsChild } from "../../types/as-child.js";
import { useCallbackRef } from "../../hooks/use-callback-ref.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { findTabbableDescendants } from "../alert/tabbable-neighbors.js";
import { FloatArrow, focusFirst } from "../../utils/float/parts.js";
import type { Align, Side } from "../../utils/float/position.js";
import { boxAround, isInBox, isInsideBoth } from "../../utils/float/position.js";
import {
	floatClassName,
	hasPopoverApi,
	useFloat,
	useOpenedOnce,
	useReconcileOnTriggerChange,
	useTriggerRef,
} from "../../utils/float/use-float.js";
import type { OutsideHandlers } from "../../utils/float/use-float.js";
import {
	isCoveredByOverlay,
	LayerContainer,
	LayerContainerContext,
} from "../../utils/layer-container/layer-container.js";
import { Slot } from "../slot/index.js";
import type { PopoverDrawer } from "./drawer.js";

/** How long a pointer rests on an `openOnHover` trigger before the popover opens, in milliseconds. */
const hoverOpenDelay = 300;

/** How a popover can present: next to its anchor, or chosen at each open. */
type PopoverPresentation = "popover" | "auto";

/**
 * The drawer presentation, once its module loads. Why a module variable: one
 * load serves every popover on the page.
 */
let Drawer: typeof PopoverDrawer | null = null;

/**
 * Whether this device presents `presentation="auto"` as a drawer: a viewport
 * below `sm` (40rem), the breakpoint of `Sheet`, with a coarse (touch)
 * pointer. A narrow desktop window keeps the popover. `false` with no
 * `matchMedia`, such as in jsdom.
 */
const wantsDrawer = (presentation: PopoverPresentation): boolean =>
	presentation === "auto" &&
	typeof matchMedia === "function" &&
	matchMedia("(max-width: 39.99rem) and (pointer: coarse)").matches;

/**
 * Loads the drawer presentation. A failed load leaves `Drawer` unset, so a
 * later popover tries again. Why outside the component: the React Compiler
 * does not compile an `import()` in a component.
 */
function loadDrawer(): void {
	import("./drawer.js").then(
		(module) => {
			Drawer = module.PopoverDrawer;
			return undefined;
		},
		() => undefined,
	);
}

/** A pointer position, from a pointer event. */
type PointerPoint = Pick<globalThis.PointerEvent, "clientX" | "clientY">;

/** A popover that a hover holds open, and whether its content holds an element. */
type HoverOpenEntry = { close: () => void; holds: (element: Element) => boolean };

/** The popover that a hover holds open now. A hover open of another popover closes it. */
let hoverOpenPopover: HoverOpenEntry | undefined;

/** The shown popover content: its element, and how it moves focus into itself. */
type ShownContent = { element: HTMLElement; focus: () => void };

type PopoverState = {
	open: boolean;
	/**
	 * The drawer that the current (or last) open presents in, or `null` for a
	 * popover. It changes only when the popover opens.
	 */
	drawer: typeof PopoverDrawer | null;
	/** Opens or closes the popover. `byHover` marks an open or a close that a hover asked for. */
	setOpen: (open: boolean, options?: { byHover?: boolean }) => void;
	contentId: string;
	/** The trigger's default `id`. It names the content when the content has no name of its own. */
	triggerId: string;
	triggerRef: RefObject<HTMLElement | null>;
	/** The trigger's ref callback. It tells the open content about a new trigger element. */
	setTrigger: (element: HTMLElement | null) => void;
	onTriggerChangeRef: RefObject<(() => void) | null>;
	anchorRef: RefObject<HTMLElement | null>;
	/** The anchor's ref callback. It tells the open content about a new anchor element. */
	setAnchor: (element: HTMLElement | null) => void;
	onAnchorChangeRef: RefObject<(() => void) | null>;
	/** The pointer reached an `openOnHover` trigger: open after `hoverOpenDelay`. */
	onHoverEnter: () => void;
	/** The pointer left an `openOnHover` trigger at `point`. */
	onTriggerLeave: (point: PointerPoint) => void;
	/** The pointer left the content at `point`: close a hover open once it leaves the box that holds both. */
	onHoverLeave: (point: PointerPoint) => void;
	/** The pointer reached the content: keep a hover open. */
	onHoverStay: () => void;
	/**
	 * Turns a hover open into a press open, which a pointer that leaves does
	 * not close. Returns `true` when the open was a hover open.
	 */
	pin: () => boolean;
	/** Whether the open came from a hover and nothing pinned it yet. */
	isHoverOpen: () => boolean;
	/** The shown content gives its element and the way it moves focus into itself. */
	showContent: (shown: ShownContent) => void;
	/** The content with this element hides. */
	hideContent: (element: HTMLElement) => void;
	/** The trigger unmounts or stops opening on hover: drop a pending hover open, and close a hover open. */
	cancelHover: () => void;
	/** Moves focus into the shown content, as a press open does. */
	focusContent: () => void;
};

const PopoverContext = createContext<PopoverState | null>(null);

function usePopoverState(part: string): PopoverState {
	const state = useContext(PopoverContext);
	invariant(state != null, `\`Popover.${part}\` must be rendered inside \`Popover.Root\`.`);
	return state;
}

type PopoverRootProps = {
	children?: ReactNode;
	/** The open state, for a controlled popover. Pair it with `onOpenChange`. */
	open?: boolean;
	/**
	 * The open state on the first render, for an uncontrolled popover.
	 * @default false
	 */
	defaultOpen?: boolean;
	/** Runs when the popover opens or closes. */
	onOpenChange?: (open: boolean) => void;
	/**
	 * How the popover presents. `"popover"` shows the content next to its
	 * anchor. `"auto"` decides each time the popover opens: on a phone (a
	 * viewport below `sm` with a touch pointer) the content is a modal drawer
	 * that slides up from the bottom edge, and elsewhere it is a popover. The
	 * decision holds until the popover closes. Use `"auto"` for a small task,
	 * such as a short form, not for a list to pick from.
	 * @default "popover"
	 */
	presentation?: PopoverPresentation;
};

/**
 * A floating panel with rich content, which a button opens next to itself.
 * This is the root, stateful part that owns the open state. It renders no element.
 *
 * `Popover.Content` is a native `popover` in the browser's top layer, so it
 * paints above the page and every overlay, and no `overflow` or `z-index`
 * clips it. It does not open while an overlay that does not hold it is open,
 * because the top layer would paint it over that overlay.
 *
 * @see https://mantle.ngrok.com/components/overlays/popover#popoverroot
 *
 * @example
 * ```tsx
 * <Popover.Root>
 *   <Popover.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Open Popover
 *     </Button>
 *   </Popover.Trigger>
 *   <Popover.Content>
 *     <p>This is the popover content.</p>
 *   </Popover.Content>
 * </Popover.Root>
 * ```
 */
function Root({
	children,
	defaultOpen = false,
	onOpenChange,
	open: openProp,
	presentation = "popover",
}: PopoverRootProps) {
	const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
	const open = openProp ?? uncontrolledOpen;
	const layerContainer = useContext(LayerContainerContext);
	// Why not under an overlay: the drawer would open as a second modal over
	// it and take focus. The popover stays hidden until the overlay closes.
	const presentsDrawer = (isOpen: boolean) =>
		isOpen && wantsDrawer(presentation) && !isCoveredByOverlay(layerContainer);
	// Why a decision at each open, in render: a controlled `open` opens with no
	// event here, and the decision must hold until the close and its exit.
	// Why `Drawer` must have loaded: a tap never waits on the network, so an
	// open before the load presents as a popover. Why the server agrees: it
	// renders no content, and `Drawer` loads after hydration.
	const [opened, setOpened] = useState(() => ({
		open,
		drawer: presentsDrawer(open) ? Drawer : null,
	}));
	if (opened.open !== open) {
		const wanted = presentsDrawer(open);
		// Why a load here, in render: a phone that rotates below `sm`, or a
		// failed load, loads the drawer for the next open. As with React's
		// `preload`, the call only starts a fetch, and a repeat changes nothing.
		if (wanted && Drawer == null) {
			loadDrawer();
		}
		// Why keep the drawer on close: the drawer plays its exit before it unmounts.
		const drawer = wanted ? Drawer : null;
		setOpened({ open, drawer: open ? drawer : opened.drawer });
	}
	// Why after mount, and only on a matching device: a desktop page never
	// fetches the drawer, and a phone has it before the first tap.
	useEffect(() => {
		if (Drawer == null && wantsDrawer(presentation)) {
			loadDrawer();
		}
	}, [presentation]);
	const { triggerRef, setTrigger, onTriggerChangeRef } = useTriggerRef();
	const {
		triggerRef: anchorRef,
		setTrigger: setAnchor,
		onTriggerChangeRef: onAnchorChangeRef,
	} = useTriggerRef();
	const contentId = useId();
	const triggerId = useId();
	const openChange = useCallbackRef((next: boolean) => onOpenChange?.(next));
	const hoverOpenRef = useRef(false);
	const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const stopGrace = useRef<(() => void) | undefined>(undefined);
	const shownContentRef = useRef<ShownContent | null>(null);
	const pointerOnTrigger = useRef(false);
	/** Whether a pointer that stays on the trigger may not hover-open it again. */
	const hoverSuppressed = useRef(false);
	const stopSuppress = useRef<(() => void) | undefined>(undefined);
	const hoverEntry = useRef<HoverOpenEntry | null>(null);
	// Why a ref: a hover can ask a slow controlled parent to open, and the close
	// that follows must still reach it before it renders the open.
	const requestedOpen = useRef(open);
	// Why an effect: it follows every way the popover opens and closes,
	// including a controlled parent that closes it.
	// Why the hover session ends on any close: a later open by a press or by
	// the parent must not close on a leave or on a neighbor's hover.
	// Why not when a newer open waits: a pointer that returned before a slow
	// parent committed the close asked to open again, by hover.
	useEffect(() => {
		const newerOpen = !open && requestedOpen.current;
		requestedOpen.current = open;
		if (!open && !newerOpen) {
			hoverOpenRef.current = false;
			stopGrace.current?.();
			if (hoverEntry.current != null && hoverOpenPopover === hoverEntry.current) {
				hoverOpenPopover = undefined;
			}
		}
	}, [open]);
	useEffect(
		() => () => {
			clearTimeout(hoverTimer.current);
			stopGrace.current?.();
			stopSuppress.current?.();
			if (hoverOpenPopover === hoverEntry.current) {
				hoverOpenPopover = undefined;
			}
		},
		[],
	);
	const state = useMemo<PopoverState>(() => {
		const stopHover = () => {
			clearTimeout(hoverTimer.current);
			stopGrace.current?.();
		};
		const releaseHoverOwner = () => {
			if (hoverEntry.current != null && hoverOpenPopover === hoverEntry.current) {
				hoverOpenPopover = undefined;
			}
		};
		const endHoverOpen = () => {
			hoverOpenRef.current = false;
			releaseHoverOwner();
		};
		// Why: a close the user asks for, such as Escape, must hold while the
		// pointer stays on the trigger. The content that covered the trigger sends
		// a leave as it hides, so the hold ends only once the pointer is off the
		// trigger's box.
		const suppressHover = () => {
			const trigger = triggerRef.current;
			if (trigger == null || stopSuppress.current != null) {
				return;
			}
			hoverSuppressed.current = true;
			const document = trigger.ownerDocument;
			const onMove = (event: globalThis.PointerEvent) => {
				if (!isInsideBoth(event, trigger, trigger)) {
					stopSuppress.current?.();
				}
			};
			document.addEventListener("pointermove", onMove);
			stopSuppress.current = () => {
				hoverSuppressed.current = false;
				document.removeEventListener("pointermove", onMove);
				stopSuppress.current = undefined;
			};
		};
		// Why the hover mark goes up before `onOpenChange`: a parent that commits
		// the open in that callback shows the content before this call returns.
		// Why a hover close keeps the mark: a slow parent can commit the earlier
		// open after it, and that open must not take focus. The commit of the
		// close clears it.
		const setOpen: PopoverState["setOpen"] = (next, { byHover = false } = {}) => {
			stopHover();
			if (!next && !byHover && (hoverOpenRef.current || pointerOnTrigger.current)) {
				suppressHover();
			}
			if (next && byHover) {
				hoverOpenRef.current = true;
			} else if (byHover) {
				releaseHoverOwner();
			} else {
				endHoverOpen();
			}
			if (next === open && next === requestedOpen.current) {
				return;
			}
			requestedOpen.current = next;
			if (openProp === undefined) {
				setUncontrolledOpen(next);
			}
			openChange(next);
		};
		const onHoverLeave = (point: PointerPoint) => {
			stopHover();
			if (!hoverOpenRef.current) {
				return;
			}
			const trigger = triggerRef.current;
			const content = shownContentRef.current?.element;
			// Why the leave point first: a pointer that jumps out in one move
			// sends no later `pointermove` inside the page to close on.
			// Why also while not yet open: a slow controlled parent must hear the close.
			if (!open || trigger == null || content == null) {
				setOpen(false, { byHover: true });
				return;
			}
			// Why a box and not a deadline: a slow pointer on its way from the
			// trigger to the content keeps the popover open (WCAG 1.4.13).
			// Why measure once: a pointer can move more than once a frame, and a
			// move then reads no layout. A scroll or a resize moves the box.
			let box = boxAround(trigger, content);
			if (!isInBox(point, box)) {
				setOpen(false, { byHover: true });
				return;
			}
			const document = trigger.ownerDocument;
			const view = document.defaultView ?? window;
			const measure = () => {
				box = boxAround(trigger, content);
			};
			const onMove = (event: globalThis.PointerEvent) => {
				if (!isInBox(event, box)) {
					setOpen(false, { byHover: true });
				}
			};
			document.addEventListener("pointermove", onMove);
			view.addEventListener("scroll", measure, { capture: true, passive: true });
			view.addEventListener("resize", measure);
			stopGrace.current = () => {
				document.removeEventListener("pointermove", onMove);
				view.removeEventListener("scroll", measure, { capture: true });
				view.removeEventListener("resize", measure);
				stopGrace.current = undefined;
			};
		};
		return {
			open,
			drawer: opened.drawer,
			setOpen,
			contentId,
			triggerId,
			triggerRef,
			setTrigger,
			onTriggerChangeRef,
			anchorRef,
			setAnchor,
			onAnchorChangeRef,
			onHoverEnter: () => {
				pointerOnTrigger.current = true;
				stopHover();
				// Why the requested state: a pointer that returns before a slow
				// parent commits a hover close asks to open again.
				// Why not for a drawer: a hover must not open a modal that takes focus.
				if (requestedOpen.current || hoverSuppressed.current || wantsDrawer(presentation)) {
					return;
				}
				hoverTimer.current = setTimeout(() => {
					const trigger = triggerRef.current;
					// Why again: a rotated phone can cross `sm`, the trigger can turn
					// disabled, and another open can come first during the delay.
					if (
						requestedOpen.current ||
						wantsDrawer(presentation) ||
						trigger == null ||
						trigger.matches(":disabled, [aria-disabled='true']")
					) {
						return;
					}
					// Why: a pointer can reach a neighbor trigger inside this one's
					// grace box. Why not a popover that holds this trigger: closing it
					// would remove the trigger.
					if (!hoverOpenPopover?.holds(trigger)) {
						hoverOpenPopover?.close();
					}
					// Why before `onOpenChange`: the callback can unmount this popover,
					// and its cleanup must find the entry.
					const entry: HoverOpenEntry = {
						close: () => setOpen(false, { byHover: true }),
						holds: (element) => shownContentRef.current?.element.contains(element) ?? false,
					};
					hoverOpenPopover = entry;
					hoverEntry.current = entry;
					setOpen(true, { byHover: true });
				}, hoverOpenDelay);
			},
			onTriggerLeave: (point) => {
				pointerOnTrigger.current = false;
				const trigger = triggerRef.current;
				if (trigger == null || !isInsideBoth(point, trigger, trigger)) {
					stopSuppress.current?.();
				}
				onHoverLeave(point);
			},
			cancelHover: () => {
				pointerOnTrigger.current = false;
				clearTimeout(hoverTimer.current);
				// Why: the trigger's leave never comes once it unmounts or opts out.
				if (open && hoverOpenRef.current) {
					setOpen(false, { byHover: true });
				}
			},
			onHoverLeave,
			onHoverStay: stopHover,
			pin: () => {
				stopHover();
				// Why `open` too: a controlled parent can refuse a hover open, and
				// the next press must then ask to open.
				const wasHoverOpen = open && hoverOpenRef.current;
				endHoverOpen();
				// Why: a hover close can wait on a slow parent, and the press keeps it open.
				if (wasHoverOpen && !requestedOpen.current) {
					setOpen(true);
				}
				return wasHoverOpen;
			},
			isHoverOpen: () => hoverOpenRef.current,
			showContent: (shown) => {
				shownContentRef.current = shown;
			},
			// Why only its own: a keyed replacement shows before the old one hides.
			hideContent: (element) => {
				if (shownContentRef.current?.element === element) {
					shownContentRef.current = null;
				}
			},
			focusContent: () => shownContentRef.current?.focus(),
		};
	}, [
		anchorRef,
		contentId,
		onAnchorChangeRef,
		onTriggerChangeRef,
		open,
		openChange,
		openProp,
		opened.drawer,
		setAnchor,
		setTrigger,
		presentation,
		triggerId,
		triggerRef,
	]);
	return <PopoverContext.Provider value={state}>{children}</PopoverContext.Provider>;
}

/** Props for `Popover.Trigger`. */
type PopoverTriggerProps = ComponentProps<"button"> &
	WithAsChild &
	WithDataSlot & {
		/**
		 * Also opens the popover when a mouse or pen rests on the trigger. A hover
		 * open does not move focus, and it closes when the pointer leaves the
		 * trigger and the content. A press on the trigger, or a press or focus in
		 * the content, keeps it open and makes it a normal open. A tap, `Enter`,
		 * and `Space` open it as they do without this prop. Use it for a trigger
		 * whose only job is to show the content, such as an info icon.
		 * @default false
		 */
		openOnHover?: boolean;
	};

/**
 * The button that opens and closes the popover. With `openOnHover`, a mouse
 * or pen that rests on it also opens the popover, without a focus move.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value               | Description                                                  |
 * | -------------- | ------------------- | ------------------------------------------------------------ |
 * | `data-slot`    | `"popover-trigger"` | On the trigger, with any composing part's chain ahead of it. |
 *
 * @see https://mantle.ngrok.com/components/overlays/popover#popovertrigger
 *
 * @example
 * ```tsx
 * <Popover.Root>
 *   <Popover.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Open Popover
 *     </Button>
 *   </Popover.Trigger>
 *   <Popover.Content>
 *     <p>This is the popover content.</p>
 *   </Popover.Content>
 * </Popover.Root>
 * ```
 */
const Trigger = ({
	asChild = false,
	children,
	"data-slot": dataSlot,
	onClick,
	onPointerEnter,
	onPointerLeave,
	openOnHover = false,
	ref,
	...props
}: PopoverTriggerProps) => {
	const state = usePopoverState("Trigger");
	const composedRef = useComposedRefs(ref, state.setTrigger);
	const Component = asChild ? Slot : "button";
	// Why the latest handler: an open or close must not run the cleanup.
	const cancelHover = useCallbackRef(state.cancelHover);
	// Why an effect: it follows a trigger that unmounts or stops opening on
	// hover while a hover open waits for its delay or holds the popover.
	useEffect(() => {
		if (openOnHover) {
			return cancelHover;
		}
		return undefined;
	}, [cancelHover, openOnHover]);
	return (
		<Component
			aria-controls={state.open ? state.contentId : undefined}
			aria-expanded={state.open}
			aria-haspopup="dialog"
			data-slot={joinDataSlot(dataSlot, "popover-trigger")}
			id={state.triggerId}
			ref={composedRef}
			// Why also under `asChild`: a slotted `<button>` with no type would submit its form.
			type="button"
			{...props}
			onPointerEnter={(event: PointerEvent<HTMLButtonElement>) => {
				onPointerEnter?.(event);
				// Why the disabled check: a disabled button still gets pointer events,
				// and a keyboard user cannot reach what it would open.
				if (
					openOnHover &&
					!event.defaultPrevented &&
					event.pointerType !== "touch" &&
					!event.currentTarget.matches(":disabled, [aria-disabled='true']")
				) {
					state.onHoverEnter();
				}
			}}
			onPointerLeave={(event: PointerEvent<HTMLButtonElement>) => {
				onPointerLeave?.(event);
				if (openOnHover && !event.defaultPrevented && event.pointerType !== "touch") {
					state.onTriggerLeave(event);
				}
			}}
			onClick={(event: MouseEvent<HTMLButtonElement>) => {
				onClick?.(event);
				if (event.defaultPrevented) {
					return;
				}
				// Why a press on a hover open keeps it open: the user asked for the
				// content, and a toggle would close what they just reached for.
				if (state.pin()) {
					state.focusContent();
					return;
				}
				state.setOpen(!state.open);
			}}
		>
			{children}
		</Component>
	);
};

/**
 * An optional element to position `Popover.Content` against. Without it, the
 * content sits next to `Popover.Trigger`.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value              | Description                                                 |
 * | -------------- | ------------------ | ----------------------------------------------------------- |
 * | `data-slot`    | `"popover-anchor"` | On the anchor, with any composing part's chain ahead of it. |
 *
 * @see https://mantle.ngrok.com/components/overlays/popover#popoveranchor
 *
 * @example
 * ```tsx
 * <Popover.Root>
 *   <Popover.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Open Popover
 *     </Button>
 *   </Popover.Trigger>
 *   <Popover.Anchor asChild>
 *     <div>Anchor element</div>
 *   </Popover.Anchor>
 *   <Popover.Content>
 *     <p>This is the popover content.</p>
 *   </Popover.Content>
 * </Popover.Root>
 * ```
 */
const Anchor = ({
	asChild = false,
	"data-slot": dataSlot,
	ref,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const state = usePopoverState("Anchor");
	const composedRef = useComposedRefs(ref, state.setAnchor);
	const Component = asChild ? Slot : "div";
	return (
		<Component data-slot={joinDataSlot(dataSlot, "popover-anchor")} ref={composedRef} {...props} />
	);
};

/**
 * A button that closes an open popover.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value             | Description                                                 |
 * | -------------- | ----------------- | ----------------------------------------------------------- |
 * | `data-slot`    | `"popover-close"` | On the button, with any composing part's chain ahead of it. |
 *
 * @see https://mantle.ngrok.com/components/overlays/popover#popoverclose
 *
 * @example
 * ```tsx
 * <Popover.Root>
 *   <Popover.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Open Popover
 *     </Button>
 *   </Popover.Trigger>
 *   <Popover.Content>
 *     <p>This is the popover content.</p>
 *     <Popover.Close asChild>
 *       <Button type="button" appearance="outlined" intent="neutral">Close</Button>
 *     </Popover.Close>
 *   </Popover.Content>
 * </Popover.Root>
 * ```
 */
const Close = ({
	asChild = false,
	"data-slot": dataSlot,
	onClick,
	...props
}: ComponentProps<"button"> & WithAsChild & WithDataSlot) => {
	const state = usePopoverState("Close");
	const Component = asChild ? Slot : "button";
	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "popover-close")}
			// Why also under `asChild`: a slotted `<button>` with no type would submit its form.
			type="button"
			{...props}
			onClick={(event: MouseEvent<HTMLButtonElement>) => {
				onClick?.(event);
				if (event.defaultPrevented) {
					return;
				}
				state.setOpen(false);
			}}
		/>
	);
};

type PopoverContentProps = ComponentProps<"div"> &
	OutsideHandlers &
	WithDataSlot & {
		/**
		 * The side of the anchor the content prefers. It flips to the opposite
		 * side when only that side has room.
		 * @default "bottom"
		 */
		side?: Side;
		/**
		 * How the content lines up with the anchor along `side`.
		 * @default "center"
		 */
		align?: Align;
		/**
		 * The gap between the anchor and the content, in pixels.
		 * @default 4
		 */
		sideOffset?: number;
		/**
		 * The preferred width of the content, as a Tailwind `max-w-` class.
		 * @default "max-w-72"
		 */
		preferredWidth?: `max-w-${string}`;
		/**
		 * Runs after the content opens, before focus moves to its first
		 * focusable element. Call `event.preventDefault()` to keep focus where it is.
		 */
		onOpenAutoFocus?: (event: Event) => void;
		/**
		 * Runs as the content closes, before focus returns to the trigger. Call
		 * `event.preventDefault()` to move focus yourself.
		 */
		onCloseAutoFocus?: (event: Event) => void;
		/** Runs on Escape while the popover is the top float. Call `event.preventDefault()` to keep it open. */
		onEscapeKeyDown?: (event: KeyboardEvent) => void;
	};

/** The popover presentation of `Popover.Content`: a float next to its anchor. */
const FloatContent = ({
	align = "center",
	className,
	"data-slot": dataSlot,
	onClick,
	onCloseAutoFocus,
	onEscapeKeyDown,
	onFocusOutside,
	onInteractOutside,
	onKeyDown,
	onOpenAutoFocus,
	onFocus,
	onPointerDown,
	onPointerDownOutside,
	onPointerEnter,
	onPointerLeave,
	preferredWidth = "max-w-72",
	ref,
	side = "bottom",
	sideOffset = 4,
	...props
}: PopoverContentProps) => {
	const state = usePopoverState("Content");
	const closedFromOutside = useRef(false);
	// Why the latest handler: a press can move focus in long after a hover open rendered.
	const openAutoFocus = useCallbackRef((event: Event) => onOpenAutoFocus?.(event));
	const { portalTarget, floatingRef, reconcile } = useFloat({
		open: state.open,
		onDismiss: (reason) => {
			closedFromOutside.current = reason === "outside";
			state.setOpen(false);
		},
		getAnchor: () => state.anchorRef.current ?? state.triggerRef.current,
		getInsideElements: () => [state.triggerRef.current, state.anchorRef.current],
		dismissOnOutside: true,
		dismissWhenCovered: false,
		side,
		align,
		sideOffset,
		onEscapeKeyDown,
		onFocusOutside: (event) => {
			onFocusOutside?.(event);
			// Why: focus was never inside a hover open, so a focus move elsewhere
			// does not dismiss it while the pointer holds it (WCAG 1.4.13).
			if (state.isHoverOpen()) {
				event.preventDefault();
			}
		},
		onInteractOutside,
		onPointerDownOutside,
		onShow: (floating) => {
			closedFromOutside.current = false;
			// Why the trigger: a dialog needs a name, and the trigger says what opens.
			// Why its rendered `id`: a consumer `id` on the trigger replaces the default.
			const triggerId = state.triggerRef.current?.id;
			if (
				triggerId &&
				!floating.hasAttribute("aria-label") &&
				!floating.hasAttribute("aria-labelledby")
			) {
				floating.setAttribute("aria-labelledby", triggerId);
			}
			const focusContent = () => {
				const event = new Event("mantle.popover.openAutoFocus", { cancelable: true });
				openAutoFocus(event);
				if (!event.defaultPrevented) {
					focusFirst(floating);
				}
			};
			state.showContent({ element: floating, focus: focusContent });
			// Why: a hover must not move focus. A press that pins the open moves it.
			if (!state.isHoverOpen()) {
				focusContent();
			}
		},
		onHide: (floating, focusWasInside) => {
			state.hideContent(floating);
			const event = new Event("mantle.popover.closeAutoFocus", { cancelable: true });
			onCloseAutoFocus?.(event);
			const activeElement = floating.ownerDocument.activeElement;
			if (event.defaultPrevented) {
				// Why the blur: the browser returns focus to where it was before the
				// popover opened when focus is inside it as it hides.
				if (activeElement instanceof HTMLElement && floating.contains(activeElement)) {
					activeElement.blur();
				}
				return;
			}
			if (focusWasInside && !closedFromOutside.current) {
				state.triggerRef.current?.focus();
			}
		},
	});
	useReconcileOnTriggerChange(state.onTriggerChangeRef, reconcile);
	useReconcileOnTriggerChange(state.onAnchorChangeRef, reconcile);
	const composedRef = useComposedRefs(ref, floatingRef);

	return (
		portalTarget != null &&
		createPortal(
			<LayerContainer
				modal={false}
				id={state.contentId}
				popover={hasPopoverApi ? "manual" : undefined}
				role="dialog"
				tabIndex={-1}
				data-slot={joinDataSlot(dataSlot, "popover-content")}
				data-presentation="popover"
				data-open={state.open ? "" : undefined}
				inert={!state.open}
				className={cx(
					floatClassName,
					"border-popover bg-popover rounded-md border p-4 shadow-md outline-hidden",
					preferredWidth,
					className,
				)}
				ref={composedRef}
				{...props}
				onClick={(event) => {
					// Why: a click in the content must not reach a clickable parent of the trigger.
					event.stopPropagation();
					onClick?.(event);
				}}
				onPointerEnter={(event) => {
					onPointerEnter?.(event);
					if (!event.defaultPrevented) {
						state.onHoverStay();
					}
				}}
				onPointerLeave={(event) => {
					onPointerLeave?.(event);
					if (!event.defaultPrevented && event.pointerType !== "touch") {
						state.onHoverLeave(event);
					}
				}}
				// Why a press or a focus pins a hover open: a pointer that then leaves
				// must not close a field the user is typing in.
				onPointerDown={(event) => {
					onPointerDown?.(event);
					if (!event.defaultPrevented) {
						state.pin();
					}
				}}
				onFocus={(event) => {
					onFocus?.(event);
					if (!event.defaultPrevented) {
						state.pin();
					}
				}}
				onKeyDown={(event) => {
					onKeyDown?.(event);
					const content = event.currentTarget;
					// Why the `:modal` check: a Dialog opened from the content portals
					// into it, and that dialog keeps its own Tab order.
					if (
						event.key !== "Tab" ||
						event.defaultPrevented ||
						!(event.target instanceof Element) ||
						!content.contains(event.target) ||
						event.target.closest("dialog:modal") !== content.closest("dialog:modal")
					) {
						return;
					}
					// Why wrap: the content portals to the end of the body, so Tab on its
					// last stop leaves the page. Tab wraps only from the first or last
					// stop, and the browser moves focus otherwise.
					const tabStops = findTabbableDescendants(content);
					const first = tabStops[0];
					const last = tabStops[tabStops.length - 1];
					const focused = content.ownerDocument.activeElement;
					if (first == null ? focused === content : focused === (event.shiftKey ? first : last)) {
						event.preventDefault();
						(event.shiftKey ? last : first)?.focus();
					}
				}}
			/>,
			portalTarget,
		)
	);
};

/**
 * The content of the popover. It mounts while the popover is open, as a
 * `popover="manual"` element in the top layer, next to `Popover.Anchor` or
 * `Popover.Trigger`.
 *
 * It closes on Escape, on a press or a focus move outside it and its trigger,
 * and from `Popover.Close`. It moves focus to its first focusable element when it
 * opens, and back to the trigger when it closes. A hover open
 * (`Popover.Trigger` `openOnHover`) moves no focus: a press on the trigger
 * moves it, and `onOpenAutoFocus` runs then. It portals into the overlay or
 * float that holds it, else into `document.body`, and a float composed inside
 * it portals into it.
 *
 * It is a `role="dialog"` named by its trigger. An `aria-label` or
 * `aria-labelledby` gives it a name of its own.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value                                          | Description                                        |
 * | -------------- | ---------------------------------------------- | -------------------------------------------------- |
 * | `data-slot`    | `"popover-content"`                            | On the content, with any composing part's chain ahead of it. |
 * | `data-open`    | present while open | Presence-only. Absent while the exit transition plays. |
 * | `data-side`    | `"top"` \| `"right"` \| `"bottom"` \| `"left"` | The side of the anchor the content resolved to. Popover presentation only. |
 * | `data-presentation` | `"popover"` \| `"drawer"` | How this open presents (`Popover.Root` `presentation`). Style the two shapes with `data-[presentation=drawer]:`. |
 * | `data-closing` | present while the exit plays | Presence-only. Drawer presentation only. Drives the slide out. |
 * | `data-mantle-modal-content` | `""` | Drawer presentation only. Floats and an enclosing dialog find the panel by it. |
 * | `data-slot` (positioner) | `"drawer-positioner"` | Drawer presentation only. On the `<dialog>` of the `Drawer` around the content, which carries `role="dialog"`, the name, `data-open`, `data-closing`, and `data-overlay`. |
 * | `data-mantle-scroll-lock` | present while a drawer is open | Presence-only. On `<html>`. The page stops scrolling. |
 * | `data-overlay` | `""` | Drawer presentation only. On the `<dialog>` positioner. A press on the backdrop targets it. |
 *
 * In drawer presentation (`presentation="auto"` on a phone), the content is
 * the panel of a `Drawer`: a modal `<dialog>` that slides up from the bottom
 * edge and closes on a swipe down, Escape, the back gesture, or a press on
 * the scrim. The dialog takes focus so the on-screen keyboard stays closed,
 * and `data-slot` reads `"popover-content drawer-content"`.
 * `side`, `align`, `sideOffset`, `preferredWidth`, `onFocusOutside`, and
 * `Popover.Arrow` apply only to the popover presentation. A `Sandbar` slides
 * away while the drawer is open.
 *
 * The content sets the CSS variables `--anchor-width` (the anchor's width)
 * and `--available-height` (the room between the anchor and the viewport edge).
 *
 * @see https://mantle.ngrok.com/components/overlays/popover#popovercontent
 *
 * @example
 * ```tsx
 * <Popover.Root>
 *   <Popover.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Open Popover
 *     </Button>
 *   </Popover.Trigger>
 *   <Popover.Content>
 *     <p>This is the popover content.</p>
 *   </Popover.Content>
 * </Popover.Root>
 * ```
 */
const Content = (props: PopoverContentProps) => {
	const state = usePopoverState("Content");
	const opened = useOpenedOnce(state.open);
	const Drawer = state.drawer;
	if (Drawer != null) {
		return <Drawer state={state} {...props} />;
	}
	return opened ? <FloatContent {...props} /> : null;
};

type PopoverArrowProps = Omit<ComponentProps<"svg">, "children" | "width" | "height"> &
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
 * An optional tip that points from `Popover.Content` at its anchor. Render it
 * as a direct child of `Popover.Content`. It moves to the edge of the content
 * that faces the anchor and centers on the anchor, also after the content
 * flips or shifts. It repaints the content's fill and border across its base,
 * so the two edges read as one line, and casts its own shadow, clipped at
 * that base.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-float-arrow` | `""` | On the `<span>` around the arrow's `<svg>`. The float moves it to the edge that faces the anchor. |
 * | `data-slot` | `"popover-arrow"` | On the `<svg>`, with any composing part's chain ahead of it. |
 *
 * @see https://mantle.ngrok.com/components/overlays/popover#popoverarrow
 *
 * @example
 * ```tsx
 * <Popover.Root>
 *   <Popover.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Open Popover
 *     </Button>
 *   </Popover.Trigger>
 *   <Popover.Content side="right">
 *     <Popover.Arrow />
 *     <p>This is the popover content.</p>
 *   </Popover.Content>
 * </Popover.Root>
 * ```
 */
const Arrow = ({ "data-slot": dataSlot, ...props }: PopoverArrowProps) => (
	<FloatArrow data-slot={joinDataSlot(dataSlot, "popover-arrow")} {...props} />
);

export type {
	//,
	PopoverContentProps,
	PopoverState,
};

export {
	//,
	Root,
	Anchor,
	Arrow,
	Close,
	Content,
	Trigger,
};
