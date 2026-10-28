import {
	type FilterGrammar,
	type FilterSyntax,
	acceptsValueList,
	getFilterKeyDefinition,
	getFilterSyntax,
} from "./grammar.js";
import { parseFilterQuery } from "./parse.js";

/**
 * The helpers a natural-language search needs: a description of the filter
 * language to send to a model, and a check of the query the model sends back.
 * Neither one calls a model. The host owns the request, so this module stays
 * free of React and of any network code.
 */

/** One qualifier key, as a model reads it. */
type FilterKeyDescription = {
	/** The canonical key, as it is written before the `:`. */
	key: string;
	/** What the key filters by. */
	description: string;
	/**
	 * The only values the key accepts, with what each one means. Absent for a
	 * free-text key, which takes any text.
	 */
	values?: { value: string; description?: string }[];
	/** Whether `-key:value` excludes on this key. */
	negatable: boolean;
	/** Whether `key:a,b` matches either value. */
	acceptsList: boolean;
};

/** The whole filter language, as plain data that serializes to JSON. */
type FilterGrammarDescription = {
	/** The syntax the grammar honors. */
	syntax: FilterSyntax;
	/** The qualifier keys, in the order the grammar lists them. */
	keys: FilterKeyDescription[];
	/** The syntax rules, one sentence each, for a system prompt. */
	rules: string[];
};

/**
 * Describes a grammar as plain data for a language model: each key, its
 * values, and the syntax rules the grammar honors. Send it with the person's
 * words, and ask the model for one query in this language.
 *
 * The description holds no matchers and no aliases: a model that writes the
 * canonical spelling writes a query every surface reads the same way.
 *
 * @preview The API is not stable and may change. There may also be bugs.
 * Please file an issue at https://github.com/ngrok/mantle/issues if you find any.
 *
 * @example
 * ```ts
 * const description = describeFilterGrammar(projectFilterGrammar);
 * const system = `Translate a request into one filter query.\n${JSON.stringify(description)}`;
 * ```
 */
function describeFilterGrammar<Item>(grammar: FilterGrammar<Item>): FilterGrammarDescription {
	const syntax = getFilterSyntax(grammar);
	const keys = grammar.keys.map((definition): FilterKeyDescription => ({
		key: definition.key,
		description: definition.description,
		...(definition.values == null
			? {}
			: {
					values: definition.values.map(({ value, description }) => ({ value, description })),
				}),
		// Why: a `"qualifiers"` grammar reads `-key:value` as search text.
		negatable: syntax !== "qualifiers" && definition.negatable !== false,
		acceptsList: acceptsValueList(grammar, definition),
	}));

	const rules = [
		"`key:value` keeps the items whose key has that value.",
		"A key with listed values accepts only those values.",
		keys.some((key) => key.negatable) && "`-key:value` excludes the items that match.",
		keys.some((key) => key.acceptsList) && "`key:a,b` keeps the items that match either value.",
		syntax !== "qualifiers" && 'Wrap a value that has spaces in double quotes: `key:"a b"`.',
		syntax === "full" && "`OR` between two groups keeps the items that match either group.",
		"Qualifiers separated by spaces must all match.",
		syntax === "conjunction"
			? "Write only qualifiers. The search cannot read other words."
			: "Other words search the item text.",
	].filter((rule) => rule !== false);

	return { syntax, keys, rules };
}

/** One problem in a query that a model or a person wrote. */
type FilterQueryProblem =
	| {
			/** A `key:` that the grammar does not define. The parser reads it as free text. */
			kind: "unknown-key";
			key: string;
			start: number;
			end: number;
	  }
	| {
			/** A value that a key with listed values does not accept. It matches no item. */
			kind: "unknown-value";
			key: string;
			value: string;
			start: number;
			end: number;
	  }
	| {
			/** A `-key:` on a key that cannot exclude. It matches no item. */
			kind: "not-negatable";
			key: string;
			start: number;
			end: number;
	  }
	| {
			/** A bare term in a `"conjunction"` query. The executor cannot run it. */
			kind: "unsupported-term";
			text: string;
			start: number;
			end: number;
	  };

/** The characters of a written key. Any letter or digit counts, so `über:` and `123:` read as keys. */
const keyCharacters = /^[\p{L}\p{N}_-]+$/u;

/**
 * Reads the key that a free-text token attempts, such as `owner` in
 * `owner:me` or `"owner":me`. A colon inside quotes is text on purpose, and
 * `scheme://` starts a URL, so neither one attempts a key.
 */
function findAttemptedKey({
	query,
	start,
	end,
	quotes,
}: {
	query: string;
	start: number;
	end: number;
	quotes: boolean;
}) {
	let insideQuotes = false;
	let key = "";
	for (let index = start; index < end; index += 1) {
		const character = query.charAt(index);
		if (quotes && character === "\\" && /["\\]/.test(query.charAt(index + 1))) {
			key += query.charAt(index + 1);
			index += 1;
		} else if (quotes && character === '"') {
			insideQuotes = !insideQuotes;
		} else if (character === ":" && !insideQuotes) {
			const isUrl = query.startsWith("//", index + 1);
			return !isUrl && keyCharacters.test(key) ? key : null;
		} else {
			key += character;
		}
	}
	return null;
}

/**
 * Finds the parts of a query that do not mean what they look like: an
 * unknown key, an unknown value, an exclusion on a key that cannot exclude,
 * or a bare term that a `"conjunction"` grammar cannot run. Check a query
 * that a model wrote before you show it, so an invented filter never empties
 * the list without a reason.
 *
 * A quoted `"key:value"` and a URL are free text on purpose, so neither one
 * is a problem.
 *
 * @preview The API is not stable and may change. There may also be bugs.
 * Please file an issue at https://github.com/ngrok/mantle/issues if you find any.
 *
 * @returns the problems in query order, or an empty array for a clean query.
 *
 * @example
 * ```ts
 * checkFilterQuery(grammar, "is:shared owner:me");
 * // => [{ kind: "unknown-key", key: "owner", start: 10, end: 18 }]
 * ```
 */
function checkFilterQuery<Item>(grammar: FilterGrammar<Item>, query: string): FilterQueryProblem[] {
	const problems: FilterQueryProblem[] = [];
	const syntax = getFilterSyntax(grammar);

	for (const token of parseFilterQuery(grammar, query)) {
		if (token.kind === "text") {
			const { start, end } = token;
			const bodyStart = start + (token.negated ? 1 : 0);
			const key = findAttemptedKey({
				query,
				start: bodyStart,
				end,
				quotes: syntax !== "qualifiers",
			});
			if (key != null) {
				problems.push({ kind: "unknown-key", key, start, end });
			} else if (syntax === "conjunction") {
				problems.push({ kind: "unsupported-term", text: token.text, start, end });
			}
			continue;
		}
		if (token.kind !== "facet") {
			continue;
		}

		if (token.negated && getFilterKeyDefinition(grammar, token.key)?.negatable === false) {
			problems.push({ kind: "not-negatable", key: token.key, start: token.start, end: token.end });
		}
		for (const member of token.members) {
			if (!member.isKnownValue) {
				problems.push({
					kind: "unknown-value",
					key: token.key,
					value: member.value,
					start: member.start,
					end: member.end,
				});
			}
		}
	}

	return problems;
}

export {
	//,
	checkFilterQuery,
	describeFilterGrammar,
};

export type {
	//,
	FilterGrammarDescription,
	FilterKeyDescription,
	FilterQueryProblem,
};
