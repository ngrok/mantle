/**
 * @private
 *
 * Allows any mantle floating prompt (e.g. toasts and notifications) to be interacted with
 * even when a modaled view (e.g. dialog, sheet, etc) is open and a focus trap is active.
 *
 * Without this, interacting with the prompt would close the modaled view.
 *
 * This lives in its own module (rather than `toast.tsx`) so that modaled views
 * can import it without pulling the Toast implementation (and its `sonner`
 * dependency) into their module graph.
 *
 * @example
 * ```ts
 * // a modal surface's press-outside handler: a press on a prompt keeps it open
 * const outside = createPointerDownOutsideEvent(originalEvent);
 * preventCloseOnPromptInteraction(outside);
 * if (!outside.defaultPrevented) close();
 * ```
 */
export function preventCloseOnPromptInteraction(
	event: CustomEvent | PointerEvent | MouseEvent | TouchEvent | FocusEvent,
) {
	if (!(event.target instanceof Element)) {
		return;
	}

	if (event.target.closest(".overlay-prompt")) {
		event.preventDefault();
	}
}
