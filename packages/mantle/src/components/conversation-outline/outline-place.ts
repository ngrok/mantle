/** The vertical edges of a box, as `getBoundingClientRect` returns them. */
type Edges = { top: number; bottom: number };

/** Where the reader is in a conversation, for `ConversationOutline`. */
type OutlinePlace = {
	/** For each message, whether any of it shows in the viewport. */
	inView: boolean[];
	/**
	 * The index of the current message: the first in view, else the last one
	 * above the view. `-1` when every message is below the view or missing.
	 */
	current: number;
};

/**
 * Finds which messages show in `viewport` and which one the reader is at.
 * A `null` entry is a message that is not in the document; it is never in
 * view and never current.
 *
 * @example
 * ```ts
 * outlinePlace([{ top: -200, bottom: -100 }, { top: 50, bottom: 90 }], { top: 0, bottom: 600 });
 * // { inView: [false, true], current: 1 }
 * ```
 */
function outlinePlace(messages: (Edges | null)[], viewport: Edges): OutlinePlace {
	const inView = messages.map(
		(message) => message != null && message.bottom > viewport.top && message.top < viewport.bottom,
	);
	let current = inView.indexOf(true);
	if (current === -1) {
		current = messages.findLastIndex(
			(message) => message != null && message.bottom <= viewport.top,
		);
	}
	return { inView, current };
}

export {
	//,
	outlinePlace,
};

export type {
	//,
	Edges,
	OutlinePlace,
};
