import type { FacetToken, FilterToken, FreeTextToken } from "./parse.js";

/** Which `OR` a backend that runs one AND group can run. */
type FilterConjunctionOr =
	/** No `OR`. A comma list on one key is still one term. */
	| "none"
	/**
	 * An `OR` whose sides are each one qualifier on the same key, not negated,
	 * such as `status:404 OR status:500`. Its sides are alternatives, as the
	 * members of a comma list are on a key that is not `prose`.
	 */
	| "same-key";

/** Options for {@link getFilterConjunction}. */
type FilterConjunctionOptions = {
	/** Which `OR` the backend can run. Defaults to `"none"`. */
	or?: FilterConjunctionOr;
};

/** One qualifier or free-text term of the AND group. */
type FilterConjunctionTerm = {
	/** The token as `parseFilterQuery` returned it. */
	token: FacetToken | FreeTextToken;
	/**
	 * Whether the term excludes in effect: by its own `-` or `!`, by each `NOT`
	 * before it, and by each negated group around it. Read it, not
	 * `token.negated`.
	 */
	negated: boolean;
};

/**
 * Structure that one AND group cannot hold. The span covers the part of the
 * query that has it.
 *
 * - `"or"`: an `OR` that the `or` option does not accept.
 * - `"negated-group"`: a `NOT` or `-` before a group of two or more terms.
 *   `NOT (a b)` is `NOT a OR NOT b`, not `NOT a NOT b`.
 */
type FilterConjunctionProblem = {
	kind: "or" | "negated-group";
	/** Offset of the part's first character in the source query. */
	start: number;
	/** Offset one past the part's last character in the source query. */
	end: number;
};

/** A query read as one AND group. */
type FilterConjunction = {
	/**
	 * The AND group, in query order. Each clause is an OR of its terms: one
	 * term, or the terms of an `OR` that the `or` option accepts. A comma list
	 * is one term. Two clauses on one key intersect: a backend with one value
	 * list for each key must not join them into one list. A qualifier still
	 * being typed, such as `is:`, is a clause of its own with no `members`, so
	 * the caller can ask for a value.
	 */
	clauses: FilterConjunctionTerm[][];
	/**
	 * The structure that one AND group cannot hold, in query order. Compile
	 * `clauses` only when it is empty.
	 */
	problems: FilterConjunctionProblem[];
};

/**
 * One clause while the descent reads it, with the span of its source.
 * `refused` marks an OR that already has a problem, so no outer OR accepts it.
 */
type Clause = { start: number; end: number; terms: FilterConjunctionTerm[]; refused?: true };

/** The key of a clause whose terms are each a qualifier on one key, not negated. */
function positiveKey(clause: Clause | undefined): string | null {
	if (clause?.refused) {
		return null;
	}
	const key = clause?.terms[0]?.token.kind === "facet" ? clause.terms[0].token.key : null;
	const same = clause?.terms.every(
		({ token, negated }) => token.kind === "facet" && token.key === key && !negated,
	);
	return same ? key : null;
}

/**
 * Reads a query as one AND group, for a backend that runs only that, such as a
 * list API that takes one value list for each key. It applies the same rules as
 * `parseFilterExpression`: `OR` binds looser than `AND`, and a negation moves
 * onto each term of its group.
 *
 * Each term comes back with its effective negation, so `NOT status:404` and
 * `-status:404` read the same. Validate each term's key and value yourself.
 *
 * @example
 * ```ts
 * const { clauses, problems } = getFilterConjunction(
 *   parseFilterQuery(grammar, "(status:404 OR status:500) NOT method:GET"),
 *   { or: "same-key" },
 * );
 * // clauses: [[status:404, status:500], [method:GET, negated]]. problems: [].
 *
 * getFilterConjunction(parseFilterQuery(grammar, "method:GET status:404 OR status:500"), {
 *   or: "same-key",
 * }).problems;
 * // => [{ kind: "or", start: 0, end: 35 }]: the query is (GET and 404) or 500.
 * ```
 */
