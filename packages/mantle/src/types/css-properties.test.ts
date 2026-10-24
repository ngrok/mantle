import type { CSSProperties } from "react";
import { describe, expect, expectTypeOf, test } from "vitest";
import { $cssProperties } from "./css-properties.js";

describe("$cssProperties", () => {
	test("accepts CSS variables beside React CSS properties, and returns the input", () => {
		const style: CSSProperties = { opacity: 0.5 };
		const input = { display: "block", "--gap": 8, "--brand-color": "red", ...style } as const;

		expect($cssProperties(input)).toBe(input);
		expectTypeOf($cssProperties(input)).toEqualTypeOf<CSSProperties>();
	});

	test("accepts a computed CSS variable key", () => {
		const token = "--k8s-kubelet-color" as const;

		expect($cssProperties({ [token]: "#326CE5" })).toEqual({ "--k8s-kubelet-color": "#326CE5" });
	});

	test("rejects an unknown key that does not start with `--`", () => {
		// @ts-expect-error `displya` is not a CSS property or a CSS variable.
		expect($cssProperties({ displya: "block" })).toEqual({ displya: "block" });
	});
});
