import {
	type FilterGrammar,
	type FilterKeyDefinition,
	type FilterMatchContext,
	getFilterKeyDefinition,
} from "./grammar.js";
import { type FilterToken, parseFilterQuery } from "./parse.js";

/**
 * Turns a parsed filter query into a filtered item list.
 *
 * Matching is exact and case-insensitive: no fuzzy scoring, no typo recovery.
 * Identifiers are pasted, not recalled, and a false positive ranked above the
 * row you pasted is worse than an empty list you can see is empty.
 */

/**
 * The lowercased search corpus per item, memoized per grammar. A new items
 * array that keeps its items, as after a refetch with structural sharing,
 * reuses each corpus instead of building it again. The map releases an item
 * when nothing else holds it.
 */
const searchTextCaches = new WeakMap<object, WeakMap<object, string>>();

/**
 * The search corpus of every item in one items array, by index, per grammar.
 * A `WeakMap` lookup per item costs more than the substring check, so a pass
 * reads the corpus by index. It costs one pointer per item, and it lives as
 * long as the items array.
 */
const searchTextsByItems = new WeakMap<object, WeakMap<object, readonly string[]>>();

/** Builds or reuses the lowercased search corpus of every item, by index. */
function getSearchTexts<Item extends object>(
	grammar: FilterGrammar<Item>,
	items: readonly Item[],
): readonly string[] {
	let textsByItems = searchTextsByItems.get(grammar);
	if (textsByItems == null) {
		textsByItems = new WeakMap();
		searchTextsByItems.set(grammar, textsByItems);
	}
	const cachedTexts = textsByItems.get(items);
	if (cachedTexts?.length === items.length) {
		return cachedTexts;
	}

	let textByItem = searchTextCaches.get(grammar);
	if (textByItem == null) {
		textByItem = new WeakMap();
		searchTextCaches.set(grammar, textByItem);
	}
	const itemCache = textByItem;
	const texts = items.map((item) => {
		const cached = itemCache.get(item);
		if (cached != null) {
			return cached;
		}
		const searchText = grammar.getSearchText(item).toLowerCase();
		itemCache.set(item, searchText);
		return searchText;
	});
	textsByItems.set(items, texts);
	return texts;
}

/**
 * One test of a compiled conjunction. Compiling resolves the keys, the value
 * aliases, and the search terms once per pass, so the per-item loop only runs
 * matchers and substring checks.
 */
type CompiledTest<Item> =
	| {
			kind: "facet";
			definition: FilterKeyDefinition<Item>;
			/** The known canonical values. They OR together. */
			values: string[];
			negated: boolean;
	  }
	| {
			kind: "text";
			/** The normalized, lowercased term. */
			term: string;
			negated: boolean;
	  };

/**
 * Compiles one conjunction: every qualifier and every search term must hold,
 * negations inverted. Repeats of one key AND like everything else; the OR
 * forms are a comma list and the `OR` operator.
 *
 * @returns `null` when no item can match, as for an unknown value. A token
 * that every item passes compiles to no test.
 */
function compileConjunction<Item>(
	grammar: FilterGrammar<Item>,
	tokens: readonly FilterToken[],
): CompiledTest<Item>[] | null {
	const tests: CompiledTest<Item>[] = [];

	for (const token of tokens) {
		if (token.kind === "facet") {
			// A qualifier with no members yet (`is:`, `is:,`) is mid-token;
			// filtering on nothing would empty the list under the user.
			if (token.members.length === 0) {
				continue;
			}
			const definition = getFilterKeyDefinition(grammar, token.key);
			// A `-` on a key that cannot exclude paints invalid. Like an unknown
			// value, it is a filter that nothing satisfies.
			if (definition == null || (token.negated && definition.negatable === false)) {
				return null;
			}
			// A member that survives no alias is a real filter that nothing
			// satisfies, which is the standard filtered-empty state rather than a
			// silent no-op. Its negation excludes nothing.
			const values = token.members
				.filter((member) => member.isKnownValue)
				.map((member) => member.value);
			if (values.length === 0) {
				if (token.negated) {
					continue;
				}
				return null;
			}
			tests.push({ kind: "facet", definition, values, negated: token.negated });
			continue;
		}

		if (token.kind !== "text") {
			continue;
		}
		// A term that normalizes to nothing matches no item, so its negation
		// matches every item.
		const term = (grammar.normalizeSearchTerm?.(token.text) ?? token.text).toLowerCase();
		if (term === "") {
			if (token.negated) {
				continue;
			}
			return null;
		}
		tests.push({ kind: "text", term, negated: token.negated });
	}

	return tests;
}

