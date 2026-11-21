"use client";

import { useEffect } from "react";

/** Matches a `Button` or `IconButton` that resolved disabled, and each element inside one. */
const DISABLED_BUTTON_SELECTOR =
	'[data-slot~="button"][aria-disabled="true"], [data-slot~="icon-button"][aria-disabled="true"]';

/**
 * Cancels a click on a disabled `Button` or `IconButton`: no navigation, and no
 * React handler runs. Why on the document in the capture phase: it runs before
 * React's root listener, so it also stops the child's own `onClickCapture`.
 */
const cancelDisabledClick = (event: MouseEvent) => {
	if (event.target instanceof Element && event.target.closest(DISABLED_BUTTON_SELECTOR) != null) {
		event.preventDefault();
		event.stopPropagation();
	}
};

/**
 * Makes a disabled `asChild` child inert to clicks, so a disabled link does not
 * navigate. The native `disabled` attribute does nothing on an `<a>`.
 *
 * It renders nothing. `Button` and `IconButton` render it only for a disabled
 * `asChild` child, so the other cases stay server components with no
 * JavaScript.
 *
 * Why no cleanup: each guard adds the same listener, which the document adds
 * once. A cleanup in one guard would remove the listener for the guards that
 * are still mounted.
 */
const DisabledLinkGuard = () => {
	useEffect(() => {
		document.addEventListener("click", cancelDisabledClick, true);
	}, []);
	return null;
};

export {
	//,
	DisabledLinkGuard,
};
