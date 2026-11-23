"use client";

import {
	createDialogScope,
	Close as DialogPrimitiveClose,
	Content as DialogPrimitiveContent,
	Description as DialogPrimitiveDescription,
	Overlay as DialogPrimitiveOverlay,
	Portal as DialogPrimitivePortal,
	Root as DialogPrimitiveRoot,
	Title as DialogPrimitiveTitle,
	Trigger as DialogPrimitiveTrigger,
} from "@radix-ui/react-dialog";
import type { ComponentProps, ComponentPropsWithoutRef, Ref } from "react";
import { createContext, useContext, useMemo, useRef, useState } from "react";
import { useCallbackRef } from "../../hooks/use-callback-ref.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { Slot } from "../slot/index.js";
import { preventCloseOnPromptInteraction } from "../toast/prevent-close-on-prompt-interaction.js";
import { parseBooleanish } from "../../types/booleanish.js";
import {
	getCoveringFrame,
	LayerContainerContext,
	useLayerContainer,
	useRegisterOverlay,
} from "../../utils/layer-container/layer-container.js";

type DialogPrimitiveContentProps = ComponentProps<typeof DialogPrimitiveContent>;

/**
 * The open state and the close action of a dialog root, linked to the roots
 * above it. A float that the dialog covers uses it to hand the dialog an
 * Escape, which Radix sent to the float.
 */
type DialogRootState = {
	/** The Radix scope key of the root. See {@link dialogScopeKey}. */
	scopeKey: unknown;
	open: boolean;
	close: () => void;
	parent: DialogRootState | null;
};

const DialogRootContext = createContext<DialogRootState | null>(null);

/**
 * The key Radix binds a dialog part to its root by: the dialog contexts of the
 * part's `__scopeDialog` prop, or `undefined` for the default scope.
 */
function dialogScopeKey(props: object): unknown {
	const scope: unknown = Reflect.get(props, "__scopeDialog");
	return scope != null && typeof scope === "object" ? Reflect.get(scope, "Dialog") : undefined;
}

/**
 * The state of the root that Radix binds the part to: the nearest root with
 * the same scope key. Without this match, a `Dialog.Content` inside a
 * `Sheet.Root` would read the sheet's state.
 */
function useDialogRootState(props: object): DialogRootState | null {
	const scopeKey = dialogScopeKey(props);
	let state = useContext(DialogRootContext);
	while (state != null && state.scopeKey !== scopeKey) {
		state = state.parent;
	}
	return state;
}

/**
 * The Radix dialog root, with the open state kept here so that mantle can
 * close the dialog from outside Radix. It is controlled when `open` is set.
 */
const Root = ({
	defaultOpen = false,
	onOpenChange,
	open: openProp,
	...props
}: ComponentProps<typeof DialogPrimitiveRoot>) => {
	const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
	const open = openProp ?? uncontrolledOpen;
	const parent = useContext(DialogRootContext);

	const setOpen = (next: boolean) => {
		if (openProp === undefined) {
			setUncontrolledOpen(next);
		}
		onOpenChange?.(next);
	};
	const close = useCallbackRef(() => setOpen(false));
	const scopeKey = dialogScopeKey(props);
	const rootState = useMemo(
		() => ({ scopeKey, open, close, parent }),
		[scopeKey, open, close, parent],
	);

	return (
		<DialogRootContext.Provider value={rootState}>
			<DialogPrimitiveRoot open={open} onOpenChange={setOpen} {...props} />
		</DialogRootContext.Provider>
	);
};
const Trigger = DialogPrimitiveTrigger;

/**
 * Mounts dialog layers into the nearest layer container: an enclosing
 * overlay's positioner when one is open, else `document.body`. An explicit
 * `container` prop wins over both.
 */
const Portal = ({ container, ...props }: ComponentProps<typeof DialogPrimitivePortal>) => {
	const layerContainer = useLayerContainer();
	const resolvedContainer = container ?? layerContainer;

	// Why the provider: `Dialog.Content` portals again internally, so the
	// resolved container must also become the layer container for the wrapped
	// subtree. Otherwise the inner portal would ignore an explicit `container`.
	return (
		<LayerContainerContext.Provider value={resolvedContainer}>
			<DialogPrimitivePortal container={resolvedContainer} {...props} />
		</LayerContainerContext.Provider>
	);
};

const Close = DialogPrimitiveClose;

const Overlay = (props: ComponentProps<typeof DialogPrimitiveOverlay>) => (
	<DialogPrimitiveOverlay
		/**
		 * Mark the overlay with a data attribute so we can target it, e.g. in
		 * event handlers
		 */
		data-overlay
		{...props}
	/>
);

