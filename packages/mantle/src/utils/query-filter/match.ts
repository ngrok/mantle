import { type FilterGrammar, type FilterMatchContext, getFilterKeyDefinition } from "./grammar.js";
import { type FacetToken, type FilterToken, parseFilterQuery } from "./parse.js";

/**
 * Turns a parsed filter query into a filtered item list.
 *
 * Matching is exact and case-insensitive: no fuzzy scoring, no typo recovery.
 * Identifiers are pasted, not recalled, and a false positive ranked above the
 * row you pasted is worse than an empty list you can see is empty.
 */

/**
 * The lowercased search corpus per item, memoized per grammar. The suggestion
 * match counts re-filter the whole list once per candidate value, so at five
 * digits of items the corpus must build once per item, not once per pass.
 * Items keep their identity until the caller replaces the array, so the map
 * hits until then — and then it releases them.
 */
const searchTextCaches = new WeakMap<object, WeakMap<object, string>>();

/** Builds or reuses the lowercased text one item is searched against. */
function getSearchText<Item extends object>(grammar: FilterGrammar<Item>, item: Item) {
	let cache = searchTextCaches.get(grammar);
	if (cache == null) {
		cache = new WeakMap();
		searchTextCaches.set(grammar, cache);
	}

	const cached = cache.get(item);
	if (cached != null) {
		return cached;
	}
	const searchText = grammar.getSearchText(item).toLowerCase();
	cache.set(item, searchText);
	return searchText;
}

/** Normalizes and lowercases one free-text term for the substring search. */
function normalizeSearchTerm<Item>(grammar: FilterGrammar<Item>, term: string) {
	return (grammar.normalizeSearchTerm?.(term) ?? term).toLowerCase();
}

/**
 * Tests one qualifier against one item, ignoring the token's negation — the
 * caller applies that. The members OR together.
 */
function matchesFacet<Item extends object>({
	grammar,
	item,
	token,
	context,
}: {
	grammar: FilterGrammar<Item>;
	item: Item;
	token: FacetToken;
	context: FilterMatchContext;
}) {
	const definition = getFilterKeyDefinition(grammar, token.key);
	if (definition == null) {
		return false;
	}

	// A member that survives no alias is a real filter that nothing satisfies,
	// which is the standard filtered-empty state rather than a silent no-op.
	return token.members.some(
		(member) => member.isKnownValue && definition.matches(item, member.value, context),
	);
}

/**
 * Tests one item against one conjunction: every qualifier and every search
 * term must hold, negations inverted. Repeats of one key AND like everything
 * else; the OR forms are a comma list and the `OR` operator.
 */
function matchesConjunction<Item extends object>({
	grammar,
	item,
	tokens,
	context,
}: {
	grammar: FilterGrammar<Item>;
	item: Item;
	tokens: readonly FilterToken[];
	context: FilterMatchContext;
}) {
	for (const token of tokens) {
		if (token.kind === "facet") {
			// A qualifier with no members yet (`is:`, `is:,`) is mid-token;
			// filtering on nothing would empty the list under the user.
			if (token.members.length === 0) {
				continue;
			}
			// A `-` on a key that cannot exclude paints invalid. Like an unknown
			// value, it is a filter that nothing satisfies.
			if (token.negated && getFilterKeyDefinition(grammar, token.key)?.negatable === false) {
				return false;
			}
			if (matchesFacet({ grammar, item, token, context }) === token.negated) {
				return false;
			}
			continue;
		}

		if (token.kind !== "text") {
			continue;
		}
		// A term that normalizes to nothing matches no item, so its negation
		// matches every item.
		const term = normalizeSearchTerm(grammar, token.text);
		const found = term !== "" && getSearchText(grammar, item).includes(term);
		if (found === token.negated) {
			return false;
		}
	}

	return true;
}

/**
 * Splits the token stream into OR groups. An `AND` is dropped — conjunction is
 * already implicit. Empty groups — a leading, trailing, or doubled `OR` — are
 * dropped too: the user is mid-token, and an empty group matching everything
 * would flood the list under them.
 */
