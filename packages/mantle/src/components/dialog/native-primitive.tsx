"use client";

import type { ComponentProps, Context, MouseEvent, ReactNode } from "react";
import {
	createContext,
	useContext,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import invariant from "tiny-invariant";
import { useCallbackRef } from "../../hooks/use-callback-ref.js";
import { useIsHydrated } from "../../hooks/use-is-hydrated.js";
import type { WithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import {
	getCoveringFrame,
	LayerContainer,
	registerOverlay,
	useLayerContainer,
} from "../../utils/layer-container/layer-container.js";
import { Slot } from "../slot/index.js";
import { preventCloseOnPromptInteraction } from "../toast/prevent-close-on-prompt-interaction.js";
import { setTopModal } from "../overlay-prompt/host.js";
import { escapeBelongsToNestedPopup } from "./targets.js";

/**
 * The behavior that `Dialog`, `AlertDialog`, and `Sheet` share: a `<dialog>`
 * that the browser opens as a modal, makes the page inert behind, closes on
 * Escape, paints in the top layer, and returns focus from.
 * The parts here carry no look; each component composes its own presentation
 * onto them.
 *
 * By default, `Content` mounts its children when the dialog opens and
 * unmounts them after the exit animation. With
 * `forceMount`, the `<dialog>` and its children stay mounted and the server
 * renders them: an uncontrolled tap then opens the dialog with DOM calls and
 * no React render, even before hydration.
 */

/** What every part reads from its `Root`. */
type RootState = {
	/** The `id` of the `<dialog>`, which each trigger names in `aria-controls`. */
	contentId: string;
	/** The `id` of the title, which the `<dialog>` names in `aria-labelledby`. */
	titleId: string;
	/** Whether the owner sets `open`. */
	controlled: boolean;
	/** The open state that React holds: the `open` prop, else the uncontrolled state. */
	open: boolean;
	defaultOpen: boolean;
	/** Whether the dialog opens as a modal. */
	modal: boolean;
	/** Asks for a new open state: sets the uncontrolled state, and tells the owner. */
	setOpen: (open: boolean) => void;
	/** Tells the owner of a change that the DOM already made. */
	reportOpen: (open: boolean) => void;
};

/**
 * The context that ties the parts of one component family to its `Root`. Each
 * family makes its own with `createScope`, so a `Dialog.Trigger` inside a
 * `Sheet.Content` binds to the enclosing `Dialog.Root`, not to the sheet.
 */
type Scope = Context<RootState | null>;

/** Makes the `Scope` of a component family. Call it once, at module level. */
const createScope = (): Scope => createContext<RootState | null>(null);

/** What every part takes: the `Scope` of its family. */
type ScopeProps = {
	scope: Scope;
};

/** The `RootState` of the enclosing `Root` in `scope`. Throws outside one. */
function useRootState(scope: Scope, part: string): RootState {
	const state = useContext(scope);
	invariant(state != null, `The dialog part \`${part}\` must be rendered inside its \`Root\`.`);
	return state;
}

/** The open dialogs, in open order. The last one is on top. */
const openDialogs: HTMLDialogElement[] = [];

/** The `<dialog>` elements whose `Content` stays mounted (`forceMount`). */
const keptMounted = new WeakSet<HTMLDialogElement>();

/** The `<dialog>` elements that open with `show()`, not as a modal. */
const nonModal = new WeakSet<HTMLDialogElement>();

/** The panels that `writeOpenState` made inert. */
let inertPanels = new Set<HTMLElement>();

/** The documents that `trackInput` listens to. */
const trackedDocuments = new WeakSet<Document>();
/**
 * Whether the last press or key on a tracked document was a press, or
 * `undefined` before the first one that `trackInput` sees.
 */
let pressedLast: boolean | undefined;

/**
 * Records whether the last input on `ownerDocument` was a press or a key, for
 * the focus ring of a dialog that opens. Why on the document: a dialog can
 * open from any press or key, such as a row action or a hotkey, and Safari
 * gives a pressed button no focus to read.
 */
function trackInput(ownerDocument: Document): void {
	if (trackedDocuments.has(ownerDocument)) {
		return;
	}
	trackedDocuments.add(ownerDocument);
	const options = { capture: true, passive: true };
	ownerDocument.addEventListener("pointerdown", () => (pressedLast = true), options);
	ownerDocument.addEventListener("keydown", () => (pressedLast = false), options);
}

/**
 * Runs `handler` with a cancelable `type` event that `target` receives, so
 * `event.currentTarget` is the panel. Returns the event. An error in `handler`
 * goes to `window`'s `error` event, not to the caller.
 */
function sendFocusEvent(
	target: HTMLElement | null,
	type: string,
	handler: ((event: Event) => void) | undefined,
): Event {
	const event = new Event(type, { cancelable: true });
	if (handler == null) {
		return event;
	}
	if (target == null) {
		handler(event);
		return event;
	}
	target.addEventListener(type, handler, { once: true });
	target.dispatchEvent(event);
	return event;
}

/**
 * Writes the open state of `dialog` to the DOM that mirrors it: `data-open`, or
 * `data-closing` for the exit, on the `<dialog>` and its panel, `aria-expanded`
 * on each trigger, the stack of open dialogs, and the toaster hosts, which follow the
 * top open modal. A write that changes nothing touches no attribute.
 */
function writeOpenState({ dialog, open }: { dialog: HTMLDialogElement; open: boolean }): void {
	if (dialog.hasAttribute("data-open") !== open) {
		const panel = dialog.querySelector("[data-mantle-modal-content]");
		for (const element of [dialog, panel]) {
			element?.toggleAttribute("data-open", open);
			element?.toggleAttribute("data-closing", !open);
		}
		for (const trigger of dialog.ownerDocument.querySelectorAll(`[aria-controls="${dialog.id}"]`)) {
			trigger.setAttribute("aria-expanded", String(open));
		}
	}
	const index = openDialogs.indexOf(dialog);
	if (open && index === -1) {
		openDialogs.push(dialog);
	} else if (!open && index !== -1) {
		openDialogs.splice(index, 1);
	}
	const top = openDialogs.findLast((each) => !nonModal.has(each)) ?? null;
	setTopModal(top);
	// Why: WebKit keeps the content of an open dialog under the top modal
	// focusable from script when the top one opened in a later frame, so the
	// panel of each dialog under the top modal takes `inert` too.
	const covered = new Set<HTMLElement>();
	for (const each of openDialogs) {
		const panel = each.querySelector("[data-mantle-modal-content]");
		// Why the inert check: a panel that its owner made inert stays the owner's.
		// Why the containment check: a kept-mounted dialog renders in the panel
		// of its parent, and an inert ancestor makes the top modal inert too.
		if (
			top != null &&
			each !== top &&
			!top.contains(each) &&
			panel instanceof HTMLElement &&
			!panel.contains(top) &&
			(inertPanels.has(panel) || !panel.inert)
		) {
			covered.add(panel);
		}
	}
	// Why the set: a panel can lose its marker before its dialog closes, as the
	// Sidebar nav does at the breakpoint, so a query would not find it again.
	for (const panel of inertPanels) {
		panel.inert = covered.has(panel);
	}
	for (const panel of covered) {
		panel.inert = true;
	}
	inertPanels = covered;
}

/** The open modal dialogs that hold the page scroll lock. */
const scrollLockers = new Set<HTMLDialogElement>();

/**
 * Adds `dialog` to the page scroll lock, or takes it out. The first modal
 * writes the width of the page scrollbar to `--mantle-scrollbar-width` and
 * marks the root with `data-mantle-scroll-lock`; the last one to close removes
 * the mark. `mantle.css` then hides the scrollbar and pads the page by that
 * width, so the page does not shift and the backdrop covers the viewport.
 */
function lockPageScroll({ dialog, lock }: { dialog: HTMLDialogElement; lock: boolean }): void {
	const root = dialog.ownerDocument.documentElement;
	if (lock) {
		if (scrollLockers.size === 0) {
			const width = (dialog.ownerDocument.defaultView?.innerWidth ?? 0) - root.clientWidth;
			root.style.setProperty("--mantle-scrollbar-width", `${Math.max(width, 0)}px`);
			root.setAttribute("data-mantle-scroll-lock", "");
		}
		scrollLockers.add(dialog);
		return;
	}
	if (scrollLockers.delete(dialog) && scrollLockers.size === 0) {
		root.removeAttribute("data-mantle-scroll-lock");
	}
}

/**
 * Opens or closes `dialog` at once. The state is written first, so the
 * browser lays out the open dialog and its new attributes in one style pass.
 * A close closes the open dialogs nested in `dialog` first.
 */
function moveDialog({
	dialog,
	modal = true,
	open,
}: {
	dialog: HTMLDialogElement;
	modal?: boolean;
	open: boolean;
}): void {
	// Why: jsdom has no dialog methods. Without them, a consumer test that
	// opens a dialog by its role throws. The `open` attribute is enough there.
	if (typeof dialog.showModal !== "function") {
		dialog.show = dialog.showModal = () => dialog.setAttribute("open", "");
		dialog.close = () => {
			dialog.removeAttribute("open");
			dialog.dispatchEvent(new Event("close"));
		};
	}
	if (open === dialog.open) {
		// Why: a reopen during the exit keeps the dialog open, and the pending
		// close sees the state and stops.
		if (open && !dialog.hasAttribute("data-open")) {
			writeOpenState({ dialog, open });
		}
		return;
	}
	if (open && insideHiddenDialog(dialog)) {
		return;
	}
	if (modal) {
		nonModal.delete(dialog);
	} else {
		nonModal.add(dialog);
	}
	writeOpenState({ dialog, open });
	if (open) {
		if (modal) {
			lockPageScroll({ dialog, lock: true });
			dialog.showModal();
		} else {
			dialog.show();
		}
		return;
	}
	closeNested(dialog);
	dialog.close();
}

/**
 * Closes the open dialogs nested in `dialog`, innermost first. Call it before
 * `dialog` closes: an open child stays modal inside its hidden parent and
 * blocks the page, and each close returns focus to the element that opened it.
 */
function closeNested(dialog: HTMLDialogElement): void {
	for (const child of [...dialog.querySelectorAll("dialog[open]")].toReversed()) {
		if (child instanceof HTMLDialogElement) {
			// Why the write first: it takes the child out of the stack of open
			// dialogs now, so a dialog that opens in the same event mounts on the
			// true top modal, not in the closed child.
			writeOpenState({ dialog: child, open: false });
			child.close();
		}
	}
}

/**
 * Closes `dialog` after its exit animation: `data-closing` starts the
 * exit of the `<dialog>`, its backdrop, and its panel, and `close()` runs when
 * those animations end. The dialog stays modal for the length of the exit.
 * `done` runs after the close, unless the dialog opened
 * again during the exit.
 *
 * Why not CSS alone: Firefox does not animate `display`, and Safari takes a
 * closed `<dialog>` out of the top layer at once (no `overlay`).
 */
function closeAfterExit(dialog: HTMLDialogElement, done?: () => void): void {
	if (!dialog.open) {
		done?.();
		return;
	}
	writeOpenState({ dialog, open: false });
	const panel = dialog.querySelector("[data-mantle-modal-content]");
	// Why the filter: an animation that runs inside the panel, such as a spinner,
	// must not hold the dialog open.
	const exits = (dialog.getAnimations?.({ subtree: true }) ?? []).filter(
		({ effect }) =>
			effect instanceof KeyframeEffect &&
			(effect.target === dialog || effect.target === panel) &&
			effect.getTiming().iterations !== Number.POSITIVE_INFINITY,
	);
	const closeNow = () => {
		if (dialog.hasAttribute("data-open")) {
			return;
		}
		if (dialog.open) {
			closeNested(dialog);
			dialog.close();
		}
		dialog.removeAttribute("data-closing");
		panel?.removeAttribute("data-closing");
		done?.();
	};
	// Why at once with no exit: a dialog with no animation closes in the
	// event that asks for it.
	if (exits.length === 0) {
		closeNow();
		return;
	}
	const closeWhenDone = async () => {
		await Promise.allSettled(exits.map((animation) => animation.finished));
		closeNow();
	};
	void closeWhenDone();
}

/**
 * Asks the dialog of `root` for a new open state. A controlled root asks its
 * owner. A dialog that stays mounted moves in the DOM, with no render. Else the
 * root's own state changes, which mounts or unmounts the content.
 */
function requestOpen({
	dialog,
	open,
	root,
}: {
	dialog: Element | null;
	open: boolean;
	root: RootState;
}): void {
	if (root.controlled) {
		if (open !== root.open) {
			root.setOpen(open);
		}
		return;
	}
	if (dialog instanceof HTMLDialogElement && keptMounted.has(dialog)) {
		if (open) {
			moveDialog({ dialog, modal: root.modal, open });
		} else {
			closeAfterExit(dialog);
		}
		return;
	}
	if (open !== root.open) {
		root.setOpen(open);
	}
}

/**
 * The `command` and `commandfor` attributes of an uncontrolled trigger or
 * close button. Where the browser supports invoker commands and the
 * `<dialog>` is on the page, the click reaches the dialog even before
 * hydration, and the dialog's `command` listener routes it.
 */
function commandAttributes(root: RootState, command: "show-modal" | "close") {
	// Why not for a non-modal open: the command opens a modal, even before hydration.
	return root.controlled || (command === "show-modal" && !root.modal)
		? {}
		: { command, commandfor: root.contentId };
}

/**
 * Whether `dialog` sits in a closed `<dialog>` that hides it, such as a closed
 * `forceMount` parent. A modal there would make the page inert and not show.
 * The closed `<dialog>` of a desktop `Sidebar.Nav` has `display: contents` and
 * hides nothing.
 */
function insideHiddenDialog(dialog: HTMLDialogElement): boolean {
	for (
		let ancestor = dialog.parentElement?.closest("dialog:not([open])");
		ancestor instanceof HTMLElement;
		ancestor = ancestor.parentElement?.closest("dialog:not([open])")
	) {
		if (ancestor.style.display !== "contents") {
			return true;
		}
	}
	return false;
}

/** Whether the click on `element` sends a `command` event to the `<dialog>`. */
function sendsCommand(element: Element): boolean {
	// Why `type="button"`: the browser runs no command for a submit or reset button.
	return (
		element instanceof HTMLButtonElement &&
		element.type === "button" &&
		Reflect.get(element, "commandForElement") instanceof HTMLDialogElement
	);
}

/**
 * The event that `onPointerDownOutside` and `onInteractOutside` get: a
 * cancelable event at the pressed element, with the pointer event.
 * Call `preventDefault()` to keep the dialog open.
 */
type PointerDownOutsideEvent = CustomEvent<{ originalEvent: PointerEvent }>;

/** Dispatches a {@link PointerDownOutsideEvent} at the target of `originalEvent`. */
function createPointerDownOutsideEvent(originalEvent: PointerEvent): PointerDownOutsideEvent {
	const event = new CustomEvent("dismissableLayer.pointerDownOutside", {
		cancelable: true,
		detail: { originalEvent },
	});
	// Why a dispatch: it sets `event.target`, which handlers such as
	// `isDialogOverlayTarget(event.target)` read.
	originalEvent.target?.dispatchEvent(event);
	return event;
}

/**
 * Gives an Escape to a frame that covers a non-modal dialog, such as a 3-D
 * Secure challenge that a payment script puts on `<body>`: it prevents the
 * Escape, so the dialog stays open, and moves focus into the frame.
 */
function yieldEscapeToCoveringFrame(event: KeyboardEvent): void {
	const frame = getCoveringFrame();
	if (frame == null) {
		return;
	}
	event.preventDefault();
	// Why a timer: Firefox ignores a `focus()` call on a frame from a key listener.
	setTimeout(() => frame.focus());
}

type RootProps = ScopeProps & {
	children?: ReactNode;
	/**
	 * Whether the dialog opens on mount, when `open` is not set.
	 *
	 * @default false
	 */
	defaultOpen?: boolean;
	/**
	 * Whether the dialog is modal: the page behind it is inert, and it paints in
	 * the top layer. Set `false` for a dialog that holds a flow whose frame a
	 * third-party script puts on `<body>`, such as a 3-D Secure challenge or a
	 * captcha: a modal dialog would make that frame inert and cover it.
	 *
	 * @default true
	 */
	modal?: boolean;
	/** Runs when the dialog opens or closes, with the new state. */
	onOpenChange?: (open: boolean) => void;
	/** The controlled open state. Pair it with `onOpenChange`. */
	open?: boolean;
};

/** The state owner of a dialog. It renders no DOM. */
const Root = ({
	children,
	defaultOpen = false,
	modal = true,
	onOpenChange,
	open,
	scope: Scope,
}: RootProps) => {
	const contentId = useId();
	const titleId = useId();
	const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
	const controlled = open !== undefined;
	const reportOpen = useCallbackRef((next: boolean) => onOpenChange?.(next));
	const setOpen = useCallbackRef((next: boolean) => {
		if (!controlled) {
			setUncontrolledOpen(next);
		}
		onOpenChange?.(next);
	});
	const resolvedOpen = open ?? uncontrolledOpen;
	const state = useMemo(
		() => ({
			contentId,
			titleId,
			controlled,
			open: resolvedOpen,
			defaultOpen,
			modal,
			setOpen,
			reportOpen,
		}),
		[contentId, titleId, controlled, resolvedOpen, defaultOpen, modal, setOpen, reportOpen],
	);

	return <Scope value={state}>{children}</Scope>;
};

type ButtonProps = ComponentProps<"button"> & WithAsChild & ScopeProps;

/**
 * The click handler of a trigger or close button: it runs `onClick`, then asks
 * for `open`, unless the click sends a `command` that the `<dialog>` routes.
 *
 * Why a named handler type: `Slot` types its event on `HTMLElement`, and the
 * handler reads `currentTarget` as the clicked element either way.
 */
function useClickToOpen({
	onClick,
	open,
	root,
}: {
	onClick: ButtonProps["onClick"];
	open: boolean;
	root: RootState;
}) {
	return (event: MouseEvent<HTMLButtonElement>) => {
		onClick?.(event);
		const element = event.currentTarget;
		if (!event.defaultPrevented && !sendsCommand(element)) {
			const dialog = element.ownerDocument.getElementById(root.contentId);
			// Why a toggle: a trigger outside an open non-modal dialog closes it.
			const shown =
				dialog instanceof HTMLDialogElement && dialog.open && dialog.hasAttribute("data-open");
			requestOpen({ dialog, open: open && !shown, root });
		}
	};
}

/** A button that opens the dialog. */
const Trigger = ({ asChild, onClick, ref, scope, ...props }: ButtonProps) => {
	const root = useRootState(scope, "Trigger");
	const Component = asChild ? Slot : "button";
	const handleClick = useClickToOpen({ onClick, open: true, root });

	// Why a ref: a trigger that mounts while its dialog is open takes the open
	// state the dialog already has.
	const readState = (trigger: HTMLButtonElement | null) => {
		const dialog = trigger?.ownerDocument.getElementById(root.contentId);
		if (trigger != null && dialog != null) {
			trigger.setAttribute("aria-expanded", String(dialog.hasAttribute("data-open")));
		}
	};
	const composedRef = useComposedRefs(ref, readState);

	// Why: a dialog that opens from state passes an empty `asChild` trigger,
	// which renders nothing.
	if (asChild && props.children == null) {
		return null;
	}

	// Why a constant `aria-expanded`: `writeOpenState` keeps it
	// current on the DOM, and React never writes a prop again that did not change.
	return (
		<Component
			ref={composedRef}
			type="button"
			aria-controls={root.contentId}
			aria-expanded="false"
			aria-haspopup="dialog"
			{...commandAttributes(root, "show-modal")}
			{...props}
			onClick={handleClick}
		/>
	);
};

/** A button that closes the dialog. */
const Close = ({ asChild, onClick, scope, ...props }: ButtonProps) => {
	const root = useRootState(scope, "Close");
	const Component = asChild ? Slot : "button";
	const handleClick = useClickToOpen({ onClick, open: false, root });

	return (
		<Component
			type="button"
			{...commandAttributes(root, "close")}
			{...props}
			onClick={handleClick}
		/>
	);
};

/**
 * The classes every `<dialog>` takes: a reset of the browser's dialog box,
 * and the backdrop with its motion. `data-open` drives the entry and
 * `data-closing` the exit, which plays before `close()`. Why not
 * `not-data-open:` for the exit: an invoker command opens the `<dialog>`
 * before hydration, with no `data-open`, and must not play the exit.
 *
 * Why `overscroll-none`: a scroll in the dialog must not bounce or chain to
 * the page behind it.
 */
const positionerBaseClassName = cx(
	"group/native-dialog m-0 h-auto max-h-none w-auto max-w-none overflow-visible overscroll-none bg-transparent p-0 text-inherit outline-hidden",
	// Why: a non-modal dialog leaves the page live, so the area around the
	// panel lets presses through to the page. The panel and floats take them.
	"[&[open]:not(:modal)]:pointer-events-none [&[open]:not(:modal)>*]:pointer-events-auto",
	"backdrop:bg-overlay backdrop:backdrop-blur-xs",
	"data-open:backdrop:animate-in data-open:backdrop:fade-in-0 data-closing:backdrop:animate-out data-closing:backdrop:fade-out-0",
	"backdrop:duration-200 data-closing:backdrop:duration-150 motion-reduce:backdrop:animate-none!",
);

/** The style of an inline `<dialog>`, which has no box of its own. */
const inlineStyle = { display: "contents" } as const;

type ContentProps = ComponentProps<"div"> &
	ScopeProps & {
		/**
		 * Whether the `<dialog>` and its children stay mounted while closed. The
		 * server renders them, and an uncontrolled tap opens the dialog with no
		 * React render, even before hydration. The page pays the HTML and the
		 * hydration of the content up front.
		 *
		 * @default false
		 */
		forceMount?: true;
		/**
		 * Whether the closed `<dialog>` shows its panel in the page, as
		 * `Sidebar.Nav` does above its breakpoint. An inline `<dialog>` has no
		 * box (`display: contents`), and it is neither a dialog nor a layer: it
		 * takes `role="generic"` and no name or description, and the floats
		 * inside portal as if it were not there. Needs `forceMount`.
		 *
		 * @default false
		 */
		inline?: boolean;
		/**
		 * Whether the floats inside portal into the `<dialog>`. Pass `false`
		 * while a `<dialog>` that stays mounted is closed, so a float that a
		 * shortcut opens there portals to the body and shows.
		 *
		 * @default true
		 */
		layer?: boolean;
		/**
		 * Runs after the dialog opens and the browser moves focus into it. Call
		 * `event.preventDefault()` and focus an element of your choice; with no
		 * focus move, the `<dialog>` takes focus.
		 */
		onOpenAutoFocus?: (event: Event) => void;
		/**
		 * Runs after the dialog closes and the browser returns focus to the
		 * element that opened it. Focus another element here to send focus there.
		 */
		onCloseAutoFocus?: (event: Event) => void;
		/** Runs on Escape. Call `event.preventDefault()` to keep the dialog open. */
		onEscapeKeyDown?: (event: KeyboardEvent) => void;
		/**
		 * Runs on a press outside the panel: on the backdrop, or, for a non-modal
		 * dialog, anywhere outside it. Call `event.preventDefault()` to keep the
		 * dialog open.
		 */
		onPointerDownOutside?: (event: PointerDownOutsideEvent) => void;
		/** Runs on the same presses as `onPointerDownOutside`, after it. */
		onInteractOutside?: (event: PointerDownOutsideEvent) => void;
		/**
		 * The requests that close the dialog, as in the HTML `closedby`
		 * attribute. With `"any"`, a press outside the panel closes it too. With
		 * `"closerequest"`, a press outside does nothing, and
		 * `onPointerDownOutside` and `onInteractOutside` do not run: Escape,
		 * the close parts, and a trigger outside close the dialog. Use it for a form that
		 * must not lose its input to a stray press, such as a card form in a
		 * sheet that is not modal.
		 *
		 * @default "any"
		 */
		closedby?: "any" | "closerequest";
		/** The classes of the `<dialog>`, which positions the panel. */
		positionerClassName: string;
		/** The `data-slot` of the `<dialog>`. */
		positionerSlot: string;
		/**
		 * The role of the `<dialog>`, such as `"alertdialog"` for a dialog that
		 * asks for an explicit response.
		 *
		 * @default "dialog"
		 */
		role?: ComponentProps<"dialog">["role"];
	};

/**
 * The panel of the dialog, inside a `<dialog>` (`positionerSlot`) that is the
 * layer container: a float composed inside portals into it and paints in the
 * top layer with it. Style the panel with `data-open:` and
 * `data-closing:`; the exit plays before the `<dialog>` closes.
 */
const Content = ({
	"aria-describedby": ariaDescribedBy,
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledBy,
	children,
	closedby = "any",
	forceMount,
	inline = false,
	layer = true,
	onCloseAutoFocus,
	onEscapeKeyDown,
	onInteractOutside,
	onOpenAutoFocus,
	onPointerDownOutside,
	positionerClassName,
	positionerSlot,
	ref,
	role,
	scope,
	...props
}: ContentProps) => {
	const root = useRootState(scope, "Content");
	const keepMounted = forceMount === true;
	// Why refs and not state: a state would render the children again on each
	// open, and the open must cost no more than the mount.
	const dialogRef = useRef<HTMLDialogElement | null>(null);
	const panelRef = useRef<HTMLDivElement | null>(null);
	/** The panel of the last `<dialog>` that attached, which outlives its unmount. */
	const lastPanel = useRef<HTMLDivElement | null>(null);
	const composedPanelRef = useComposedRefs(ref, panelRef);
	const reportedOpen = useRef(false);
	const pressedOutside = useRef(false);

	// Why a state for the exit: the content stays mounted until its exit ends.
	const [exiting, setExiting] = useState(false);
	const [renderedOpen, setRenderedOpen] = useState(root.open);
	if (renderedOpen !== root.open) {
		setRenderedOpen(root.open);
		setExiting(!root.open);
	}
	const present = keepMounted || root.open || exiting;

	// Why a portal for content that mounts on open: a `<dialog>` inside a
	// closed `<dialog>` or another hidden ancestor does not show, even in the
	// top layer. It portals into the enclosing open dialog, so a close of that
	// dialog closes it first, else into `<body>` once the page has hydrated.
	// A dialog that stays mounted renders in place, so the server renders it.
	const layerContainer = useLayerContainer();
	const isHydrated = useIsHydrated();
	const portalTarget = layerContainer ?? (isHydrated ? document.body : null);

	/** The open state that React expects, or `undefined` while the DOM owns it. */
	const expectedOpen = keepMounted && !root.controlled ? undefined : root.open;

	const close = useCallbackRef(() => requestOpen({ dialog: dialogRef.current, open: false, root }));
	const escape = useCallbackRef((event: KeyboardEvent) => {
		onEscapeKeyDown?.(event);
		if (!event.defaultPrevented) {
			close();
		}
	});
	/**
	 * Handles an Escape for this dialog from the document. Why the consumer
	 * runs after the guards: it sees the prevented Escape that a picker in the
	 * panel or a covering frame takes.
	 */
	const guardedEscape = useCallbackRef((event: KeyboardEvent) => {
		const dialog = dialogRef.current;
		if (dialog != null && escapeBelongsToNestedPopup(dialog, event.target)) {
			event.preventDefault();
		} else if (!root.modal) {
			yieldEscapeToCoveringFrame(event);
		}
		escape(event);
		// Why prevent: the browser's own close request would close the dialog
		// at once, with no exit, and a dialog under a non-modal one would close too.
		event.preventDefault();
	});
	const pressOutside = useCallbackRef((originalEvent: PointerEvent): boolean => {
		// Why no `closedby` on the `<dialog>`: on a non-modal dialog, the
		// browser then closes it on Escape past the guards and the owner's state.
		if (closedby === "closerequest") {
			return false;
		}
		const outside = createPointerDownOutsideEvent(originalEvent);
		// Why the check: a dialog composed in a prompt sits in the prompt, and a
		// press on its own backdrop is still outside it.
		if (
			!(originalEvent.target instanceof Node && dialogRef.current?.contains(originalEvent.target))
		) {
			preventCloseOnPromptInteraction(outside);
		}
		onPointerDownOutside?.(outside);
		onInteractOutside?.(outside);
		return !outside.defaultPrevented;
	});

	/** The element that had focus when the dialog opened, such as a frame. */
	const opener = useRef<Element | null>(null);
	/** Whether `opener` showed a focus ring at open. */
	const openerRing = useRef(false);
	/** Runs `onOpenAutoFocus` on an open `dialog`. */
	const openAutoFocus = useCallbackRef((dialog: HTMLDialogElement) => {
		// Why: the content of each `OverlayPrompt` moved into the dialog before
		// it opened. With no control in the panel, the browser picks a control
		// of a prompt, so the dialog takes focus itself, as with no prompt.
		const browserPick = dialog.ownerDocument.activeElement;
		if (
			browserPick !== dialog &&
			dialog.contains(browserPick) &&
			panelRef.current?.contains(browserPick) === false
		) {
			dialog.focus({ preventScroll: true });
		}
		// Why: WebKit shows a focus ring on the browser's pick after a press, and
		// a dialog that a press opens shows none. A text field always
		// shows one. Firefox shows none after a key when the opener showed none,
		// such as a trigger that got focus back from a dialog that a press opened.
		// Why the opener's ring as a fallback: a dialog that mounts on the press
		// that opens it starts `trackInput` after that press.
		const picked = dialog.ownerDocument.activeElement;
		if (picked instanceof HTMLElement) {
			const ring = picked.matches(":focus-visible");
			const wrong = ring
				? (pressedLast ?? !openerRing.current) && !picked.matches(":read-write")
				: pressedLast === false;
			if (wrong) {
				picked.blur();
				picked.focus({ focusVisible: !ring, preventScroll: true });
			}
		}
		if (onOpenAutoFocus == null) {
			return;
		}
		// Why the dialog takes focus before the handler: a prevented event keeps
		// the browser's pick, such as an input that opens a phone's keyboard, from
		// focus. A comparison after the handler cannot tell a handler that
		// focused the browser's pick, as Firefox picks Command's input.
		const autoFocused = dialog.ownerDocument.activeElement;
		if (autoFocused !== dialog) {
			dialog.focus({ preventScroll: true });
		}
		const event = sendFocusEvent(panelRef.current, "openAutoFocus", onOpenAutoFocus);
		if (
			!event.defaultPrevented &&
			dialog.ownerDocument.activeElement === dialog &&
			autoFocused instanceof HTMLElement
		) {
			autoFocused.focus({ preventScroll: true });
		}
	});

	/** Whether `onOpenAutoFocus` waits for the refs of the content to attach. */
	const autoFocusPending = useRef(false);
	/**
	 * Opens `dialog`, then runs `onOpenAutoFocus`. A dialog that opens before
	 * its ref attaches runs it once the refs of its content attach.
	 */
	const openDialog = useCallbackRef((dialog: HTMLDialogElement) => {
		opener.current = dialog.ownerDocument.activeElement;
		openerRing.current = opener.current?.matches(":focus-visible") === true;
		moveDialog({ dialog, modal: root.modal, open: true });
		if (dialogRef.current === dialog) {
			openAutoFocus(dialog);
		} else {
			autoFocusPending.current = true;
		}
	});

	const wantsOpen = useCallbackRef(
		() => expectedOpen === true || (expectedOpen === undefined && reportedOpen.current),
	);
	/**
	 * Opens `dialog` now, or after the `<dialog>` around it opens.
	 *
	 * Why wait: React attaches a dialog before the dialog around it, and a
	 * dialog that opens first paints under that dialog in the top layer.
	 */
	const openSoon = useCallbackRef((dialog: HTMLDialogElement) => {
		if (!insideHiddenDialog(dialog)) {
			openDialog(dialog);
			return;
		}
		// Why the second check: a closed dialog that stays mounted, such as a
		// `forceMount` parent, does not open. A modal in it would make the page
		// inert and not show.
		queueMicrotask(() => {
			if (dialogRef.current !== dialog || !wantsOpen() || dialog.open) {
				return;
			}
			if (insideHiddenDialog(dialog)) {
				// Why: the open state must not stay true for a dialog that did not open.
				root.setOpen(false);
				return;
			}
			openDialog(dialog);
		});
	});

	const openBeforeChildren = useCallbackRef((template: HTMLTemplateElement | null) => {
		const dialog = template?.parentElement;
		if (dialog instanceof HTMLDialogElement && expectedOpen === true && !dialog.open) {
			openSoon(dialog);
		}
	});

	// Why register: a float that this dialog covers hides, and a frame that
	// covers it takes Escape. Why until `close`: the dialog stays modal through
	// its exit, so a float that opens in the exit shows when the dialog closes.
	const releaseOverlay = useRef<(() => void) | null>(null);
	const registerOnce = useCallbackRef((dialog: HTMLDialogElement) => {
		const panel = panelRef.current;
		if (inline || panel == null || releaseOverlay.current != null) {
			return;
		}
		const unregister = registerOverlay({
			container: dialog,
			content: panel,
		});
		// Why the open check: `close` fires in a later task, after a reopen too.
		function release() {
			dialog.removeEventListener("close", onClose);
			releaseOverlay.current = null;
			unregister();
		}
		function onClose() {
			if (!dialog.open) {
				release();
			}
		}
		releaseOverlay.current = release;
		dialog.addEventListener("close", onClose);
	});

	/**
	 * Runs `onCloseAutoFocus` after `dialog` closes or leaves the page.
	 *
	 * Why so little: `close()` already returned focus to the element that had
	 * it at open, and a non-modal close keeps focus that moved outside. Three
	 * gaps stay. A consumer that cancels owns focus, so the focus a modal
	 * returned goes first and comes back only if the consumer does not cancel.
	 * Chromium returns no focus to a frame, such as a docs preview that sent
	 * ⌘K, and none from a dialog that leaves the page, so the opener takes it.
	 * An opener that is gone leaves focus on `<body>`, so the trigger takes it.
	 */
	const returnFocus = useCallbackRef((dialog: HTMLDialogElement, leftOpen = false) => {
		const { ownerDocument } = dialog;
		const { body } = ownerDocument;
		// Why: a dialog that left the page open returned no focus, so the focus
		// now is another's, such as that of a dialog that replaced it.
		const returned = leftOpen ? body : ownerDocument.activeElement;
		const modal = !nonModal.has(dialog);
		if (modal && returned instanceof HTMLElement && returned !== body) {
			returned.blur();
		}
		const event = sendFocusEvent(lastPanel.current, "closeAutoFocus", onCloseAutoFocus);
		if (event.defaultPrevented || ownerDocument.activeElement !== body) {
			return;
		}
		const trigger = ownerDocument.querySelector(`[aria-controls="${dialog.id}"]`);
		for (const target of [modal ? returned : null, opener.current, trigger]) {
			if (target instanceof HTMLElement && target !== body && target.isConnected) {
				target.focus();
				if (ownerDocument.activeElement === target) {
					return;
				}
			}
		}
	});

	const sync = useCallbackRef((dialog: HTMLDialogElement) => {
		const { open } = dialog;
		// Why the write comes before the check: a StrictMode remount writes the
		// state closed and then finds the dialog still open.
		writeOpenState({ dialog, open });
		// Why here too: it sees a dialog that opens through its command before
		// hydration, and each close, after the exit.
		lockPageScroll({ dialog, lock: open && !nonModal.has(dialog) });
		if (open) {
			registerOnce(dialog);
		}
		if (open === reportedOpen.current) {
			return;
		}
		reportedOpen.current = open;
		if (open) {
			if (expectedOpen === undefined) {
				openAutoFocus(dialog);
			}
		} else {
			// Why a microtask: the close can run in a React commit, which puts
			// back the focus it saw at its start.
			queueMicrotask(() => returnFocus(dialog));
		}
		if (open === expectedOpen) {
			return;
		}
		// Why both: a dialog that stays mounted and owns its state reports the
		// change; any other dialog that the browser closed on its own updates
		// the root, which unmounts the content.
		if (expectedOpen === undefined) {
			root.reportOpen(open);
		} else {
			root.setOpen(open);
		}
	});

	// Why the `command` listener: it routes each trigger and close button.
	// Why a callback ref: the listener must read the root of the latest
	// render. A dialog that mounts on open attaches before that render's
	// effects run, and a tap sends its command after the dialog mounts.
	const routeCommand = useCallbackRef((event: Event) => {
		const dialog = event.currentTarget;
		const command: unknown = Reflect.get(event, "command");
		if (
			!(dialog instanceof HTMLDialogElement) ||
			(command !== "show-modal" && command !== "close" && command !== "request-close")
		) {
			return;
		}
		const open = command === "show-modal";
		if (open && insideHiddenDialog(dialog)) {
			event.preventDefault();
			return;
		}
		event.preventDefault();
		requestOpen({ dialog, open, root });
	});

	// Why an observer of `open`: it sees each way the `<dialog>` opens or closes
	// in one place, such as a command before hydration. Its callback runs before
	// the next paint.
	const attach = useCallbackRef((dialog: HTMLDialogElement | null) => {
		dialogRef.current = dialog;
		if (dialog == null) {
			return;
		}
		lastPanel.current = panelRef.current;
		if (keepMounted) {
			keptMounted.add(dialog);
		}
		const observer = new MutationObserver(() => sync(dialog));
		observer.observe(dialog, { attributeFilter: ["open"] });
		dialog.addEventListener("command", routeCommand);
		// Why a reset: a new portal target mounts a new, closed `<dialog>`, which
		// is no close of the dialog.
		reportedOpen.current = false;
		// Why a sync now: a tap before hydration can open the dialog through its command.
		sync(dialog);
		if (autoFocusPending.current) {
			autoFocusPending.current = false;
			openAutoFocus(dialog);
		}
		if (keepMounted && !root.controlled && root.defaultOpen && !dialog.open) {
			reportedOpen.current = true;
			openSoon(dialog);
		}
		// Why open here too: a new portal target mounts a new `<dialog>` with no
		// change to the open state, so the layout effect does not run again.
		if (expectedOpen === true && !dialog.open) {
			openSoon(dialog);
		}
		return () => {
			// Why: the content can unmount in the same task as the `close()` that
			// ends its exit, before the observer reports it.
			if (observer.takeRecords().length > 0) {
				sync(dialog);
			}
			observer.disconnect();
			dialog.removeEventListener("command", routeCommand);
			writeOpenState({ dialog, open: false });
			lockPageScroll({ dialog, lock: false });
			// Why: a dialog that leaves the page sends no `close`.
			releaseOverlay.current?.();
			if (!dialog.open) {
				return;
			}
			// Why: the browser returns focus only from `close()`, not when an open
			// `<dialog>` leaves the page. A StrictMode remount keeps it on the page.
			// Why the ref check: a new portal target replaces the `<dialog>`, and
			// the dialog stays open in it.
			queueMicrotask(() => {
				if (!dialog.isConnected && (dialogRef.current == null || dialogRef.current === dialog)) {
					returnFocus(dialog, true);
				}
			});
		};
	});

	// Why a layout effect: the dialog opens in the frame of the render that
	// mounts it, and the exit starts in the frame that asks for it.
	useLayoutEffect(() => {
		const dialog = dialogRef.current;
		if (dialog == null || expectedOpen === undefined) {
			return;
		}
		if (!expectedOpen) {
			closeAfterExit(dialog, keepMounted ? undefined : () => setExiting(false));
		} else if (dialog.open) {
			writeOpenState({ dialog, open: true });
		} else {
			openSoon(dialog);
		}
	}, [expectedOpen, keepMounted, openSoon]);

	useEffect(() => {
		trackInput(document);
		return () => releaseOverlay.current?.();
	}, []);

	// Why Escape on the document: an open picker in the panel takes the key
	// first and prevents it, in every engine, and the key closes the top dialog
	// wherever focus is. Why a press outside here: a non-modal
	// dialog has no backdrop.
	// Why the DOM-owned case: a dialog that stays mounted and owns its state
	// opens with no render, so `root.open` stays false. Why `portalTarget`: the
	// `<dialog>` mounts after hydration, or anew in a new target.
	const listening = root.open || expectedOpen === undefined;
	useEffect(() => {
		const dialog = dialogRef.current;
		if (dialog == null || !listening || inline || (!keepMounted && portalTarget == null)) {
			return;
		}
		const { ownerDocument } = dialog;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !event.defaultPrevented && openDialogs.at(-1) === dialog) {
				guardedEscape(event);
			}
		};
		// Why the covering-frame check: a press on the popup around a captcha
		// frame is a press in that flow, not outside the dialog.
		const onPointerDown = (event: PointerEvent) => {
			const { target } = event;
			// Why the top check: a press in a modal above this dialog is not
			// outside it. Why the trigger check: its click toggles the dialog.
			if (
				!root.modal &&
				dialog.open &&
				openDialogs.at(-1) === dialog &&
				target instanceof Element &&
				!dialog.contains(target) &&
				target.closest(`[aria-controls="${dialog.id}"]`) == null &&
				getCoveringFrame()?.closest("body > *")?.contains(target) !== true &&
				pressOutside(event)
			) {
				close();
			}
		};
		// Why: when the focused element leaves the panel, such as a retry button
		// that a loading state replaces, the browser puts focus on `<body>`. The
		// dialog takes it back, so a screen reader stays in it.
		// Why a task later: a field that renders on blur, such as one that clears
		// its error, changes the panel while Tab moves focus and `<body>` holds it
		// for a moment. Focus on the dialog then would cancel the Tab.
		let refocusTimer = 0;
		const refocus = new MutationObserver(() => {
			clearTimeout(refocusTimer);
			refocusTimer = window.setTimeout(() => {
				if (
					dialog.open &&
					dialog.hasAttribute("data-open") &&
					!nonModal.has(dialog) &&
					openDialogs.at(-1) === dialog &&
					ownerDocument.activeElement === ownerDocument.body
				) {
					dialog.focus({ preventScroll: true });
				}
			});
		});
		refocus.observe(dialog, { childList: true, subtree: true });
		ownerDocument.addEventListener("keydown", onKeyDown);
		ownerDocument.addEventListener("pointerdown", onPointerDown, { capture: true });
		return () => {
			clearTimeout(refocusTimer);
			refocus.disconnect();
			ownerDocument.removeEventListener("keydown", onKeyDown);
			ownerDocument.removeEventListener("pointerdown", onPointerDown, { capture: true });
		};
	}, [
		root.modal,
		listening,
		inline,
		keepMounted,
		portalTarget,
		guardedEscape,
		pressOutside,
		close,
	]);

	if (!present || (!keepMounted && portalTarget == null)) {
		return null;
	}

	const dialog = (
		// oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- Why: Escape closes the dialog from the keyboard, through the `cancel` event.
		<dialog
			ref={attach}
			id={root.contentId}
			// Why `generic`: Chromium ignores `none` and `presentation` on a
			// `<dialog>`. ARIA prohibits a name on `generic`.
			// Why an inline `display`: the browser's own style hides a closed
			// `<dialog>`, and the panel must show before any stylesheet loads.
			// Why `tabIndex` on the `<dialog>`, not the panel: the browser opens a
			// dialog with focus on its first focusable element, and a
			// press on a bare part of the panel keeps focus in the dialog.
			{...(inline
				? { role: "generic", style: inlineStyle }
				: {
						role,
						tabIndex: -1,
						"aria-describedby": ariaDescribedBy,
						"aria-label": ariaLabel,
						"aria-labelledby": ariaLabelledBy ?? (ariaLabel == null ? root.titleId : undefined),
					})}
			className={cx(positionerBaseClassName, positionerClassName)}
			// Why `data-overlay`: a press on the backdrop targets the `<dialog>`,
			// and `isDialogOverlayTarget` names that press.
			data-overlay=""
			data-slot={positionerSlot}
			// Why the target checks: React sends the events of a nested `<dialog>`
			// up to this one too. Why `preventDefault`: the exit plays before the
			// close, and a controlled dialog closes when its owner sets `open`.
			onCancel={(event) => {
				if (event.target === event.currentTarget) {
					event.preventDefault();
					close();
				}
			}}
			onSubmit={(event) => {
				const { currentTarget, nativeEvent, target } = event;
				if (
					event.defaultPrevented ||
					!(nativeEvent instanceof SubmitEvent) ||
					!(target instanceof HTMLFormElement) ||
					target.closest("dialog") !== currentTarget
				) {
					return;
				}
				const method = nativeEvent.submitter?.getAttribute("formmethod")?.toLowerCase();
				if ((method ?? target.method) === "dialog") {
					event.preventDefault();
					close();
				}
			}}
			// Why a press and a click on the `<dialog>` itself: the backdrop and
			// the area around the panel are the `<dialog>`. A drag out of the panel
			// ends with a click there too, so the press must start there as well.
			// Why stop the click: React sends it through the portal to a
			// clickable parent of the trigger, such as a table row.
			onPointerDown={(event) => {
				pressedOutside.current =
					root.modal && event.target === event.currentTarget && pressOutside(event.nativeEvent);
			}}
			onClick={(event) => {
				if (event.target === event.currentTarget) {
					event.stopPropagation();
					if (pressedOutside.current) {
						close();
					}
				}
			}}
		>
			{/* Why: React focuses an `autoFocus` element before the refs of the
			    elements around it attach, so a dialog that mounts on open must open
			    from a ref that attaches before its children commit. */}
			{!keepMounted && <template ref={openBeforeChildren} />}
			<LayerContainer active={layer && !inline} modal={root.modal} className="contents">
				{/* Why no marker inline: the panel is not an overlay's content, and
				    the close must not write `data-open` over the inline panel's own. */}
				<div ref={composedPanelRef} data-mantle-modal-content={inline ? undefined : ""} {...props}>
					{children}
				</div>
			</LayerContainer>
		</dialog>
	);
	return keepMounted || portalTarget == null ? dialog : createPortal(dialog, portalTarget);
};

