import { describe, expect, test } from "vitest";
import {
	defaultMeta,
	normalizeValue,
	parseMetastring,
	resolvePreRenderedCodeBlockProps,
	tokenizeMetastring,
} from "./resolve-pre-rendered-props.js";

describe("resolvePreRenderedCodeBlockProps", () => {
	test("returns undefined when no pre-rendered payload exists", () => {
		expect(resolvePreRenderedCodeBlockProps({ foo: "bar" })).toEqual({
			mantleCode: undefined,
			props: { foo: "bar" },
		});
	});

	test("normalizes mantle-prefixed payload", () => {
		expect(
			resolvePreRenderedCodeBlockProps({
				mantleCode: "const x = 1",
				mantleHighlightLines: "1,3-5",
				mantleLanguage: "ts",
				mantleLineNumberStart: "10",
				mantlePreHtml: "<span>...</span>",
				mantleShowLineNumbers: "true",
				dataX: "hello",
			}),
		).toEqual({
			mantleCode: {
				code: "const x = 1",
				collapsible: undefined,
				disableCopy: undefined,
				highlightLines: [1, "3-5"],
				language: "ts",
				lineNumberStart: 10,
				mode: undefined,
				preHtml: "<span>...</span>",
				rawLanguage: "ts",
				showLineNumbers: true,
				title: undefined,
			},
			props: {
				dataX: "hello",
			},
		});
	});

	test("returns mantle payload only", () => {
		expect(
			resolvePreRenderedCodeBlockProps({
				mantleCode: "echo hi",
				mantleLanguage: "sh",
				mantlePreHtml: "<span>...</span>",
				mantleShowLineNumbers: false,
			}),
		).toEqual({
			mantleCode: {
				code: "echo hi",
				collapsible: undefined,
				disableCopy: undefined,
				highlightLines: undefined,
				language: "sh",
				lineNumberStart: undefined,
				mode: undefined,
				preHtml: "<span>...</span>",
				rawLanguage: "sh",
				showLineNumbers: false,
				title: undefined,
			},
			props: {},
		});
	});

	test("normalizes mantle disableCopy/mode/title payload and strips mantle keys", () => {
		expect(
			resolvePreRenderedCodeBlockProps({
				mantleCode: "echo test",
				mantleDisableCopy: "true",
				mantleLanguage: "sh",
				mantleMode: "cli",
				mantlePreHtml: "<span>echo test</span>",
				mantleTitle: "  run command  ",
				id: "example",
			}),
		).toEqual({
			mantleCode: {
				code: "echo test",
				collapsible: undefined,
				disableCopy: true,
				highlightLines: undefined,
				language: "sh",
				lineNumberStart: undefined,
				mode: "cli",
				preHtml: "<span>echo test</span>",
				rawLanguage: "sh",
				showLineNumbers: undefined,
				title: "run command",
			},
			props: {
				id: "example",
			},
		});
	});

	test("detects payload when only mantleHighlightLines is provided", () => {
		const result = resolvePreRenderedCodeBlockProps({
			mantleHighlightLines: "1,3-5",
			dataX: "hello",
		});
		expect(result.mantleCode).toBeDefined();
		expect(result.mantleCode?.highlightLines).toEqual([1, "3-5"]);
		expect(result.props).toEqual({ dataX: "hello" });
	});

	test("detects payload when only mantleLineNumberStart is provided", () => {
		const result = resolvePreRenderedCodeBlockProps({
			mantleLineNumberStart: "10",
			dataX: "hello",
		});
		expect(result.mantleCode).toBeDefined();
		expect(result.mantleCode?.lineNumberStart).toBe(10);
		expect(result.props).toEqual({ dataX: "hello" });
	});

	test("normalizes non-mantle metadata keys when mantle payload exists", () => {
		expect(
			resolvePreRenderedCodeBlockProps({
				collapsible: "false",
				disableCopy: true,
				mantleCode: "echo plain",
				mantleLanguage: "sh",
				mode: "cli",
				mantlePreHtml: "<span>echo plain</span>",
				title: "  plain title  ",
				role: "presentation",
			}),
		).toEqual({
			mantleCode: {
				code: "echo plain",
				collapsible: false,
				disableCopy: true,
				highlightLines: undefined,
				language: "sh",
				lineNumberStart: undefined,
				mode: "cli",
				preHtml: "<span>echo plain</span>",
				rawLanguage: "sh",
				showLineNumbers: undefined,
				title: "plain title",
			},
			props: {
				role: "presentation",
			},
		});
	});
});

