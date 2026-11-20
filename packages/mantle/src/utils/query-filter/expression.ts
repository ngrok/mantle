import type { FilterComparison } from "./comparison.js";
import { type FilterGrammar, getFilterKeyDefinition } from "./grammar.js";
import { type FacetToken, type FilterToken, parseFilterQuery } from "./parse.js";

/**
 * A parsed filter query as a tree of `and`, `or`, `not`, `facet`, and `text`
 * nodes: the contract an app compiles to its own backend.
 *
 * The tree is normalized, so a compiler handles few shapes:
 *
 * - A comma list is an `or` of one `facet` node for each member.
 * - Negation sits on the leaves: a `not` node wraps one `facet` or `text`
 *   node, and `NOT (a OR b)` arrives as `and` of two `not` nodes.
 * - `{ kind: "and", children: [] }` matches every item, and
 *   `{ kind: "or", children: [] }` matches none. They stand for a qualifier
 *   still being typed and for a filter nothing can satisfy, such as an
 *   unknown value. Every other `and` and `or` has two or more children.
 */

/** One comparison on one key: a qualifier, or one member of its comma list. */
type FilterFacetNode = {
	kind: "facet";
	/** The canonical key. */
	key: string;
	/** The operator and the typed value. */
	comparison: FilterComparison;
	/** Offset of the member's first character in the source query. */
	start: number;
	/** Offset one past the member's last character in the source query. */
	end: number;
};

/** One free-text term, searched in each item's search text. */
type FilterTextNode = {
	kind: "text";
	/** The term with its negation prefix and quotes removed. */
	text: string;
	/** Offset of the token's first character in the source query. */
	start: number;
	/** Offset one past the token's last character in the source query. */
	end: number;
};

/** One node of a parsed filter query. */
type FilterExpression =
	| { kind: "and"; children: FilterExpression[] }
	| { kind: "or"; children: FilterExpression[] }
	| { kind: "not"; child: FilterFacetNode | FilterTextNode }
	| FilterFacetNode
	| FilterTextNode;

/** The node that matches every item. */
function always(): FilterExpression {
	return { kind: "and", children: [] };
}

/** The node that matches no item. */
function never(): FilterExpression {
	return { kind: "or", children: [] };
}

/**
 * Joins nodes with `and` or `or`, flattening nested nodes of the same kind
 * and folding the constants: a node that matches nothing ends an `and`, and
 * a node that matches everything ends an `or`.
 */
function combine(kind: "and" | "or", parts: readonly FilterExpression[]): FilterExpression {
	const absorbing = kind === "and" ? "or" : "and";
	const children: FilterExpression[] = [];
	for (const part of parts) {
		if (part.kind === kind) {
			children.push(...part.children);
		} else if (part.kind === absorbing && part.children.length === 0) {
			return part;
		} else {
			children.push(part);
		}
	}
	const [onlyChild] = children;
	return children.length === 1 && onlyChild != null ? onlyChild : { kind, children };
}

/** Builds the nodes of one qualifier, negated by De Morgan's laws when `negated`. */
function toFacetExpression<Item>(
	grammar: FilterGrammar<Item>,
	token: FacetToken,
	{ negated }: { negated: boolean },
): FilterExpression {
	// A qualifier with no members yet (`is:`, `is:,`) is mid-token; filtering
	// on nothing would empty the list under the user.
	if (token.members.length === 0) {
		return always();
	}
	// An exclusion the executor cannot run is a filter nothing satisfies.
	if (negated && getFilterKeyDefinition(grammar, token.key)?.negatable === false) {
		return never();
	}
	const leaves = token.members.map((member): FilterExpression => {
		// A member that does not parse matches nothing, so its negation excludes nothing.
		if (member.comparison == null) {
			return negated ? always() : never();
		}
		const leaf: FilterFacetNode = {
			kind: "facet",
			key: token.key,
			comparison: member.comparison,
			start: member.start,
			end: member.end,
		};
		return negated ? { kind: "not", child: leaf } : leaf;
	});
	return combine(negated ? "and" : "or", leaves);
}