/** The accessible name of the dialog. */
const Title = ({
	asChild,
	scope,
	...props
}: Omit<ComponentProps<"h2">, "id"> & WithAsChild & ScopeProps) => {
	const root = useRootState(scope, "Title");
	const Component = asChild ? Slot : "h2";
	return <Component id={root.titleId} {...props} />;
};

/**
 * The accessible description of the dialog. While it is mounted, the
 * `<dialog>` names it in `aria-describedby`.
 */
const Description = ({
	asChild,
	id,
	ref,
	scope,
	...props
}: ComponentProps<"div"> & WithAsChild & ScopeProps) => {
	useRootState(scope, "Description");
	const generatedId = useId();
	const descriptionId = id ?? generatedId;
	const describe = (element: HTMLDivElement | null) => {
		const dialog = element?.closest("dialog");
		if (dialog == null || dialog.hasAttribute("aria-describedby")) {
			return;
		}
		dialog.setAttribute("aria-describedby", descriptionId);
		return () => dialog.removeAttribute("aria-describedby");
	};
	const composedRef = useComposedRefs(ref, describe);
	const Component = asChild ? Slot : "div";
	return <Component id={descriptionId} ref={composedRef} {...props} />;
};

/** Renders its children: a `<dialog>` paints in the top layer, so it needs no portal. */
const Portal = ({
	children,
}: {
	children?: ReactNode;
	/** Accepted for compatibility; the `<dialog>` needs no container. */
	container?: Element | DocumentFragment | null;
	/** Accepted for compatibility; `Content` takes `forceMount`. */
	forceMount?: true;
}) => children;

/** Renders nothing: `Content` styles the `<dialog>`'s `::backdrop` instead. */
const Overlay = (_props: ComponentProps<"div"> & { forceMount?: true }) => null;

export {
	//,
	Close,
	closeAfterExit,
	Content,
	createScope,
	Description,
	moveDialog,
	Overlay,
	Portal,
	Root,
	Title,
	Trigger,
};

export type {
	//,
	ContentProps,
	PointerDownOutsideEvent,
	RootProps,
	Scope,
};