describe("parseMetastring", () => {
	test("given undefined, returns default meta", () => {
		const meta = parseMetastring(undefined);
		expect(meta).toEqual(defaultMeta);
	});

	test('given "title="Hello World"", returns meta with title and default values', () => {
		const meta = parseMetastring('title="Hello World"');
		expect(meta).toEqual({
			collapsible: false,
			disableCopy: false,
			mode: undefined,
			title: "Hello World",
		});
	});

	test('given "collapsible disableCopy mode=cli", returns meta with collapsible, disableCopy, and mode', () => {
		const meta = parseMetastring("collapsible disableCopy mode=cli");
		expect(meta).toEqual({
			collapsible: true,
			disableCopy: true,
			mode: "cli",
			title: undefined,
		});
	});

	test('given "collapsible disableCopy mode="file" title="Foo Bar"", returns meta with collapsible, disableCopy, mode, and title', () => {
		const meta = parseMetastring('collapsible disableCopy mode="file" title="Foo Bar"');
		expect(meta).toEqual({
			collapsible: true,
			disableCopy: true,
			mode: "file",
			title: "Foo Bar",
		});
	});

	test("given duplicates, returns meta with no duplicates and last value for Key-Value pairs", () => {
		const meta = parseMetastring(
			'collapsible disableCopy disableCopy mode="file" title="Foo Bar" title="Hello World"',
		);
		expect(meta).toEqual({
			collapsible: true,
			disableCopy: true,
			mode: "file",
			title: "Hello World",
		});
	});
});

describe("tokenizeMetastring", () => {
	test("given undefined, returns empty array", () => {
		const tokens = tokenizeMetastring(undefined);
		expect(tokens).toEqual([]);
	});

	test("splits on spaces outside quotes and keeps the space inside a quoted value", () => {
		const tokens = tokenizeMetastring('title="Terminal Example" disableCopy mode="cli"');
		expect(tokens).toEqual(['title="Terminal Example"', "disableCopy", 'mode="cli"']);
	});

	test("keeps whitespace inside a quote that re-opens within a token", () => {
		const tokens = tokenizeMetastring('title="Terminal Example "one" " disableCopy mode="cli"');
		expect(tokens).toEqual(['title="Terminal Example "one" "', "disableCopy", 'mode="cli"']);
	});

	test("treats an adjacent quote pair as an open and a close, not as a literal quote", () => {
		const tokens = tokenizeMetastring('title="Terminal Example "one"" disableCopy mode="cli"');
		expect(tokens).toEqual(['title="Terminal Example "one""', "disableCopy", 'mode="cli"']);
	});

	test("splits on tabs in addition to spaces", () => {
		const tokens = tokenizeMetastring('title="Tabby"\tcollapsible\tmode="cli"');
		expect(tokens).toEqual(['title="Tabby"', "collapsible", 'mode="cli"']);
	});

	test("splits on newlines and carriage returns", () => {
		const tokens = tokenizeMetastring('title="Hello"\ncollapsible\r\nmode="cli"');
		expect(tokens).toEqual(['title="Hello"', "collapsible", 'mode="cli"']);
	});

	test("preserves whitespace inside quoted values", () => {
		const tokens = tokenizeMetastring('title="Hello\tWorld"');
		expect(tokens).toEqual(['title="Hello\tWorld"']);
	});
});

describe("normalizeValue", () => {
	test("given undefined, returns undefined", () => {
		const value = normalizeValue(undefined);
		expect(value).toEqual(undefined);
	});

	test('given "  \t\n\r  ", returns ""', () => {
		const value = normalizeValue("  \t\n\r  ");
		expect(value).toEqual("");
	});

	test('given "Hello World", returns "Hello World"', () => {
		const value = normalizeValue("Hello World");
		expect(value).toEqual("Hello World");
	});

	test('given ""Hello World"", returns "Hello World"', () => {
		const value = normalizeValue('"Hello World"');
		expect(value).toEqual("Hello World");
	});
});
