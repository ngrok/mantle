import { describe, expect, test } from "vitest";
import { clsx } from "./index.js";

describe("clsx", () => {
	test("joins string arguments with single spaces", () => {
		expect(clsx("a", "b", "c")).toBe("a b c");
	});

	test("ignores falsy values", () => {
		// oxlint-disable-next-line no-constant-binary-expression
		expect(clsx("a", false, null, undefined, 0, "", true && "b")).toBe("a b");
	});

	test("supports object syntax (truthy keys only)", () => {
		expect(clsx({ a: true, b: false, c: 1 })).toBe("a c");
	});

	test("flattens arrays recursively", () => {
		expect(clsx(["a", ["b", ["c", false]]], "d")).toBe("a b c d");
	});

	test("does NOT resolve Tailwind conflicts (unlike cx)", () => {
		// clsx is a plain join: conflicting utilities are both kept.
		expect(clsx("p-4", "p-8")).toBe("p-4 p-8");
	});

	test("plain space-join for non-class text, skipping falsy (input.tsx use case)", () => {
		const name: string | undefined = undefined;
		expect(clsx("The value entered for the", name, "input has failed validation.")).toBe(
			"The value entered for the input has failed validation.",
		);
	});
});
