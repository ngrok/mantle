import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The recipe page promises its fence is drop-in: copy the file, it runs. That
 * only stays true if the fence and the demo module cannot drift, so this
 * asserts the fence is byte-identical to the file the framed preview renders.
 *
 * If this fails, the fix is to re-copy the file into the fence, never to loosen
 * the assertion. A recipe whose code does not run is worse than no recipe.
 */
const RECIPE = "app/docs/recipes/list-page-loading-states.mdx";

const FENCED_FILES = ["app/features/list-page-loading-demo.tsx"] as const;

/** This file's own location, two directories below the app root. */
const APP_ROOT = new URL("../../", import.meta.url);

/**
 * Reads a path written relative to the app root. The paths above stay
 * app-relative because they are the names the recipe page itself uses and the
 * names that read best in test output, but they are resolved against this
 * module's own URL rather than the process's working directory, which is not
 * the app root under every runner and IDE.
 */
function readFromAppRoot(path: string): string {
	return readFileSync(fileURLToPath(new URL(path, APP_ROOT)), "utf8");
}

/**
 * Extracts every fenced `ts`/`tsx` block, allowing any fence length: a block
 * whose own content contains a ``` fence must be delimited by a longer run, and
 * oxfmt normalizes those to four backticks.
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

describe("list page loading recipe fences", () => {
	const markdown = readFromAppRoot(RECIPE);
	const blocks = fencedBlocks(markdown);

	it("finds fenced code on the recipe page", () => {
		expect(blocks.length).toBeGreaterThan(0);
	});

	it.for(FENCED_FILES)("%s appears verbatim in the recipe", (path) => {
		const source = readFromAppRoot(path).trimEnd();
		expect(blocks).toContain(source);
	});
});
