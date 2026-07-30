/**
 * What a keystroke or paste on a search trigger should do to the command
 * palette. A search trigger looks like a text field but is a `<button>` — it
 * has no editable value — so every input event it receives has to be
 * classified before it can mean anything.
 *
 * Three outcomes, because "type into the trigger" has three honest answers:
 *
 * - `"seed"` — the event carried text. Open the palette with `query` already
 *   in `Command.Input`.
 * - `"open"` — the event was text *intent* that cannot be replayed (an IME
 *   composition belongs to the element that started it). Open the palette with
 *   an empty query so the next keystroke has a real text field to land in.
 * - `"ignore"` — the event was navigation, a modifier chord, or the button's
 *   own activation keys. Leave the palette alone.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#searchactionfromkeydown
 *
 * @example
 * ```tsx
 * const { openWithQuery } = useCommandDialog();
 *
 * const applyAction = (action: SearchAction) => {
 *   switch (action.type) {
 *     case "seed":
 *       openWithQuery(action.query);
 *       break;
 *     case "open":
 *       openWithQuery();
 *       break;
 *     case "ignore":
 *       break;
 *   }
 * };
 * ```
 */
type SearchAction =
	| {
			type: "seed";
			/**
			 * The text to open the palette with. A single character for a keystroke,
			 * the pasted text (collapsed to one line) for a paste.
			 */
			query: string;
	  }
	| { type: "open" }
	| { type: "ignore" };

/**
 * The properties {@link searchActionFromKeyDown} reads. Satisfied by a native
 * `KeyboardEvent` — pass `event.nativeEvent` from a React handler, since
 * React's synthetic keyboard event does not carry `isComposing`.
 */
type SearchKeyDownEvent = {
	altKey: boolean;
	ctrlKey: boolean;
	isComposing: boolean;
	key: string;
	/**
	 * Optional so a hand-built test event can omit it.
	 *
	 * Why a deprecated property: `229` is the only reliable marker for the
	 * keydown that *starts* an IME composition, where `isComposing` is still
	 * `false` and `key` varies by engine. There is no non-deprecated
	 * replacement — cmdk reads it for the same reason.
	 */
	keyCode?: number;
	metaKey: boolean;
};

/**
 * The properties {@link searchActionFromPaste} reads. Satisfied by both a
 * native `ClipboardEvent` and React's synthetic one.
 */
type SearchPasteEvent = {
	clipboardData: Pick<DataTransfer, "getData"> | null;
};

/**
 * The keys that activate a `<button>`. The activation fires a `click`, which
 * opens the palette on its own — seeding them would put a stray `" "` in the
 * query and double-handle `Enter`.
 */
const activationKeys = new Set([" ", "Enter"]);

/**
 * Classifies a `keydown` on a search trigger. Pure, so the whole policy is
 * testable without a DOM: see the {@link SearchAction} cases for what each
 * outcome means.
 *
 * The policy, and why:
 *
 * - **IME composition → `"open"`.** A composition session is bound to the
 *   element that started it and cannot be forwarded, so seeding is impossible;
 *   opening empty at least lands the user in a real text field instead of
 *   swallowing the keystroke. This is the case the blog's original trigger got
 *   wrong — it silently did nothing for CJK input. Engines that route dead keys
 *   through the IME path report them the same way (Chrome on macOS sends
 *   `key: "Dead"` with `keyCode: 229` for `⌥e`), so those open empty too rather
 *   than falling through to the named-key case below.
 * - **Any of `⌘` / `Ctrl` / `Alt` held → `"ignore"`.** Those are shortcuts, not
 *   text: the palette's own `⌘K`, `⌘V` (the paste path handles it), and the
 *   browser/OS accelerators. `Alt` is excluded even though macOS `⌥` produces
 *   real characters, because seeding one means calling `preventDefault()` on
 *   Windows `Alt` accelerators (`Alt+D`, `Alt+Home`) — the worse trade.
 *   `Shift` is not a modifier here; it is already reflected in `key`.
 * - **`Enter` / `Space` → `"ignore"`.** The button's own activation keys.
 * - **A single code point → `"seed"`.** Counted by spreading rather than
 *   `.length`, so astral characters (emoji, less common CJK) count as one
 *   instead of two and are not dropped. Every named key (`"Tab"`,
 *   `"ArrowDown"`, `"Dead"`, `"Unidentified"`) is longer and falls through —
 *   except when the engine also flags it as IME processing, which the case
 *   above claims first.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#searchactionfromkeydown
 *
 * @example
 * ```tsx
 * <button
 *   type="button"
 *   onKeyDown={(event) => {
 *     const action = searchActionFromKeyDown(event.nativeEvent);
 *     if (action.type === "seed") {
 *       event.preventDefault();
 *       openWithQuery(action.query);
 *     } else if (action.type === "open") {
 *       openWithQuery();
 *     }
 *   }}
 * >
 *   Search…
 * </button>
 * ```
 */
function searchActionFromKeyDown(event: SearchKeyDownEvent): SearchAction {
	if (event.isComposing || event.key === "Process" || event.keyCode === 229) {
		return { type: "open" };
	}

	if (event.metaKey || event.ctrlKey || event.altKey) {
		return { type: "ignore" };
	}

	if (activationKeys.has(event.key)) {
		return { type: "ignore" };
	}

	if ([...event.key].length === 1) {
		return { type: "seed", query: event.key };
	}

	return { type: "ignore" };
}

/**
 * Classifies a `paste` on a search trigger. A paste is unambiguous search
 * intent — a control that looks like a text field will be pasted into — so it
 * always opens the palette, and seeds it whenever the clipboard holds text.
 * Never returns `"ignore"`.
 *
 * The text is collapsed to a single space-separated line because the palette's
 * query is a one-line field: pasting a multi-line selection should search for
 * its words, not embed newlines that no item can match.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#searchactionfrompaste
 *
 * @example
 * ```tsx
 * <button
 *   type="button"
 *   onPaste={(event) => {
 *     const action = searchActionFromPaste(event.nativeEvent);
 *     openWithQuery(action.type === "seed" ? action.query : undefined);
 *   }}
 * >
 *   Search…
 * </button>
 * ```
 */
function searchActionFromPaste(event: SearchPasteEvent): SearchAction {
	const text = event.clipboardData?.getData("text/plain") ?? "";
	const query = text.replace(/\s+/g, " ").trim();

	if (query === "") {
		return { type: "open" };
	}

	return { type: "seed", query };
}

export {
	//,
	searchActionFromKeyDown,
	searchActionFromPaste,
};

export type {
	//,
	SearchAction,
	SearchKeyDownEvent,
	SearchPasteEvent,
};
