import invariant from "tiny-invariant";

/**
 * The grammar contract of the query-filter language.
 *
 * A grammar declares the qualifier keys of one list surface — their spellings,
 * their fixed values, and how one value tests one item. The engine modules
 * (`parse`, `match`, `suggestions`, `highlight`) stay grammar-agnostic and take
 * the grammar as their first argument, so every list can speak the same
 * language over its own vocabulary.
 *
 * Spellings stay forgiving through explicit aliases, never fuzzy matching:
 * each accepted spelling is one entry, matched case-insensitively, and the
 * suggestions always write the canonical form — so a shared `?q=` URL never
 * surprises the person who opens it.
 */

/** One fixed value of an enumerated key, with the copy the UI shows for it. */
type FilterValueDefinition = {
	/** The canonical value, as it is written after the `:`. */
	value: string;
	/** One-line explanation shown beside the value. */
	description?: string;
	/** Accepted alternative spellings, matched case-insensitively. */
	aliases?: readonly string[];
};

/**
 * The inputs of one matching pass that live outside the items, sampled once
 * per pass.
 *
 * A caller that memoizes the filter passes a ticking `now` from React state.
 * The clock is then an input of the memo, so the pass re-runs as time passes
 * instead of going stale.
 */
type FilterMatchContext = {
	/** The clock the matchers compare dates against, in epoch milliseconds. */
	now: number;
};

/** One qualifier key of a grammar. */
type FilterKeyDefinition<Item> = {
	/** The canonical key, as it is written before the `:`. */
	key: string;
	/** One-line explanation for the suggestion list and the builder menu. */
	description: string;
	/** Accepted alternative spellings, matched case-insensitively. */
	aliases?: readonly string[];
	/**
	 * The fixed values, in the order the UI shows them. Omit for a free-text
	 * key. A written value that matches no entry matches no item.
	 */
	values?: readonly FilterValueDefinition[];
	/**
	 * Prose keys keep commas as content. Every other key splits an unquoted
	 * comma list into OR members (`is:active,pending`).
	 */
	prose?: boolean;
	/**
	 * False when the executor cannot exclude on this key. The suggestions then
	 * offer no `-key:` row, and a typed `-` paints invalid. Defaults to true.
	 */
	negatable?: boolean;
	/**
	 * Tests one canonical value of this key against one item. A matcher that
	 * compares a date against the clock reads `context.now`, never `Date.now()`.
	 */
	matches: (item: Item, value: string, context: FilterMatchContext) => boolean;
};

/**
 * How much of the shared syntax a grammar honours.
 *
 * - `"full"`: `-key:value` excludes, `OR` and `AND` join groups, `key:a,b`
 *   lists alternatives, and `"quotes"` keep spaces.
 * - `"conjunction"`: the same tokens, read as one AND group. A bare term is
 *   structure the executor cannot run, so the input paints it invalid. `OR`
 *   paints as an operator; the consumer decides which `OR` it can run.
 * - `"qualifiers"`: only whitespace-separated `key:value` tokens are
 *   structure. Everything else is search text.
 */
type FilterSyntax = "full" | "conjunction" | "qualifiers";

/** The vocabulary and the matching rules of one list's filter language. */
type FilterGrammar<Item> = {
	/** The qualifier keys, in the order the UI lists them. */
	keys: readonly FilterKeyDefinition<Item>[];
	/**
	 * Builds the text one item is searched against; the engine lowercases it.
	 * Join the fields with a separator no term can contain (a newline), so a
	 * term can never match by bridging two fields.
	 */
	getSearchText: (item: Item) => string;
	/**
	 * Normalizes one free-text term before the substring search. The engine
	 * lowercases the result. Defaults to the identity.
	 */
	normalizeSearchTerm?: (term: string) => string;
	/**
	 * How much of the shared syntax the surface honours. Defaults to `"full"`.
	 * A grammar whose query another system executes declares the syntax that
	 * executor reads, so the input never paints a structure the results will
	 * not honour.
	 */
	syntax?: FilterSyntax;
};

