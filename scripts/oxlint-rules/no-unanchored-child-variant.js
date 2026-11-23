/**
 * Flags the `*` and `**` variants and an arbitrary variant with a selector
 * list, such as `[&_a,&_b]`. Tailwind wraps the first two in `:is()`, as in
 * `:is(.\*\:p-2 > *)`, and a Vite production build wraps the list. Chromium cannot see a class inside `:is()`, so it
 * tries the rule on each element of the page, on each style pass, without its
 * quick ancestor test. The same rule written as `[&>*]:p-2` compiles to
 * `.\[\&\>\*\]\:p-2 > *`, which Chromium skips at once on an element outside
 * the anchor. The specificity is the same; Tailwind orders arbitrary variants
 * last.
 *
 * It also flags the `space-*` and `divide-*` utilities, which compile to
 * `:where(.space-y-2 > :not(:last-child))`. Mantle's `between:` variant
 * compiles to `:where(.between\:mb-2) > :where(:not(:last-child))`, with the
 * same zero specificity and the class outside.
 *
 * Scope: every static string in a file, so a class list in a `cx()` call, a
 * `className`, or a variants object is covered.
 *
 * @example
 * // ❌ Incorrect
 * cx("*:pointer-events-auto **:data-[slot=icon]:shrink-0");
 * cx("[&_[data-a],&_[data-b]]:top-1/2");
 * cx("space-y-px divide-y divide-separator");
 *
 * // ✅ Correct
 * cx("[&>*]:pointer-events-auto [&_[data-slot=icon]]:shrink-0");
 * cx("[&_[data-a]]:top-1/2 [&_[data-b]]:top-1/2");
 * cx("between:mb-px between:border-b between:border-separator");
 */

/** The message for a variant, with the fix it names. */
const fixHint =
	"Tailwind or the minifier wraps this variant in `:is()`, so Chromium tries the rule on each element of the page on each style pass. Write the combinator as an arbitrary variant with the class outside it: `[&>*]:` for `*:`, `[&_*]:` for `**:`, `[&>[data-slot=x]]:` for `*:data-[slot=x]:`, and one class for each selector of a list.";

/**
 * The offsets of `target` outside parentheses, brackets, and quotes. An escaped
 * character, such as `\,` in a class name, is not syntax.
 */
function topLevelOffsets(text, target) {
	const offsets = [];
	let depth = 0;
	let quote = null;
	for (let index = 0; index < text.length; index++) {
		const char = text[index];
		if (char === "\\") {
			index++;
		} else if (quote != null) {
			if (char === quote) {
				quote = null;
			}
		} else if (char === '"' || char === "'") {
			quote = char;
		} else if (char === "(" || char === "[") {
			depth++;
		} else if (char === ")" || char === "]") {
			depth--;
		} else if (char === target && depth === 0) {
			offsets.push(index);
		}
	}
	return offsets;
}

/**
 * The variants of one Tailwind class that Tailwind wraps in `:is()` around the
 * class: `*`, `**`, and an arbitrary variant with a selector list.
 *
 * @example
 * unanchoredVariants("md:*:p-2"); // => ["*"]
 * unanchoredVariants("[&>*]:p-2"); // => []
 */
export function unanchoredVariants(token) {
	const found = [];
	let start = 0;
	for (const index of topLevelOffsets(token, ":")) {
		const variant = token.slice(start, index);
		start = index + 1;
		if (
			variant === "*" ||
			variant === "**" ||
			(variant.startsWith("[") &&
				variant.endsWith("]") &&
				variant.includes("&") &&
				topLevelOffsets(variant.slice(1, -1), ",").length > 0)
		) {
			found.push(variant);
		}
	}
	return found;
}

/** The message for a `space-*` or `divide-*` utility. */
const betweenHint =
	"Tailwind puts the class of `space-*` and `divide-*` inside `:where()`, so Chromium tries the rule on each element of the page on each style pass. Use mantle's `between:` variant: `between:mb-2` for `space-y-2`, `between:me-2` for `space-x-2`, `between:border-b` for `divide-y`, and `between:border-<color>` for `divide-<color>`.";

/**
 * Whether a Tailwind class is a `space-*` or `divide-*` utility, under any variants.
 *
 * @example
 * isSpaceOrDivide("sm:space-x-2"); // => true
 * isSpaceOrDivide("between:mb-2"); // => false
 */
export function isSpaceOrDivide(token) {
	const offsets = topLevelOffsets(token, ":");
	const utility = token.slice((offsets.at(-1) ?? -1) + 1).replace(/^-/, "");
	return /^(?:space-[xy]-\S|divide-\S)/.test(utility);
}

const noUnanchoredChildVariant = {
	meta: {},
	create(context) {
		function check(node, value) {
			for (const token of value.split(/\s+/)) {
				if (isSpaceOrDivide(token)) {
					context.report({ message: `\`${token}\`: ${betweenHint}`, node });
				}
				for (const variant of unanchoredVariants(token)) {
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
		"no-unanchored-child-variant": noUnanchoredChildVariant,
	},
};

export default plugin;
