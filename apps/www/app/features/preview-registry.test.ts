import { describe, expect, it } from "vitest";
import { isPreviewExampleName } from "./preview-registry";

describe("isPreviewExampleName", () => {
	it("accepts registered example names", () => {
		expect(isPreviewExampleName("centered-layout")).toBe(true);
	});

	it("rejects unknown URL segments — the preview route 404s on these", () => {
		expect(isPreviewExampleName("nope")).toBe(false);
		expect(isPreviewExampleName("")).toBe(false);
	});

	// Regression: `in` matched prototype-chain names, so /preview/toString
	// passed the guard and crashed the route instead of 404ing.
	it("rejects prototype-chain property names", () => {
		expect(isPreviewExampleName("toString")).toBe(false);
		expect(isPreviewExampleName("constructor")).toBe(false);
		expect(isPreviewExampleName("hasOwnProperty")).toBe(false);
	});
});
