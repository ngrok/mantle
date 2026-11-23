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
 * Scope: every static string in a file, so a class list in a `cx()` call, a
 * `className`, or a variants object is covered.
 *
 * @example
 * // ❌ Incorrect
 * cx("*:pointer-events-auto **:data-[slot=icon]:shrink-0");
 * cx("[&_[data-a],&_[data-b]]:top-1/2");
 *
 * // ✅ Correct
 * cx("[&>*]:pointer-events-auto [&_[data-slot=icon]]:shrink-0");
 * cx("[&_[data-a]]:top-1/2 [&_[data-b]]:top-1/2");
 */

/** The message for a variant, with the fix it names. */
const fixHint =
	"Tailwind or the minifier wraps this variant in `:is()`, so Chromium tries the rule on each element of the page on each style pass. Write the combinator as an arbitrary variant with the class outside it: `[&>*]:` for `*:`, `[&_*]:` for `**:`, `[&>[data-slot=x]]:` for `*:data-[slot=x]:`, and one class for each selector of a list.";

/** Whether an arbitrary variant's selector has a comma outside parentheses and brackets. */
function hasSelectorList(selector) {
	let depth = 0;
	for (const char of selector) {
		if (char === "(" || char === "[") {
			depth++;
		} else if (char === ")" || char === "]") {
			depth--;
		} else if (char === "," && depth === 0) {
			return true;
		}
	}
	return false;
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
	let depth = 0;
	let start = 0;
	for (let index = 0; index < token.length; index++) {
		const char = token[index];
		if (char === "[" || char === "(") {
			depth++;
		} else if (char === "]" || char === ")") {
			depth--;
		} else if (char === ":" && depth === 0) {
			const variant = token.slice(start, index);
			start = index + 1;
			if (
				variant === "*" ||
				variant === "**" ||
				(variant.startsWith("[") &&
					variant.endsWith("]") &&
					variant.includes("&") &&
					hasSelectorList(variant.slice(1, -1)))
			) {
				found.push(variant);
			}
		}
	}
	return found;
}

const noUnanchoredChildVariant = {
	meta: {},
	create(context) {
		function check(node, value) {
			for (const token of value.split(/\s+/)) {
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
