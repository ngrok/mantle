import {
	type FilterGrammar,
	type FilterKeyDefinition,
	acceptsValueList,
	getFilterSyntax,
	resolveFilterKey,
	resolveFilterValue,
} from "./grammar.js";

/**
 * The query-filter language, tokenized.
 *
 * The parser is **total**: it returns tokens for every prefix of every input and
 * never throws. The query is a hand-editable URL param and the suggestion list
 * re-parses on each keystroke, so a thrown `SyntaxError` would take the page
 * down mid-word. Anything the grammar does not recognize degrades to free text.
 *
 * A `"qualifiers"` grammar reads only `key:value` tokens as structure: quotes,
 * the negation dash, the `OR`/`AND` operators, and comma lists all stay text.
 * A `"conjunction"` grammar reads every token the full syntax does; what the
 * executor cannot run is the highlighter's and the consumer's concern. Under
 * either richer syntax, `\"` and `\\` write a literal quote and backslash.
 */

/** Fields every token carries, whatever its kind. */
type FilterTokenBase = {
	/** Offset of the token's first character in the source query. */
	start: number;
	/** Offset one past the token's last character in the source query. */
	end: number;
	/** True when the token was written with a leading `-`. */
	negated: boolean;
};

/** A bare search term, matched against the item search corpus. */
type FreeTextToken = FilterTokenBase & {
	kind: "text";
	/** The term with its negation prefix and quotes removed. */
	text: string;
};

/** One comma-separated member of a qualifier's value list. */
type FacetValueMember = {
	/**
	 * The canonical value for enumerated keys, the written value for free-text
	 * keys, and the written value again when no alias matched.
	 */
	value: string;
	/** The member exactly as written, with quotes removed. */
	rawValue: string;
	/** False only when the key is enumerated and the member matched no alias. */
	isKnownValue: boolean;
	/**
	 * Offset of the member's first character in the source query. A quoted
	 * member's span covers its quote characters too.
	 */
	start: number;
	/** Offset one past the member's last character in the source query. */
	end: number;
};

/** A `key:value` qualifier whose key resolved to a known facet. */
type FacetToken = FilterTokenBase & {
	kind: "facet";
	/** The canonical key the written spelling resolved to. */
	key: string;
	/** The whole value exactly as written, with quotes removed. */
	rawValue: string;
	/**
	 * The value's members, which OR together: every unquoted comma splits one
	 * off for a list key (`is:active,pending`), a quoted comma stays inside its
	 * member (`name:"a,b",c`), and a prose key keeps one member. Empty while the
	 * value is empty — the user is still typing.
	 */
	members: FacetValueMember[];
	/**
	 * False only when some member is unknown on an enumerated key. An empty
	 * value is never invalid — the user is still typing.
	 */
	isKnownValue: boolean;
	/** Offset of the separating `:` in the source query. */
	colonIndex: number;
};

/**
 * The OR operator between two filter groups. Only the bare, unquoted spellings
 * `OR` and `||` count: a quoted `"OR"` and a lowercase `or` stay search terms.
 */
type OrToken = FilterTokenBase & {
	kind: "or";
	/** The operator exactly as written. */
	text: string;
};

/**
 * The AND operator, written `AND` or `&&`, unquoted. Conjunction is already
 * implicit between tokens, so this token only spells it out.
 */
type AndToken = FilterTokenBase & {
	kind: "and";
	/** The operator exactly as written. */
	text: string;
};

/** One token of a parsed filter query. */
type FilterToken = FreeTextToken | FacetToken | OrToken | AndToken;

/**
 * Reports whether a character separates tokens: any whitespace, the same set
 * `quoteFilterValue` quotes. Quoted runs suspend this, so a quoted value can
 * carry spaces.
 */
function isTokenSeparator(character: string) {
	return /\s/.test(character);
}

/** One comma-delimited run of a scanned value, with its quotes dropped from the literal. */
type ScannedMember = {
	/** Offset of the run's first character, a quote included, in the source query. */
	start: number;
	/** Offset one past the run's last character in the source query. */
	end: number;
	/** The run with its quote characters removed. */
	literal: string;
};

