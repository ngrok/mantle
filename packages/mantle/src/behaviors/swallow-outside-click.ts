/**
 * Cancels the click that follows an outside press that closes a popup, so the
 * press does not also activate what is under it. Call it from the press's
 * `pointerdown`. A cancelled press or the next press lets the next click through.
 *
 * Why on the window: the press closes the popup before its click arrives.
 * Why skip `detail` 0: a keyboard or script click has no press, so a press that
 * makes no click, such as on a disabled button, cannot eat it.
 *
 * @example
 * ```ts
 * document.addEventListener("pointerdown", (event) => {
 *   if (event.button === 0 && event.target instanceof Node && !popup.contains(event.target)) {
 *     swallowOutsideClick();
 *     close();
 *   }
 * }, { capture: true });
 * ```
 */
function swallowOutsideClick(): void {
	const swallow = (click: MouseEvent) => {
		if (click.detail === 0) {
			return;
		}
		click.preventDefault();
		click.stopPropagation();
		release();
	};
	const release = () => {
		window.removeEventListener("click", swallow, { capture: true });
		window.removeEventListener("pointercancel", release, { capture: true });
		window.removeEventListener("pointerdown", release, { capture: true });
	};
	window.addEventListener("click", swallow, { capture: true });
	window.addEventListener("pointercancel", release, { capture: true });
	// Why this press does not release it: it has passed the window already.
	window.addEventListener("pointerdown", release, { capture: true });
}

export {
	//,
	swallowOutsideClick,
};
