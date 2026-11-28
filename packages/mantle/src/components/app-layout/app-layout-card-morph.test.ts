import { compile } from "tailwindcss";
import { describe, expect, test } from "vitest";
import mantleCss from "../../mantle.css?raw";
import { loadMantleImport } from "../../test-utils/parse-theme-css.js";

/**
 * The page-to-panel morph is part of the experience, not decoration: the
 * reader sees the panel slide over the page and keeps their place. These tests
 * fail when a change to `mantle.css` drops the parts of it that apps rely on.
 */
async function buildMantleCss() {
	const compiler = await compile(mantleCss, { loadStylesheet: loadMantleImport });
	return compiler.build([]);
}

/** Every rule body whose selector list names `selector`. */
function rulesFor(css: string, selector: string): string {
	const bodies: Array<string> = [];
	const pattern = /([^{}]+)\{([^{}]*)\}/g;
	for (const match of css.matchAll(pattern)) {
		const [, selectors = "", body = ""] = match;
		if (selectors.includes(selector)) {
			bodies.push(body);
		}
	}
	return bodies.join("\n");
}

/** The rules inside every `prefers-reduced-motion: reduce` block, and no others. */
function reducedMotionRules(css: string): string {
	const blocks: Array<string> = [];
	let from = css.indexOf("prefers-reduced-motion: reduce");
	while (from !== -1) {
		const open = css.indexOf("{", from);
		let depth = 1;
		let end = open + 1;
		while (depth > 0 && end < css.length) {
			if (css[end] === "{") {
				depth++;
			}
			if (css[end] === "}") {
				depth--;
			}
			end++;
		}
		blocks.push(css.slice(open + 1, end - 1));
		from = css.indexOf("prefers-reduced-motion: reduce", end);
	}
	return blocks.join("\n");
}

describe("app-layout-card morph", () => {
	test("the moving card paints above the page with a shadow", async () => {
		const group = rulesFor(await buildMantleCss(), "::view-transition-group(*.app-layout-card)");

		expect(group).toContain("z-index: 1");
		expect(group).toContain("box-shadow: var(--shadow-lg)");
		expect(group).toContain("animation-duration: 300ms");
	});

	test("the page under the card holds still and stays below it", async () => {
		const css = await buildMantleCss();

		expect(rulesFor(css, "::view-transition-group(*.app-layout-card-under)")).toContain(
			"z-index: 0",
		);
		expect(rulesFor(css, "::view-transition-old(*.app-layout-card-under)")).toContain(
			"animation: none",
		);
	});

	test("reduced motion cuts the morph", async () => {
		const reduced = reducedMotionRules(await buildMantleCss());

		for (const pseudo of ["group", "old", "new"]) {
			expect(rulesFor(reduced, `::view-transition-${pseudo}(*.app-layout-card)`)).toContain(
				"animation: none",
			);
			expect(rulesFor(reduced, `::view-transition-${pseudo}(*.app-layout-card-alone)`)).toContain(
				"animation: none",
			);
		}
		expect(rulesFor(reduced, "::view-transition-old(*.app-layout-card)")).toContain("opacity: 0");
	});
});
