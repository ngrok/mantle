import { compile } from "tailwindcss";
import tailwindCss from "tailwindcss/index.css?raw";
import { expect, test } from "vitest";
import mantleCss from "../../mantle.css?raw";

/**
 * Compiles `mantle.css`, then `appCss`, the way a consumer's Tailwind build does,
 * for the given candidates. `tw-animate-css` is stubbed out: it declares none of the tokens
 * these tests read.
 */
async function buildMantleCss(candidates: string[] = [], appCss = "") {
	const compiler = await compile(`${mantleCss}\n${appCss}`, {
		loadStylesheet: async (id, base) => ({
			base,
			content: id === "tailwindcss" ? tailwindCss : "",
			path: id,
		}),
	});
	return compiler.build(candidates);
}

// Why: a consumer's plain stylesheet (a third-party widget override) reads
// `var(--shadow-md)` at runtime, and no utility in that build reads the token.
test("emits the shadow tokens as runtime CSS variables when no utility uses them", async () => {
	const css = await buildMantleCss();

	expect(css).toMatch(/--shadow-sm:\s*0px 1px 2px 0/);
	expect(css).toMatch(/--shadow-md:\s*0px 2px 13px 0px/);
});

// Why: Tailwind wrote each `@theme inline` registration into `@layer theme` as
// `--background-color-card: var(--background-color-card)`. That cycle is invalid,
// and on a shadow `:host`, where no theme rule overrides it, it hid the page value.
test("the semantic utilities read the theme tokens, and no token is declared as a reference to itself", async () => {
	const css = await buildMantleCss(["bg-card", "text-muted", "border-card", "ring-focus-accent"]);

	expect(css).toMatch(/\.bg-card\s*\{\s*background-color:\s*var\(--background-color-card\)/);
	expect(css).toMatch(/\.text-muted\s*\{\s*color:\s*var\(--text-color-muted\)/);
	const selfReferences = [...css.matchAll(/(--[\w-]+):\s*var\(\1\)/g)].map(([, name]) => name);
	expect(selfReferences).toEqual([]);
});

// Why: no theme rule declares the tooltip colors; `@theme` is their only definition.
// A plain stylesheet that reads them must still find a value.
test("emits the tooltip colors when a plain stylesheet reads them", async () => {
	const css = await buildMantleCss(
		[],
		".probe { background-color: var(--background-color-tooltip); }",
	);

	expect(css).toMatch(/--background-color-tooltip:\s*#000;/);
});
