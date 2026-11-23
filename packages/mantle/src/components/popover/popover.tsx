"use client";

import type { ComponentProps, MouseEvent, ReactNode, RefObject } from "react";
import { createContext, useContext, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import invariant from "tiny-invariant";
import type { WithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { findWrappedTabStop } from "../../hooks/use-focus-trap.js";
import { findTabbableDescendants } from "../alert/tabbable-neighbors.js";
import { FloatArrow, focusFirst } from "../../utils/float/parts.js";
import type { Align, Side } from "../../utils/float/position.js";
import {
	floatClassName,
	useFloat,
	useReconcileOnTriggerChange,
	useTriggerRef,
} from "../../utils/float/use-float.js";
import type { OutsideHandlers } from "../../utils/float/use-float.js";
import { LayerContainer } from "../../utils/layer-container/layer-container.js";
import { Slot } from "../slot/index.js";

type PopoverState = {
	open: boolean;
	setOpen: (open: boolean) => void;
	contentId: string;
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
function Root({ children, defaultOpen = false, onOpenChange, open: openProp }: PopoverRootProps) {
	const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
	const open = openProp ?? uncontrolledOpen;
	const { triggerRef, setTrigger, onTriggerChangeRef } = useTriggerRef();
	const {
		triggerRef: anchorRef,
		setTrigger: setAnchor,
		onTriggerChangeRef: onAnchorChangeRef,
	} = useTriggerRef();
	const contentId = useId();
	const state = useMemo<PopoverState>(
		() => ({
			open,
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
			setAnchor,
			setTrigger,
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
			data-state={state.open ? "open" : "closed"}
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
 * **Data attributes:**
 *
 * | Data Attribute | Value                                          | Description                                        |
 * | -------------- | ---------------------------------------------- | -------------------------------------------------- |
 * | `data-slot`    | `"popover-content"`                            | On the content, with any composing part's chain ahead of it. |
 * | `data-state`   | `"open"` \| `"closed"`                         | `"closed"` while the exit transition plays.        |
 * | `data-side`    | `"top"` \| `"right"` \| `"bottom"` \| `"left"` | The side of the anchor the content resolved to.    |
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
	const closedFromOutside = useRef(false);
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
		onFocusOutside,
		onInteractOutside,
		onPointerDownOutside,
		onShow: (floating) => {
			closedFromOutside.current = false;
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

	return (
		portalTarget != null &&
		createPortal(
			<LayerContainer
				modal={false}
				id={state.contentId}
				popover="manual"
				role="dialog"
				tabIndex={-1}
				data-slot={joinDataSlot(dataSlot, "popover-content")}
				data-state={state.open ? "open" : "closed"}
				inert={!state.open}
				className={cx(
					floatClassName,
					"text-popover-foreground border-popover bg-popover rounded-md border p-4 shadow-md outline-hidden",
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
					if (
						event.key !== "Tab" ||
						event.defaultPrevented ||
						!(event.target instanceof Node) ||
						!event.currentTarget.contains(event.target)
					) {
						return;
					}
					// Why wrap: the content portals to the end of the body, so the
					// browser's next tab stop after it is outside the page. Tab cycles
					// inside the open content, and Escape or a press outside leaves it.
					const tabStops = findTabbableDescendants(event.currentTarget);
					const target = findWrappedTabStop({
						tabStops,
						current: event.currentTarget.ownerDocument.activeElement,
						backwards: event.shiftKey,
					});
					if (tabStops.length === 0 || target != null) {
						event.preventDefault();
						target?.focus();
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
