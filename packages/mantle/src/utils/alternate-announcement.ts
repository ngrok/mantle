/**
 * Make a live-region injection differ from the one before it by alternating an
 * invisible trailing no-break space, advancing `toggle` in place.
 *
 * Two mechanisms need this. React bails out of a `setState` with an identical
 * value, so re-announcing a byte-identical string would never mutate the text
 * node and would say nothing at all (a retried save, a second blocked
 * navigation). And a live region only announces *changes* — Safari/VoiceOver
 * additionally skip repeated identical strings even when the node is rewritten.
 *
 * @example
 * ```ts
 * const toggle = useRef(false);
 * alternateAnnouncement("Saving changes…", toggle); // "Saving changes…"
 * alternateAnnouncement("Saving changes…", toggle); // "Saving changes…" + U+00A0
 * ```
 */
function alternateAnnouncement(text: string, toggle: { current: boolean }): string {
	const padded = toggle.current ? `${text}\u00A0` : text;
	toggle.current = !toggle.current;
	return padded;
}

export {
	//,
	alternateAnnouncement,
};
