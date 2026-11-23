import { parseBooleanish } from "../../types/booleanish.js";

/**
 * Whether `target` is the backdrop of a dialog. A press on the backdrop, or on
 * the area around the panel, targets the `<dialog>` itself, which carries
 * `data-overlay`.
 *
 * @example
 * ```tsx
 * <Sheet.Content
 *   onPointerDownOutside={(event) => {
 *     if (!isDialogOverlayTarget(event.target)) {
 *       event.preventDefault();
 *     }
 *   }}
 * />
 * ```
 */
function isDialogOverlayTarget(target: EventTarget | null): boolean {
	if (target instanceof HTMLElement) {
		return target.hasAttribute("data-overlay");
	}
	return false;
}

/**
 * Whether an Escape pressed at `target` belongs to a popup open inside
 * `container`, so the surface that owns `container` must stay open. The popup
 * owner is the nearest ancestor of `target`, else of the focused element, with
 * `aria-expanded="true"` and `aria-controls`; its popup must sit inside
 * `container` and be open (`data-open`). An always-visible list carries no
 * `data-open` and never claims the Escape.
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
		popup.hasAttribute("data-open")
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
 * Narrows an event target to an HTMLElement so DOM traversal helpers can be used safely.
 */
function isHTMLElement(value: EventTarget | null): value is HTMLElement {
	return value instanceof HTMLElement;
}

export {
	//,
	escapeBelongsToNestedPopup,
	isDialogOverlayTarget,
};
