import { describe, expect, it } from "vitest";
import { findCycles } from "./check-dist.ts";

describe("findCycles", () => {
	it("reports each cycle once, and not the files that only import into it", () => {
		const imports = new Map([
			["entry.js", ["parts.js", "shared.js"]],
			["parts.js", ["chunk.js"]],
			["chunk.js", ["shared.js", "parts.js"]],
			["shared.js", []],
			["self.js", ["self.js"]],
		]);
		expect(findCycles(imports)).toEqual([
			["parts.js", "chunk.js", "parts.js"],
			["self.js", "self.js"],
		]);
	});

	it("passes a graph where two files import one shared file", () => {
		expect(
			findCycles(
				new Map([
					["a.js", ["shared.js"]],
					["b.js", ["shared.js", "a.js"]],
					["shared.js", []],
				]),
			),
		).toEqual([]);
	});
});
