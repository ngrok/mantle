import { describe, expect, test } from "vitest";
import { configuredElements, jsxRequireTranslateNo } from "./jsx-require-translate-no.ts";
import { ruleTester } from "./rule-tester.ts";

describe("configuredElements", () => {
	test("falls back to the default list when the options name none", () => {
		expect(configuredElements([])).toEqual(new Set(["kbd", "samp"]));
	});

	test("replaces the default list rather than extending it", () => {
		expect(configuredElements([{ elements: ["CodeBlock.Code"] }])).toEqual(
			new Set(["CodeBlock.Code"]),
		);
	});

	test("reads an empty list as an opt-out", () => {
		expect(configuredElements([{ elements: [] }])).toEqual(new Set());
	});

	test("drops the entries that are not strings", () => {
		expect(configuredElements([{ elements: ["kbd", 7, null, "samp"] }])).toEqual(
			new Set(["kbd", "samp"]),
		);
	});

	test.each([
		["a null option", [null]],
		["an option that is not an object", ["kbd"]],
		["an option missing the key", [{ other: true }]],
		["a non-array element list", [{ elements: "kbd" }]],
	])("falls back to the default list for %s", (_label, options) => {
		expect(configuredElements(options)).toEqual(new Set(["kbd", "samp"]));
	});
});

ruleTester.run("jsx-require-translate-no", jsxRequireTranslateNo, {
	valid: [
		// Review finding 8: a static expression value is static, and the last assignment wins.
		'<kbd translate={"no"}>{shortcut}</kbd>',
		'<kbd {...props} translate="no">{shortcut}</kbd>',
		'<kbd translate="no">{shortcut}</kbd>',
		'<samp translate="no">{output}</samp>',
		// A bare or dynamic `translate` says the author decided, so the rule stays quiet.
		"<kbd translate>{shortcut}</kbd>",
		"<kbd translate={translate}>{shortcut}</kbd>",
		// Descendants inherit the attribute, so an enclosing lock is enough.
		'<div translate="no"><kbd>{shortcut}</kbd></div>',
		'<div translate="no"><p><kbd>{shortcut}</kbd></p></div>',
		// An element outside the configured list is not this rule's business.
		"<code>{snippet}</code>",
		"<span>{shortcut}</span>",
		// The default list holds tag names, not the components that already lock the attribute.
		"<Kbd>{shortcut}</Kbd>",
		{
			// An empty list turns the rule off.
			code: "<kbd>{shortcut}</kbd>",
			options: [{ elements: [] }],
		},
		{
			code: "<code>{snippet}</code>",
			options: [{ elements: ["kbd"] }],
		},
		{
			// A configured component name matches, and this one carries the attribute.
			code: '<CodeBlock.Code translate="no">{snippet}</CodeBlock.Code>',
			options: [{ elements: ["CodeBlock.Code"] }],
		},
	],
	invalid: [
		{
			// Review finding 11: a static value other than `no` leaves the key translatable.
			code: '<kbd translate="yes">{shortcut}</kbd>',
			errors: [{ messageId: "missingTranslateNo", data: { name: "kbd" } }],
		},
		{
			code: '<kbd translate="">{shortcut}</kbd>',
			errors: [{ messageId: "missingTranslateNo", data: { name: "kbd" } }],
		},
		{
			// Review finding 8 and Qodo: a later spread can override an earlier `translate="no"`.
			code: '<kbd translate="no" {...{ translate: "yes" }}>{shortcut}</kbd>',
			errors: [{ messageId: "missingTranslateNo", data: { name: "kbd" } }],
		},
		{
			code: '<kbd translate="no" {...props}>{shortcut}</kbd>',
			errors: [{ messageId: "missingTranslateNo", data: { name: "kbd" } }],
		},
		{
			// Review finding 7: the nearest `translate` decides.
			code: '<div translate="no"><aside translate="yes"><kbd>Return</kbd></aside></div>',
			errors: [{ messageId: "missingTranslateNo", data: { name: "kbd" } }],
		},
		{
			// Review finding 6: a portal mounts elsewhere, so it does not inherit the attribute.
			code: '<div translate="no">{createPortal(<kbd>K</kbd>, node)}</div>',
			errors: [{ messageId: "missingTranslateNo", data: { name: "kbd" } }],
		},
		{
			code: "<kbd>{shortcut}</kbd>",
			errors: [{ messageId: "missingTranslateNo", data: { name: "kbd" } }],
		},
		{
			code: "<samp>{output}</samp>",
			errors: [{ messageId: "missingTranslateNo", data: { name: "samp" } }],
		},
		{
			// `translate="yes"` on an ancestor does not lock the subtree.
			code: '<div translate="yes"><kbd>{shortcut}</kbd></div>',
			errors: [{ messageId: "missingTranslateNo", data: { name: "kbd" } }],
		},
		{
			// The ancestor walk must read the attribute value, not just the attribute name.
			code: "<div translate><kbd>{shortcut}</kbd></div>",
			errors: [{ messageId: "missingTranslateNo", data: { name: "kbd" } }],
		},
		{
			code: "<Kbd>{shortcut}</Kbd>",
			options: [{ elements: ["Kbd"] }],
			errors: [{ messageId: "missingTranslateNo", data: { name: "Kbd" } }],
		},
		{
			// A member-expression tag name is spelled with its object.
			code: "<CodeBlock.Code>{snippet}</CodeBlock.Code>",
			options: [{ elements: ["CodeBlock.Code"] }],
			errors: [{ messageId: "missingTranslateNo", data: { name: "CodeBlock.Code" } }],
		},
		{
			// Each offending element reports once.
			code: "<div><kbd>{a}</kbd><samp>{b}</samp></div>",
			errors: [
				{ messageId: "missingTranslateNo", data: { name: "kbd" } },
				{ messageId: "missingTranslateNo", data: { name: "samp" } },
			],
		},
	],
});
