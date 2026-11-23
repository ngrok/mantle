/**
 * Adds the popover methods happy-dom lacks: `showPopover()` and
 * `hidePopover()`, each with a `beforetoggle` event, and `togglePopover()`.
 * The shim keeps no top layer and never matches `:popover-open`. The browser
 * project runs the real API.
 *
 * @example
 * ```ts
 * if ("happyDOM" in window) installPopoverApi();
 * ```
 */
function installPopoverApi(): void {
	const shown = new WeakSet<HTMLElement>();
	const toggle = (element: HTMLElement, { open }: { open: boolean }) => {
		if (shown.has(element) === open) {
			return;
		}
		element.dispatchEvent(
			Object.assign(new Event("beforetoggle", { cancelable: open }), {
				oldState: open ? "closed" : "open",
				newState: open ? "open" : "closed",
			}),
		);
		if (open) {
			shown.add(element);
		} else {
			shown.delete(element);
		}
	};
	Object.assign(HTMLElement.prototype, {
		showPopover(this: HTMLElement) {
			toggle(this, { open: true });
		},
		hidePopover(this: HTMLElement) {
			toggle(this, { open: false });
		},
		togglePopover(this: HTMLElement, force?: boolean) {
			const open = force ?? !shown.has(this);
			toggle(this, { open });
			return open;
		},
	});
}

export {
	//,
	installPopoverApi,
};
