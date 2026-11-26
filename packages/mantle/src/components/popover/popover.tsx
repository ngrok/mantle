"use client";

import type { ComponentProps, MouseEvent, ReactNode, RefObject } from "react";
import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import invariant from "tiny-invariant";
import type { WithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { findTabbableDescendants } from "../alert/tabbable-neighbors.js";
import { FloatArrow, focusFirst } from "../../utils/float/parts.js";
import type { Align, Side } from "../../utils/float/position.js";
import {
	floatClassName,
	hasPopoverApi,
	useFloat,
	useReconcileOnTriggerChange,
	useTriggerRef,
} from "../../utils/float/use-float.js";
import type { OutsideHandlers } from "../../utils/float/use-float.js";
import { LayerContainer } from "../../utils/layer-container/layer-container.js";
import { Slot } from "../slot/index.js";
import type { PopoverDrawer } from "./drawer.js";

/** How a popover can present: next to its anchor, or chosen at each open. */
type PopoverPresentation = "popover" | "auto";

/** How one open of a popover presents. */
type Presented = "popover" | "drawer";

/**
 * The devices where `presentation="auto"` presents a drawer: a viewport below
 * Tailwind's `sm` breakpoint (40rem), the breakpoint of `Sheet`, with a
 * coarse (touch) pointer. A narrow desktop window keeps the popover.
 */
const DRAWER_QUERY = "(max-width: 39.99rem) and (pointer: coarse)";

/** Whether this device matches {@link DRAWER_QUERY}. `false` where there is no `matchMedia`, such as jsdom. */
function matchesDrawerQuery(): boolean {
	return typeof matchMedia === "function" && matchMedia(DRAWER_QUERY).matches;
}

/** The drawer module, once it loads. */
let drawerModule: { PopoverDrawer: typeof PopoverDrawer } | null = null;
/** The pending load of the drawer module. */
let drawerLoad: Promise<void> | null = null;

/**
 * Loads the drawer module once. A failed load clears itself, so a later
 * popover tries again.
 */
function loadDrawer(): void {
	drawerLoad ??= import("./drawer.js").then(
		(module) => {
			drawerModule = module;
			return undefined;
		},
		() => {
			drawerLoad = null;
		},
	);
}

/**
 * How an open presents. Why the loaded check: a tap must never wait on the
 * network, so an open before the drawer module loads presents as a popover.
 */
function presentAs(presentation: PopoverPresentation): Presented {
	return presentation === "auto" && drawerModule != null && matchesDrawerQuery()
		? "drawer"
		: "popover";
}

type PopoverState = {
	open: boolean;
	/** How the current (or last) open presents. It changes only when the popover opens. */
	presented: Presented;
	setOpen: (open: boolean) => void;
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
	// Why a decision at each open, in render: a controlled `open` opens with no
	// event here, and the decision must hold until the close. Why no server
	// branch: an open state that the first render has is no change, so it
	// presents as a popover, and the server renders no content.
	const [presented, setPresented] = useState<Presented>("popover");
	const [openSeen, setOpenSeen] = useState(open);
	if (open !== openSeen) {
		setOpenSeen(open);
		if (open) {
			setPresented(presentAs(presentation));
		}
	}
	// Why at idle and only on a matching device: a desktop page never fetches
	// the drawer, and a phone has it before the first tap.
	useEffect(() => {
		if (presentation !== "auto" || drawerModule != null || !matchesDrawerQuery()) {
			return undefined;
		}
		if (typeof requestIdleCallback === "function") {
			const handle = requestIdleCallback(loadDrawer);
			return () => cancelIdleCallback(handle);
		}
		// Why the fallback: Safari has no `requestIdleCallback`.
		const handle = setTimeout(loadDrawer, 0);
		return () => clearTimeout(handle);
	}, [presentation]);
	const { triggerRef, setTrigger, onTriggerChangeRef } = useTriggerRef();
	const {
		triggerRef: anchorRef,
		setTrigger: setAnchor,
		onTriggerChangeRef: onAnchorChangeRef,
	} = useTriggerRef();
	const contentId = useId();
	const triggerId = useId();
	const state = useMemo<PopoverState>(
		() => ({
			open,
			presented,
			setOpen: (next) => {
				if (next === open) {
					return;
				}
				if (openProp === undefined) {
					setUncontrolledOpen(next);
				}
				onOpenChange?.(next);
			},
			contentId,
			triggerId,
			triggerRef,
			setTrigger,
			onTriggerChangeRef,
			anchorRef,
			setAnchor,
			onAnchorChangeRef,
		}),
		[
			anchorRef,
			contentId,
			onAnchorChangeRef,
			onOpenChange,
			onTriggerChangeRef,
			open,
			openProp,
			presented,
			setAnchor,
			setTrigger,
			triggerId,
			triggerRef,
		],
	);
	return <PopoverContext.Provider value={state}>{children}</PopoverContext.Provider>;
}

/**
 * The button that opens and closes the popover.
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
	ref,
	...props
}: ComponentProps<"button"> & WithAsChild & WithDataSlot) => {
	const state = usePopoverState("Trigger");
	const composedRef = useComposedRefs(ref, state.setTrigger);
	const Component = asChild ? Slot : "button";
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
			onClick={(event: MouseEvent<HTMLButtonElement>) => {
				onClick?.(event);
				if (event.defaultPrevented) {
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

/**
 * The content of the popover. It mounts while the popover is open, as a
 * `popover="manual"` element in the top layer, next to `Popover.Anchor` or
 * `Popover.Trigger`.
 *
 * It closes on Escape, on a press or a focus move outside it and its trigger,
 * and from `Popover.Close`. It moves focus to its first focusable element when it
 * opens, and back to the trigger when it closes. It portals into the overlay or
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
const Content = ({
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
	onPointerDownOutside,
	preferredWidth = "max-w-72",
	ref,
	side = "bottom",
	sideOffset = 4,
	...props
}: PopoverContentProps) => {
	const state = usePopoverState("Content");
	// Why the module check: `presented` is `"drawer"` only once the module loaded.
	const drawer = state.presented === "drawer" ? drawerModule : null;
	const closedFromOutside = useRef(false);
	const { portalTarget, floatingRef, reconcile } = useFloat({
		open: state.open && drawer == null,
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
		onFocusOutside,
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
			const event = new Event("mantle.popover.openAutoFocus", { cancelable: true });
			onOpenAutoFocus?.(event);
			if (!event.defaultPrevented) {
				focusFirst(floating);
			}
		},
		onHide: (floating, focusWasInside) => {
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

	if (drawer != null) {
		// Why the trigger names the drawer: as in the popover, the trigger says what opens.
		const name =
			props["aria-label"] != null || props["aria-labelledby"] != null
				? {}
				: { "aria-labelledby": state.triggerId };
		return (
			<drawer.PopoverDrawer
				open={state.open}
				onOpenChange={state.setOpen}
				id={state.contentId}
				data-slot={joinDataSlot(dataSlot, "popover-content")}
				data-presentation="drawer"
				className={className}
				ref={ref}
				onCloseAutoFocus={onCloseAutoFocus}
				onEscapeKeyDown={onEscapeKeyDown}
				onInteractOutside={onInteractOutside}
				onPointerDownOutside={onPointerDownOutside}
				// Why the dialog keeps focus: the drawer opens from a tap, and focus
				// on its first field would open the on-screen keyboard over it.
				onOpenAutoFocus={(event) => {
					onOpenAutoFocus?.(event);
					event.preventDefault();
				}}
				{...props}
				{...name}
				onClick={(event) => {
					// Why: a click in the content must not reach a clickable parent of the trigger.
					event.stopPropagation();
					onClick?.(event);
				}}
			/>
		);
	}

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

export {
	//,
	Root,
	Anchor,
	Arrow,
	Close,
	Content,
	Trigger,
};
