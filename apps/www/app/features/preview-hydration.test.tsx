// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { hydrationErrorsOf } from "~/test-utils/hydration";
import { previewExamples } from "./preview-registry";

/**
 * Every preview example is a whole document the server paints first, so a
 * render that reads the browser lands as a hydration mismatch: React throws
 * the server tree away, the demo flashes, and the console reports it.
 */
describe("preview examples hydrate without a mismatch", () => {
	it.for(Object.entries(previewExamples))("%s", ([, { Component }]) => {
		expect(hydrationErrorsOf(<Component />)).toEqual([]);
	});
});