const Content = ({
	onCloseAutoFocus,
	onEscapeKeyDown,
	onInteractOutside,
	onOpenAutoFocus,
	onPointerDownOutside,
	ref,
	...props
}: DialogPrimitiveContentProps) => {
	const rootState = useDialogRootState(props);
	const layerContainer = useLayerContainer();
	const [contentElement, setContentElement] = useState<HTMLDivElement | null>(null);
	const composedRef = useComposedRefs(ref, setContentElement);
	const focusedBeforeOpenRef = useRef<Element | null>(null);

	// Why register: Radix can send Escape to a float this dialog covers. The
	// float then passes it here, and this runs the same guards as Radix would.
	// Why only while open: a closed dialog can stay mounted for its exit animation.
	useRegisterOverlay({
		container: rootState?.open ? layerContainer : null,
		content: contentElement,
		escape: (event) => {
			if (layerContainer != null && escapeBelongsToNestedPopup(layerContainer, event.target)) {
				event.preventDefault();
			}
			yieldEscapeToCoveringFrame(event);
			onEscapeKeyDown?.(event);
			if (!event.defaultPrevented) {
				rootState?.close();
			}
		},
	});

	return (
		<DialogPrimitiveContent
			ref={composedRef}
			onOpenAutoFocus={(event) => {
				// Radix fires this before it moves focus into the dialog.
				focusedBeforeOpenRef.current = document.activeElement;
				onOpenAutoFocus?.(event);
			}}
			onCloseAutoFocus={(event) => {
				onCloseAutoFocus?.(event);
				// Why: Radix focuses only a `Dialog.Trigger` on close. A dialog opened
				// from a shortcut or a frame then drops focus on the trigger or `<body>`.
				// Why only from `<body>`: focus that moved elsewhere on close stays there.
				const focused = document.activeElement;
				const focusIsFree = focused == null || focused === document.body;
				if (!event.defaultPrevented && focusIsFree && returnFocus(focusedBeforeOpenRef.current)) {
					event.preventDefault();
				}
			}}
			onEscapeKeyDown={(event) => {
				preventCloseOnNestedPopupEscape(event);
				yieldEscapeToCoveringFrame(event);
				onEscapeKeyDown?.(event);
			}}
			onInteractOutside={(event) => {
				preventCloseOnPromptInteraction(event);
				onInteractOutside?.(event);
			}}
			onPointerDownOutside={(event) => {
				preventCloseOnPromptInteraction(event);
				onPointerDownOutside?.(event);
			}}
			// Why no `aria-describedby` here: Radix sets it only while a `Description`
			// is mounted. Radix spreads these props after that computed value, so a
			// value set here, even `undefined`, replaces the Radix one.
			{...props}
		/>
	);
};

const Title = DialogPrimitiveTitle;

/**
 * An accessible description for the dialog primitive.
 * This is a low-level primitive used by higher-level dialog components.
 * Renders as a `div` by default, but can be changed to any other element using the `asChild` prop.
 */
