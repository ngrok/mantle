import { describe, expect, test } from "vitest";
import {
	defaultMeta,
	normalizeValue,
	parseMetastring,
	tokenizeMetastring,
} from "./resolve-pre-rendered-props.js";

describe("parseMetastring", () => {
	test("given undefined, returns default meta", () => {
		const meta = parseMetastring(undefined);
		expect(meta).toEqual(defaultMeta);
	});

	test("given empty string, returns default meta", () => {
		const meta = parseMetastring("");
		expect(meta).toEqual(defaultMeta);
	});

	test("given only whitespace, returns default meta", () => {
		const meta = parseMetastring("  \t\n\r  ");
		expect(meta).toEqual(defaultMeta);
	});

	test('given "title="Hello World", returns meta with title and default values', () => {
		const meta = parseMetastring('title="Hello World"');
		expect(meta).toEqual({
			collapsible: false,
			disableCopy: false,
			mode: undefined,
			title: "Hello World",
		});
	});

	test('given "collapsible disableCopy mode="cli", returns meta with collapsible, disableCopy, and mode', () => {
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

	test("given empty string, returns empty array", () => {
		const tokens = tokenizeMetastring("");
		expect(tokens).toEqual([]);
	});

	test("given only whitespace, returns empty array", () => {
		const tokens = tokenizeMetastring("  \t\n\r  ");
		expect(tokens).toEqual([]);
	});

	test(`given 'title="Hello World"', returns ['title="Hello World"']`, () => {
		const tokens = tokenizeMetastring('title="Hello World"');
		expect(tokens).toEqual(['title="Hello World"']);
	});

	test(`given "title='Terminal Example" disableCopy mode="cli"", returns ['title="Terminal Example"', 'disableCopy', 'mode="cli"']`, () => {
		const tokens = tokenizeMetastring('title="Terminal Example" disableCopy mode="cli"');
		expect(tokens).toEqual(['title="Terminal Example"', "disableCopy", 'mode="cli"']);
	});

	test(`given "title="Terminal Example "one" disableCopy mode="cli"", returns ['title="Terminal Example "one"', 'disableCopy', 'mode="cli"']`, () => {
		const tokens = tokenizeMetastring('title="Terminal Example "one" " disableCopy mode="cli"');
		expect(tokens).toEqual(['title="Terminal Example "one" "', "disableCopy", 'mode="cli"']);
	});

	test(`given 'title="Terminal Example "one"" disableCopy mode="cli"', returns ['title="Terminal Example "one""', 'disableCopy', 'mode="cli"']`, () => {
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

	test('given "", returns ""', () => {
		const value = normalizeValue("");
		expect(value).toEqual("");
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