/**
 * Compiles the OR groups of a query into one item test.
 *
 * @returns `true` when every item matches, `false` when none does, or the
 * per-item test.
 */
function compileQuery<Item extends object>({
	grammar,
	items,
	groups,
	context,
}: {
	grammar: FilterGrammar<Item>;
	items: readonly Item[];
	groups: readonly FilterToken[][];
	context: FilterMatchContext;
}): boolean | ((item: Item, index: number) => boolean) {
	const conjunctions = groups
		.map((group) => compileConjunction(grammar, group))
		.filter((tests) => tests != null);
	if (conjunctions.length === 0) {
		return false;
	}
	if (conjunctions.some((tests) => tests.length === 0)) {
		return true;
	}

	const searchTexts = conjunctions.some((tests) => tests.some((test) => test.kind === "text"))
		? getSearchTexts(grammar, items)
		: [];

	// Why plain loops: this runs once per item per pass, and the callbacks of
	// `some` cost more than the checks inside them.
	function passes(item: Item, index: number, tests: readonly CompiledTest<Item>[]) {
		for (const test of tests) {
			let found = false;
			if (test.kind === "text") {
				found = (searchTexts[index] ?? "").includes(test.term);
			} else {
				for (const value of test.values) {
					if (test.definition.matches(item, value, context)) {
						found = true;
						break;
					}
				}
			}
			if (found === test.negated) {
				return false;
			}
		}
		return true;
	}

	return (item, index) => {
		for (const tests of conjunctions) {
			if (passes(item, index, tests)) {
				return true;
			}
		}
		return false;
	};
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
	const groups = splitOrGroups(tokens);

	// Hand back the same array when nothing was asked — an empty query, or
	// bare operators mid-typing — so an unfiltered list keeps its identity
	// through a memoized caller.
	if (groups.length === 0) {
		return items;
	}

	const test = compileQuery({ grammar, items, groups, context });
	if (test === true) {
		return items.slice();
	}
	if (test === false) {
		return [];
	}
	return items.filter(test);
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
 * Counts the items the OR groups match, without building the filtered array.
 * With `indexes`, it counts only the items at those indexes.
 */
function countMatches<Item extends object>({
	grammar,
	items,
	groups,
	indexes,
}: {
	grammar: FilterGrammar<Item>;
	items: readonly Item[];
	groups: readonly FilterToken[][];
	indexes: Uint32Array | null;
}) {
	const total = indexes?.length ?? items.length;
	if (groups.length === 0) {
		return total;
	}
	const test = compileQuery({ grammar, items, groups, context: { now: Date.now() } });
	if (typeof test === "boolean") {
		return test ? total : 0;
	}

	let count = 0;
	if (indexes == null) {
		items.forEach((item, index) => {
			if (test(item, index)) {
				count += 1;
			}
		});
		return count;
	}
	for (const index of indexes) {
		const item = items[index];
		if (item != null && test(item, index)) {
			count += 1;
		}
	}
	return count;
}

/**
 * Match counts memoized per grammar, items array, and query string. The
 * suggestion popover re-asks for the same counts on every caret move and every
 * open, and at five digits of items each count is a full scan. An entry lives
 * as long as its items array: a refetch replaces the array and releases every
 * count with it.
 */
const matchCountCaches = new WeakMap<object, WeakMap<object, Map<string, number>>>();

/**
 * The most counts one items array keeps. A long session on one array asks for
 * a new query on every keystroke; a full cache starts over instead of growing.
 */
const maxCountsPerItems = 1000;

/** Gets the count cache of one grammar and items array. */
function getCountCache(grammar: object, items: object) {
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
	return counts;
}

/** Stores one count. A full cache starts over. */
function storeCount(counts: Map<string, number>, query: string, count: number) {
	if (counts.size >= maxCountsPerItems) {
		counts.clear();
	}
	counts.set(query, count);
}

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
	const counts = getCountCache(grammar, items);
	const cached = counts.get(query);
	if (cached != null) {
		return cached;
	}

	const groups = splitOrGroups(parseFilterQuery(grammar, query));
	const count = countMatches({ grammar, items, groups, indexes: null });
	storeCount(counts, query, count);
	return count;
}

