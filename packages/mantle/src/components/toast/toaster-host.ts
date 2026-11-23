/**
 * The portal host of each mounted `Toaster`. A modal `<dialog>` makes the rest
 * of the page inert and paints in the top layer, so the hosts move into the
 * top open native modal dialog and back to `<body>` when it closes. There the
 * toasts paint above the dialog, take clicks, and stay live for screen readers.
 */
const hosts = new Set<HTMLElement>();

/** The top open native modal `<dialog>`, or `null` when none is open. */
let topModal: HTMLDialogElement | null = null;

/**
 * Puts `host` in the top open native modal dialog, else in `<body>`, and keeps
 * it there as dialogs open and close. Returns the function that removes it.
 *
 * @example
 * ```ts
 * const detach = attachToasterHost(document.createElement("div"));
 * detach(); // the host leaves the document
 * ```
 */
function attachToasterHost(host: HTMLElement): () => void {
	hosts.add(host);
	(topModal ?? host.ownerDocument.body).append(host);
	return () => {
		hosts.delete(host);
		host.remove();
	};
}

/**
 * Moves every `Toaster` host into `dialog`, the top open native modal dialog,
 * or back to `<body>` when `dialog` is `null`.
 *
 * @example
 * ```ts
 * setTopModal(sheetDialog); // toasts now paint above the sheet
 * setTopModal(null); // the sheet closed; toasts go back to `<body>`
 * ```
 */
function setTopModal(dialog: HTMLDialogElement | null): void {
	if (dialog === topModal) {
		return;
	}
	topModal = dialog;
	for (const host of hosts) {
		(dialog ?? host.ownerDocument.body).append(host);
	}
}

export {
	//,
	attachToasterHost,
	setTopModal,
};
