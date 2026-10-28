import {
	type FilterGrammar,
	type FilterKeyDefinition,
	acceptsValueList,
	getFilterKeyDefinition,
	getFilterSyntax,
	resolveFilterKey,
	resolveFilterValue,
} from "./grammar.js";
import { countItemsByQuery, countItemsByRestAndToken } from "./match.js";
import {
	type FacetToken,
	type FilterToken,
	findTokenAtCaret,
	formatFacet,
	isCaretInFacetValue,
	parseFilterQuery,
	quoteFilterValue,
} from "./parse.js";

/**
 * What the suggestion popover offers for the token under the caret.
 *
 * Suggestions carry the exact splice they perform rather than a value for the
 * input to interpret, so the input never re-derives where the token started.
 * Every suggestion writes the canonical spelling, which is how a query typed as
 * `-DESC:api` leaves as `-description:api`.
 */

/** The heading a suggestion sits under. */
type FilterSuggestionSection =
	/** Qualifier keys that narrow the list. */
	| "filters"
	/** The same keys, written to exclude instead. */
	| "exclusions"
	/** Values for the key the caret sits in. */
	| "values";

/** One row of the suggestion popover. */
type FilterSuggestion = {
	/** The heading this row sits under. */
	section: FilterSuggestionSection;
	/** The canonical text the row shows, which is also what it writes. */
	label: string;
	/** One-line explanation, when the grammar has one. */
	description?: string;
	/**
	 * Items left after accepting, when accepting completes a filter and the
	 * caller handed over the items to count.
	 */
	matchCount?: number;
	/** Text that replaces the span between `replaceStart` and `replaceEnd`. */
	insertText: string;
	/** True when accepting finishes a filter rather than opening the value list. */
	completes: boolean;
};

/** The suggestion list, plus the span every row in it replaces. */
type FilterSuggestions = {
	/** Offset where an accepted row starts replacing. */
	replaceStart: number;
	/** Offset where an accepted row stops replacing. */
	replaceEnd: number;
	/** The rows, in display order. */
	items: FilterSuggestion[];
	/**
	 * The canonical key of the qualifier whose value the caret sits in. It is
	 * absent when the caret sits in a key or in free text.
	 */
	key?: string;
};

/** Everything the suggestion list reads. */
type FilterSuggestionsOptions<Item extends object> = {
	/** The grammar of the surface's filter language. */
	grammar: FilterGrammar<Item>;
	/** The whole query, exactly as typed. */
	query: string;
	/** Where the caret sits in that query. */
	caretIndex: number;
	/**
	 * The unfiltered items, for the live match counts. Omit when the query runs
	 * elsewhere and there is nothing to count; the rows then carry no count.
	 */
	items?: Item[];
};

/** Reports whether a candidate answers to what the user has typed so far. */
function matchesTyped(candidate: string, typed: string) {
	return typed === "" || candidate.toLowerCase().includes(typed.toLowerCase());
}

/** Reports whether a qualifier answers to what the user has typed so far. */
function keyMatchesTyped<Item>(
	grammar: FilterGrammar<Item>,
	definition: FilterKeyDefinition<Item>,
	typed: string,
) {
	return matchesTyped(definition.key, typed) || resolveFilterKey(grammar, typed) === definition;
}

/**
 * Reports whether a value answers to what the user has typed so far, through
 * its own spelling or an alias — so a typed alias still offers the canonical
 * value, which is also how that alias gets rewritten to the canonical form.
 */
function valueMatchesTyped<Item>({
	grammar,
	key,
	value,
	typed,
}: {
	grammar: FilterGrammar<Item>;
	key: string;
	value: string;
	typed: string;
}) {
	return matchesTyped(value, typed) || resolveFilterValue(grammar, key, typed) === value;
}

/** A canonical value paired with the copy the suggestion list shows for it. */
type ValueCandidate = {
	/** The canonical value. */
	value: string;
	/** One-line explanation, when the grammar has one. */
	description?: string;
};

/**
 * Lists the values a qualifier can take from its definition. The
 * filter-builder menu shares this, so the two surfaces can never disagree.
 *
 * @example
 * ```ts
 * getValueCandidates(isDefinition); // => [{ value: "active", description: "…" }, …]
 * getValueCandidates(descriptionDefinition); // => [] — free text
 * ```
 */
function getValueCandidates(
	definition: Pick<FilterKeyDefinition<unknown>, "values">,
): ValueCandidate[] {
	const vocabulary = definition.values;
	return vocabulary == null
		? []
		: vocabulary.map(({ value, description }) => ({ value, description }));
}

