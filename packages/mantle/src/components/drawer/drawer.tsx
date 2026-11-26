"use client";

import type { ComponentProps, ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useCallbackRef } from "../../hooks/use-callback-ref.js";
import { useSwipeToDismiss } from "../../hooks/use-swipe-to-dismiss.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import {
	Close as DrawerPrimitiveClose,
	Content as DrawerPrimitiveContent,
	createScope,
	Description as DrawerPrimitiveDescription,
	Root as DrawerPrimitiveRoot,
	Title as DrawerPrimitiveTitle,
	Trigger as DrawerPrimitiveTrigger,
} from "../dialog/native-primitive.js";
import { ScrollBody } from "../dialog/scroll-body.js";

// Why a scope of its own: a `Dialog.Trigger` inside a drawer must bind to the
// nearest `Dialog.Root`, not to the drawer.
const scope = createScope();

type DrawerState = {
	dismissible: boolean;
	setOpen: (open: boolean) => void;
};

const DrawerContext = createContext<DrawerState>({ dismissible: true, setOpen: () => {} });

type DrawerRootProps = {
	children?: ReactNode;
	/** The open state, for a controlled drawer. Pair it with `onOpenChange`. */
	open?: boolean;
	/**
	 * The open state on the first render, for an uncontrolled drawer.
	 * @default false
	 */
	defaultOpen?: boolean;
	/** Runs when the drawer opens or closes. */
	onOpenChange?: (open: boolean) => void;
	/**
	 * Whether a swipe down, Escape, the back gesture, or a press on the
	 * backdrop closes the drawer. With `false`, a swipe springs back and only
	 * `Drawer.Close` or the owner closes it, such as while it holds unsaved work.
	 * The browser still closes it on a second back with no press in between,
	 * so a page cannot trap the user; `onOpenChange` then reports the close.
	 * @default true
	 */
	dismissible?: boolean;
};

/**
 * The root of a `Drawer`: the stateful part that owns the open state. It
 * renders no element.
 *
 * @see https://mantle.ngrok.com/components/overlays/drawer#drawerroot
 *
 * @example
 * ```tsx
 * <Drawer.Root>
 *   <Drawer.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">Filters</Button>
 *   </Drawer.Trigger>
 *   <Drawer.Content>
 *     <Drawer.Header>
 *       <Drawer.Title>Filters</Drawer.Title>
 *     </Drawer.Header>
 *     <Drawer.Body>…</Drawer.Body>
 *   </Drawer.Content>
 * </Drawer.Root>
 * ```
 */
function Root({
	children,
	defaultOpen = false,
	dismissible = true,
	onOpenChange,
	open: openProp,
}: DrawerRootProps) {
	const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
	const open = openProp ?? uncontrolledOpen;
	const setOpen = useCallbackRef((next: boolean) => {
		if (openProp === undefined) {
			setUncontrolledOpen(next);
		}
		onOpenChange?.(next);
	});
	const state = useMemo(() => ({ dismissible, setOpen }), [dismissible, setOpen]);
	// Why controlled: a swipe closes the drawer from the content, so the
	// state lives here, where the content can reach it.
	return (
		<DrawerContext value={state}>
			<DrawerPrimitiveRoot scope={scope} open={open} onOpenChange={setOpen}>
				{children}
			</DrawerPrimitiveRoot>
		</DrawerContext>
	);
}

/**
 * The button that opens the drawer.
 *
 * @see https://mantle.ngrok.com/components/overlays/drawer#drawertrigger
 *
 * @example
 * ```tsx
 * <Drawer.Trigger asChild>
 *   <Button type="button" appearance="outlined" intent="neutral">Filters</Button>
 * </Drawer.Trigger>
 * ```
 */
const Trigger = ({
	"data-slot": dataSlot,
	...props
}: Omit<ComponentProps<typeof DrawerPrimitiveTrigger>, "scope"> & WithDataSlot) => (
	<DrawerPrimitiveTrigger
		scope={scope}
		data-slot={joinDataSlot(dataSlot, "drawer-trigger")}
		{...props}
	/>
);

