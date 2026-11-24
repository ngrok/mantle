/**
 * Flags a structural pseudo-class (`:first-child`, `:last-child`, `:nth-*`,
 * `:only-child`, `:empty`, and the `-of-type` forms) that a combinator
 * follows, such as `[&>tr:last-child>*]`. With such a selector in the
 * stylesheet, Chromium restyles the whole subtree of any element whose
 * position changes: a portal appended to `<body>` restyles the app root
 * (#1794). A structural pseudo-class in the last compound, such as
 * `[&>*:last-child]`, and one inside `:has()` are fine.
 *
 * It also flags two shapes whose subject has no class, id, attribute, or
 * tag, such as `*` or `:not(.x)`. Chromium tries such a rule on each element.
 * - A sibling combinator anywhere, such as `[&+*]` or `[&>tr+tr>*]`. When
 *   all of the selector after the combinator is universal, as in `[&+*]`,
 *   Chromium marks each parent on the page, and an insert restyles the next
 *   sibling's subtree (the OtpInput overlay restyled 4,662 elements, #1825).
 * - Only attributes as anchors, such as `[data-state] > *` in a stylesheet:
 *   no class, id, or tag limits it to mantle's parts.
 * The check reads a combinator inside a one-selector `:is()`, as CSS nesting
 * writes it, and composes the arbitrary variants of one class.
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
 * cx("[&+*]:ml-2");
 *
 * // ✅ Correct
 * cx("[&>tr:not(:has(+tr))>*]:border-b");
 * cx("[&>*:last-child]:border-b");
 * cx("[&+[data-slot=x]]:ml-2");
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

/** The message for a selector whose subject has no class, id, attribute, or tag. */
const universalHint =
	"This rule's subject has no class, id, attribute, or tag, so Chromium tries it on each element. After a sibling combinator such as `+*`, an insert anywhere on the page can restyle a whole subtree. Give the subject a class or a `data-slot` attribute.";

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

