/**
 * Flags a structural pseudo-class (`:first-child`, `:last-child`, `:nth-*`,
 * `:only-child`, `:empty`, and the `-of-type` forms) that a combinator
 * follows, such as `[&>tr:last-child>*]`. With such a selector in the
 * stylesheet, Chromium restyles the whole subtree of any element whose
 * position changes: a portal appended to `<body>` restyles the app root
 * (#1794). A structural pseudo-class in the last compound, such as
 * `[&>*:last-child]`, and one inside `:has()` are fine.
 *
 * Scope: every static string in a file, so a class list in a `cx()` call, a
 * `className`, or a variants object is covered. Only Tailwind arbitrary
 * variants (`[&…]:`) and the `group-*` and `peer-*` structural variants can
 * match, so other strings do not.
 * `scripts/check-css-selectors.ts` applies the same check to stylesheets.
 *
 * @example
 * // ❌ Incorrect
 * cx("[&>tr:last-child>*]:border-b");
 * cx("group-first:hidden");
 *
 * // ✅ Correct
 * cx("[&>tr:not(:has(+tr))>*]:border-b");
 * cx("[&>*:last-child]:border-b");
 */

const STRUCTURAL =
	/:(?:first-child|last-child|only-child|first-of-type|last-of-type|only-of-type|empty|nth-(?:last-)?(?:child|of-type)\()/i;
/** The names of Tailwind's structural variants, such as `first` or `nth-3`. */
const STRUCTURAL_NAME =
	"(?:not-)?(?:first|last|only|odd|even|empty|first-of-type|last-of-type|only-of-type|nth(?:-last)?(?:-of-type)?-\\S+)";
/** A structural variant on the element itself, such as `first` or `not-last`. */
const STRUCTURAL_SELF_VARIANT = new RegExp(`^${STRUCTURAL_NAME}$`);
/** A variant that puts a structural pseudo-class on an ancestor or a sibling, such as `group-first` or `in-last`. */
const STRUCTURAL_RELATIVE_VARIANT = new RegExp(
	`^(?:group|peer|in)-${STRUCTURAL_NAME}(?:\\/\\S+)?$`,
);
/** An arbitrary `group-[…]`, `peer-[…]`, or `in-[…]` variant, with its selector. */
const RELATIVE_ARBITRARY_VARIANT = /^(?:group|peer|in)-\[(.+)\](?:\/\S+)?$/;

/** The message for a selector, with the fix it names. */
const fixHint =
	"A structural pseudo-class before a combinator makes Chromium restyle the whole subtree of an element whose position changes, such as the app root on each portal. Use `:not(:has(+…))` for a last item, a selector with no position, or a structural pseudo-class in the last compound.";

/** Replaces the argument of each `:has(…)` with nothing; a structural pseudo-class there is fine. */
function dropHasArguments(selector) {
	let result = "";
	for (let index = 0; index < selector.length; index++) {
		if (selector.startsWith(":has(", index)) {
			let depth = 0;
			let end = index + 4;
			for (; end < selector.length; end++) {
				if (selector[end] === "(") {
					depth++;
				} else if (selector[end] === ")" && --depth === 0) {
					break;
				}
			}
			result += ":has()";
			index = end;
		} else {
			result += selector[index];
		}
	}
	return result;
}

/** Splits at the top-level commas, outside parentheses, brackets, and quotes. */
function splitTopLevel(selector) {
	const parts = [];
	let depth = 0;
	let quote = null;
	let start = 0;
	for (let index = 0; index < selector.length; index++) {
		const char = selector[index];
		if (quote != null) {
			if (char === quote) {
				quote = null;
			}
		} else if (char === '"' || char === "'") {
			quote = char;
		} else if (char === "(" || char === "[") {
			depth++;
		} else if (char === ")" || char === "]") {
			depth--;
		} else if (char === "," && depth === 0) {
			parts.push(selector.slice(start, index));
			start = index + 1;
		}
	}
	parts.push(selector.slice(start));
	return parts;
}

/** The index where the last compound of a complex selector starts. */
function lastCompoundStart(selector) {
	let depth = 0;
	let quote = null;
	let start = 0;
	for (let index = 0; index < selector.length; index++) {
		const char = selector[index];
		if (quote != null) {
			if (char === quote) {
				quote = null;
			}
		} else if (char === '"' || char === "'") {
			quote = char;
		} else if (char === "(" || char === "[") {
			depth++;
		} else if (char === ")" || char === "]") {
			depth--;
		} else if (depth === 0 && /[\s>+~]/.test(char)) {
			start = index + 1;
		}
	}
	return start;
}

/**
 * Whether a selector has a structural pseudo-class that a combinator follows,
 * outside `:has()`. It checks the arguments of `:is()`, `:where()`, and
 * `:not()` the same way.
 *
 * @example
 * hasStructuralCombinator(".a>tr:last-child>*"); // => true
 * hasStructuralCombinator(".a>tr:not(:has(+tr))>*"); // => false
 * hasStructuralCombinator(".a>*:last-child"); // => false
 */
export function hasStructuralCombinator(selector) {
	for (const part of splitTopLevel(dropHasArguments(selector))) {
		const trimmed = part.trim();
		if (STRUCTURAL.test(trimmed.slice(0, lastCompoundStart(trimmed)))) {
			return true;
		}
		for (const match of trimmed.matchAll(/:(?:is|where|not|matches)\(/g)) {
			let depth = 0;
			let end = match.index + match[0].length - 1;
			const open = end;
			for (; end < trimmed.length; end++) {
				if (trimmed[end] === "(") {
					depth++;
				} else if (trimmed[end] === ")" && --depth === 0) {
					break;
				}
			}
			if (hasStructuralCombinator(trimmed.slice(open + 1, end))) {
				return true;
			}
		}
	}
	return false;
}

/**
 * The variants of one Tailwind class that put a structural pseudo-class before
 * a combinator: an arbitrary variant such as `[&>tr:last-child>*]`, a
 * `group-first` or `in-[tr:last-child]` variant, or a structural variant that
 * a combinator variant follows, such as `first:*:`. Tailwind applies the
 * variants from left to right, so a later variant wraps an earlier one.
 *
 * @example
 * structuralVariants("md:[&>tr:last-child>*]:border-b"); // => ["[&>tr:last-child>*]"]
 * structuralVariants("first:*:p-2"); // => ["*"]
 */
export function structuralVariants(token) {
	const found = [];
	let depth = 0;
	let start = 0;
	let structuralBefore = false;
	for (let index = 0; index < token.length; index++) {
		const char = token[index];
		if (char === "[" || char === "(") {
			depth++;
		} else if (char === "]" || char === ")") {
			depth--;
		} else if (char === ":" && depth === 0) {
			const variant = token.slice(start, index);
			start = index + 1;
			const relative = RELATIVE_ARBITRARY_VARIANT.exec(variant);
			if (variant.startsWith("[") && variant.endsWith("]") && variant.includes("&")) {
				// Why the swap: Tailwind reads `_` as a space in an arbitrary value.
				const selector = variant.slice(1, -1).replace(/(?<!\\)_/g, " ");
				const selfStart = lastCompoundStart(selector);
				const addsCombinator = selector.indexOf("&") < selfStart;
				if (hasStructuralCombinator(selector) || (structuralBefore && addsCombinator)) {
					found.push(variant);
				}
				const self = dropHasArguments(selector.slice(selfStart));
				structuralBefore = (structuralBefore && !addsCombinator) || STRUCTURAL.test(self);
			} else if (relative != null) {
				// Why `structuralBefore` stays: the relative selector goes in front, so the element's own compound stays last.
				if (STRUCTURAL.test(dropHasArguments(relative[1] ?? ""))) {
					found.push(variant);
				}
			} else if (STRUCTURAL_RELATIVE_VARIANT.test(variant)) {
				found.push(variant);
				structuralBefore = false;
			} else if (variant === "*" || variant === "**") {
				if (structuralBefore) {
					found.push(variant);
				}
				structuralBefore = false;
			} else if (
				STRUCTURAL_SELF_VARIANT.test(variant) ||
				(/^not-\[.+\]$/.test(variant) && STRUCTURAL.test(variant))
			) {
				structuralBefore = true;
			}
		}
	}
	return found;
}

const noStructuralCombinator = {
	meta: {},
	create(context) {
		function check(node, value) {
			for (const token of value.split(/\s+/)) {
				for (const variant of structuralVariants(token)) {
					context.report({ message: `\`${variant}\` in \`${token}\`: ${fixHint}`, node });
				}
			}
		}
		return {
			Literal(node) {
				if (typeof node.value === "string") {
					check(node, node.value);
				}
			},
			TemplateElement(node) {
				check(node, node.value.raw);
			},
		};
	},
};

const plugin = {
	meta: { name: "mantle" },
	rules: {
		"no-structural-combinator": noStructuralCombinator,
	},
};

export { fixHint };
export default plugin;