/**
 * A button that closes the drawer.
 *
 * @see https://mantle.ngrok.com/components/overlays/drawer#drawerclose
 *
 * @example
 * ```tsx
 * <Drawer.Close asChild>
 *   <Button type="button" appearance="outlined" intent="neutral">Cancel</Button>
 * </Drawer.Close>
 * ```
 */
const Close = ({
	"data-slot": dataSlot,
	...props
}: Omit<ComponentProps<typeof DrawerPrimitiveClose>, "scope"> & WithDataSlot) => (
	<DrawerPrimitiveClose
		scope={scope}
		data-slot={joinDataSlot(dataSlot, "drawer-close")}
		{...props}
	/>
);

/** The parts of the panel that take no touch scroll, so that a drag on them moves it. */
const dragSurface =
	"[data-slot~='drawer-handle'], [data-slot~='drawer-header'], [data-slot~='drawer-footer']";

/**
 * Whether a press on `target` belongs to a control, to scrolled content, or
 * to a dialog above the drawer, not to a drag.
 */
function pressBelongsToContent(target: EventTarget | null, panel: HTMLElement): boolean {
	if (!(target instanceof Element) || target.closest("dialog") !== panel.closest("dialog")) {
		return true;
	}
	if (
		target.closest("input, textarea, select") != null ||
		(target instanceof HTMLElement && target.isContentEditable)
	) {
		return true;
	}
	if ((target.ownerDocument.getSelection()?.toString() ?? "") !== "") {
		return true;
	}
	// Why: content that is scrolled scrolls back first, as on iOS. A control
	// that takes its own drag, such as a slider, sets `touch-action: none`.
	for (let element: Element | null = target; element != null && element !== panel;) {
		if (
			element.scrollTop > 0 ||
			(!element.matches(dragSurface) && getComputedStyle(element).touchAction === "none")
		) {
			return true;
		}
		element = element.parentElement;
	}
	return false;
}

/** Puts the panel back at rest, with its scrim and text selection. */
function rest(panel: HTMLElement): void {
	panel.style.removeProperty("translate");
	panel.style.removeProperty("user-select");
	panel.closest("dialog")?.style.setProperty("--drawer-swipe", "0");
}

/**
 * The grab handle, which also owns the swipe, the keyboard inset, and the
 * back gesture. Why here: it mounts with the panel, which the dialog renders
 * only while open, so its effects see the panel.
 */