/** Empties attribute selectors and quoted strings, whose text is not a pseudo-class. */
function dropAttributes(selector) {
	let result = "";
	let depth = 0;
	let quote = null;
	let escaped = false;
	for (const char of selector) {
		if (escaped || char === "\\") {
			// Why: an escaped character, such as `\]` or `\+`, is not syntax.
			escaped = !escaped;
			result += depth === 0 ? char : "";
		} else if (quote != null) {
			if (char === quote) {
				quote = null;
				result += depth === 0 ? char : "";
			}
		} else if (char === '"' || char === "'") {
			quote = char;
			result += depth === 0 ? char : "";
		} else if (char === "[") {
			result += depth === 0 ? char : "";
			depth++;
		} else if (char === "]") {
			depth--;
			result += depth === 0 ? char : "";
		} else if (depth === 0) {
			result += char;
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
 * The compounds of a complex selector and the combinator before each one
 * after the first: `>`, `+`, `~`, or `" "` for a descendant.
 *
 * @example
 * splitCompounds("tr + tr>*"); // => { compounds: ["tr", "tr", "*"], combinators: ["+", ">"] }
 */
function splitCompounds(selector) {
	const compounds = [];
	const combinators = [];
	let depth = 0;
	let current = "";
	let pending = null;
	let escaped = false;
	for (const char of selector.trim()) {
		if (!escaped && depth === 0 && /[\s>+~]/.test(char)) {
			if (current !== "") {
				compounds.push(current);
				current = "";
				pending = char.trim() === "" ? " " : char;
			} else if (char.trim() !== "") {
				pending = char;
			}
			continue;
		}
		if (current === "" && pending != null) {
			combinators.push(pending);
			pending = null;
		}
		if (escaped) {
			escaped = false;
		} else if (char === "\\") {
			escaped = true;
		} else if (char === "(" || char === "[") {
			depth++;
		} else if (char === ")" || char === "]") {
			depth--;
		}
		current += char;
	}
	compounds.push(current);
	return { compounds, combinators };
}

/**
 * Empties the argument of each `:not(…)`, and of each `:is(…)` or `:where(…)`
 * with more than one selector. Chromium files a rule with such a subject
 * under no class, id, attribute, or tag.
 *
 * @example
 * dropUnbucketedArguments(":not(.x):is(.a,.b):is(.c)"); // => ":not():is():is(.c)"
 */
function dropUnbucketedArguments(compound) {
	let result = "";
	for (let index = 0; index < compound.length; index++) {
		const name = /^:(not|is|where)\(/.exec(compound.slice(index))?.[1];
		if (name == null) {
			result += compound[index];
			continue;
		}
		const open = index + name.length + 1;
		let depth = 0;
		let end = open;
		for (; end < compound.length; end++) {
			if (compound[end] === "(") {
				depth++;
			} else if (compound[end] === ")" && --depth === 0) {
				break;
			}
		}
		const argument = compound.slice(open + 1, end);
		const keep = name !== "not" && splitTopLevel(argument).length === 1;
		result += `:${name}(${keep ? argument : ""})`;
		index = end;
	}
	return result;
}

/** Whether a compound, with its attribute and `:has()` text emptied, names no class, id, attribute, or tag. */
const isUniversal = (compound) => {
	const bucketed = dropUnbucketedArguments(compound);
	return !/[.#[]/.test(bucketed) && !/^[a-z]/i.test(bucketed);
};

/**
 * Replaces a one-selector `:is(…)` or `:where(…)` that holds a combinator with
 * its argument, so a combinator that CSS nesting wraps is seen.
 *
 * @example
 * unwrapIs(":is(.a + .b) > *"); // => ".a + .b > *"
 */
function unwrapIs(selector) {
	let result = "";
	for (let index = 0; index < selector.length; index++) {
		const name = /^:(is|where)\(/.exec(selector.slice(index))?.[1];
		if (name == null) {
			result += selector[index];
			continue;
		}
		const open = index + name.length + 1;
		let depth = 0;
		let end = open;
		for (; end < selector.length; end++) {
			if (selector[end] === "(") {
				depth++;
			} else if (selector[end] === ")" && --depth === 0) {
				break;
			}
		}
		const argument = selector.slice(open + 1, end);
		const { compounds } = splitCompounds(dropAttributes(argument));
		const flatten = splitTopLevel(argument).length === 1 && compounds.length > 1;
		result += flatten ? unwrapIs(argument) : selector.slice(index, end + 1);
		index = end;
	}
	return result;
}

/** Whether a compound anchors only on attributes: no class, id, or tag. */
const isAttributeOnly = (compound) =>
	!/[.#]/.test(compound) && !/^[a-z]/i.test(compound) && compound.includes("[");

/**
 * Whether a selector ends in a universal subject after a sibling combinator,
 * or after only attribute anchors. A selector with one compound is fine.
 *
 * @example
 * hasUniversalSubjectTrap(".a + *"); // => true
 * hasUniversalSubjectTrap(".a + :not(.x)"); // => true
 * hasUniversalSubjectTrap(".a>tr+tr>*"); // => true
 * hasUniversalSubjectTrap("[data-state] > *"); // => true
 * hasUniversalSubjectTrap(".a > *"); // => false
 * hasUniversalSubjectTrap(".a + [data-slot=x]"); // => false
 */
export function hasUniversalSubjectTrap(selector) {
	// Why `&` counts as a class: Tailwind puts the utility's class there.
	for (const part of splitTopLevel(unwrapIs(dropHasArguments(selector.replaceAll("&", ".x"))))) {
		const { compounds, combinators } = splitCompounds(dropAttributes(part));
		const subject = compounds.at(-1) ?? "";
		if (compounds.length < 2 || !isUniversal(subject)) {
			continue;
		}
		const anchors = compounds.slice(0, -1);
		if (
			combinators.some((combinator) => combinator === "+" || combinator === "~") ||
			(anchors.some(isAttributeOnly) &&
				anchors.every((compound) => isAttributeOnly(compound) || isUniversal(compound)))
		) {
			return true;
		}
	}
	return false;
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
	for (const part of splitTopLevel(dropHasArguments(dropAttributes(selector)))) {
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
	return classifyVariants(token).map(({ variant }) => variant);
}

/**
 * The variants that `structuralVariants` returns, each with the fixes it needs:
 * `structural` for a structural pseudo-class before a combinator, `universal`
 * for a universal subject trap in the selector the arbitrary variants build.
 *
 * @example
 * classifyVariants("[&+tr]:[&>*]:p-2"); // => [{ variant: "[&>*]", structural: false, universal: true }]
 */
function classifyVariants(token) {
	const found = [];
	let depth = 0;
	let start = 0;
	let structuralBefore = false;
	// Why compose: `[&+tr]:[&>*]:` builds `.x+tr>*`, a trap that neither variant shows alone.
	let composed = "&";
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
				composed = selector.replaceAll("&", composed);
				const structural =
					hasStructuralCombinator(selector) || (structuralBefore && addsCombinator);
				const universal = hasUniversalSubjectTrap(composed);
				if (structural || universal) {
					found.push({ variant, structural, universal });
				}
				const self = dropHasArguments(dropAttributes(selector.slice(selfStart)));
				structuralBefore = (structuralBefore && !addsCombinator) || STRUCTURAL.test(self);
			} else if (relative != null) {
				// Why `structuralBefore` stays: the relative selector goes in front, so the element's own compound stays last.
				if (STRUCTURAL.test(dropHasArguments(dropAttributes(relative[1] ?? "")))) {
					found.push({ variant, structural: true, universal: false });
				}
			} else if (STRUCTURAL_RELATIVE_VARIANT.test(variant)) {
				found.push({ variant, structural: true, universal: false });
				structuralBefore = false;
			} else if (variant === "*" || variant === "**") {
				if (structuralBefore) {
					found.push({ variant, structural: true, universal: false });
				}
				structuralBefore = false;
			} else if (
				STRUCTURAL_SELF_VARIANT.test(variant) ||
				(/^not-\[.+\]$/.test(variant) && STRUCTURAL.test(dropAttributes(variant.slice(5, -1))))
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
				for (const { variant, structural, universal } of classifyVariants(token)) {
					const hint = [structural && fixHint, universal && universalHint]
						.filter(Boolean)
						.join(" ");
					context.report({ message: `\`${variant}\` in \`${token}\`: ${hint}`, node });
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

export {
	//,
	fixHint,
	universalHint,
};
export default plugin;
