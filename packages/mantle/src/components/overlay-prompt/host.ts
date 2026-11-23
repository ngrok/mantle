/**
 * The hosts of each mounted `OverlayPrompt`, with the element each one calls
 * home. A modal `<dialog>` makes the rest of the page inert and paints in the
 * top layer, so a host moves into the top open native modal dialog and back
 * home when it closes. There its content paints above the dialog, takes
 * clicks and focus, and stays live for screen readers.
 *
 * Why a host and not the element that React renders: React removes and
 * inserts its own nodes in the parent where it put them, and throws when one
 * has moved. React never moves a portal's container, so a move is safe.
 */
const hosts = new Map<HTMLElement, Element>();

/** The top open native modal `<dialog>`, or `null` when none is open. */
let topModal: HTMLDialogElement | null = null;

/**
 * Moves `host` to the end of `parent`. Why `moveBefore` where it exists: it
 * keeps the state of the content, so a frame does not reload and focus stays.
 */
function moveHost(host: HTMLElement, parent: Element): void {
	if (host.parentElement === parent) {
		return;
	}
	if (host.isConnected && parent.isConnected && "moveBefore" in parent) {
		parent.moveBefore(host, null);
	} else {
		parent.append(host);
	}
}

/**
 * Puts `host` where it belongs: in the top open modal dialog, else in `home`.
 * It stays home in a dialog that holds its home, which it can already reach.
 * It stays where it is while it holds an open modal, such as a confirm that
 * opens from it: a move without `moveBefore` takes that dialog out of the top
 * layer and closes a popover around it. Why both checks: `topModal` is not
 * `:modal` yet as it opens, and a closing one still is.
 */
function placeHost(host: HTMLElement, home: Element): void {
	if (topModal != null && host.contains(topModal)) {
		return;
	}
	if (host.querySelector("dialog:modal") != null) {
		return;
	}
	moveHost(host, topModal == null || topModal.contains(home) ? home : topModal);
}

/**
 * Keeps `host` in the top open native modal dialog while one is open, else in
 * `home`. Returns the function that removes it.
 *
 * @example
 * ```ts
 * const detach = attachPromptHost(document.createElement("div"), anchor);
 * detach(); // the host leaves the document
 * ```
 */
function attachPromptHost(host: HTMLElement, home: Element): () => void {
	hosts.set(host, home);
	placeHost(host, home);
	return () => {
		hosts.delete(host);
		host.remove();
	};
}

/**
 * Moves every host into `dialog`, the top open native modal dialog, or back
 * home when `dialog` is `null`.
 *
 * @example
 * ```ts
 * setTopModal(sheetDialog); // prompts now paint above the sheet
 * setTopModal(null); // the sheet closed; prompts go back home
 * ```
 */
function setTopModal(dialog: HTMLDialogElement | null): void {
	if (dialog === topModal) {
		return;
	}
	topModal = dialog;
	for (const [host, home] of hosts) {
		placeHost(host, home);
	}
}

export {
	//,
	attachPromptHost,
	setTopModal,
};