function SwipeHandle() {
	const { dismissible, setOpen } = useContext(DrawerContext);
	const panelRef = useRef<HTMLElement | null>(null);
	const progress = useRef(0);
	/** Whether a swipe that closed the drawer left the panel displaced. */
	const swiped = useRef(false);
	const attach = (element: HTMLDivElement | null) => {
		panelRef.current = element?.parentElement ?? null;
	};

	useSwipeToDismiss(panelRef, {
		direction: "down",
		active: (event) => {
			const panel = panelRef.current;
			return panel != null && !pressBelongsToContent(event.target, panel);
		},
		onMove: (next) => {
			progress.current = next;
			const panel = panelRef.current;
			panel?.closest("dialog")?.style.setProperty("--drawer-swipe", String(next));
			// Why: a mouse drag would select the text it passes over.
			if (panel != null && next > 0 && panel.style.userSelect !== "none") {
				panel.style.userSelect = "none";
				panel.ownerDocument.getSelection()?.removeAllRanges();
			} else if (panel != null && next === 0) {
				panel.style.removeProperty("user-select");
			}
		},
		onDismiss: () => {
			const panel = panelRef.current;
			// Why the `data-closing` check: Escape can close the drawer while the
			// finger is down, and one close reports once.
			if (panel == null || panel.hasAttribute("data-closing")) {
				return;
			}
			if (!dismissible) {
				rest(panel);
				return;
			}
			// Why: the exit slides from where the finger let go, not from rest.
			panel.style.translate = `0 ${progress.current * panel.offsetHeight}px`;
			swiped.current = true;
			setOpen(false);
			// Why: a controlled owner can keep the drawer open, and the panel
			// then goes back to rest.
			requestAnimationFrame(() => {
				if (!panel.hasAttribute("data-closing")) {
					swiped.current = false;
					rest(panel);
				}
			});
		},
	});

	// Why `visualViewport`: the layout viewport keeps its height under an
	// on-screen keyboard, so a panel at `bottom: 0` would sit behind it.
	useEffect(() => {
		const viewport = window.visualViewport;
		const dialog = panelRef.current?.closest("dialog");
		if (viewport == null || dialog == null) {
			return undefined;
		}
		const update = () => {
			const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
			dialog.style.setProperty("--drawer-keyboard-inset", `${inset}px`);
		};
		update();
		viewport.addEventListener("resize", update);
		viewport.addEventListener("scroll", update);
		return () => {
			viewport.removeEventListener("resize", update);
			viewport.removeEventListener("scroll", update);
		};
	}, []);

	// Why: a reopen during the exit slides in to rest, not to where the
	// finger let go.
	useEffect(() => {
		const panel = panelRef.current;
		const reopen = (event: AnimationEvent) => {
			if (
				panel != null &&
				swiped.current &&
				event.target === panel &&
				!panel.hasAttribute("data-closing")
			) {
				swiped.current = false;
				rest(panel);
			}
		};
		panel?.addEventListener("animationstart", reopen);
		return () => panel?.removeEventListener("animationstart", reopen);
	}, []);

	// Why a capture listener: the native primitive closes on `cancel`, the
	// close request of the back gesture, and its listener must not run.
	const blocksBack = useCallbackRef((event: Event) => {
		if (!dismissible && event.target === event.currentTarget) {
			event.preventDefault();
			event.stopImmediatePropagation();
		}
	});
	useEffect(() => {
		const dialog = panelRef.current?.closest("dialog");
		dialog?.addEventListener("cancel", blocksBack, { capture: true });
		return () => dialog?.removeEventListener("cancel", blocksBack, { capture: true });
	}, [blocksBack]);

	return (
		<div
			aria-hidden
			ref={attach}
			data-slot="drawer-handle"
			className="mx-auto mt-2 mb-1 h-1.5 w-10 shrink-0 touch-none rounded-full bg-neutral-500/30"
		/>
	);
}

type DrawerContentProps = Omit<
	ComponentProps<typeof DrawerPrimitiveContent>,
	"scope" | "positionerClassName" | "positionerSlot" | "forceMount" | "inline" | "layer" | "role"
> &
	WithDataSlot;

