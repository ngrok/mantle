import invariant from "tiny-invariant";

/**
 * A value split into the part that may clip and the part that stays visible.
 */
type SplitValue = {
	/**
	 * Everything before the tail. Empty when the value holds `count` graphemes
	 * or fewer.
	 */
	head: string;
	/**
	 * The last `count` graphemes of the value, or the whole value when it is
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
 * Splits `value` so that its last `count` graphemes form the tail.
 *
 * The split lands on a grapheme boundary, so an emoji sequence, a flag, or a
 * letter with a combining mark never splits in half. Throws when `count` is
 * negative or not an integer.
 *
 * @example
 * ```ts
 * splitTail("ep_2abcdEFGhijKL123456", 6);
 * // { head: "ep_2abcdEFGhijKL", tail: "123456", tailGraphemes: 6 }
 *
 * splitTail("short", 8);
 * // { head: "", tail: "short", tailGraphemes: 5 }
 * ```
 */
function splitTail(value: string, count: number): SplitValue {
	invariant(
		Number.isInteger(count) && count >= 0,
		`TruncatedText: \`tail\` must be a non-negative integer, received ${String(count)}.`,
	);

	// Why lazy: a module-level constructor is a side effect a bundler cannot
	// drop from a consumer that never renders the component.
	segmenter ??= new Intl.Segmenter(undefined, { granularity: "grapheme" });
	const graphemes = Array.from(segmenter.segment(value), (segment) => segment.segment);

	if (graphemes.length <= count) {
		return { head: "", tail: value, tailGraphemes: graphemes.length };
	}

	const splitAt = graphemes.length - count;
	return {
		head: graphemes.slice(0, splitAt).join(""),
		tail: graphemes.slice(splitAt).join(""),
		tailGraphemes: count,
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
