import { expect, test } from "vitest";
import { computeJsonFoldRanges } from "./compute-json-fold-ranges.js";
import { decorateHighlightedHtml } from "./decorate-highlighted-html.js";

/**
 * Synthesizes Shiki-shaped HTML for a JSON source by wrapping every line in
 * `<span class="line">`: exactly the shape `decorateHighlightedHtml` expects.
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

// Why bytes per line: a non-opener line carries only `data-fold-regions`
// (about 24 bytes here), and a spacer span on each line adds at least 30 more,
// whatever its class name. The count is deterministic, not a wall-clock budget.
test("fold markup adds under 32 bytes for each line", () => {
	const code = buildLargeJson(1000);
	const baseHtml = shikiShapedHtml(code);

	const baseline = decorateHighlightedHtml({
		html: baseHtml,
		lineNumberStart: 1,
	});
	const withFolds = decorateHighlightedHtml({
		foldableRanges: computeJsonFoldRanges(code),
		html: baseHtml,
		lineNumberStart: 1,
	});

	const lineCount = code.split("\n").length;
	expect((withFolds.length - baseline.length) / lineCount).toBeLessThan(32);
});
