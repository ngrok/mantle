/**
 * The portal host of each mounted `Toaster` and `Sandbar`. A modal `<dialog>`
 * makes the rest of the page inert and paints in the top layer, so the hosts
 * move into the top open native modal dialog and back to `<body>` when it
 * closes. There the toasts and the bar paint above the dialog, take clicks,
 * and stay live for screen readers.
 */
const hosts = new Set<HTMLElement>();

/** The top open native modal `<dialog>`, or `null` when none is open. */
let topModal: HTMLDialogElement | null = null;

/** The functions that `setTopModal` calls after the top modal changes. */
const topModalListeners = new Set<() => void>();

/**
 * Calls `listener` after the top open native modal dialog changes, for
 * `useSyncExternalStore`. Returns the function that stops it.
 */
function subscribeTopModal(listener: () => void): () => void {
	topModalListeners.add(listener);
	return () => {
		topModalListeners.delete(listener);
	};
}

/** Returns the top open native modal `<dialog>`, or `null` when none is open. */
function getTopModal(): HTMLDialogElement | null {
	return topModal;
}

/**
 * Puts `host` in the top open native modal dialog, else in `<body>`, and keeps
 * it there as dialogs open and close. Returns the function that removes it.
 *
 * @example
 * ```ts
 * const detach = attachPromptHost(document.createElement("div"));
 * detach(); // the host leaves the document
 * ```
 */
function attachPromptHost(host: HTMLElement): () => void {
	hosts.add(host);
	(topModal ?? host.ownerDocument.body).append(host);
	return () => {
		hosts.delete(host);
		host.remove();
	};
}

/**
 * Moves every host into `dialog`, the top open native modal dialog,
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
		// Why the check: a dialog can open from inside a host, such as a confirm
		// in a Sandbar, and a host cannot move into its own descendant.
		if (dialog == null || !host.contains(dialog)) {
			(dialog ?? host.ownerDocument.body).append(host);
		}
	}
	for (const listener of topModalListeners) {
		listener();
	}
}

export {
	//,
	attachPromptHost,
	getTopModal,
	setTopModal,
	subscribeTopModal,
};
