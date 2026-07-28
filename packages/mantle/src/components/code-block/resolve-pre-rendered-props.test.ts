import { describe, expect, test } from "vitest";
import { resolvePreRenderedCodeBlockProps } from "./resolve-pre-rendered-props.js";

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

	test("ignores unknown non-mantle payload keys", () => {
		expect(
			resolvePreRenderedCodeBlockProps({
				mantleCode: "new",
				mantleLanguage: "ts",
				mantlePreHtml: "<span>new</span>",
				shikiCode: "old",
			}),
		).toEqual({
			mantleCode: {
				code: "new",
				collapsible: undefined,
				disableCopy: undefined,
				highlightLines: undefined,
				language: "ts",
				lineNumberStart: undefined,
				mode: undefined,
				preHtml: "<span>new</span>",
				rawLanguage: "ts",
				showLineNumbers: undefined,
				title: undefined,
			},
			props: {
				shikiCode: "old",
			},
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

	test("drops an unsupported language but keeps it as rawLanguage", () => {
		// `rawLanguage` exists so a caller can warn about the unhighlightable fence it
		// fell back from; `language` must stay undefined so the fallback is taken.
		const result = resolvePreRenderedCodeBlockProps({
			mantleCode: "+++[->+++<]",
			mantleLanguage: "brainfuck",
			mantlePreHtml: "<span>+++</span>",
		});

		expect(result.mantleCode?.language).toBeUndefined();
		expect(result.mantleCode?.rawLanguage).toBe("brainfuck");
	});

	test("keeps rawLanguage as the raw value even when it is not a string", () => {
		const result = resolvePreRenderedCodeBlockProps({ mantleLanguage: 42 });

		expect(result.mantleCode?.language).toBeUndefined();
		expect(result.mantleCode?.rawLanguage).toBe(42);
	});

	test("prefers every mantle-prefixed value over its bare counterpart", () => {
		const result = resolvePreRenderedCodeBlockProps({
			collapsible: true,
			disableCopy: true,
			mantleCode: "echo hi",
			mantleCollapsible: "false",
			mantleDisableCopy: "false",
			mantleLanguage: "sh",
			mantleMode: "cli",
			mantlePreHtml: "<span>echo hi</span>",
			mantleTitle: "mantle title",
			mode: "file",
			title: "bare title",
		});

		// `false` from the mantle tier must win over `true` from the bare tier — a
		// `||` in place of the nullish fallback would silently flip both booleans.
		expect(result.mantleCode?.collapsible).toBe(false);
		expect(result.mantleCode?.disableCopy).toBe(false);
		expect(result.mantleCode?.mode).toBe("cli");
		expect(result.mantleCode?.title).toBe("mantle title");
	});

	test("falls back to the bare counterpart when the mantle value is absent", () => {
		const result = resolvePreRenderedCodeBlockProps({
			collapsible: "true",
			disableCopy: "true",
			mantleCode: "echo hi",
			mantleLanguage: "sh",
			mantlePreHtml: "<span>echo hi</span>",
			mode: "file",
			title: "bare title",
		});

		expect(result.mantleCode?.collapsible).toBe(true);
		expect(result.mantleCode?.disableCopy).toBe(true);
		expect(result.mantleCode?.mode).toBe("file");
		expect(result.mantleCode?.title).toBe("bare title");
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

	test("lineNumberStart string '0' resolves to undefined", () => {
		const result = resolvePreRenderedCodeBlockProps({
			mantleCode: "echo hi",
			mantleLanguage: "sh",
			mantlePreHtml: "<span>...</span>",
			mantleLineNumberStart: "0",
		});
		expect(result.mantleCode?.lineNumberStart).toBeUndefined();
	});

	test("highlightLines string with zeros filters them out", () => {
		const result = resolvePreRenderedCodeBlockProps({
			mantleCode: "echo hi",
			mantleLanguage: "sh",
			mantlePreHtml: "<span>...</span>",
			mantleHighlightLines: "0,0-2,3",
		});
		expect(result.mantleCode?.highlightLines).toEqual([3]);
	});

	test("highlightLines string with only zeros resolves to undefined", () => {
		const result = resolvePreRenderedCodeBlockProps({
			mantleCode: "echo hi",
			mantleLanguage: "sh",
			mantlePreHtml: "<span>...</span>",
			mantleHighlightLines: "0,0-2",
		});
		expect(result.mantleCode?.highlightLines).toBeUndefined();
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
