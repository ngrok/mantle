import { createElement, type ReactNode } from "react";
import { describe, expect, test } from "vitest";
import {
	hasRenderableErrorListChildren,
	isErrorItemRenderable,
	normalizeErrorMessages,
} from "./error-helpers.js";

const errorItemType = "field-error-item";

/**
 * Opaque component used to verify that custom components are treated as
 * renderable because their eventual output is unknowable from props alone.
 */
const OpaqueError = ({ children }: { children?: ReactNode }) =>
	createElement("span", null, children);

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
			expect(isErrorItemRenderable(undefined)).toBe(false);
			expect(isErrorItemRenderable(false)).toBe(false);
			expect(isErrorItemRenderable(true)).toBe(false);
			expect(isErrorItemRenderable("")).toBe(false);
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
					children: true,
					errorItemType,
				}),
			).toBe(false);
			expect(
				hasRenderableErrorListChildren({
					children: [false, true, null],
					errorItemType,
				}),
			).toBe(false);
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

		test("treats host elements and custom components as opaque renderable content", () => {
			// Wrapping ErrorItems in a host element inside a <ul> is invalid
			// HTML; we don't recurse into it. Both inputs are treated as
			// opaque-and-therefore-renderable.
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
			expect(
				hasRenderableErrorListChildren({
					children: <OpaqueError />,
					errorItemType,
				}),
			).toBe(true);
		});
	});
});
