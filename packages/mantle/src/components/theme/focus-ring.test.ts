import { compile } from "tailwindcss";
import { describe, expect, test } from "vitest";
import mantleCss from "../../mantle.css?raw";
import { loadMantleImport } from "../../test-utils/parse-theme-css.js";

/**
 * Compiles `mantle.css` the way a consumer's Tailwind build does.
 * `tw-animate-css` is stubbed out: it declares no ring utilities.
 */
async function buildMantleCss(candidates: string[]) {
	const compiler = await compile(mantleCss, { loadStylesheet: loadMantleImport });
	return compiler.build(candidates);
}

/** The body of the rule for `selector`, such as `.focus-ring`. */
function ruleOf(css: string, selector: string): string {
	const match = new RegExp(String.raw`\n( *)${RegExp.escape(selector)} \{`).exec(css);
	if (match == null) {
		throw new Error(`The compiled CSS holds no rule for ${selector}.`);
	}
	return css.slice(match.index, css.indexOf(`\n${match[1]}}`, match.index));
}

describe("focus-ring", () => {
	test("draws a 4px accent ring and removes the outline", async () => {
		const rule = ruleOf(await buildMantleCss(["focus-ring"]), ".focus-ring");

		expect(rule).toContain("calc(4px + var(--tw-ring-offset-width))");
		expect(rule).toContain("--tw-ring-color: var(--ring-color-focus-accent);");
		expect(rule).toContain("outline-style: none;");
	});

	test.each(["danger", "warning", "success", "neutral"])(
		"focus-ring-%s uses the focus color of the tone",
		async (tone) => {
			const rule = ruleOf(await buildMantleCss([`focus-ring-${tone}`]), `.focus-ring-${tone}`);

			expect(rule).toContain("calc(4px + var(--tw-ring-offset-width))");
			expect(rule).toContain(`--tw-ring-color: var(--ring-color-focus-${tone});`);
		},
	);

	test("a tone with no focus color token compiles to nothing", async () => {
		expect(await buildMantleCss(["focus-ring-bogus"])).not.toContain("focus-ring-bogus");
	});

	// Why: CSS order, not class order, decides which rule wins on one element.
	test("a ring width class and a ring color class come later, so they override it", async () => {
		const css = await buildMantleCss([
			"focus-visible:focus-ring",
			"focus-visible:focus-ring-danger",
			"focus-visible:ring-2",
			"focus-visible:ring-focus-success",
		]);
		const position = (name: string) => css.indexOf(`.focus-visible\\:${name}:focus-visible`);
		const lastUtility = Math.max(position("focus-ring"), position("focus-ring-danger"));

		expect(position("focus-ring")).toBeGreaterThan(-1);
		expect(position("ring-2")).toBeGreaterThan(lastUtility);
		expect(position("ring-focus-success")).toBeGreaterThan(lastUtility);
	});
});
