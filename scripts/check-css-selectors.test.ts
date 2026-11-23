import { describe, expect, it } from "vitest";

import { selectorProblems } from "./check-css-selectors.ts";

describe("selectorProblems", () => {
	it("flags a structural pseudo-class before a combinator, with its line", () => {
		const css = ".a { color: red; }\n\n.table > tr:last-child > *,\n.b {\n\tborder: 0;\n}\n";

		expect(selectorProblems(css)).toEqual([
			{ line: 3, selector: ".table > tr:last-child > *, .b" },
		]);
	});

	it("checks nested rules and custom variants", () => {
		const css =
			"@custom-variant odd-row (&:nth-child(odd) > *);\n.a {\n\t&:first-child .b { color: red; }\n}\n";

		expect(selectorProblems(css).map((problem) => problem.line)).toEqual([1, 3]);
	});

	it("allows a structural pseudo-class in the last compound or inside :has()", () => {
		const css =
			".a > :last-child { color: red; }\n.b:has(> tr:last-child > td) { color: red; }\n@media (width > 1px) { .c { color: red; } }\n@keyframes k { from { opacity: 0; } }\n";

		expect(selectorProblems(css)).toEqual([]);
	});

	it("allows a rule after a structural-selector-ok comment with a reason", () => {
		const css =
			"/* structural-selector-ok: the subtree is one icon. */\n.a:first-child > svg { color: red; }\n/* structural-selector-ok: */\n.b:first-child > svg { color: red; }\n";

		expect(selectorProblems(css)).toEqual([{ line: 4, selector: ".b:first-child > svg" }]);
	});
});
