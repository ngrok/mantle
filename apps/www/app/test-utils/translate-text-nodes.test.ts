import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * `translateTextNodes` lives in `packages/mantle/src/test-utils/`, and
 * `@ngrok/mantle` publishes no `./test-utils` subpath, so `apps/www` keeps a
 * copy rather than a published test helper nobody should import.
 *
 * The copy has to stay byte-identical. A drifted one stops reproducing the
 * crash, and every regression test that leans on it goes green for the wrong
 * reason. If this fails, re-copy the file; never loosen the assertion.
 */
const ORIGINAL = "../../../../packages/mantle/src/test-utils/translate-text-nodes.ts";
const COPY = "./translate-text-nodes.ts";

function read(relative: string) {
	return readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

describe("translateTextNodes copy", () => {
	it("is byte-identical to the mantle original", () => {
		expect(read(COPY)).toBe(read(ORIGINAL));
	});
});
