import { type FilterComparison, parseTypedComparison } from "./comparison.js";
import {
	type FilterGrammar,
	type FilterKeyDefinition,
	type FilterOperator,
	acceptsValueList,
	getFilterKeyDefinition,
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
 * negation, the `OR`/`AND` operators, parentheses, and comma lists all stay
 * text. A `"conjunction"` grammar reads every token the full syntax does; what
 * the executor cannot run is the highlighter's and the consumer's concern.
 * Under either richer syntax, `\"` and `\\` write a literal quote and backslash.
 */

/** Fields every token carries, whatever its kind. */
type FilterTokenBase = {
	/** Offset of the token's first character in the source query. */
	start: number;
	/** Offset one past the token's last character in the source query. */
	end: number;
	/** True when the token was written with a leading `-` or `!`. */
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
	/**
	 * False when the member does not parse: an enumerated value that matches
	 * no alias, a value that does not parse for its key's type, or an
	 * operator the key does not accept. Such a member matches no item.
	 */
	isKnownValue: boolean;
	/**
	 * The operator as written, or the default of the key's type when none is
	 * written. A key with no type always reads `"equals"`.
	 */
	operator: FilterOperator;
	/** The parsed comparison, or `null` exactly when `isKnownValue` is false. */
	comparison: FilterComparison | null;
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
	 * value is empty (the user is still typing).
	 */
	members: FacetValueMember[];
	/**
	 * False only when some member is unknown on an enumerated key. An empty
	 * value is never invalid (the user is still typing).
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

/**
 * The NOT operator, written `NOT` and unquoted. It negates the token or group
 * that follows it, as a leading `-` or `!` does.
 */
type NotToken = FilterTokenBase & {
	kind: "not";
	/** The operator exactly as written. */
	text: string;
};

/**
 * An unquoted `(` at the start of a token, which opens a group. A leading
 * `-` or `!`, as in `-(`, negates the group. Groups nest 32 deep at most; a
 * `(` past that depth is text.
 */
type GroupStartToken = FilterTokenBase & {
	kind: "group-start";
};

/**
 * An unquoted `)` that closes the innermost open group. A `)` outside any
 * group stays text.
 */
type GroupEndToken = FilterTokenBase & {
	kind: "group-end";
};

/** One token of a parsed filter query. */
type FilterToken =
	| FreeTextToken
	| FacetToken
	| OrToken
	| AndToken
	| NotToken
	| GroupStartToken
	| GroupEndToken;

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
 * Inside an open group, an unquoted `)` ends the token, so it can close the group.
 */
function scanToken(
	query: string,
	start: number,
	{ quotes, insideGroup }: { quotes: boolean; insideGroup: boolean },
): ScannedToken {
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

		if (!insideQuotes && (isTokenSeparator(character) || (insideGroup && character === ")"))) {
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

/** Reads the text an `"equals"` comparison compares with, or `null`. */
function equalsText(comparison: FilterComparison | null) {
	return comparison?.operator === "equals" && comparison.operand.type === "text"
		? comparison.operand.value
		: null;
}

/**
 * Builds one value member: resolves its spelling against the key's aliases,
 * and parses its operator and typed value when the key has a type.
 */
function toFacetValueMember<Item>({
	grammar,
	definition,
	query,
	rawValue,
	start,
	end,
}: {
	grammar: FilterGrammar<Item>;
	definition: FilterKeyDefinition<Item>;
	query: string;
	rawValue: string;
	start: number;
	end: number;
}): FacetValueMember {
	if (definition.type == null) {
		const canonicalValue = resolveFilterValue(grammar, definition.key, rawValue);
		return {
			value: canonicalValue ?? rawValue,
			rawValue,
			isKnownValue: canonicalValue != null,
			operator: "equals",
			comparison:
				canonicalValue == null
					? null
					: { operator: "equals", operand: { type: "text", value: canonicalValue } },
			start,
			end,
		};
	}

	const { operator, comparison } = parseTypedComparison({
		key: definition,
		source: query.slice(start, end),
		literal: rawValue,
		resolveEnumValue: (written) => resolveFilterValue(grammar, definition.key, written),
	});
	return {
		value: definition.type === "enum" ? (equalsText(comparison) ?? rawValue) : rawValue,
		rawValue,
		isKnownValue: comparison != null,
		operator,
		comparison,
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
	query,
	rawValue,
	valueStart,
	valueEnd,
	scannedMembers,
}: {
	grammar: FilterGrammar<Item>;
	definition: FilterKeyDefinition<Item>;
	query: string;
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
				definition,
				query,
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
				definition,
				query,
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

/** Whether a character negates the token it starts: `-` or `!`. */
function isNegationPrefix(character: string) {
	return character === "-" || character === "!";
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
	const negated = operators && isNegationPrefix(query.charAt(start)) && literal.length > 1;
	const bodyStart = negated ? 1 : 0;

	// A dropped quote shortens the literal, so equal lengths mean a bare token.
	const isBareToken = end - start === literal.length;
	if (operators && isBareToken && !negated && (literal === "OR" || literal === "||")) {
		return { kind: "or", start, end, negated: false, text: literal };
	}
	if (operators && isBareToken && !negated && (literal === "AND" || literal === "&&")) {
		return { kind: "and", start, end, negated: false, text: literal };
	}
	if (operators && isBareToken && !negated && literal === "NOT") {
		return { kind: "not", start, end, negated: false, text: literal };
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
		query,
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

/** The deepest that groups nest. Real queries nest two or three deep. */
const maxGroupDepth = 32;

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
	// Quotes, negation, and groups are all structure, or all text.
	const operators = getFilterSyntax(grammar) !== "qualifiers";
	let groupDepth = 0;
	let index = 0;

	while (index < query.length) {
		const character = query.charAt(index);
		if (isTokenSeparator(character)) {
			index += 1;
			continue;
		}

		if (operators && character === ")" && groupDepth > 0) {
			tokens.push({ kind: "group-end", start: index, end: index + 1, negated: false });
			groupDepth -= 1;
			index += 1;
			continue;
		}

		const negatedGroup = isNegationPrefix(character) && query.charAt(index + 1) === "(";
		// Why a cap: each group is a level of recursion in the expression parser,
		// and a pasted query must not overflow the stack.
		if (operators && (character === "(" || negatedGroup) && groupDepth < maxGroupDepth) {
			const end = index + (negatedGroup ? 2 : 1);
			tokens.push({ kind: "group-start", start: index, end, negated: negatedGroup });
			groupDepth += 1;
			index = end;
			continue;
		}

		const scanned = scanToken(query, index, { quotes: operators, insideGroup: groupDepth > 0 });
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
 * split into several tokens, close a group, or read as an operator of a typed
 * key, with each quote and backslash escaped.
 *
 * @example
 * ```ts
 * quoteFilterValue("staging api"); // => "\"staging api\""
 * quoteFilterValue("=draft"); // => "\"=draft\""
 * quoteFilterValue("acme"); // => "acme"
 * quoteFilterValue('/a"b'); // => "\"/a\\\"b\""
 * ```
 */
function quoteFilterValue(value: string) {
	const escaped = value.replaceAll(/["\\]/g, (character) => `\\${character}`);
	// A comma needs quotes too, or a list key would split the value in two. A
	// parenthesis needs them so that it cannot close a group, and a leading `=`
	// or `*` or a trailing `*` so that a typed key reads no operator.
	const needsQuotes = value === "" || /[\s",()]|^[=*]|\*$/.test(value);
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

/**
 * Writes a value so the grammar reads it back as that value. A grammar that
 * reads quotes gets `quoteFilterValue`. A `"qualifiers"` grammar reads quotes
 * as text, so it takes the value as is, with a `=` before a value that a typed
 * key would read as an operator.
 */
function writeFilterValue<Item>(grammar: FilterGrammar<Item>, key: string, value: string) {
	if (getFilterSyntax(grammar) !== "qualifiers") {
		return quoteFilterValue(value);
	}
	const typed = getFilterKeyDefinition(grammar, key)?.type != null;
	return typed && /^[=*]|\*$/.test(value) ? `=${value}` : value;
}

/** How a token changes the group depth: `(` opens one and `)` closes one. */
function groupDepthChange(kind: FilterToken["kind"]) {
	if (kind === "group-start") {
		return 1;
	}
	return kind === "group-end" ? -1 : 0;
}

/** Whether a token is an `OR`, `AND`, or `NOT`, which asks nothing alone. */
function isOperator(token: FilterToken) {
	return token.kind === "or" || token.kind === "and" || token.kind === "not";
}

/**
 * Reads whether each token is negated in effect: by its own `-` or `!`, by each
 * `NOT` before it, and by each negated group around it. For a `group-start`, it
 * is the negation that the group gives each token inside it.
 *
 * @example
 * ```ts
 * getEffectiveNegations(parseFilterQuery(grammar, "NOT (-is:shared api)"));
 * // => [false, true, false, true, true]
 * ```
 */
function getEffectiveNegations(tokens: readonly FilterToken[]): boolean[] {
	// Why a stack: a `NOT` or `-` before a group negates each token inside it.
	const groupNegations: boolean[] = [];
	let pendingNot = false;
	return tokens.map((token) => {
		const inherited = groupNegations.at(-1) ?? false;
		const negated = (inherited !== pendingNot) !== token.negated;
		pendingNot = token.kind === "not" && !pendingNot;
		if (token.kind === "group-start") {
			groupNegations.push(negated);
		} else if (token.kind === "group-end") {
			groupNegations.pop();
		}
		return negated;
	});
}

/**
 * Whether a token is the one-value qualifier `target`, negated or not. A typed
 * member compares by its operator and operand, so `region:=us` is
 * `region:us` and `name:api*` is not `name:"api*"`.
 */
function isSameFacet(token: FilterToken | undefined, target: FacetToken | undefined) {
	if (token?.kind !== "facet" || token.key !== target?.key || token.members.length !== 1) {
		return false;
	}
	const [member] = token.members;
	const [wanted] = target.members;
	if (member == null || wanted == null) {
		return false;
	}
	return member.comparison != null && wanted.comparison != null
		? JSON.stringify(member.comparison) === JSON.stringify(wanted.comparison)
		: member.value === wanted.value;
}

/**
 * Adds a qualifier to a query, or takes it out when the query already has it.
 * Use it for a value that filters when the person clicks it, such as a status
 * badge in a table row.
 *
 * The key and the value resolve through the grammar's aliases, so `is:personal`
 * counts as `is:private`. The opposite qualifier gives way: `-is:shared`
 * becomes `is:shared` in its place, and so does `NOT is:shared`. A list such as
 * `is:shared,private` stays as written. An `OR` or `AND` beside a removed
 * qualifier goes with it, and so does each `NOT` before it and a group that it
 * leaves empty, so no operator dangles. A qualifier counts as negated by its
 * own `-`, by each `NOT` before it, and by each negated group around it.
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
	const written = value === "" ? `${key}:` : `${key}:${writeFilterValue(grammar, key, value)}`;
	const [target] = parseFilterQuery(grammar, written);
	const tokens = parseFilterQuery(grammar, query);
	const negations = getEffectiveNegations(tokens);
	const matched = tokens.map((token) =>
		isSameFacet(token, target?.kind === "facet" ? target : undefined),
	);
	const removed = [...matched];
	const wasOn = matched.some((isMatch, index) => isMatch && negations[index] === facet.negated);

	// A group left with only operators inside goes too, so `NOT (is:shared)`
	// leaves no `NOT ( )`. The parser closes an open group at the end of the
	// query, so this does too.
	const openGroups: number[] = [];
	const removeIfEmpty = (start: number, end: number) => {
		const inside = tokens.slice(start + 1, end);
		const empty = inside.every((other, offset) => removed[start + 1 + offset] || isOperator(other));
		if (empty) {
			removed.fill(true, start, end + 1);
		}
	};
	tokens.forEach((token, index) => {
		if (token.kind === "group-start") {
			openGroups.push(index);
		} else if (token.kind === "group-end") {
			removeIfEmpty(openGroups.pop() ?? index, index);
		}
	});
	for (const start of openGroups.toReversed()) {
		removeIfEmpty(start, tokens.length);
	}
	// Each `NOT` before a removed token goes with it, or it would negate the next token.
	for (let index = tokens.length - 2; index >= 0; index -= 1) {
		if (tokens[index]?.kind === "not" && removed[index + 1]) {
			removed[index] = true;
		}
	}

	// The new qualifier takes the place of the opposite one when that one sits
	// outside every kept group, so it keeps the joins around it: toggling
	// `is:shared` in `NOT is:shared OR api` gives `is:shared OR api`.
	let insertAt = -1;
	let depth = 0;
	tokens.forEach((token, index) => {
		if (wasOn || insertAt !== -1) {
			return;
		}
		if (!removed[index]) {
			depth += groupDepthChange(token.kind);
			return;
		}
		let runEnd = index;
		while (removed[runEnd + 1] === true) {
			runEnd += 1;
		}
		if (
			removed[index - 1] !== true &&
			depth === 0 &&
			matched.slice(index, runEnd + 1).includes(true)
		) {
			insertAt = index;
		}
	});
	const added = `${facet.negated ? "-" : ""}${written}`;

	let result = "";
	let previous: Pick<FilterToken, "kind"> | undefined;
	// Why a pending join: a join lands only between two kept operands, so taking
	// out one alternative of `a OR b OR c` keeps `a OR c`, not `a c`.
	let pendingJoin: FilterToken | undefined;
	let unclosed = 0;
	const emit = (kind: FilterToken["kind"], text: string) => {
		if (pendingJoin != null && kind !== "group-end") {
			result += ` ${query.slice(pendingJoin.start, pendingJoin.end)}`;
		}
		pendingJoin = undefined;
		unclosed += groupDepthChange(kind);
		const hugs = previous?.kind === "group-start" || kind === "group-end";
		result += (previous == null || hugs ? "" : " ") + text;
		previous = { kind };
	};
	tokens.forEach((token, index) => {
		if (index === insertAt) {
			emit("facet", added);
		}
		if (removed[index]) {
			return;
		}
		if (token.kind === "or" || token.kind === "and") {
			if (previous != null && previous.kind !== "group-start" && previous.kind !== "not") {
				// `OR` binds looser than `AND`, so it is the join that keeps the meaning.
				pendingJoin = pendingJoin?.kind === "or" ? pendingJoin : token;
			}
			return;
		}
		emit(token.kind, query.slice(token.start, token.end));
	});

	if (wasOn || insertAt !== -1) {
		return result;
	}
	// A group the query leaves open closes first, or it would negate or join the new qualifier.
	result += ")".repeat(Math.max(unclosed, 0));
	return result === "" ? added : `${result} ${added}`;
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
 * findTokenAtCaret(tokens, 6); // => undefined (the caret is in the space)
 * ```
 */
function findTokenAtCaret(tokens: readonly FilterToken[], caretIndex: number) {
	const touching = tokens.filter((token) => caretIndex >= token.start && caretIndex <= token.end);
	// A caret between `(` and a word belongs to the word, so its suggestions edit that word.
	return (
		touching.find((token) => token.kind !== "group-start" && token.kind !== "group-end") ??
		touching[0]
	);
}

/**
 * Reports whether the caret sits in a qualifier's value, past its `:`.
 *
 * @example
 * ```ts
 * const [token] = parseFilterQuery(grammar, "is:active");
 * isCaretInFacetValue(token, 4); // => true
 * isCaretInFacetValue(token, 2); // => false (still in the key)
 * ```
 */
function isCaretInFacetValue(token: FilterToken, caretIndex: number): token is FacetToken {
	return token.kind === "facet" && caretIndex > token.colonIndex;
}

export {
	//,
	findTokenAtCaret,
	formatFacet,
	getEffectiveNegations,
	isCaretInFacetValue,
	parseFilterQuery,
	queryUsesQualifiers,
	quoteFilterValue,
	toggleFacet,
	writeFilterValue,
};

export type {
	//,
	AndToken,
	FacetToken,
	FacetValueMember,
	FilterToken,
	FreeTextToken,
	GroupEndToken,
	GroupStartToken,
	NotToken,
	OrToken,
};