/** The span a value suggestion replaces, and the value text already inside it. */
type ValueEdit = {
	/** Offset where an accepted row starts replacing. */
	replaceStart: number;
	/** Offset where an accepted row stops replacing. */
	replaceEnd: number;
	/** The value text typed so far in that span. */
	typed: string;
};

/**
 * Works out the span a value suggestion rewrites: the comma member under the
 * caret for a list key, or the whole value otherwise.
 *
 * A member's span covers its quotes, so accepting a row over `"GET"` rewrites
 * the quotes with it. A caret in an empty run, as after `is:active,`, has no
 * member; the row then inserts at the caret. An empty quoted run (`is:"`,
 * `is:""`) has no member either, so the edit takes its quotes.
 */
function getValueEdit<Item>({
	grammar,
	definition,
	token,
	query,
	caretIndex,
}: {
	grammar: FilterGrammar<Item>;
	definition: FilterKeyDefinition<Item>;
	token: FacetToken;
	query: string;
	caretIndex: number;
}): ValueEdit {
	if (!acceptsValueList(grammar, definition)) {
		return { replaceStart: token.colonIndex + 1, replaceEnd: token.end, typed: token.rawValue };
	}

	const member = token.members.find(
		(candidate) => caretIndex >= candidate.start && caretIndex <= candidate.end,
	);
	if (member == null) {
		let replaceStart = caretIndex;
		let replaceEnd = caretIndex;
		while (
			replaceStart > token.colonIndex + 1 &&
			replaceEnd - replaceStart < 2 &&
			query.charAt(replaceStart - 1) === '"'
		) {
			replaceStart -= 1;
		}
		while (
			replaceEnd < token.end &&
			replaceEnd - replaceStart < 2 &&
			query.charAt(replaceEnd) === '"'
		) {
			replaceEnd += 1;
		}
		return { replaceStart, replaceEnd, typed: "" };
	}
	return { replaceStart: member.start, replaceEnd: member.end, typed: member.rawValue };
}

/** Builds the value rows for the qualifier member the caret sits in. */
function getValueSuggestions<Item extends object>(
	token: FacetToken,
	{ grammar, query, caretIndex, items }: FilterSuggestionsOptions<Item>,
): FilterSuggestions {
	const definition = getFilterKeyDefinition(grammar, token.key);
	if (definition == null) {
		return { replaceStart: caretIndex, replaceEnd: caretIndex, items: [] };
	}

	const { replaceStart, replaceEnd, typed } = getValueEdit({
		grammar,
		definition,
		token,
		query,
		caretIndex,
	});

	// Values already picked by the token's other members would only repeat
	// themselves, so `is:active,` offers everything but `active`.
	const pickedElsewhere = new Set(
		token.members
			.filter((member) => member.start !== replaceStart || member.end !== replaceEnd)
			.map((member) => member.value.toLowerCase()),
	);

	// Every row rewrites only this token. Without an `OR`, the query is one AND
	// group, so the rest of it filters the items once for all the rows.
	const restQuery = `${query.slice(0, token.start)} ${query.slice(token.end)}`;
	const isOneGroup = !parseFilterQuery(grammar, query).some((other) => other.kind === "or");
	const quotes = getFilterSyntax(grammar) !== "qualifiers";

	function countAccepted(insertText: string) {
		if (items == null) {
			return undefined;
		}
		const accepted = query.slice(0, replaceStart) + insertText + query.slice(replaceEnd);
		if (!isOneGroup) {
			return countItemsByQuery(grammar, items, accepted);
		}
		return countItemsByRestAndToken({
			grammar,
			items,
			query: accepted,
			restQuery,
			tokenQuery:
				query.slice(token.start, replaceStart) + insertText + query.slice(replaceEnd, token.end),
		});
	}

	const rows = getValueCandidates(definition)
		.filter((candidate) =>
			valueMatchesTyped({ grammar, key: definition.key, value: candidate.value, typed }),
		)
		.filter((candidate) => !pickedElsewhere.has(candidate.value.toLowerCase()))
		.map((candidate): FilterSuggestion => {
			// A `"qualifiers"` grammar reads quotes as literal text, so it takes the value as is.
			const insertText = quotes ? quoteFilterValue(candidate.value) : candidate.value;

			return {
				section: "values",
				label: candidate.value,
				description: candidate.description,
				// Counting with the real matcher over the accepted query is the
				// honest number; the count cache keeps it one scan per distinct
				// query, so caret moves re-ask for free.
				matchCount: countAccepted(insertText),
				insertText,
				completes: true,
			};
		});

	return { replaceStart, replaceEnd, items: rows, key: definition.key };
}