function splitOrGroups(tokens: readonly FilterToken[]) {
	const groups: FilterToken[][] = [[]];
	for (const token of tokens) {
		if (token.kind === "or") {
			groups.push([]);
		} else if (token.kind !== "and") {
			groups.at(-1)?.push(token);
		}
	}
	return groups.filter((group) => group.length > 0);
}

/**
 * Filters items with an already-parsed query, preserving the input order.
 *
 * Take this overload when you already hold the tokens. The `context` defaults
 * to the clock at the call.
 *
 * @example
 * ```ts
 * filterItemsByTokens({ grammar, items, tokens: parseFilterQuery(grammar, "is:active") });
 * ```
 */
function filterItemsByTokens<Item extends object>({
	grammar,
	items,
	tokens,
	context = { now: Date.now() },
}: {
	grammar: FilterGrammar<Item>;
	items: Item[];
	tokens: readonly FilterToken[];
	context?: FilterMatchContext;
}) {
	// Split the OR groups once here, not once per item: at five digits of
	// items, per-row allocations are what the profile shows.
	const groups = splitOrGroups(tokens);

	// Hand back the same array when nothing was asked — an empty query, or
	// bare operators mid-typing — so an unfiltered list keeps its identity
	// through a memoized caller.
	if (groups.length === 0) {
		return items;
	}
	return items.filter((item) =>
		groups.some((group) => matchesConjunction({ grammar, item, tokens: group, context })),
	);
}

/**
 * Filters items with a raw `?q=` string, preserving the input order.
 *
 * An empty or whitespace-only query returns every item: nothing was asked.
 * The `context` defaults to the clock at the call. Pass `{ now }` from a
 * ticking state hook when a matcher reads the clock and the pass is memoized.
 *
 * @example
 * ```ts
 * filterItemsByQuery({ grammar, items, query: "is:active -staging acme" });
 * filterItemsByQuery({ grammar, items, query: "is:expired", context: { now: clockTick } });
 * ```
 */
function filterItemsByQuery<Item extends object>({
	grammar,
	items,
	query,
	context = { now: Date.now() },
}: {
	grammar: FilterGrammar<Item>;
	items: Item[];
	query: string;
	context?: FilterMatchContext;
}) {
	return filterItemsByTokens({ grammar, items, tokens: parseFilterQuery(grammar, query), context });
}

/**
 * Match counts memoized per grammar, items array, and query string. The
 * suggestion popover and the builder menu re-ask for the same counts on every
 * caret move and every open, and at five digits of items each count is a full
 * scan. An entry lives as long as its items array: a refetch replaces the
 * array and releases every count with it.
 */
const matchCountCaches = new WeakMap<object, WeakMap<object, Map<string, number>>>();

/**
 * Counts the items a raw `?q=` string matches, without building the filtered
 * array. Counts are memoized (see {@link matchCountCaches}), so a count whose
 * matcher reads the clock — `is:expired` — can lag until a refetch replaces
 * the items.
 *
 * @example
 * ```ts
 * countItemsByQuery(grammar, items, "is:active -staging"); // => 42
 * ```
 */
function countItemsByQuery<Item extends object>(
	grammar: FilterGrammar<Item>,
	items: Item[],
	query: string,
): number {
	let grammarCache = matchCountCaches.get(grammar);
	if (grammarCache == null) {
		grammarCache = new WeakMap();
		matchCountCaches.set(grammar, grammarCache);
	}

	let counts = grammarCache.get(items);
	if (counts == null) {
		counts = new Map();
		grammarCache.set(items, counts);
	}

	const cached = counts.get(query);
	if (cached != null) {
		return cached;
	}

	const groups = splitOrGroups(parseFilterQuery(grammar, query));
	const context: FilterMatchContext = { now: Date.now() };
	let count = items.length;
	if (groups.length > 0) {
		count = 0;
		for (const item of items) {
			if (groups.some((group) => matchesConjunction({ grammar, item, tokens: group, context }))) {
				count += 1;
			}
		}
	}

	counts.set(query, count);
	return count;
}

export {
	//,
	countItemsByQuery,
	filterItemsByQuery,
	filterItemsByTokens,
};
