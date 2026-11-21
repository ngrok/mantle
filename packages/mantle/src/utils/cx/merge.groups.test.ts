import { expect, test } from "vitest";
import { mergeClassList } from "./merge.js";

// Why a file of its own: the test needs a fresh module, where no built-in group is registered yet.
test("keeps merging built-in utilities after many arbitrary properties", () => {
	for (let index = 0; index < 1 << 16; index++) {
		mergeClassList(`[--unique-${index}:1]`);
	}
	expect(mergeClassList("opacity-20 opacity-50")).toBe("opacity-50");
	expect(mergeClassList("grid-cols-2 grid-cols-3")).toBe("grid-cols-3");
});
