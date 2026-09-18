import { createElement } from "react";
import { describe, expect, test } from "vitest";
import {
	hasRenderableErrorListChildren,
	isErrorItemRenderable,
	normalizeErrorMessages,
} from "./error-helpers.js";

const errorItemType = "field-error-item";

describe("field helpers", () => {
	describe("normalizeErrorMessages", () => {
		test("trims strings and filters empty or non-string absence values", () => {
			expect(
				normalizeErrorMessages([" Required ", undefined, "", "  ", false, "Too short"]),
			).toEqual(["Required", "Too short"]);
		});

		test("removes duplicate messages after trimming while preserving first occurrence order", () => {
			expect(
				normalizeErrorMessages([
					" Required ",
					"Too short",
					"Required",
					" Too short ",
					"Use a symbol.",
				]),
			).toEqual(["Required", "Too short", "Use a symbol."]);
		});
	});

	describe("isErrorItemRenderable", () => {
		test("returns false for nullish / boolean / blank-string children", () => {
			expect(isErrorItemRenderable(null)).toBe(false);
			expect(isErrorItemRenderable(true)).toBe(false);
			expect(isErrorItemRenderable(" ")).toBe(false);
		});

		test("returns true for non-blank string and other renderable values", () => {
			expect(isErrorItemRenderable("Required")).toBe(true);
			expect(isErrorItemRenderable(0)).toBe(true);
			expect(isErrorItemRenderable(<span>Required</span>)).toBe(true);
		});
	});

	describe("hasRenderableErrorListChildren", () => {
		test("returns false for an empty fragment", () => {
			expect(
				hasRenderableErrorListChildren({
					// oxlint-disable-next-line react/jsx-no-useless-fragment -- empty fragment is the test subject
					children: <></>,
					errorItemType,
				}),
			).toBe(false);
		});

		test("returns false for boolean-only children", () => {
			expect(
				hasRenderableErrorListChildren({
					children: [false, true, null],
					errorItemType,
				}),
			).toBe(false);
		});

		test("counts a string child as content only when it has non-whitespace text", () => {
			expect(hasRenderableErrorListChildren({ children: " ", errorItemType })).toBe(false);
			expect(hasRenderableErrorListChildren({ children: "Required", errorItemType })).toBe(true);
		});

		test("uses Field.ErrorItem renderability for matching error item elements", () => {
			expect(
				hasRenderableErrorListChildren({
					children: createElement(errorItemType, null, " "),
					errorItemType,
				}),
			).toBe(false);
			expect(
				hasRenderableErrorListChildren({
					children: createElement(errorItemType, null, "Required"),
					errorItemType,
				}),
			).toBe(true);
		});

		test("treats a host element as opaque renderable content", () => {
			// Why no recursion: ErrorItems wrapped in a host element inside a <ul> are invalid HTML.
			expect(
				hasRenderableErrorListChildren({
					children: (
						<div>
							<span />
						</div>
					),
					errorItemType,
				}),
			).toBe(true);
		});

		test("treats a non-element child as renderable", () => {
			expect(hasRenderableErrorListChildren({ children: 0, errorItemType })).toBe(true);
		});
	});
});
