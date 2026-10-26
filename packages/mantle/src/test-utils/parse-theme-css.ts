/**
 * Test-only helpers for parsing mantle's theme stylesheet. Power the
 * invert-theme guard tests (which keep the `light-dark()` palette and the
 * color-scheme rules honest against Tailwind's default palette) and the
 * browser tests (which inject normalized theme CSS and assert the resolved
 * colors end-to-end).
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

function serializeRule(selector: string, declarations: Map<string, string>): string {
	const body = [...declarations].map(([property, value]) => `${property}: ${value};`).join("\n");
	return `${selector} {\n${body}\n}`;
}

/**
 * Build the theme CSS a consumer build emits, from the raw sources, so a
 * browser test can inject it with no Tailwind build step: Tailwind's default
 * palette and mantle's `@theme` at `:root`, then every `:root` rule of
 * mantle.css. Each value has `--alpha()` compiled to `color-mix()`.
 *
 * @example
 * ```ts
 * style.textContent = themeTestCss({ mantleCss, tailwindThemeCss });
 * ```
 */
function themeTestCss({
	mantleCss,
	tailwindThemeCss,
}: {
	mantleCss: string;
	tailwindThemeCss: string;
}): string {
	const tailwindDefaults = parseDeclarationBlock(tailwindThemeCss, (selector) =>
		selector.includes("@theme default"),
	);
	const mantleTheme = parseDeclarationBlock(mantleCss, (selector) => selector === "@theme");
	const rootRules = extractTopLevelRules(mantleCss)
		.filter(({ selector }) => selector.startsWith(":root"))
		.map(({ selector, body }) => serializeRule(selector, parseDeclarations(body)));
	return [
		serializeRule(":root", new Map([...tailwindDefaults, ...mantleTheme])),
		...rootRules,
	].join("\n");
}

/**
 * The color a probe takes when a property holds no color, so the reader can
 * tell a color token from any other value.
 */
const NOT_A_COLOR = "rgb(1, 2, 3)";

/**
 * Read each property as an element under `element` paints it. A color
 * resolves as the `color` of a child probe, so each `light-dark()` resolves
 * against the `color-scheme` there. Any other value is the raw computed
 * value, prefixed `raw:`. The map also holds the computed `color-scheme`.
 *
 * Why a probe: a custom property keeps `light-dark()` unresolved, so
 * `getPropertyValue` returns the same text in both themes.
 *
 * @example
 * ```ts
 * readResolvedTokens(island, ["--background-color-card"]).get("--background-color-card");
 * // "oklch(0.205 0 0)"
 * ```
 */
function readResolvedTokens(
	element: HTMLElement,
	properties: readonly string[],
): Map<string, string> {
	const wrapper = document.createElement("span");
	wrapper.style.color = NOT_A_COLOR;
	const probe = document.createElement("span");
	wrapper.appendChild(probe);
	element.appendChild(wrapper);
	const computed = getComputedStyle(element);
	const values = new Map([["color-scheme", computed.colorScheme]]);
	for (const property of properties) {
		probe.style.color = `var(${property})`;
		const color = getComputedStyle(probe).color;
		values.set(
			property,
			color === NOT_A_COLOR ? `raw:${computed.getPropertyValue(property).trim()}` : color,
		);
	}
	wrapper.remove();
	return values;
}

export {
	//,
	extractTopLevelRules,
	parseDeclarationBlock,
	parseDeclarations,
	readResolvedTokens,
	themeTestCss,
};