/**
 * The panel of the drawer: a modal `<dialog>` that slides up from the bottom
 * edge, with a grab handle at its top. The page behind it is inert and stops
 * scrolling, and a light scrim dims it.
 *
 * It follows a finger or a mouse down one to one. A release past a quarter of
 * its height, or a flick, closes it; a shorter drag springs back, and a drag
 * up meets rubber-band resistance. The scrim fades with the drag. A press on
 * a field, on selected text, or on scrolled content does not start a drag. On
 * a touch screen, `Drawer.Body` scrolls with the finger, so a drag starts on
 * the handle, the header, or the footer. The panel rises above the on-screen
 * keyboard and keeps clear of the home indicator.
 *
 * Escape, the back gesture, and a press on the scrim close it too, unless the
 * root has `dismissible={false}`. Focus moves to the `<dialog>`, so the
 * on-screen keyboard stays closed until a field takes focus, and returns to
 * the trigger on close. Under reduced motion it appears and leaves in place.
 * Floats composed inside portal into it, and `Toast` and `OverlayPrompt`
 * content moves into it. A `Sandbar` slides away while it is open, so it does
 * not cover the drawer's actions.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"drawer-content"` | On the panel, with any composing part's chain ahead of it. |
 * | `data-slot` (positioner) | `"drawer-positioner"` | On the `<dialog>` around the panel. |
 * | `data-slot` (handle) | `"drawer-handle"` | On the grab handle at the top of the panel. Hidden from assistive technology. |
 * | `data-slot` (children) | `"drawer-children"` | On a `display: contents` wrapper around the children, after the handle. |
 * | `data-open` | present while open | Presence-only. On the `<dialog>` positioner and the panel. Drives the slide in. |
 * | `data-closing` | present while the exit plays | Presence-only. On the `<dialog>` positioner and the panel. Drives the slide out. |
 * | `data-overlay` | `""` | On the `<dialog>` positioner. A press on the scrim targets it. |
 * | `data-mantle-modal-content` | `""` | On the panel. Floats and an enclosing dialog find the panel by it. |
 * | `data-mantle-scroll-lock` | present while open | Presence-only. On `<html>`, while any modal dialog is open. The page stops scrolling. |
 *
 * The `<dialog>` sets the CSS variables `--drawer-swipe` (how far a drag has
 * moved the panel, from `0` to `1`) and `--drawer-keyboard-inset` (the height
 * of the on-screen keyboard).
 *
 * @see https://mantle.ngrok.com/components/overlays/drawer#drawercontent
 *
 * @example
 * ```tsx
 * <Drawer.Content>
 *   <Drawer.Header>
 *     <Drawer.Title>Filters</Drawer.Title>
 *   </Drawer.Header>
 *   <Drawer.Body>…</Drawer.Body>
 * </Drawer.Content>
 * ```
 */
const Content = ({
	children,
	className,
	"data-slot": dataSlot,
	onEscapeKeyDown,
	onOpenAutoFocus,
	onPointerDownOutside,
	ref,
	...props
}: DrawerContentProps) => {
	const { dismissible } = useContext(DrawerContext);
	return (
		<DrawerPrimitiveContent
			scope={scope}
			positionerSlot="drawer-positioner"
			// Why a light scrim with no blur: the drawer is a short task beside
			// the page, and a blur over the page repaints on each frame of a drag.
			positionerClassName={cx(
				"fixed z-60",
				"backdrop:bg-black/20 backdrop:backdrop-blur-none",
				"backdrop:opacity-[calc(1-var(--drawer-swipe,0))]",
			)}
			data-slot={joinDataSlot(dataSlot, "drawer-content")}
			className={cx(
				"bg-dialog border-dialog fixed inset-x-0 bottom-(--drawer-keyboard-inset,0px) flex max-h-[calc(100dvh-2rem-var(--drawer-keyboard-inset,0px))] w-full flex-col rounded-t-2xl border-t shadow-lg outline-hidden sm:mx-auto sm:max-w-lg",
				"pb-[env(safe-area-inset-bottom)]",
				// Why the transition on `translate`: a released drag springs back.
				"transition-[translate] duration-200 ease-out-strong motion-reduce:transition-none",
				"data-open:animate-in data-open:slide-in-from-bottom data-closing:animate-out data-closing:slide-out-to-bottom data-closing:duration-150 motion-reduce:animate-none!",
				className,
			)}
			ref={ref}
			// Why the dialog keeps focus: focus on the first field would open the
			// on-screen keyboard over the drawer. A focus move in the handler stays.
			onOpenAutoFocus={(event) => {
				onOpenAutoFocus?.(event);
				event.preventDefault();
			}}
			onEscapeKeyDown={(event) => {
				onEscapeKeyDown?.(event);
				if (!dismissible) {
					event.preventDefault();
				}
			}}
			onPointerDownOutside={(event) => {
				onPointerDownOutside?.(event);
				if (!dismissible) {
					event.preventDefault();
				}
			}}
			{...props}
		>
			<SwipeHandle />
			{/* Why the wrapper: browser translation reparents a bare text child,
			    and React then fails to remove it beside the permanent handle. */}
			<div data-slot="drawer-children" className="contents">
				{children}
			</div>
		</DrawerPrimitiveContent>
	);
};