/**
 * Builds the tree of a token list. `OR` binds looser than `AND`, and both
 * looser than `NOT`. Like the parser, it is total: an empty group, an
 * operator with no operand, and an unclosed group drop out or close at the
 * end instead of failing.
 *
 * @returns `null` when the tokens ask nothing, as for an empty query or a
 * bare `OR`.
 */
function toFilterExpression<Item>(
	grammar: FilterGrammar<Item>,
	tokens: readonly FilterToken[],
): FilterExpression | null {
	let index = 0;

	function parseUnary(negated: boolean): FilterExpression | null {
		let flipped = negated;
		while (tokens[index]?.kind === "not") {
			flipped = !flipped;
			index += 1;
		}
		const token = tokens[index];
		if (
			token == null ||
			token.kind === "or" ||
			token.kind === "and" ||
			token.kind === "group-end"
		) {
			return null;
		}
		index += 1;
		const negate = flipped !== token.negated;
		switch (token.kind) {
			case "group-start": {
				const inner = parseOr(negate);
				if (tokens[index]?.kind === "group-end") {
					index += 1;
				}
				return inner;
			}
			case "facet":
				return toFacetExpression(grammar, token, { negated: negate });
			default: {
				const leaf: FilterTextNode = {
					kind: "text",
					text: token.text,
					start: token.start,
					end: token.end,
				};
				return negate ? { kind: "not", child: leaf } : leaf;
			}
		}
	}

	function parseAnd(negated: boolean): FilterExpression | null {
		const parts: FilterExpression[] = [];
		for (let token = tokens[index]; token != null; token = tokens[index]) {
			if (token.kind === "or" || token.kind === "group-end") {
				break;
			}
			if (token.kind === "and") {
				index += 1;
				continue;
			}
			const part = parseUnary(negated);
			if (part != null) {
				parts.push(part);
			}
		}
		return parts.length === 0 ? null : combine(negated ? "or" : "and", parts);
	}

	function parseOr(negated: boolean): FilterExpression | null {
		const parts: FilterExpression[] = [];
		for (let token = tokens[index]; token != null; token = tokens[index]) {
			if (token.kind === "group-end") {
				break;
			}
			if (token.kind === "or") {
				index += 1;
				continue;
			}
			const part = parseAnd(negated);
			if (part != null) {
				parts.push(part);
			}
		}
		return parts.length === 0 ? null : combine(negated ? "and" : "or", parts);
	}

	const parts: FilterExpression[] = [];
	while (index < tokens.length) {
		const part = parseOr(false);
		if (part != null) {
			parts.push(part);
		}
		// A `)` with no open group never comes from the parser, but a caller
		// can hand over any token list.
		if (tokens[index]?.kind === "group-end") {
			index += 1;
		}
	}
	return parts.length === 0 ? null : combine("and", parts);
}

/**
 * Parses a filter query into its expression tree. Never throws, on any
 * input. Compile the tree to the query language of the backend that runs the
 * filter; `filterItemsByQuery` runs the same tree on the client.
 *
 * @returns the tree, or `null` when the query asks nothing.
 *
 * @example
 * ```ts
 * parseFilterExpression(grammar, "(is:shared OR is:new) -name:api*");
 * // => { kind: "and", children: [
 * //      { kind: "or", children: [{ kind: "facet", key: "is", … }, { kind: "facet", key: "is", … }] },
 * //      { kind: "not", child: { kind: "facet", key: "name",
 * //        comparison: { operator: "starts-with", operand: { type: "text", value: "api" } }, … } },
 * //    ] }
 * ```
 */
function parseFilterExpression<Item>(
	grammar: FilterGrammar<Item>,
	query: string,
): FilterExpression | null {
	return toFilterExpression(grammar, parseFilterQuery(grammar, query));
}

export {
	//,
	parseFilterExpression,
	toFilterExpression,
};

export type {
	//,
	FilterExpression,
	FilterFacetNode,
	FilterTextNode,
};
