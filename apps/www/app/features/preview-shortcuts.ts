/**
 * Sends each `⌘` or `Ctrl` keypress that the preview document does not handle
 * to its frame element in the docs page, so the docs page's shortcuts, such as
 * `⌘K` for search, work while focus is in a preview. When the docs page cancels
 * the copy, the preview cancels the keypress, and the browser runs no shortcut
 * of its own.
 *
 * A preview with no same-origin parent has no `frameElement`, so the script
 * does nothing there.
 *
 * Why it stays self-contained: it runs from its source text, so it can use
 * only browser globals.
 */
function forwardPreviewShortcuts() {
	const frame = window.frameElement;
	if (frame == null) {
		return;
	}
	// Why: the docs page's `useHotkeys` ignores these tags and roles by default
	// (`FORM_TAGS_AND_ROLES` in `react-hotkeys-hook`), so a keypress there stays here.
	const fields = [
		"input",
		"textarea",
		"select",
		"searchbox",
		"slider",
		"spinbutton",
		"menuitem",
		"menuitemcheckbox",
		"menuitemradio",
		"option",
		"radio",
		"textbox",
	];
	const forward = (event: KeyboardEvent) => {
		const target = event.target;
		const inField =
			target instanceof HTMLElement &&
			(target.isContentEditable ||
				fields.includes(target.tagName.toLowerCase()) ||
				fields.includes(target.getAttribute("role") ?? ""));
		if (event.defaultPrevented || !(event.metaKey || event.ctrlKey) || inField) {
			return;
		}
		if (!frame.dispatchEvent(new KeyboardEvent(event.type, event))) {
			event.preventDefault();
		}
	};
	// Why move `forward` to the end on each keypress: it must run after the
	// preview's own `window` listeners, such as a demo's `Command.DialogRoot`,
	// which mount after this script. The bubble phase reads the listeners again.
	window.addEventListener(
		"keydown",
		() => {
			window.removeEventListener("keydown", forward);
			window.addEventListener("keydown", forward);
		},
		{ capture: true },
	);
}

/** The source of the inline script that runs `forwardPreviewShortcuts`. */
export const forwardPreviewShortcutsScript = `(${forwardPreviewShortcuts.toString()})()`;