function getFilterConjunction(
	tokens: readonly FilterToken[],
	{ or = "none" }: FilterConjunctionOptions = {},
): FilterConjunction {
	const problems: FilterConjunctionProblem[] = [];
	// Qualifiers still being typed. The tree drops them from their group, so they join no OR.
	const typing: Clause[] = [];
	let index = 0;

	/** Joins the parts of an AND, or of an OR, into the clauses of one AND group. */
	function join(
		kind: "and" | "or",
		parts: readonly Clause[][],
		problem: FilterConjunctionProblem["kind"],
	): Clause[] {
		const clauses = parts.flat();
		if (kind === "and" || parts.length < 2) {
			return clauses;
		}
		// Why reduce: a spread of a wide query passes the engine's argument limit.
		const start = clauses.reduce((min, clause) => Math.min(min, clause.start), Infinity);
		const end = clauses.reduce((max, clause) => Math.max(max, clause.end), -Infinity);
		const key = positiveKey(clauses[0]);
		const oneKey =
			or === "same-key" &&
			key != null &&
			parts.every((part) => part.length === 1 && positiveKey(part[0]) === key);
		const terms = clauses.flatMap((clause) => clause.terms);
		if (!oneKey) {
			problems.push({ kind: problem, start, end });
			return [{ start, end, terms, refused: true }];
		}
		return [{ start, end, terms }];
	}

	// The descent mirrors `parseFilterExpression`: a negation passes down, and
	// De Morgan's laws swap each AND and OR under it.
	function readUnary(negated: boolean): Clause[] | null {
		let flipped = negated;
		while (tokens[index]?.kind === "not") {
			flipped = !flipped;
			index += 1;
		}
		const token = tokens[index];
		// Why "not": the loop above consumed each one, and the check narrows the type.
		if (
			token == null ||
			token.kind === "or" ||
			token.kind === "and" ||
			token.kind === "not" ||
			token.kind === "group-end"
		) {
			return null;
		}
		index += 1;
		const negate = flipped !== token.negated;
		if (token.kind === "group-start") {
			const inner = readOr(negate);
			if (tokens[index]?.kind === "group-end") {
				index += 1;
			}
			return inner;
		}
		const clause = { start: token.start, end: token.end, terms: [{ token, negated: negate }] };
		if (token.kind === "facet" && token.members.length === 0) {
			typing.push(clause);
			return null;
		}
		return [clause];
	}

	function readAnd(negated: boolean): Clause[] | null {
		const parts: Clause[][] = [];
		for (let token = tokens[index]; token != null; token = tokens[index]) {
			if (token.kind === "or" || token.kind === "group-end") {
				break;
			}
			if (token.kind === "and") {
				index += 1;
				continue;
			}
			const part = readUnary(negated);
			if (part != null) {
				parts.push(part);
			}
		}
		return parts.length === 0 ? null : join(negated ? "or" : "and", parts, "negated-group");
	}

	function readOr(negated: boolean): Clause[] | null {
		const parts: Clause[][] = [];
		for (let token = tokens[index]; token != null; token = tokens[index]) {
			if (token.kind === "group-end") {
				break;
			}
			if (token.kind === "or") {
				index += 1;
				continue;
			}
			const part = readAnd(negated);
			if (part != null) {
				parts.push(part);
			}
		}
		return parts.length === 0 ? null : join(negated ? "and" : "or", parts, "or");
	}

	const clauses: Clause[] = [];
	while (index < tokens.length) {
		for (const clause of readOr(false) ?? []) {
			clauses.push(clause);
		}
		// A `)` with no open group never comes from the parser, but a caller can hand over any token list.
		if (tokens[index]?.kind === "group-end") {
			index += 1;
		}
	}
	// Why the end: of two problems that start on one term, the outer one is wider and comes first.
	problems.sort((a, b) => a.start - b.start || b.end - a.end);
	const all =
		typing.length === 0 ? clauses : [...clauses, ...typing].toSorted((a, b) => a.start - b.start);
	return { clauses: all.map((clause) => clause.terms), problems };
}

export {
	//,
	getFilterConjunction,
};

export type {
	//,
	FilterConjunction,
	FilterConjunctionOptions,
	FilterConjunctionOr,
	FilterConjunctionProblem,
	FilterConjunctionTerm,
};
