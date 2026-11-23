import { describe, expect, it } from "vitest";
import { judge } from "./bundle-budget.ts";

describe("judge", () => {
	it("fails a size one byte over its budget", () => {
		expect(judge({ gzipBytes: 10_001, maxGzipBytes: 10_000 })).toEqual({ kind: "over", overBy: 1 });
	});

	it("passes a size at its budget and a size a little under it", () => {
		expect(judge({ gzipBytes: 10_000, maxGzipBytes: 10_000 })).toEqual({ kind: "within" });
		expect(judge({ gzipBytes: 9_700, maxGzipBytes: 10_000 })).toEqual({ kind: "within" });
	});

	it("asks for a lower budget once a size falls more than 3% under it", () => {
		expect(judge({ gzipBytes: 9_699, maxGzipBytes: 10_000 })).toEqual({
			kind: "stale",
			underBy: 301,
		});
	});
});