const Description = ({
	asChild,
	children,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof DialogPrimitiveDescription> & {
	ref?: Ref<HTMLDivElement>;
}) => {
	const Component = asChild ? Slot : "div";

	// Why the props go on the Radix part: Radix reads `__scopeDialog` off them,
	// and its slot merges the rest onto the child.
	return (
		<DialogPrimitiveDescription ref={ref} asChild {...props}>
			<Component>{children}</Component>
		</DialogPrimitiveDescription>
	);
};

/**
 * Type guard to check if the event target is the overlay component
 */
function isDialogOverlayTarget(target: EventTarget | null): boolean {
	if (target instanceof HTMLElement) {
		return target.hasAttribute("data-overlay");
	}
	return false;
}

export {
	//,
	createDialogScope,
	Root,
	Trigger,
	Portal,
	Close,
	Overlay,
	Content,
	Description,
	Title,
	escapeBelongsToNestedPopup,
	isDialogOverlayTarget,
};

/**
 * Prevents the parent dialog/sheet/alert-dialog from closing on Escape when a
 * nested popup owner inside the same modal content is currently expanded.
 *
 * Flow:
 * - If focus is outside the nested popup owner, Escape closes the parent modal.
 * - If focus is inside the nested popup owner and its controlled popup is open,
 *   the first Escape closes only the nested popup and keeps the parent modal open.
 * - Once the nested popup has closed, a subsequent Escape closes the parent modal.
 */
function preventCloseOnNestedPopupEscape(
	event: Parameters<NonNullable<DialogPrimitiveContentProps["onEscapeKeyDown"]>>[0],
): void {
	if (!isParentNode(event.currentTarget)) {
		return;
	}
	if (escapeBelongsToNestedPopup(event.currentTarget, event.target)) {
		event.preventDefault();
	}
}

/**
 * Gives an Escape to the frame that covers the parent dialog/sheet/alert-dialog,
 * such as a 3-D Secure challenge that a payment script puts on `<body>`. The
 * dialog stays open, and focus moves into the frame.
 *
 * Why the dialog stays open: a dialog that closes under the frame leaves the
 * frame with no owner. A payment script then puts back the `<body>` styles it
 * saved while the dialog was open, and the page stops taking clicks.
 *
 * Why the focus move: a key press reaches a frame only while focus is in it.
 * The frame then takes the keyboard.
 */
function yieldEscapeToCoveringFrame(event: Event): void {
	const frame = getCoveringFrame();
	if (frame == null) {
		return;
	}
	event.preventDefault();
	// Why a timer: Firefox ignores a `focus()` call on a frame from a key listener.
	setTimeout(() => frame.focus());
}

/**
 * Whether an Escape pressed at `target` belongs to a popup open inside
 * `container`, so the surface that owns `container` must stay open. The popup
 * owner is the nearest ancestor of `target`, else of the focused element, with
 * `aria-expanded="true"` and `aria-controls`; its popup must sit inside
 * `container` and be open (Ariakit's `data-open="true"`, Radix's
 * `data-state="open"`). An always-visible list such as `Command.List` carries neither
 * attribute and never claims the Escape.
 *
 * @example
 * ```ts
 * // a combobox inside the panel is open: this Escape closes the combobox only
 * escapeBelongsToNestedPopup(panel, comboboxInput); // true
 * ```
 */
function escapeBelongsToNestedPopup(
	container: ParentNode & Node,
	target: EventTarget | null,
): boolean {
	const activeElement =
		container instanceof Document
			? container.activeElement
			: (container.ownerDocument?.activeElement ?? null);

	const owner = getExpandedPopupOwner(target) ?? getExpandedPopupOwner(activeElement);
	const popup = owner ? getControlledPopup(owner) : null;

	return (
		owner != null &&
		parseBooleanish(owner.getAttribute("aria-expanded")) &&
		popup != null &&
		container.contains(owner) &&
		container.contains(popup) &&
		(popup.getAttribute("data-open") === "true" || popup.getAttribute("data-state") === "open")
	);
}

/**
 * Finds the nearest expanded popup owner for a node using ARIA relationships.
 *
 * A matching owner must expose `aria-expanded="true"` and `aria-controls`, which
 * lets nested controls like comboboxes and input-attached popovers signal that an
 * inner surface is currently open.
 */
function getExpandedPopupOwner(node: EventTarget | null): HTMLElement | null {
	if (!isHTMLElement(node)) {
		return null;
	}

	const owner = node.closest<HTMLElement>("[aria-expanded='true'][aria-controls]");
	return owner;
}

/**
 * Resolves the popup element controlled by an expanded owner via `aria-controls`.
 */
function getControlledPopup(owner: HTMLElement): HTMLElement | null {
	const popupId = owner.getAttribute("aria-controls");
	if (!popupId) {
		return null;
	}

	const popup = owner.ownerDocument.getElementById(popupId);
	return popup instanceof HTMLElement ? popup : null;
}

/**
 * Focuses the element that had focus when the dialog opened, and returns
 * whether it took focus. `<body>`, a removed element, and an element that
 * cannot take focus return `false`. A frame element takes focus back into its
 * document.
 *
 * @example
 * ```ts
 * returnFocus(searchButton); // true: the button has focus again
 * ```
 */
function returnFocus(element: Element | null): boolean {
	if (!isHTMLElement(element) || element === element.ownerDocument.body || !element.isConnected) {
		return false;
	}
	element.focus();
	return element.ownerDocument.activeElement === element;
}

/**
 * Narrows an event target to an HTMLElement so DOM traversal helpers can be used safely.
 */
function isHTMLElement(value: EventTarget | null): value is HTMLElement {
	return value instanceof HTMLElement;
}

/**
 * Narrows an event target to a queryable DOM parent node, such as an Element or Document.
 */
function isParentNode(value: EventTarget | null): value is ParentNode & Node {
	return value instanceof Node && "querySelector" in value;
}
