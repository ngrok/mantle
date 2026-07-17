import { describe, expect, it } from "vitest";
import { isPreviewExampleName, previewExamples } from "./preview-registry";

describe("previewExamples", () => {
	it("registers a component and a human-readable title for every example", () => {
		for (const [name, example] of Object.entries(previewExamples)) {
			expect(typeof example.Component, `${name} Component`).toBe("function");
			expect(example.title.length, `${name} title`).toBeGreaterThan(0);
		}
	});
});

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
