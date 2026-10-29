import invariant from "tiny-invariant";

/**
 * How many graphemes stay visible at each end of the value.
 */
type SplitCounts = {
	/**
	 * The most graphemes the head shows before the ellipsis. `undefined` lets
	 * the head fill its container.
	 */
	head?: number;
	/**
	 * How many graphemes stay visible at the end of the value.
	 */
	tail: number;
};

/**
 * A value split into the part that may clip and the part that stays visible.
 */
type SplitValue = {
	/**
	 * Everything before the tail. Empty when the value holds `tail` graphemes
	 * or fewer.
	 */
	head: string;
	/**
	 * The first `head` graphemes, which stay visible before the ellipsis. `null`
	 * without a `head` count, or when the value holds `head + tail` graphemes or
	 * fewer and shows whole.
	 */
	lead: string | null;
	/**
	 * The last `tail` graphemes of the value, or the whole value when it is
	 * shorter.
	 */
	tail: string;
	/**
	 * How many graphemes `tail` holds.
	 */
	tailGraphemes: number;
};

let segmenter: Intl.Segmenter | undefined;

/**
 * Splits `value` so that its last `tail` graphemes form the tail, and its
 * first `head` graphemes form the lead.
 *
 * The split lands on a grapheme boundary, so an emoji sequence, a flag, or a
 * letter with a combining mark never splits in half. Throws when a count is
 * negative or not an integer.
 *
 * @example
 * ```ts
 * splitTail("ep_2abcdEFGhijKL123456", { tail: 6 });
 * // { head: "ep_2abcdEFGhijKL", lead: null, tail: "123456", tailGraphemes: 6 }
 *
 * splitTail("ep_2abcdEFGhijKL123456", { head: 3, tail: 6 });
 * // { head: "ep_2abcdEFGhijKL", lead: "ep_", tail: "123456", tailGraphemes: 6 }
 *
 * splitTail("short", { tail: 8 });
 * // { head: "", lead: null, tail: "short", tailGraphemes: 5 }
 * ```
 */
function splitTail(value: string, { head, tail }: SplitCounts): SplitValue {
	invariant(
		Number.isInteger(tail) && tail >= 0,
		`TruncatedText: \`tail\` must be a non-negative integer, received ${String(tail)}.`,
	);
	invariant(
		head == null || (Number.isInteger(head) && head >= 0),
		`TruncatedText: \`head\` must be a non-negative integer, received ${String(head)}.`,
	);

	// Why lazy: a module-level constructor is a side effect a bundler cannot
	// drop from a consumer that never renders the component.
	segmenter ??= new Intl.Segmenter(undefined, { granularity: "grapheme" });
	const graphemes = Array.from(segmenter.segment(value), (segment) => segment.segment);

	if (graphemes.length <= tail) {
		return { head: "", lead: null, tail: value, tailGraphemes: graphemes.length };
	}

	const splitAt = graphemes.length - tail;
	const hasLead = head != null && graphemes.length > head + tail;
	return {
		head: graphemes.slice(0, splitAt).join(""),
		lead: hasLead ? graphemes.slice(0, head).join("") : null,
		tail: graphemes.slice(splitAt).join(""),
		tailGraphemes: tail,
	};
}

export {
	//,
	splitTail,
};

export type {
	//,
	SplitValue,
};