/** The span a qualifier suggestion replaces, and the key text already inside it. */
type KeyEdit = {
	/** Offset where an accepted row starts replacing. */
	replaceStart: number;
	/** Offset where an accepted row stops replacing. */
	replaceEnd: number;
	/** The key text typed so far. */
	typed: string;
	/** True when the token already carries a leading `-`. */
	negated: boolean;
};

/** Works out what part of the query a qualifier suggestion would rewrite. */
function getKeyEdit(query: string, caretIndex: number, token: FilterToken | undefined): KeyEdit {
	if (token == null) {
		return { replaceStart: caretIndex, replaceEnd: caretIndex, typed: "", negated: false };
	}

	const keyStart = token.start + (token.negated ? 1 : 0);

	if (token.kind === "facet") {
		// Replacing through the `:` keeps a value that is already typed, so
		// rewriting `desc:api` to `description:` does not throw `api` away.
		return {
			replaceStart: token.start,
			replaceEnd: token.colonIndex + 1,
			typed: query.slice(keyStart, token.colonIndex),
			negated: token.negated,
		};
	}

	return {
		replaceStart: token.start,
		replaceEnd: token.end,
		typed: token.text,
		negated: token.negated,
	};
}

/** Builds one qualifier row. */
function toKeySuggestion<Item>(
	definition: FilterKeyDefinition<Item>,
	{ section, negated }: { section: FilterSuggestionSection; negated: boolean },
): FilterSuggestion {
	const text = formatFacet({ key: definition.key, value: "", negated });

	return {
		section,
		label: text,
		description: definition.description,
		insertText: text,
		// Picking a key only opens its values; the filter is not finished yet.
		completes: false,
	};
}

/** Builds the qualifier rows for a caret that is not inside a value. */
function getKeySuggestions<Item>({
	grammar,
	query,
	caretIndex,
	token,
}: {
	grammar: FilterGrammar<Item>;
	query: string;
	caretIndex: number;
	token: FilterToken | undefined;
}): FilterSuggestions {
	const syntax = getFilterSyntax(grammar);
	// A lone `-` parses as text until a key follows it. Where `-` excludes, it starts an exclusion.
	const { replaceStart, replaceEnd, typed, negated } =
		syntax !== "qualifiers" && token?.kind === "text" && !token.negated && token.text === "-"
			? { replaceStart: token.start, replaceEnd: token.end, typed: "", negated: true }
			: getKeyEdit(query, caretIndex, token);
	const matching = grammar.keys.filter((definition) => keyMatchesTyped(grammar, definition, typed));
	const negatable = matching.filter((definition) => definition.negatable !== false);

	// A typed `-` already made every row an exclusion, so a key that cannot
	// exclude has no row to offer.
	const filters = (negated ? negatable : matching).map((definition) =>
		toKeySuggestion(definition, { section: "filters", negated }),
	);

	// A typed `-` already made every row an exclusion; do not offer them twice.
	// A grammar without negation has no exclusions to offer at all.
	if (negated || syntax === "qualifiers") {
		return { replaceStart, replaceEnd, items: filters };
	}

	const exclusions = negatable.map((definition) =>
		toKeySuggestion(definition, { section: "exclusions", negated: true }),
	);

	return { replaceStart, replaceEnd, items: [...filters, ...exclusions] };
}

/**
 * Builds the suggestion list for the token under the caret: values when the
 * caret sits past a `:`, qualifier keys otherwise.
 *
 * @example
 * ```ts
 * getFilterSuggestions({ grammar, query: "is:", caretIndex: 3, items });
 * // => { replaceStart: 3, replaceEnd: 3, items: [{ label: "active", matchCount: 2, … }, …] }
 * ```
 */
function getFilterSuggestions<Item extends object>(
	options: FilterSuggestionsOptions<Item>,
): FilterSuggestions {
	const { grammar, query, caretIndex } = options;
	const clampedCaret = Math.min(Math.max(caretIndex, 0), query.length);
	const token = findTokenAtCaret(parseFilterQuery(grammar, query), clampedCaret);

	if (token != null && isCaretInFacetValue(token, clampedCaret)) {
		return getValueSuggestions(token, { ...options, caretIndex: clampedCaret });
	}

	return getKeySuggestions({ grammar, query, caretIndex: clampedCaret, token });
}

export {
	//,
	getFilterSuggestions,
	getValueCandidates,
};

export type {
	//,
	FilterSuggestion,
	FilterSuggestionSection,
	FilterSuggestions,
	FilterSuggestionsOptions,
	ValueCandidate,
};
