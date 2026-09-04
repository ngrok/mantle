/**
 * Interactive content that handles its own click: form controls, links,
 * `<details>` (a `<summary>` toggles it), labels, and the ARIA widget roles a
 * custom control renders. A click-forwarding ancestor (a `List` row, a
 * `Choice.Description`) defers to these, so one click never acts twice.
 *
 * Why not the whole HTML interactive-content set: an `<iframe>` or `<embed>`
 * click never reaches this document, and the rest (media controls, image
 * maps) is not content a row or a description hosts.
 */
const INTERACTIVE_TARGET_SELECTOR =
	'a[href], button, details, input, select, textarea, label, [role="button"], [role="link"], [role="menuitem"], [contenteditable="true"]';

/**
 * Whether a click landed on interactive content inside `within`, so a
 * click-forwarding ancestor should defer to it. Interactive ancestors outside
 * `within` do not count, and a non-element target never does. Pure over the
 * DOM.
 *
 * @example
 * ```ts
 * // click on the row's checkbox → true (activation must not fire twice)
 * isInteractiveTarget(checkboxElement, rowElement); // → true
 * // click on the row's description text → false (the row activates)
 * isInteractiveTarget(descriptionElement, rowElement); // → false
 * ```
 */
function isInteractiveTarget(target: EventTarget | null, within: Element): boolean {
	if (!(target instanceof Element)) {
		return false;
	}
	const interactive = target.closest(INTERACTIVE_TARGET_SELECTOR);
	return interactive != null && within.contains(interactive);
}

export {
	//,
	isInteractiveTarget,
};