/** The raw span one scan pass carved out of the source query. */
type ScannedToken = {
	/** Offset of the first character in the source query. */
	start: number;
	/** Offset one past the last character in the source query. */
	end: number;
	/** The span with its quote characters removed. */
	literal: string;
	/** Offset of the first unquoted `:` in the source query, or -1. */
	colonIndex: number;
	/** Index of that same `:` within `literal`, or -1. */
	literalColonIndex: number;
	/**
	 * The value past the `:`, split on its unquoted commas. A quoted comma
	 * stays inside its run, so `"a,b",c` scans to two runs. Empty without a `:`.
	 */
	members: ScannedMember[];
};

/**
 * Splits one whitespace-delimited token out of the query, starting at `start`.
 *
 * With quotes enabled, double quotes toggle in and out of a quoted run and are
 * dropped from the literal, and a backslash before a quote or a backslash keeps
 * that character as text. An unclosed quote consumes the rest of the query
 * rather than failing. Without them, a quote is one more character of text.
 */
function scanToken(query: string, start: number, { quotes }: { quotes: boolean }): ScannedToken {
	let index = start;
	let insideQuotes = false;
	let literal = "";
	let colonIndex = -1;
	let literalColonIndex = -1;
	const members: ScannedMember[] = [];
	let member: ScannedMember | null = null;

	function closeMember(end: number) {
		if (member != null) {
			member.end = end;
			members.push(member);
			member = null;
		}
	}

	while (index < query.length) {
		const character = query.charAt(index);

		if (quotes && character === "\\" && /["\\]/.test(query.charAt(index + 1))) {
			const escaped = query.charAt(index + 1);
			literal += escaped;
			if (member != null) {
				member.literal += escaped;
			}
			index += 2;
			continue;
		}

		if (quotes && character === '"') {
			insideQuotes = !insideQuotes;
			index += 1;
			continue;
		}

		if (!insideQuotes && isTokenSeparator(character)) {
			break;
		}

		if (!insideQuotes && character === ":" && colonIndex === -1) {
			colonIndex = index;
			literalColonIndex = literal.length;
			literal += character;
			index += 1;
			member = { start: index, end: index, literal: "" };
			continue;
		}

		if (!insideQuotes && character === "," && colonIndex !== -1) {
			closeMember(index);
			literal += character;
			index += 1;
			member = { start: index, end: index, literal: "" };
			continue;
		}

		literal += character;
		if (member != null) {
			member.literal += character;
		}
		index += 1;
	}

	closeMember(index);

	return { start, end: index, literal, colonIndex, literalColonIndex, members };
}

/** Builds one value member, resolving its spelling against the key's aliases. */
function toFacetValueMember<Item>({
	grammar,
	key,
	rawValue,
	start,
	end,
}: {
	grammar: FilterGrammar<Item>;
	key: string;
	rawValue: string;
	start: number;
	end: number;
}): FacetValueMember {
	const canonicalValue = resolveFilterValue(grammar, key, rawValue);
	return {
		value: canonicalValue ?? rawValue,
		rawValue,
		isKnownValue: canonicalValue != null,
		start,
		end,
	};
}

/**
 * Splits a facet's written value into its OR members.
 *
 * A list key takes the scanned runs, so an unquoted comma separates members and
 * a quoted one stays inside its member. A prose key keeps the whole value as one
 * member. Empty runs (`is:active,` mid-typing) produce no member, but a
 * quoted empty value (`is:""`) does: it asks for an empty value on purpose.
 */
function splitFacetValue<Item>({
	grammar,
	definition,
	rawValue,
	valueStart,
	valueEnd,
	scannedMembers,
}: {
	grammar: FilterGrammar<Item>;
	definition: FilterKeyDefinition<Item>;
	rawValue: string;
	valueStart: number;
	valueEnd: number;
	scannedMembers: ScannedMember[];
}): FacetValueMember[] {
	if (!isWrittenValue(rawValue, valueStart, valueEnd)) {
		return [];
	}

	if (!acceptsValueList(grammar, definition)) {
		return [
			toFacetValueMember({
				grammar,
				key: definition.key,
				rawValue,
				start: valueStart,
				end: valueEnd,
			}),
		];
	}

	return scannedMembers
		.filter((member) => isWrittenValue(member.literal, member.start, member.end))
		.map((member) =>
			toFacetValueMember({
				grammar,
				key: definition.key,
				rawValue: member.literal,
				start: member.start,
				end: member.end,
			}),
		);
}

/**
 * Whether a value span holds a value. Only quotes add a span with no literal,
 * so a span of two or more such characters is a closed quoted empty value.
 */
function isWrittenValue(literal: string, start: number, end: number) {
	return literal !== "" || end - start >= 2;
}

/**
 * Turns one scanned span into a token.
 *
 * The colon splits a qualifier only when the text before it resolves to a known
 * key. That is what keeps a pasted `https://api.example.com` free text instead
 * of a qualifier named `https`.
 */
function toFilterToken<Item>(
	grammar: FilterGrammar<Item>,
	scanned: ScannedToken,
	query: string,
): FilterToken {
	const { start, end, literal, colonIndex, literalColonIndex, members: scannedMembers } = scanned;
	const operators = getFilterSyntax(grammar) !== "qualifiers";

	// A quoted token opens with `"`, so `"-staging"` searches for the literal
	// term rather than excluding it.
	const negated = operators && query.charAt(start) === "-" && literal.length > 1;
	const bodyStart = negated ? 1 : 0;

	// A dropped quote shortens the literal, so equal lengths mean a bare token.
	const isBareToken = end - start === literal.length;
	if (operators && isBareToken && !negated && (literal === "OR" || literal === "||")) {
		return { kind: "or", start, end, negated: false, text: literal };
	}
	if (operators && isBareToken && !negated && (literal === "AND" || literal === "&&")) {
		return { kind: "and", start, end, negated: false, text: literal };
	}

	const writtenKey = colonIndex === -1 ? "" : literal.slice(bodyStart, literalColonIndex);
	const definition =
		colonIndex === -1 || literalColonIndex < bodyStart
			? null
			: resolveFilterKey(grammar, writtenKey);

	if (definition == null) {
		return { kind: "text", start, end, negated, text: literal.slice(bodyStart) };
	}

	const rawValue = literal.slice(literalColonIndex + 1);
	const members = splitFacetValue({
		grammar,
		definition,
		rawValue,
		valueStart: colonIndex + 1,
		valueEnd: end,
		scannedMembers,
	});

	return {
		kind: "facet",
		start,
		end,
		negated,
		key: definition.key,
		rawValue,
		members,
		isKnownValue: members.every((member) => member.isKnownValue),
		colonIndex,
	};
}

/**
 * Parses a filter query into tokens. Never throws, on any input.
 *
 * @example
 * ```ts
 * parseFilterQuery(grammar, 'name:api -is:active,pending acme');
 * // => [{ kind: "facet", key: "name", members: [{ value: "api", … }], … },
 * //     { kind: "facet", key: "is", members: [{ value: "active", … }, { value: "pending", … }], negated: true, … },
 * //     { kind: "text", text: "acme", … }]
 * ```
 */
function parseFilterQuery<Item>(grammar: FilterGrammar<Item>, query: string): FilterToken[] {
	const tokens: FilterToken[] = [];
	const quotes = getFilterSyntax(grammar) !== "qualifiers";
	let index = 0;

	while (index < query.length) {
		if (isTokenSeparator(query.charAt(index))) {
			index += 1;
			continue;
		}

		const scanned = scanToken(query, index, { quotes });
		tokens.push(toFilterToken(grammar, scanned, query));
		index = scanned.end;
	}

	return tokens;
}

/**
 * Reports whether a query holds at least one `key:value` qualifier.
 *
 * The filtered-empty states pick their advice from this. A structured query
 * that matched nothing needs advice about relaxing a filter, and a free-text
 * one needs advice about spelling.
 *
 * @example
 * ```ts
 * queryUsesQualifiers(grammar, "is:active acme"); // => true
 * queryUsesQualifiers(grammar, "acme"); // => false
 * ```
 */
function queryUsesQualifiers<Item>(grammar: FilterGrammar<Item>, query: string) {
	return parseFilterQuery(grammar, query).some((token) => token.kind === "facet");
}

/**
 * Writes a value so it parses back to itself: quoted when it would otherwise
 * split into several tokens, with each quote and backslash escaped.
 *
 * @example
 * ```ts
 * quoteFilterValue("staging api"); // => "\"staging api\""
 * quoteFilterValue("acme"); // => "acme"
 * quoteFilterValue('/a"b'); // => "\"/a\\\"b\""
 * ```
 */
function quoteFilterValue(value: string) {
	const escaped = value.replaceAll(/["\\]/g, (character) => `\\${character}`);
	// A comma needs quotes too, or a list key would split the value in two.
	const needsQuotes = value === "" || /[\s",]/.test(value);
	return needsQuotes ? `"${escaped}"` : escaped;
}

/**
 * Writes a qualifier in its canonical form. Accepting a suggestion always
 * replaces what was typed with this, so `-DESC:api` becomes `-description:api`.
 *
 * @example
 * ```ts
 * formatFacet({ key: "description", value: "staging api", negated: true });
 * // => '-description:"staging api"'
 * ```
 */
function formatFacet({ key, value, negated }: { key: string; value: string; negated: boolean }) {
	const prefix = negated ? "-" : "";
	// An empty value is the mid-typing state the value suggestions open on, and
	// `key:""` would be a real (empty) value rather than an invitation to type.
	return value === "" ? `${prefix}${key}:` : `${prefix}${key}:${quoteFilterValue(value)}`;
}

/** Whether a token is the one-value qualifier `key:value`, negated or not. */
function isSingleFacet(token: FilterToken | undefined, key: string, value: string) {
	return (
		token?.kind === "facet" &&
		token.key === key &&
		token.members.length === 1 &&
		token.members[0]?.value === value
	);
}

/**
 * Adds a qualifier to a query, or takes it out when the query already has it.
 * Use it for a value that filters when the person clicks it, such as a status
 * badge in a table row.
 *
 * The key and the value resolve through the grammar's aliases, so `is:personal`
 * counts as `is:private`. The opposite qualifier gives way: `-is:shared`
 * becomes `is:shared`. A list such as `is:shared,private` stays as written. An
 * `OR` or `AND` beside a removed qualifier goes with it, so no operator dangles.
 *
 * @example
 * ```ts
 * toggleFacet({ grammar, query: "api", facet: { key: "is", value: "shared", negated: false } });
 * // => "api is:shared"
 * toggleFacet({ grammar, query: "api is:shared", facet: { key: "is", value: "shared", negated: false } });
 * // => "api"
 * toggleFacet({ grammar, query: "-is:shared", facet: { key: "is", value: "shared", negated: false } });
 * // => "is:shared"
 * ```
 */
function toggleFacet<Item>({
	grammar,
	query,
	facet,
}: {
	grammar: FilterGrammar<Item>;
	query: string;
	facet: { key: string; value: string; negated: boolean };
}) {
	const key = resolveFilterKey(grammar, facet.key)?.key ?? facet.key;
	const value = resolveFilterValue(grammar, key, facet.value) ?? facet.value;
	const tokens = parseFilterQuery(grammar, query);
	const removed = tokens.map((token) => isSingleFacet(token, key, value));
	const wasOn = tokens.some((token, index) => removed[index] && token.negated === facet.negated);

	const kept: string[] = [];
	tokens.forEach((token, index) => {
		if (removed[index]) {
			return;
		}
		const isOperator = token.kind === "or" || token.kind === "and";
		if (isOperator && (removed[index - 1] === true || removed[index + 1] === true)) {
			return;
		}
		kept.push(query.slice(token.start, token.end));
	});

	return [...kept, ...(wasOn ? [] : [formatFacet({ key, value, negated: facet.negated })])].join(
		" ",
	);
}

/**
 * Finds the token the caret sits in or against.
 *
 * A caret touching either edge belongs to that token, which is what makes
 * suggestions keep refining the word being typed. A caret in whitespace belongs
 * to no token, and the suggestions fall back to offering every key.
 *
 * @example
 * ```ts
 * const tokens = parseFilterQuery(grammar, "is:active acme");
 * findTokenAtCaret(tokens, 3)?.key; // => "is"
 * findTokenAtCaret(tokens, 6); // => undefined — the caret is in the space
 * ```
 */
function findTokenAtCaret(tokens: readonly FilterToken[], caretIndex: number) {
	return tokens.find((token) => caretIndex >= token.start && caretIndex <= token.end);
}

/**
 * Reports whether the caret sits in a qualifier's value, past its `:`.
 *
 * @example
 * ```ts
 * const [token] = parseFilterQuery(grammar, "is:active");
 * isCaretInFacetValue(token, 4); // => true
 * isCaretInFacetValue(token, 2); // => false — still in the key
 * ```
 */
function isCaretInFacetValue(token: FilterToken, caretIndex: number): token is FacetToken {
	return token.kind === "facet" && caretIndex > token.colonIndex;
}

export {
	//,
	findTokenAtCaret,
	formatFacet,
	isCaretInFacetValue,
	parseFilterQuery,
	queryUsesQualifiers,
	quoteFilterValue,
	toggleFacet,
};

export type {
	//,
	AndToken,
	FacetToken,
	FacetValueMember,
	FilterToken,
	FreeTextToken,
	OrToken,
};
