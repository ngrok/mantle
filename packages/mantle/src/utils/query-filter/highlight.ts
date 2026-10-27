import { type FilterGrammar, getFilterKeyDefinition, getFilterSyntax } from "./grammar.js";
import { parseFilterQuery } from "./parse.js";

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
	 * Under the `"conjunction"` syntax, also a run the executor cannot run: a
	 * bare term, or a `-` on a key that is not negatable.
	 */
	| "invalid"
	/** A bare search term. */
	| "text"
	/** The `OR` between two filter groups. */
	| "operator"
	/** The `-` and `:` that give a token its shape. */
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

	for (const token of parseFilterQuery(grammar, query)) {
		push(token.start, "plain");

		if (token.kind === "or" || token.kind === "and") {
			push(token.end, "operator");
			continue;
		}

		// A conjunction executor reads no free text, so the whole term is wrong,
		// its dash included.
		if (token.kind === "text" && conjunction) {
			push(token.end, "invalid");
			continue;
		}

		if (token.negated) {
			const negatable =
				token.kind !== "facet" || getFilterKeyDefinition(grammar, token.key)?.negatable !== false;
			push(token.start + 1, negatable ? "syntax" : "invalid");
		}

		if (token.kind === "facet") {
			push(token.colonIndex, "key");
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
