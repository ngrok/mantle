import { compile } from "tailwindcss";
import tailwindCss from "tailwindcss/index.css?raw";
import { expect, test } from "vitest";
import mantleCss from "../../mantle.css?raw";

/**
 * Compiles `mantle.css` the way a consumer's Tailwind build does, with no
 * candidates. `tw-animate-css` is stubbed out: it declares no shadow tokens.
 */
async function buildMantleCss() {
	const compiler = await compile(mantleCss, {
		loadStylesheet: async (id, base) => ({
			base,
			content: id === "tailwindcss" ? tailwindCss : "",
			path: id,
		}),
	});
	return compiler.build([]);
}

// Why: a consumer's plain stylesheet (a third-party widget override) reads
// `var(--shadow-md)` at runtime, and no utility in that build reads the token.
test("emits the shadow tokens as runtime CSS variables when no utility uses them", async () => {
	const css = await buildMantleCss();

	expect(css).toMatch(/--shadow-sm:\s*0px 1px 2px 0/);
	expect(css).toMatch(/--shadow-md:\s*0px 2px 13px 0px/);
});
