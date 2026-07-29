import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The recipe page promises its fences are drop-in: copy the file, it runs. That
 * only stays true if the fences and the real modules cannot drift, so this asserts
 * each fence is byte-identical to the file it claims to be.
 *
 * If this fails, the fix is to re-copy the file into the fence — never to loosen
 * the assertion. A recipe whose code does not run is worse than no recipe.
 */
const RECIPE = "app/docs/recipes/breadcrumbs-from-routes.mdx";

const FENCED_FILES = [
	"app/features/breadcrumbs/route-breadcrumb.ts",
	"app/features/breadcrumbs/breadcrumbs.tsx",
	"app/features/breadcrumbs/breadcrumbs.test.tsx",
] as const;

/**
 * Extracts every fenced `ts`/`tsx` block, allowing any fence length — a block
 * whose own content contains a ``` fence (JSDoc `@example`) must be delimited by a
 * longer run, and oxfmt normalizes those to four backticks.
 */
function fencedBlocks(markdown: string): ReadonlyArray<string> {
	const blocks: Array<string> = [];
	const pattern = /^(`{3,})(?:ts|tsx)\n([\s\S]*?)^\1$/gm;
	let match = pattern.exec(markdown);
	while (match != null) {
		const [, , body] = match;
		if (body != null) {
			blocks.push(body.trimEnd());
		}
		match = pattern.exec(markdown);
	}
	return blocks;
}

describe("breadcrumbs recipe fences", () => {
	const markdown = readFileSync(RECIPE, "utf8");
	const blocks = fencedBlocks(markdown);

	it("finds fenced code on the recipe page", () => {
		expect(blocks.length).toBeGreaterThan(0);
	});

	it.for(FENCED_FILES)("%s appears verbatim in the recipe", (path) => {
		const source = readFileSync(path, "utf8").trimEnd();
		expect(blocks).toContain(source);
	});
});