/**
 * The indexes of the items one rest query matches, per grammar and items
 * array. It keeps one entry: typing inside one value keeps the rest of the
 * query, so each keystroke reuses it. `null` indexes mean every item.
 */
const restMatchCaches = new WeakMap<
	object,
	WeakMap<object, { restQuery: string; indexes: Uint32Array | null }>
>();

/**
 * Collects the indexes of the items a test passes. `null` means every item,
 * so a later pass skips the index lookup.
 */
function collectIndexes<Item>(
	items: readonly Item[],
	test: false | ((item: Item, index: number) => boolean),
): Uint32Array | null {
	if (test === false) {
		return new Uint32Array(0);
	}
	const indexes = new Uint32Array(items.length);
	let count = 0;
	items.forEach((item, index) => {
		if (test(item, index)) {
			indexes[count] = index;
			count += 1;
		}
	});
	return count === items.length ? null : indexes.subarray(0, count);
}

/** Builds or reuses the indexes of the items `restQuery` matches. */
function getRestIndexes<Item extends object>(
	grammar: FilterGrammar<Item>,
	items: readonly Item[],
	restQuery: string,
): Uint32Array | null {
	let grammarCache = restMatchCaches.get(grammar);
	if (grammarCache == null) {
		grammarCache = new WeakMap();
		restMatchCaches.set(grammar, grammarCache);
	}
	const cached = grammarCache.get(items);
	if (cached?.restQuery === restQuery) {
		return cached.indexes;
	}

	const groups = splitOrGroups(parseFilterQuery(grammar, restQuery));
	const test =
		groups.length === 0
			? true
			: compileQuery({ grammar, items, groups, context: { now: Date.now() } });
	const indexes = test === true ? null : collectIndexes(items, test);
	grammarCache.set(items, { restQuery, indexes });
	return indexes;
}

/**
 * Counts the items `query` matches, where `query` is one AND group: the
 * tokens of `restQuery` and one more token, written alone as `tokenQuery`. It
 * filters by `restQuery` once and reuses the result for each token, so the
 * value suggestions scan the whole list once, not once per value. It shares
 * the count cache of {@link countItemsByQuery}.
 */
function countItemsByRestAndToken<Item extends object>({
	grammar,
	items,
	query,
	restQuery,
	tokenQuery,
}: {
	grammar: FilterGrammar<Item>;
	items: Item[];
	query: string;
	restQuery: string;
	tokenQuery: string;
}): number {
	const counts = getCountCache(grammar, items);
	const cached = counts.get(query);
	if (cached != null) {
		return cached;
	}

	const indexes = getRestIndexes(grammar, items, restQuery);
	const groups = splitOrGroups(parseFilterQuery(grammar, tokenQuery));
	const count = countMatches({ grammar, items, groups, indexes });
	storeCount(counts, query, count);
	return count;
}

export {
	//,
	countItemsByQuery,
	countItemsByRestAndToken,
	filterItemsByQuery,
	filterItemsByTokens,
};