/**
 * The alias tables of one grammar, built once and cached. The key table holds
 * indexes into `grammar.keys` rather than the definitions, so one Item-free
 * shape serves every grammar and the cache needs no type assertion.
 */
type CompiledGrammar = {
	/** Lowercased key spelling → index of its definition in `grammar.keys`. */
	keyIndexByAlias: Map<string, number>;
	/** Canonical key → (lowercased value spelling → canonical value). */
	valueAliasesByKey: Map<string, Map<string, string>>;
};

/**
 * The compiled tables per grammar. Grammar objects are module constants, so
 * this compiles once per grammar for the life of the app.
 */
const compiledGrammars = new WeakMap<object, CompiledGrammar>();

/** Builds or reuses the alias tables for a grammar. */
function compileGrammar<Item>(grammar: FilterGrammar<Item>): CompiledGrammar {
	const cached = compiledGrammars.get(grammar);
	if (cached != null) {
		return cached;
	}

	const keyIndexByAlias = new Map<string, number>();
	const valueAliasesByKey = new Map<string, Map<string, string>>();

	grammar.keys.forEach((definition, index) => {
		keyIndexByAlias.set(definition.key.toLowerCase(), index);
		for (const alias of definition.aliases ?? []) {
			keyIndexByAlias.set(alias.toLowerCase(), index);
		}

		if (definition.values != null) {
			const valueAliases = new Map<string, string>();
			for (const valueDefinition of definition.values) {
				valueAliases.set(valueDefinition.value.toLowerCase(), valueDefinition.value);
				for (const alias of valueDefinition.aliases ?? []) {
					valueAliases.set(alias.toLowerCase(), valueDefinition.value);
				}
			}
			valueAliasesByKey.set(definition.key, valueAliases);
		}
	});

	const compiled: CompiledGrammar = { keyIndexByAlias, valueAliasesByKey };
	compiledGrammars.set(grammar, compiled);
	return compiled;
}

/**
 * Reads the syntax a grammar honours, defaulting to the full language.
 *
 * @example
 * ```ts
 * getFilterSyntax({ keys, getSearchText }); // => "full"
 * getFilterSyntax(defineRemoteFilterGrammar({ keys })); // => "qualifiers"
 * ```
 */
function getFilterSyntax<Item>(grammar: FilterGrammar<Item>): FilterSyntax {
	return grammar.syntax ?? "full";
}

/**
 * Resolves a written key to its definition, case-insensitively.
 *
 * @returns the definition, or `null` when the spelling is not a qualifier —
 * in which case the caller keeps the whole token as free text.
 *
 * @example
 * ```ts
 * resolveFilterKey(grammar, "DESC")?.key; // => "description"
 * resolveFilterKey(grammar, "https"); // => null
 * ```
 */
function resolveFilterKey<Item>(
	grammar: FilterGrammar<Item>,
	writtenKey: string,
): FilterKeyDefinition<Item> | null {
	return getFilterKeyDefinition(grammar, writtenKey) ?? null;
}

/**
 * Resolves a written value to its canonical form, case-insensitively.
 *
 * Free-text keys have no vocabulary, so their values pass through unchanged.
 *
 * @returns the canonical value, or `null` when the key is enumerated and the
 * spelling matches no alias — that filter then matches no item.
 *
 * @example
 * ```ts
 * resolveFilterValue(grammar, "is", "LIVE"); // => "active" — an alias
 * resolveFilterValue(grammar, "is", "bogus"); // => null
 * resolveFilterValue(grammar, "description", "Staging API"); // => "Staging API"
 * ```
 */
function resolveFilterValue<Item>(
	grammar: FilterGrammar<Item>,
	key: string,
	writtenValue: string,
): string | null {
	const valueAliases = compileGrammar(grammar).valueAliasesByKey.get(key);
	if (valueAliases == null) {
		return writtenValue;
	}
	return valueAliases.get(writtenValue.toLowerCase()) ?? null;
}

