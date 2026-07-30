"use client";

import { useEffect } from "react";
import { useCallbackRef } from "../../hooks/use-callback-ref.js";
import { isApplePlatform } from "../../utils/platform.js";

/**
 * The key that opens the command palette together with the platform modifier
 * (`⌘` on macOS, `Ctrl` elsewhere) — the ecosystem-standard chord.
 */
const COMMAND_KEYBOARD_SHORTCUT = "k";

/**
 * Mounted `Command.DialogRoot`s that want the shortcut, in claim order. Only
 * the first claimant handles the keypress; the rest wait and inherit ownership
 * when earlier claimants unmount, so an app that mounts a second palette never
 * opens both with one keypress.
 *
 * This queue is deliberately its own, not shared with `Sidebar`'s `⌘B` queue:
 * per-chord exclusivity is the invariant, and one queue across chords would let
 * a mounted sidebar starve a palette. The two also differ in policy — `⌘B` is
 * suppressed inside every form control because it is "bold" there, while `⌘K`
 * must keep working from a focused text input (see {@link isEditorHost}) — so
 * they have different reasons to change.
 *
 * Module state is safe here: it is only touched from effects, never during
 * server rendering.
 */
const shortcutClaims: Array<symbol> = [];

/**
 * Claims a place in the shortcut ownership queue. The returned `isOwner` is
 * checked per keypress rather than at claim time, so ownership transfers
 * automatically when an earlier claimant releases.
 */
function claimShortcut(): { isOwner: () => boolean; release: () => void } {
	const claim = Symbol("command-keyboard-shortcut");
	shortcutClaims.push(claim);
	return {
		isOwner: () => shortcutClaims[0] === claim,
		release: () => {
			const index = shortcutClaims.indexOf(claim);
			if (index !== -1) {
				shortcutClaims.splice(index, 1);
			}
		},
	};
}

/**
 * Whether an event target is a rich-text or code editor host that owns `⌘K`
 * itself — where the chord is "insert link" (or a chord prefix, in Monaco and
 * VS Code-style keymaps) and a `preventDefault()`ing window listener would
 * steal it.
 *
 * Deliberately narrower than the equivalent guard in `Sidebar`: `<input>` and
 * `<select>` are **not** excluded. A global palette is expected to open from
 * anywhere, including an app's own filter field, and the palette's own
 * `Command.Input` is an `<input>` — excluding it would make the chord unable to
 * close the palette it just opened. `<textarea>` is excluded because that is
 * what Monaco and other code editors attach to; CodeMirror uses
 * `contenteditable`.
 *
 * Apps that need a different policy pass `keyboardShortcut={false}` and bind the
 * chord themselves with `useCommandDialog()`.
 */
function isEditorHost(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) {
		return false;
	}
	return target.isContentEditable || target.tagName === "TEXTAREA";
}

type UseCommandShortcutOptions = {
	/**
	 * Whether to bind the shortcut at all. A disabled root does not claim
	 * ownership, so a sibling root that wants it can take over.
	 */
	enabled: boolean;
	/**
	 * Called when the chord matches. Read through a stable ref, so a caller may
	 * pass a fresh closure every render.
	 */
	onTrigger: () => void;
};

/**
 * Binds `⌘K` (Apple) / `Ctrl+K` (elsewhere) on `window` to `onTrigger`.
 *
 * Exact-modifier match: the two platform modifiers never substitute for each
 * other (accepting either would hijack macOS's native `Ctrl+K`, "kill to end of
 * line", which every macOS text field implements), and `Shift`/`Alt`
 * combinations pass through to the browser.
 *
 * `onTrigger` is read through a stable ref rather than listed as a dependency:
 * a toggle callback's identity changes on every toggle, and re-running the
 * effect would release the claim and re-queue it at the *tail*, handing
 * ownership to a sibling root after the first keypress.
 */
function useCommandShortcut({ enabled, onTrigger }: UseCommandShortcutOptions): void {
	const onTriggerRef = useCallbackRef(onTrigger);

	useEffect(() => {
		if (!enabled) {
			return;
		}

		const claim = claimShortcut();
		// Resolved once per mount rather than per keypress: the host platform
		// cannot change while the window is open. Reading it here (in an effect)
		// and never during render is also what keeps it out of hydration.
		const isApple = isApplePlatform();

		const handleKeyDown = (event: KeyboardEvent) => {
			if (!claim.isOwner()) {
				return;
			}
			// Yield to anything that already handled the chord. cmdk's own vim
			// bindings map `Ctrl+K` to "previous item" inside an open palette and
			// call preventDefault(); on non-Apple platforms this listener would
			// otherwise close the palette out from under that keypress.
			if (event.defaultPrevented) {
				return;
			}
			// Holding the chord must not flap the dialog open and shut.
			if (event.repeat) {
				return;
			}
			if (isEditorHost(event.target)) {
				return;
			}

			const platformModifier = isApple ? event.metaKey : event.ctrlKey;
			const foreignModifier = isApple ? event.ctrlKey : event.metaKey;
			// toLowerCase: with Caps Lock on, browsers report key "K" with
			// shiftKey false — the shortcut must not silently die there.
			if (
				event.key.toLowerCase() === COMMAND_KEYBOARD_SHORTCUT &&
				platformModifier &&
				!foreignModifier &&
				!event.altKey &&
				!event.shiftKey
			) {
				event.preventDefault();
				onTriggerRef();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			claim.release();
		};
	}, [enabled, onTriggerRef]);
}

export {
	//,
	useCommandShortcut,
};
