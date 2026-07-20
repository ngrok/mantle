"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
	type ComponentProps,
	type ComponentPropsWithoutRef,
	createContext,
	type Ref,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { Slot } from "../slot/index.js";
import { preventCloseOnPromptInteraction } from "../toast/toast.js";
import { parseBooleanish } from "../../types/booleanish.js";

type DialogPrimitiveContentProps = ComponentProps<typeof DialogPrimitive.Content>;

type InternalDialogContextValue = {
	hasDescription: boolean;
	setHasDescription: (value: boolean) => void;
};

const InternalDialogContext = createContext<InternalDialogContextValue>({
	hasDescription: false,
	setHasDescription: () => {},
});

function Root(props: ComponentPropsWithoutRef<typeof DialogPrimitive.Root>) {
	const [hasDescription, setHasDescription] = useState(false);
	const contextValue = useMemo(() => ({ hasDescription, setHasDescription }), [hasDescription]);

	return (
		<InternalDialogContext.Provider value={contextValue}>
			<DialogPrimitive.Root {...props} />
		</InternalDialogContext.Provider>
	);
}

const Trigger = DialogPrimitive.Trigger;

const Portal = DialogPrimitive.Portal;

const Close = DialogPrimitive.Close;

const Overlay = (props: ComponentProps<typeof DialogPrimitive.Overlay>) => (
	<DialogPrimitive.Overlay
		/**
		 * Mark the overlay with a data attribute so we can target it, e.g. in
		 * event handlers
		 */
		data-overlay
		{...props}
	/>
);

const Content = ({
	onEscapeKeyDown,
	onInteractOutside,
	onPointerDownOutside,
	ref,
	...props
}: DialogPrimitiveContentProps) => {
	const ctx = useContext(InternalDialogContext);

	return (
		<DialogPrimitive.Content
			ref={ref}
			onEscapeKeyDown={(event) => {
				preventCloseOnNestedPopupEscape(event);
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
			// If there's no description, we remove the default applied aria-describedby attribute from radix dialog
			{...(!ctx.hasDescription ? { "aria-describedby": undefined } : {})}
			{...props}
		/>
	);
};

const Title = DialogPrimitive.Title;

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
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Description> & {
	ref?: Ref<HTMLDivElement>;
}) => {
	const ctx = useContext(InternalDialogContext);

	useEffect(() => {
		ctx.setHasDescription(true);
		return () => ctx.setHasDescription(false);
	}, [ctx]);

	const Component = asChild ? Slot : "div";

	return (
		<DialogPrimitive.Description ref={ref} asChild>
			<Component {...props}>{children}</Component>
		</DialogPrimitive.Description>
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
	Root,
	Trigger,
	Portal,
	Close,
	Overlay,
	Content,
	Description,
	Title,
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

	const currentTarget = event.currentTarget;
	const activeElement =
		currentTarget instanceof Document
			? currentTarget.activeElement
			: (currentTarget.ownerDocument?.activeElement ?? null);

	const owner = getExpandedPopupOwner(event.target) ?? getExpandedPopupOwner(activeElement);

	const popup = owner ? getControlledPopup(owner) : null;

	if (
		owner != null &&
		parseBooleanish(owner.getAttribute("aria-expanded")) &&
		popup != null &&
		currentTarget.contains(owner) &&
		currentTarget.contains(popup) &&
		// Only block closing if the popup is actively open. Always-visible lists
		// without open/close state (e.g. cmdk) carry neither attribute and should
		// never block the dialog from closing.
		// - Ariakit sets `data-open="true"` when its popover is open.
		// - Radix sets `data-state="open"` when its popup is open.
		(popup.getAttribute("data-open") === "true" || popup.getAttribute("data-state") === "open")
	) {
		event.preventDefault();
	}
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
