import { describe, expect, test } from "vitest";
import { computeJsonFoldRanges } from "./compute-json-fold-ranges.js";
import { decorateHighlightedHtml } from "./decorate-highlighted-html.js";

/**
 * Synthesizes Shiki-shaped HTML for a JSON source by wrapping every line in
 * `<span class="line">` — exactly the shape `decorateHighlightedHtml` expects.
 */
function shikiShapedHtml(code: string): string {
	return code
		.split("\n")
		.map((line) => `<span class="line">${line === "" ? "" : line}</span>`)
		.join("\n");
}

/** Builds an N-element "items" array wrapped in a top-level object. */
function buildLargeJson(itemCount: number): string {
	const lines: string[] = ["{", '  "items": ['];
	for (let index = 0; index < itemCount; index += 1) {
		lines.push(
			`    ${JSON.stringify({ id: index, label: `item-${index}`, enabled: index % 2 === 0 })}${index === itemCount - 1 ? "" : ","}`,
		);
	}
	lines.push("  ]");
	lines.push("}");
	return lines.join("\n");
}

describe("fold gutter — perf budget", () => {
	test("decorates 1000-line JSON", () => {
		const code = buildLargeJson(1000);
		const baseHtml = shikiShapedHtml(code);
		const ranges = computeJsonFoldRanges(code);

		const html = decorateHighlightedHtml({
			foldableRanges: ranges,
			html: baseHtml,
			lineNumberStart: 1,
			showLineNumbers: true,
		});

		expect(html.length).toBeGreaterThan(0);
		expect(html).toContain('data-fold-line="1"');
	});

	test("decorates 5000-line JSON", () => {
		const code = buildLargeJson(5000);
		const baseHtml = shikiShapedHtml(code);
		const ranges = computeJsonFoldRanges(code);

		const html = decorateHighlightedHtml({
			foldableRanges: ranges,
			html: baseHtml,
			lineNumberStart: 1,
			showLineNumbers: true,
		});

		expect(html.length).toBeGreaterThan(baseHtml.length);
		expect(html).toContain('data-fold-line="1"');
	});

	test("HTML payload overhead vs no-fold decoration is under 12%", () => {
		const code = buildLargeJson(1000);
		const baseHtml = shikiShapedHtml(code);

		const baseline = decorateHighlightedHtml({
			html: baseHtml,
			lineNumberStart: 1,
			showLineNumbers: true,
		});
		const withFolds = decorateHighlightedHtml({
			foldableRanges: computeJsonFoldRanges(code),
			html: baseHtml,
			lineNumberStart: 1,
			showLineNumbers: true,
		});

		const overhead = (withFolds.length - baseline.length) / baseline.length;
		expect(overhead).toBeLessThan(0.12);
	});
});