/**
 * Looks up the definition of a canonical key.
 *
 * @example
 * ```ts
 * getFilterKeyDefinition(grammar, "is")?.values?.[0]; // => { value: "active", … }
 * ```
 */
function getFilterKeyDefinition<Item>(grammar: FilterGrammar<Item>, key: string) {
	const index = compileGrammar(grammar).keyIndexByAlias.get(key.toLowerCase());
	return index == null ? undefined : grammar.keys[index];
}

/**
 * Reports whether a key's value splits on commas into an OR list, as in
 * `is:active,pending`. Prose keys keep the comma: there it is content. So does
 * every key of a `"qualifiers"` grammar, whose executor knows no lists.
 *
 * @example
 * ```ts
 * acceptsValueList(grammar, { key: "is", … }); // => true
 * acceptsValueList(grammar, { key: "description", prose: true, … }); // => false
 * ```
 */
function acceptsValueList<Item>(
	grammar: FilterGrammar<Item>,
	definition: FilterKeyDefinition<Item>,
) {
	return getFilterSyntax(grammar) !== "qualifiers" && definition.prose !== true;
}

/** One qualifier of a remote grammar: a key definition without the client-side test. */
type RemoteFilterKeyDefinition = Omit<FilterKeyDefinition<never>, "matches">;

/** Options for {@link defineRemoteFilterGrammar}. */
type RemoteFilterGrammarOptions = {
	/** The qualifier keys, in the order the UI lists them. */
	keys: readonly RemoteFilterKeyDefinition[];
	/** The syntax the executor reads. Defaults to `"qualifiers"`. */
	syntax?: Exclude<FilterSyntax, "full">;
};

/**
 * Declares the vocabulary of a query another system executes.
 *
 * The input highlights and suggests from it like any grammar, but nothing
 * tests items on the client: the matcher treats every qualifier and term as
 * matching nothing. The syntax keeps the painted structure to what the
 * executor reads: bare `key:value` tokens under `"qualifiers"`, or one AND
 * group of exclusions, comma lists, and the `OR` the consumer accepts under
 * `"conjunction"`.
 *
 * Under `"qualifiers"`, it throws when a value or a value alias contains
 * whitespace: no query can express it.
 *
 * @example
 * ```ts
 * const accountSearchGrammar = defineRemoteFilterGrammar({
 *   keys: [{ key: "is", description: "Account state", values: [{ value: "suspended" }] }],
 * });
 * ```
 */
function defineRemoteFilterGrammar({
	keys,
	syntax = "qualifiers",
}: RemoteFilterGrammarOptions): FilterGrammar<never> {
	// Why: a `"qualifiers"` executor splits on whitespace and reads no quotes, so
	// no query can carry such a value, and an accepted suggestion would split it.
	if (syntax === "qualifiers") {
		for (const definition of keys) {
			for (const valueDefinition of definition.values ?? []) {
				// An alias is typed too, so it has the same limit as the value.
				for (const spelling of [valueDefinition.value, ...(valueDefinition.aliases ?? [])]) {
					invariant(
						!/\s/.test(spelling),
						`The value "${spelling}" of the "${definition.key}" key contains whitespace, which a "qualifiers" grammar cannot express. Set syntax: "conjunction", which reads quotes.`,
					);
				}
			}
		}
	}

	return {
		keys: keys.map((definition) => ({ ...definition, matches: () => false })),
		getSearchText: () => "",
		syntax,
	};
}

export {
	//,
	acceptsValueList,
	defineRemoteFilterGrammar,
	getFilterKeyDefinition,
	getFilterSyntax,
	resolveFilterKey,
	resolveFilterValue,
};

export type {
	//,
	FilterGrammar,
	FilterKeyDefinition,
	FilterMatchContext,
	FilterSyntax,
	FilterValueDefinition,
	RemoteFilterGrammarOptions,
	RemoteFilterKeyDefinition,
};
