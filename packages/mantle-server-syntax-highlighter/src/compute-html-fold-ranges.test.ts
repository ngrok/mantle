import { describe, expect, test } from "vitest";
import { computeHtmlFoldRanges } from "./compute-html-fold-ranges.js";

describe("computeHtmlFoldRanges", () => {
	test("returns no ranges for empty input", () => {
		expect(computeHtmlFoldRanges({ code: "", language: "html" })).toEqual([]);
	});

	test("folds a multi-line element", () => {
		const code = ["<div>", "  hello", "</div>"].join("\n");
		expect(computeHtmlFoldRanges({ code, language: "html" })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("emits nested ranges", () => {
		const code = ["<section>", "  <p>", "    text", "  </p>", "</section>"].join("\n");
		expect(computeHtmlFoldRanges({ code, language: "html" })).toEqual([
			{ id: "1", startLine: 1, endLine: 5 },
			{ id: "2", startLine: 2, endLine: 4 },
		]);
	});

	test("does not fold void elements", () => {
		const code = ["<div>", "  <br>", '  <img src="x.png">', "</div>"].join("\n");
		// Outer <div> still folds; void <br>/<img> contribute nothing.
		expect(computeHtmlFoldRanges({ code, language: "html" })).toEqual([
			{ id: "1", startLine: 1, endLine: 4 },
		]);
	});

	test("does not fold inline (single-line) elements", () => {
		const code = "<p>hello <span>world</span></p>";
		expect(computeHtmlFoldRanges({ code, language: "html" })).toEqual([]);
	});

	test("folds a multi-line opening tag (attribute list)", () => {
		const code = ["<div", '  class="x"', '  id="y"', ">", "  body", "</div>"].join("\n");
		// One fold for the element body (1→6) and one for the attribute list
		// on the opening tag (1→4); after dedup only the body fold survives
		// because both share opener line 1 and the body span is larger.
		expect(computeHtmlFoldRanges({ code, language: "html" })).toEqual([
			{ id: "1", startLine: 1, endLine: 6 },
		]);
	});

	test("folds a multi-line opening tag for a void element", () => {
		const code = ["<input", '  type="text"', '  name="email"', ">"].join("\n");
		// Void elements don't get a body fold, but the attribute list still folds.
		expect(computeHtmlFoldRanges({ code, language: "html" })).toEqual([
			{ id: "1", startLine: 1, endLine: 4 },
		]);
	});

	test("folds a full HTML document with explicit <html>/<head>/<body>", () => {
		const code = [
			"<!doctype html>",
			'<html lang="en">',
			"<head>",
			"  <title>x</title>",
			"</head>",
			"<body>",
			"  <h1>hi</h1>",
			"</body>",
			"</html>",
		].join("\n");
		expect(computeHtmlFoldRanges({ code, language: "html" })).toEqual([
			{ id: "2", startLine: 2, endLine: 9 },
			{ id: "3", startLine: 3, endLine: 5 },
			{ id: "6", startLine: 6, endLine: 8 },
		]);
	});

	test("ignores tag-like text inside HTML comments", () => {
		const code = ["<div>", "  <!-- <span> -->", "</div>"].join("\n");
		expect(computeHtmlFoldRanges({ code, language: "html" })).toEqual([
			{ id: "1", startLine: 1, endLine: 3 },
		]);
	});

	test("emits nested ranges inside template content", () => {
		const code = ["<template>", "  <div>", "    text", "  </div>", "</template>"].join("\n");
		expect(computeHtmlFoldRanges({ code, language: "html" })).toEqual([
			{ id: "1", startLine: 1, endLine: 5 },
			{ id: "2", startLine: 2, endLine: 4 },
		]);
	});

	describe("XML mode", () => {
		test("folds a multi-line XML element", () => {
			const code = ["<root>", "  <child>x</child>", "</root>"].join("\n");
			expect(computeHtmlFoldRanges({ code, language: "xml" })).toEqual([
				{ id: "1", startLine: 1, endLine: 3 },
			]);
		});

		test("respects XML self-closing tags", () => {
			const code = ["<root>", "  <empty/>", "  <other />", "</root>"].join("\n");
			// Both self-closing tags must NOT fold, otherwise parse5's HTML mode
			// would treat them as openers and consume the rest of the document.
			expect(computeHtmlFoldRanges({ code, language: "xml" })).toEqual([
				{ id: "1", startLine: 1, endLine: 4 },
			]);
		});

		test("emits nested ranges for nested XML", () => {
			const code = [
				"<project>",
				"  <dependencies>",
				"    <dependency>",
				"      <name>a</name>",
				"    </dependency>",
				"  </dependencies>",
				"</project>",
			].join("\n");
			expect(computeHtmlFoldRanges({ code, language: "xml" })).toEqual([
				{ id: "1", startLine: 1, endLine: 7 },
				{ id: "2", startLine: 2, endLine: 6 },
				{ id: "3", startLine: 3, endLine: 5 },
			]);
		});

		test("tolerates an XML processing instruction prelude", () => {
			const code = ['<?xml version="1.0"?>', "<root>", "  <child/>", "</root>"].join("\n");
			expect(computeHtmlFoldRanges({ code, language: "xml" })).toEqual([
				{ id: "2", startLine: 2, endLine: 4 },
			]);
		});
	});
});
