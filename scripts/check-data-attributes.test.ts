import { describe, expect, it } from "vitest";

import { jsDocDataAttributes, stampedDataAttributes } from "./check-data-attributes.ts";

describe("stampedDataAttributes", () => {
	it("finds each way a module stamps an attribute", () => {
		const code = [
			'<div data-open={open ? "" : undefined} data-side="top">',
			"<span data-input-otp />",
			'const props = { "data-value": value };',
			'element.setAttribute("data-shake", "");',
			'element.toggleAttribute("data-thumb-over", over);',
			'floating.dataset.themeTransition = "";',
			'`<span data-line-number="${n}">`',
		].join("\n");

		expect(stampedDataAttributes(code)).toEqual([
			"data-input-otp",
			"data-line-number",
			"data-open",
			"data-shake",
			"data-side",
			"data-theme-transition",
			"data-thumb-over",
			"data-value",
		]);
	});

	it("skips selectors, variants, and comments that only name an attribute", () => {
		const code = [
			'<div className="data-open:block group-data-[side=top]:mt-1 has-data-alert-dismiss:pr-6" />',
			'node.querySelector("[data-float-arrow]");',
			'node.hasAttribute("data-closing");',
			'observer.observe(node, { attributeFilter: ["data-target"] });',
			"/** | `data-documented` | present | In a JSDoc table. | */",
			"// <div data-commented={x} />",
		].join("\n");

		expect(stampedDataAttributes(code)).toEqual([]);
	});
});

describe("jsDocDataAttributes", () => {
	it("reads the first column of a JSDoc data-attribute table and no other table", () => {
		const code = [
			"/**",
			" * | CSS Variable | Default | Description |",
			" * | --- | --- | --- |",
			" * | `--tabs-gap` | `1rem` | The gap. |",
			" *",
			" * | Data Attribute | Value | Description |",
			" * | --- | --- | --- |",
			' * | `data-orientation` | `"horizontal"` \\| `"vertical"` | The orientation. |',
			" * | `data-dragging` | present | During a drag. |",
			" */",
		].join("\n");

		expect(jsDocDataAttributes(code)).toEqual(["data-dragging", "data-orientation"]);
	});
});
