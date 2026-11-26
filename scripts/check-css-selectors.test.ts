import { describe, expect, it } from "vitest";

import { customDataVariants, selectorProblems } from "./check-css-selectors.ts";
import { fixHint, hasHint, universalHint } from "./oxlint-rules/no-structural-combinator.js";

describe("selectorProblems", () => {
	it("flags a structural pseudo-class before a combinator, with its line", () => {
		const css = ".a { color: red; }\n\n.table > tr:last-child > *,\n.b {\n\tborder: 0;\n}\n";

		expect(selectorProblems(css)).toEqual([
			{ line: 3, selector: ".table > tr:last-child > *, .b", hint: fixHint },
		]);
	});

	it("checks nested rules and custom variants", () => {
		const css =
			"@custom-variant odd-row (&:nth-child(odd) > *);\n.a {\n\t&:first-child .b { color: red; }\n}\n";

		expect(selectorProblems(css).map((problem) => problem.line)).toEqual([1, 3]);
	});

	it("checks a nested rule as the selector it resolves to", () => {
		const css =
			".a:first-child {\n\t& > b { color: red; }\n\t.c { color: red; }\n\t&:hover { color: red; }\n}\n.d > e:last-child {\n\t& f { color: red; }\n}\n";

		expect(selectorProblems(css).map((problem) => problem.line)).toEqual([2, 3, 7]);
	});

	it("flags a universal subject after a sibling combinator or only attribute anchors", () => {
		const css =
			".a + * { color: red; }\n.b > tr ~ tr > * { color: red; }\n[data-state] > * { color: red; }\n.c > * { color: red; }\n.d + [data-slot=x] { color: red; }\n[data-x] .e > * { color: red; }\n@utility u {\n\t:root[data-theme] &::after { color: red; }\n}\n";

		expect(selectorProblems(css).map((problem) => problem.line)).toEqual([1, 2, 3]);
	});

	it("names each fix a selector needs, and reads a nested rule and a tag anchor", () => {
		const css =
			".a { & + * { color: red; } }\n.b > tr:last-child + * { color: red; }\nbutton[data-x] > * { color: red; }\n.c + .d { & > * { color: red; } }\n[data-y] > * > * { color: red; }\n.e\\+f > * { color: red; }\n.g + *:not(.h) { color: red; }\n";

		expect(selectorProblems(css)).toEqual([
			{ line: 1, selector: "& + *", hint: universalHint },
			{ line: 2, selector: ".b > tr:last-child + *", hint: `${fixHint} ${universalHint}` },
			{ line: 4, selector: "& > *", hint: universalHint },
			{ line: 5, selector: "[data-y] > * > *", hint: universalHint },
			{ line: 7, selector: ".g + *:not(.h)", hint: universalHint },
		]);
	});

	it("flags a :has() that tests a sibling or reaches past the anchor's children before a combinator", () => {
		const css =
			'pre:has(.toggle) .line { color: red; }\n.a:has(> b c) .d { color: red; }\n.p:not(:has(+ *))::after { color: red; }\n.e:has(> f > g) .h { color: red; }\n.i:has(.j) { color: red; }\n.k:has(> .l[aria-expanded="false"]) > .m::after { color: red; }\n';

		expect(selectorProblems(css)).toEqual([
			{ line: 1, selector: "pre:has(.toggle) .line", hint: hasHint },
			{ line: 2, selector: ".a:has(> b c) .d", hint: hasHint },
			{ line: 3, selector: ".p:not(:has(+ *))::after", hint: hasHint },
		]);
	});

	it("reads past an escaped quote", () => {
		expect(
			selectorProblems('.x { content: "\\""; }\n.a:first-child > b { color: red; }').length,
		).toBe(1);
	});

	it("allows a structural pseudo-class in the last compound or inside :has()", () => {
		const css =
			".a > :last-child { color: red; }\n.b:has(> tr:last-child > td) { color: red; }\n@media (width > 1px) { .c { color: red; } }\n@keyframes k { from { opacity: 0; } }\n";

		expect(selectorProblems(css)).toEqual([]);
	});

	it("allows a rule after a structural-selector-ok comment with a reason", () => {
		const css =
			"/* structural-selector-ok: the subtree is one icon. */\n.a:first-child > svg { color: red; }\n/* structural-selector-ok: */\n.b:first-child > svg { color: red; }\n";

		expect(selectorProblems(css)).toEqual([
			{ line: 4, selector: ".b:first-child > svg", hint: fixHint },
		]);
	});
});

describe("customDataVariants", () => {
	it("flags a data-* custom variant and leaves other custom variants alone", () => {
		const css =
			"@custom-variant dark (&:where(.dark, .dark *));\n@custom-variant data-side-start (&[data-side=start]);\n";

		expect(customDataVariants(css)).toEqual([2]);
	});

	it("skips a commented-out variant and finds one split across lines", () => {
		const css =
			"/*\n@custom-variant data-open (&[data-open]);\n*/\n@custom-variant\n  data-side-start (&[data-side=start]);\n";

		expect(customDataVariants(css)).toEqual([4]);
	});
});
