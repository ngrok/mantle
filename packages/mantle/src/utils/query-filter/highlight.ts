import { type FilterGrammar, getFilterKeyDefinition, getFilterSyntax } from "./grammar.js";
import { getEffectiveNegations, parseFilterQuery } from "./parse.js";

/**
 * Splits a filter query into coloured runs for the overlay that sits behind the
 * caret in `QueryFilterInput`.
 *
 * The segments always concatenate back to the exact input, whitespace and quote
 * characters included. The overlay is a second copy of the same string painted
 * under a transparent input, so a dropped character would slide every glyph
 * after it out of line with the caret.
 */

/** How one run of the query reads in the grammar. */
type HighlightSegmentKind =
	/** A qualifier key, up to but not including the `:`. */
	| "key"
	/** A qualifier value the grammar recognizes. */
	| "value"
	/**
	 * A qualifier value that matches no alias, so the filter matches nothing.
	 * Also a value that does not parse for its key's type, or an operator the
	 * key does not accept. Also the negation of a key that is not negatable:
	 * its `-`, or its key when a `NOT` or a group negates it. Under the
	 * `"conjunction"` syntax, also a bare term, which the executor cannot run.
	 */
	| "invalid"
	/** A bare search term. */
	| "text"
	/** An `OR`, `AND`, or `NOT`, or a parenthesis of a group. */
	| "operator"
	/** The `-`, `!`, and `:` that give a token its shape. */
	| "syntax"
	/** Whitespace between tokens. */
	| "plain";

/** One coloured run of the query. */
type HighlightSegment = {
	/** Offset of the run's first character in the source query. */
	start: number;
	/** The exact source text of this run. */
	text: string;
	/** How the run reads in the grammar. */
	kind: HighlightSegmentKind;
};

/**
 * Splits a filter query into segments for the syntax-highlighting overlay.
 *
 * @example
 * ```ts
 * getHighlightSegments(grammar, "is:bogus");
 * // => [{ start: 0, text: "is", kind: "key" },
 * //     { start: 2, text: ":", kind: "syntax" },
 * //     { start: 3, text: "bogus", kind: "invalid" }]
 * ```
 */
function getHighlightSegments<Item>(
	grammar: FilterGrammar<Item>,
	query: string,
): HighlightSegment[] {
	const segments: HighlightSegment[] = [];
	const conjunction = getFilterSyntax(grammar) === "conjunction";
	let cursor = 0;

	function push(end: number, kind: HighlightSegmentKind) {
		const text = query.slice(cursor, end);
		if (text !== "") {
			segments.push({ start: cursor, text, kind });
		}
		cursor = end;
	}

	const tokens = parseFilterQuery(grammar, query);
	const negations = getEffectiveNegations(tokens);

	for (const [index, token] of tokens.entries()) {
		push(token.start, "plain");

		if (token.kind === "group-start" && token.negated) {
			push(token.start + 1, "syntax");
		}
		if (token.kind !== "facet" && token.kind !== "text") {
			push(token.end, "operator");
			continue;
		}

		// A conjunction executor reads no free text, so the whole term is wrong,
		// its dash included.
		if (token.kind === "text" && conjunction) {
			push(token.end, "invalid");
			continue;
		}

		// Why effective negation: `NOT -key:value` cancels out, and `NOT key:value`
		// negates a key with no `-` of its own. The checker reads negation the same way.
		const forbidden =
			token.kind === "facet" &&
			negations[index] === true &&
			getFilterKeyDefinition(grammar, token.key)?.negatable === false;
		if (token.negated) {
			push(token.start + 1, forbidden ? "invalid" : "syntax");
		}

		if (token.kind === "facet") {
			push(token.colonIndex, forbidden && !token.negated ? "invalid" : "key");
			push(token.colonIndex + 1, "syntax");
			for (const member of token.members) {
				// The gap before a member is its separating comma.
				push(member.start, "syntax");
				push(member.end, member.isKnownValue ? "value" : "invalid");
			}
			// A trailing comma, or a comma-only value, is syntax too.
			push(token.end, "syntax");
			continue;
		}

		push(token.end, "text");
	}

	push(query.length, "plain");

	return segments;
}

export {
	//,
	getHighlightSegments,
};

export type {
	//,
	HighlightSegment,
	HighlightSegmentKind,
};
