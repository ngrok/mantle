/**
 * Adds the modal `<dialog>` behavior happy-dom lacks. `showModal()` moves
 * focus into the dialog: to its first `autofocus` element, else its first
 * focusable element, else the dialog. `close()` returns focus to the element that had it
 * before `showModal()`. An
 * Escape that no listener prevented sends `cancel` to the last modal that
 * opened, and closes it unless a `cancel` listener prevents that. The browser
 * project runs the real behavior. It installs once per window, because the
 * unit project shares one window across test files.
 *
 * @example
 * ```ts
 * if ("happyDOM" in window) installDialogCloseRequest();
 * ```
 */
const INSTALLED = Symbol.for("@ngrok/mantle/dialog-close-request");

function installDialogCloseRequest(): void {
	const scope = window as Window & { [INSTALLED]?: true };
	if (scope[INSTALLED]) {
		return;
	}
	scope[INSTALLED] = true;
	const modals: HTMLDialogElement[] = [];
	const openers = new WeakMap<HTMLDialogElement, Element | null>();
	const prototype = HTMLDialogElement.prototype;
	// oxlint-disable-next-line typescript/unbound-method -- Why: the shim calls each one with the dialog as `this`.
	const { close, showModal } = prototype;
	prototype.close = function (this: HTMLDialogElement, returnValue?: string) {
		const opener = openers.get(this);
		openers.delete(this);
		close.call(this, returnValue);
		if (opener instanceof HTMLElement && opener.isConnected) {
			opener.focus();
		}
	};
	prototype.showModal = function (this: HTMLDialogElement) {
		openers.set(this, document.activeElement);
		showModal.call(this);
		modals.push(this);
		(
			this.querySelector<HTMLElement>("[autofocus]") ??
			this.querySelector<HTMLElement>(
				"button:not(:disabled), input:not(:disabled), select, textarea, a[href], [tabindex]",
			) ??
			this
		).focus();
	};
	// Why on `window` in the bubble phase: the browser sends the close request
	// as the default action of the key, after every listener ran.
	window.addEventListener("keydown", (event) => {
		const dialog = modals.findLast((modal) => modal.open && modal.isConnected);
		if (event.key !== "Escape" || event.defaultPrevented || dialog == null) {
			return;
		}
		modals.splice(modals.indexOf(dialog), 1);
		if (dialog.dispatchEvent(new Event("cancel", { cancelable: true }))) {
			dialog.close();
		} else {
			modals.push(dialog);
		}
	});
}

export {
	//,
	installDialogCloseRequest,
};
