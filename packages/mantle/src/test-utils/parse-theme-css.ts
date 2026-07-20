/**
 * Test-only helpers for parsing mantle's theme stylesheets. Power the
 * invert-theme guard tests (which keep the hand-written `.invert-theme` rules
 * mechanically honest against the theme blocks and Tailwind's default palette)
 * and the browser sweep test (which injects normalized theme CSS and asserts
 * computed inversion end-to-end).
 */

/**
 * A parsed CSS rule: the full selector text and its raw body (declarations
 * and any nested rules, un-parsed).
 */
type CssRule = {
	selector: string;
	body: string;
};

/**
 * Strip `/* … *​/` comments from a CSS string.
 *
 * @example
 * ```ts
 * stripCssComments("a /* note *​/ b") // => "a  b"
 * ```
 */
function stripCssComments(css: string): string {
	return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * Convert Tailwind's build-time `--alpha(<color> / <alpha>)` function into the
 * standard `color-mix()` it compiles to, so theme CSS can be injected into a
 * real browser without a Tailwind build step.
 *
 * @example
 * ```ts
 * normalizeAlphaFunctions("--alpha(var(--color-neutral-500) / 0.3)")
 * // => "color-mix(in oklab, var(--color-neutral-500) 30%, transparent)"
 * ```
 */
function normalizeAlphaFunctions(value: string): string {
	return value.replace(
		/--alpha\(\s*([^()]*(?:\([^()]*\)[^()]*)*?)\s*\/\s*([\d.]+%?)\s*\)/g,
		(_match, color: string, alpha: string) => {
			// toFixed + unary plus avoids float artifacts (0.05 * 100 === 5.000000000000001)
			const percentage = alpha.endsWith("%")
				? alpha
				: `${+(Number.parseFloat(alpha) * 100).toFixed(6)}%`;
			return `color-mix(in oklab, ${color.trim()} ${percentage}, transparent)`;
		},
	);
}

/**
 * Find the index of the `}` matching the `{` at `openIndex`, tolerating nested
 * blocks (Tailwind's `@theme default` contains `@keyframes` rules).
 */
function findMatchingCloseBrace(source: string, openIndex: number): number {
	let depth = 0;
	for (let index = openIndex; index < source.length; index += 1) {
		const char = source[index];
		if (char === "{") {
			depth += 1;
		} else if (char === "}") {
			depth -= 1;
			if (depth === 0) {
				return index;
			}
		}
	}
	throw new Error("parse-theme-css: unbalanced braces");
}

/**
 * Extract every top-level rule from a CSS string, comment-stripped, in source
 * order. Nested rules stay inside their parent's `body`.
 *
 * @example
 * ```ts
 * extractTopLevelRules(":root { --a: 1; }")
 * // => [{ selector: ":root", body: " --a: 1; " }]
 * ```
 */
function extractTopLevelRules(css: string): CssRule[] {
	const source = stripCssComments(css);
	const rules: CssRule[] = [];
	let searchFrom = 0;
	while (true) {
		const braceIndex = source.indexOf("{", searchFrom);
		if (braceIndex === -1) {
			return rules;
		}
		// selector text starts after the previous top-level statement boundary
		const previousEnd = Math.max(
			source.lastIndexOf("}", braceIndex),
			source.lastIndexOf(";", braceIndex),
		);
		const selector = source
			.slice(previousEnd + 1, braceIndex)
			.replace(/\s+/g, " ")
			.trim();
		const closeIndex = findMatchingCloseBrace(source, braceIndex);
		rules.push({ selector, body: source.slice(braceIndex + 1, closeIndex) });
		searchFrom = closeIndex + 1;
	}
}

/**
 * Parse a rule body into an ordered property → value map. Values are
 * whitespace-collapsed and `--alpha()`-normalized; later duplicates win,
 * matching the cascade within a rule. Nested rules inside the body produce
 * garbage keys (brace-prefixed) that callers never query.
 *
 * @example
 * ```ts
 * parseDeclarations("--color-a: oklch(18.2% 0 0); color-scheme: dark;")
 * // => Map { "--color-a" => "oklch(18.2% 0 0)", "color-scheme" => "dark" }
 * ```
 */
function parseDeclarations(body: string): Map<string, string> {
	const declarations = new Map<string, string>();
	for (const entry of body.split(";")) {
		const colonIndex = entry.indexOf(":");
		if (colonIndex === -1) {
			continue;
		}
		const property = entry.slice(0, colonIndex).trim();
		const value = normalizeAlphaFunctions(
			entry
				.slice(colonIndex + 1)
				.replace(/\s+/g, " ")
				.trim(),
		);
		if (property.length === 0 || value.length === 0) {
			continue;
		}
		declarations.set(property, value);
	}
	return declarations;
}

/**
 * Parse the declarations of the first top-level rule whose selector matches.
 * Throws when nothing matches — a signal the theme sources changed shape and
 * the calling test needs updating.
 *
 * @example
 * ```ts
 * const dark = parseDeclarationBlock(darkCss, (sel) => sel.includes(":root.dark"));
 * dark.get("--color-neutral-50"); // => "oklch(18.2% 0 0)"
 * ```
 */
function parseDeclarationBlock(
	css: string,
	selectorTest: (selector: string) => boolean,
): Map<string, string> {
	const rule = extractTopLevelRules(css).find(({ selector }) => selectorTest(selector));
	if (rule == null) {
		throw new Error("parse-theme-css: no rule matched the selector test");
	}
	return parseDeclarations(rule.body);
}

export {
	//,
	extractTopLevelRules,
	normalizeAlphaFunctions,
	parseDeclarationBlock,
	parseDeclarations,
	stripCssComments,
};

export type {
	//,
	CssRule,
};
