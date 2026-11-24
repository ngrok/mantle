import { compileComparison } from "./comparison.js";
import {
	type FilterExpression,
	type FilterFacetNode,
	type FilterTextNode,
	parseFilterExpression,
	toFilterExpression,
} from "./expression.js";
import {
	type FilterGrammar,
	type FilterMatchContext,
	getFilterKeyDefinition,
	getFilterValueType,
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

/** A compiled test of one item, with its index into the items array. */
type ItemTest<Item> = (item: Item, index: number) => boolean;

/**
 * A compiled node: `true` when every item matches, `false` when none does,
 * or the test of one item. Folding the constants at compile time keeps them
 * out of the loop over the items.
 */
type CompiledNode<Item> = boolean | ItemTest<Item>;

/**
 * Joins compiled children with `&&` or `||`. A constant child decides the
 * whole node or drops out, so the loop over the items runs only real tests.
 */
function joinTests<Item>(
	kind: "and" | "or",
	children: readonly CompiledNode<Item>[],
): CompiledNode<Item> {
	const deciding = kind === "or";
	const tests: ItemTest<Item>[] = [];
	for (const child of children) {
		if (child === deciding) {
			return deciding;
		}
		if (typeof child === "function") {
			tests.push(child);
		}
	}
	const [first, second] = tests;
	if (first == null) {
		return !deciding;
	}
	if (second == null) {
		return first;
	}
	if (tests.length === 2) {
		return deciding
			? (item, index) => first(item, index) || second(item, index)
			: (item, index) => first(item, index) && second(item, index);
	}
	// Why plain loops: this runs once per item per pass, and the callbacks of
	// `some` cost more than the checks inside them.
	return (item, index) => {
		for (const test of tests) {
			if (test(item, index) === deciding) {
				return deciding;
			}
		}
		return !deciding;
	};
}

/** Compiles one qualifier member into the test its key runs. */
function compileFacet<Item>(
	grammar: FilterGrammar<Item>,
	node: FilterFacetNode,
	context: FilterMatchContext,
): CompiledNode<Item> {
	const definition = getFilterKeyDefinition(grammar, node.key);
	if (definition == null) {
		return false;
	}
	const { comparison } = node;
	// Why method calls: a grammar can define `matches` or `getValue` as a method
	// that reads `this`, so the test must not detach it from its key.
	if (definition.matches != null) {
		// A key with no type only ever parses to text equality.
		if (comparison.operator !== "equals" || comparison.operand.type !== "text") {
			return false;
		}
		const value = comparison.operand.value;
		return (item) => definition.matches(item, value, context);
	}
	const compare = compileComparison({
		type: getFilterValueType(definition),
		comparison,
		now: context.now,
	});
	return (item) => compare(definition.getValue(item));
}

/**
 * Compiles an expression tree into one item test. It resolves the keys, the
 * operands, and the search terms once per pass, so the loop over the items
 * only runs matchers, comparisons, and substring checks.
 *
 * @returns `true` when every item matches, `false` when none does, or the
 * test of one item.
 */
function compileQuery<Item extends object>({
	grammar,
	items,
	expression,
	context,
}: {
	grammar: FilterGrammar<Item>;
	items: readonly Item[];
	expression: FilterExpression;
	context: FilterMatchContext;
}): CompiledNode<Item> {
	let searchTexts: readonly string[] | null = null;

	function compileText(node: FilterTextNode): CompiledNode<Item> {
		// A term that normalizes to nothing matches no item, so its negation
		// matches every item.
		const term = (grammar.normalizeSearchTerm?.(node.text) ?? node.text).toLowerCase();
		if (term === "") {
			return false;
		}
		searchTexts ??= getSearchTexts(grammar, items);
		const texts = searchTexts;
		return (_item, index) => (texts[index] ?? "").includes(term);
	}

	function compileNode(node: FilterExpression): CompiledNode<Item> {
		switch (node.kind) {
			case "and":
			case "or":
				return joinTests(node.kind, node.children.map(compileNode));
			case "not": {
				const child = compileNode(node.child);
				return typeof child === "function" ? (item, index) => !child(item, index) : !child;
			}
			case "facet":
				return compileFacet(grammar, node, context);
			default:
				return compileText(node);
		}
	}

	return compileNode(expression);
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
	const expression = toFilterExpression(grammar, tokens);

	// Hand back the same array when nothing was asked (an empty query, or
	// bare operators mid-typing), so an unfiltered list keeps its identity
	// through a memoized caller.
	if (expression == null) {
		return items;
	}

	const test = compileQuery({ grammar, items, expression, context });
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
 * Counts the items a query matches, without building the filtered array.
 * With `indexes`, it counts only the items at those indexes.
 */
function countMatches<Item extends object>({
	grammar,
	items,
	query,
	indexes,
}: {
	grammar: FilterGrammar<Item>;
	items: readonly Item[];
	query: string;
	indexes: Uint32Array | null;
}) {
	const total = indexes?.length ?? items.length;
	const expression = parseFilterExpression(grammar, query);
	if (expression == null) {
		return total;
	}
	const test = compileQuery({ grammar, items, expression, context: { now: Date.now() } });
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
 * matcher reads the clock (`is:expired`) can lag until a refetch replaces
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

	const count = countMatches({ grammar, items, query, indexes: null });
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

	const expression = parseFilterExpression(grammar, restQuery);
	const test =
		expression == null
			? true
			: compileQuery({ grammar, items, expression, context: { now: Date.now() } });
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
	const count = countMatches({ grammar, items, query: tokenQuery, indexes });
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