/**
 * The top of the drawer: its title and description.
 *
 * @see https://mantle.ngrok.com/components/overlays/drawer#drawerheader
 *
 * @example
 * ```tsx
 * <Drawer.Header>
 *   <Drawer.Title>Filters</Drawer.Title>
 *   <Drawer.Description>Show the endpoints that match.</Drawer.Description>
 * </Drawer.Header>
 * ```
 */
const Header = ({
	className,
	"data-slot": dataSlot,
	...props
}: ComponentProps<"div"> & WithDataSlot) => (
	<div
		data-slot={joinDataSlot(dataSlot, "drawer-header")}
		className={cx("between:mbe-1 shrink-0 touch-none px-4 pt-1 pb-3", className)}
		{...props}
	/>
);

/**
 * The accessible name of the drawer. Renders an `h2`.
 *
 * @see https://mantle.ngrok.com/components/overlays/drawer#drawertitle
 *
 * @example
 * ```tsx
 * <Drawer.Title>Filters</Drawer.Title>
 * ```
 */
const Title = ({
	className,
	"data-slot": dataSlot,
	...props
}: Omit<ComponentProps<typeof DrawerPrimitiveTitle>, "scope"> & WithDataSlot) => (
	<DrawerPrimitiveTitle
		scope={scope}
		data-slot={joinDataSlot(dataSlot, "drawer-title")}
		className={cx("text-strong text-lg font-medium", className)}
		{...props}
	/>
);

/**
 * The accessible description of the drawer.
 *
 * @see https://mantle.ngrok.com/components/overlays/drawer#drawerdescription
 *
 * @example
 * ```tsx
 * <Drawer.Description>Show the endpoints that match.</Drawer.Description>
 * ```
 */
const Description = ({
	className,
	"data-slot": dataSlot,
	...props
}: Omit<ComponentProps<typeof DrawerPrimitiveDescription>, "scope"> & WithDataSlot) => (
	<DrawerPrimitiveDescription
		scope={scope}
		data-slot={joinDataSlot(dataSlot, "drawer-description")}
		className={cx("text-body text-sm", className)}
		{...props}
	/>
);

/**
 * The scrolling middle of the drawer. It scrolls with the finger on a touch
 * screen and does not chain its scroll to the page.
 *
 * @see https://mantle.ngrok.com/components/overlays/drawer#drawerbody
 *
 * @example
 * ```tsx
 * <Drawer.Body>
 *   <p>Long content.</p>
 * </Drawer.Body>
 * ```
 */
const Body = ({
	className,
	"data-slot": dataSlot,
	...props
}: ComponentProps<"div"> & WithDataSlot) => (
	<ScrollBody
		data-slot={joinDataSlot(dataSlot, "drawer-body")}
		className={cx(
			"text-body min-h-0 flex-1 touch-pan-y touch-pinch-zoom overflow-y-auto overscroll-contain px-4 pb-4 focus-visible:focus-ring focus-visible:ring-inset",
			className,
		)}
		{...props}
	/>
);

/**
 * The actions at the bottom of the drawer, where a thumb reaches them.
 *
 * @see https://mantle.ngrok.com/components/overlays/drawer#drawerfooter
 *
 * @example
 * ```tsx
 * <Drawer.Footer>
 *   <Drawer.Close asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">Cancel</Button>
 *   </Drawer.Close>
 * </Drawer.Footer>
 * ```
 */
const Footer = ({
	className,
	"data-slot": dataSlot,
	...props
}: ComponentProps<"div"> & WithDataSlot) => (
	<div
		data-slot={joinDataSlot(dataSlot, "drawer-footer")}
		className={cx("flex shrink-0 touch-none justify-end gap-2 px-4 pt-2 pb-4", className)}
		{...props}
	/>
);

export {
	//,
	Root,
	Body,
	Close,
	Content,
	Description,
	Footer,
	Header,
	Title,
	Trigger,
};
