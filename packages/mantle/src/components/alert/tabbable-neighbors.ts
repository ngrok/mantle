/**
 * Elements the browser puts in the tab order when nothing disables or hides
 * them. `[tabindex]` also matches negative values; `isTabbable` drops those.
 */
const TABBABLE_CANDIDATE_SELECTOR =
	'a[href], area[href], button, input, select, textarea, iframe, summary, audio[controls], video[controls], [contenteditable]:not([contenteditable="false"]), [tabindex]';

/**
 * Whether a Tab press can reach `element`: it is an `HTMLElement` with a
 * non-negative `tabIndex`, not disabled, not a hidden input, not inside a
 * `hidden` or `inert` subtree, and rendered.
 *
 * Why the `checkVisibility` guard: Safari added it in 17.4, so an older engine
 * counts the element as visible instead of throwing.
 */
function isTabbable(element: Element): element is HTMLElement {
	if (!(element instanceof HTMLElement)) {
		return false;
	}
	if (element.tabIndex < 0 || element.matches(":disabled")) {
		return false;
	}
	if (element instanceof HTMLInputElement && element.type === "hidden") {
		return false;
	}
	if (element.closest("[hidden], [inert]") != null) {
		return false;
	}
	if (typeof element.checkVisibility === "function" && !element.checkVisibility()) {
		return false;
	}
	return true;
}

/**
 * The tabbable elements outside `anchor`, ordered by where keyboard focus
 * should land when `anchor` leaves the document: every tabbable after it in
 * document order, nearest first, then every tabbable before it, nearest first.
 * Elements inside `anchor` leave with it, so they never count. Returns an
 * empty array when the document has no other tabbable.
 *
 * The caller focuses the first element that is still connected, because the
 * unmount that removes `anchor` can remove its nearest neighbor too.
 *
 * @example
 * ```ts
 * // <button>Before</button> <div id="alert">…</div> <button>After</button>
 * findTabbableNeighbors(alert); // → [afterButton, beforeButton]
 * ```
 */
function findTabbableNeighbors(anchor: Element): HTMLElement[] {
	const following: HTMLElement[] = [];
	const preceding: HTMLElement[] = [];
	for (const candidate of anchor.ownerDocument.querySelectorAll(TABBABLE_CANDIDATE_SELECTOR)) {
		if (anchor.contains(candidate) || !isTabbable(candidate)) {
			continue;
		}
		const position = anchor.compareDocumentPosition(candidate);
		if ((position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0) {
			following.push(candidate);
		} else {
			preceding.push(candidate);
		}
	}
	preceding.reverse();
	return [...following, ...preceding];
}

export {
	//,
	findTabbableNeighbors,
};
