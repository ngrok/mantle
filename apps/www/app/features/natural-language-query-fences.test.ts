import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The recipe page promises its fences are drop-in: copy the file, it runs. That
 * only stays true if the fences and the real modules cannot drift, so this asserts
 * each fence is byte-identical to the file it claims to be.
 *
 * If this fails, the fix is to re-copy the file into the fence, never to loosen
 * the assertion.
 */
const RECIPE = "app/docs/recipes/natural-language-query.mdx";

const FENCED_FILES = [
	"app/features/natural-language-query.ts",
	"app/features/natural-language-query-mock.ts",
	"app/features/natural-language-query-demo.tsx",
] as const;

/** This file's own location, two directories below the app root. */
const APP_ROOT = new URL("../../", import.meta.url);

/** Reads a path written relative to the app root. */
function readFromAppRoot(path: string): string {
	return readFileSync(fileURLToPath(new URL(path, APP_ROOT)), "utf8");
}

/** Extracts every fenced `ts`/`tsx` block, allowing any fence length. */
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

describe("natural language query recipe fences", () => {
	const blocks = fencedBlocks(readFromAppRoot(RECIPE));

	it.for(FENCED_FILES)("%s appears verbatim in the recipe", (path) => {
		expect(blocks).toContain(readFromAppRoot(path).trimEnd());
	});
});
