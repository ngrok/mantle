import type { FacetToken, FilterToken, FreeTextToken } from "./parse.js";

/** Which `OR` a backend that runs one AND group can run. */
type FilterConjunctionOr =
	/** No `OR`. A comma list on one key is still one term. */
	| "none"
	/**
	 * An `OR` whose sides are each one qualifier on the same key, not negated,
	 * such as `status:404 OR status:500`. It reads as one comma list.
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
	 * is one term. A qualifier still being typed, such as `is:`, is a term with
	 * no `members`, so the caller can ask for a value.
	 */
	clauses: FilterConjunctionTerm[][];
	/**
	 * The structure that one AND group cannot hold, in query order. Compile
	 * `clauses` only when it is empty.
	 */
	problems: FilterConjunctionProblem[];
};

/** One clause while the descent reads it, with the span of its source. */
type Clause = { start: number; end: number; terms: FilterConjunctionTerm[] };

/** The key of a clause whose terms are each a qualifier on one key, not negated. */
function positiveKey(clause: Clause | undefined): string | null {
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
		const start = Math.min(...clauses.map((clause) => clause.start));
		const end = Math.max(...clauses.map((clause) => clause.end));
		const key = positiveKey(clauses[0]);
		const oneKey =
			or === "same-key" &&
			key != null &&
			parts.every((part) => part.length === 1 && positiveKey(part[0]) === key);
		if (!oneKey) {
			problems.push({ kind: problem, start, end });
		}
		return [{ start, end, terms: clauses.flatMap((clause) => clause.terms) }];
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
		return [{ start: token.start, end: token.end, terms: [{ token, negated: negate }] }];
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
		clauses.push(...(readOr(false) ?? []));
		// A `)` with no open group never comes from the parser, but a caller can hand over any token list.
		if (tokens[index]?.kind === "group-end") {
			index += 1;
		}
	}
	problems.sort((a, b) => a.start - b.start);
	return { clauses: clauses.map((clause) => clause.terms), problems };
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
