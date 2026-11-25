import { describe, expect, test } from "vitest";
import { decorateHighlightedHtml } from "./decorate-highlighted-html.js";

/**
 * Helper that builds a minimal Shiki-like HTML string from line contents.
 * Each line is wrapped in `<span class="line">...</span>` separated by `\n`.
 */
function shikiHtml(lines: string[], lineEnding = "\n"): string {
	return lines.map((line) => `<span class="line">${line}</span>`).join(lineEnding);
}

/**
 * Reads one line's class list out of the decorated HTML. An assertion then
 * names the class a line carries and never the `cx()` order.
 */
function classesForLine(html: string, lineNumber: number): string[] {
	return (
		html
			.match(new RegExp(`<span class="([^"]*)" data-line-number="${lineNumber}"`))?.[1]
			?.split(" ") ?? []
	);
}

describe("decorateHighlightedHtml", () => {
	test("wraps each line in mantle-code-line spans", () => {
		const html = shikiHtml(["const x = 1;", "const y = 2;"]);
		const result = decorateHighlightedHtml({ html });

		expect(result).toContain('class="mantle-code-line"');
		expect(result).toContain('data-line-number="1"');
		expect(result).toContain('data-line-number="2"');
		expect(result).toContain("const x = 1;");
		expect(result).toContain("const y = 2;");
	});

	test("replaces empty lines with a space to preserve line height", () => {
		const html = shikiHtml(["line1", "", "line3"]);
		const result = decorateHighlightedHtml({ html });

		expect(result).toContain('<span class="mantle-code-line-content"> </span>');
	});

	test("carries line numbers in data-line-number, out of the text", () => {
		const html = shikiHtml(["a", "b"]);
		const result = decorateHighlightedHtml({ html, lineNumberStart: 10 });

		// Why: CSS draws the number, so the text that copy and crawlers read is only the code.
		expect(result).toContain('data-line-number="10"');
		expect(result).toContain('data-line-number="11"');
		expect(result.replace(/<[^>]+>/g, "")).toBe("a\nb");
	});

	test("highlights specified lines", () => {
		const html = shikiHtml(["a", "b", "c"]);
		const result = decorateHighlightedHtml({ html, highlightLines: [2] });

		expect(classesForLine(result, 2)).toContain("mantle-code-line-highlighted");
		expect(classesForLine(result, 1)).not.toContain("mantle-code-line-highlighted");
		expect(classesForLine(result, 3)).not.toContain("mantle-code-line-highlighted");
	});

	test("strips trailing newlines from input", () => {
		const html = shikiHtml(["a", "b"]) + "\n\n\n";
		const result = decorateHighlightedHtml({ html });

		// should produce exactly 2 lines, not 5
		const lineCount = (result.match(/data-line-number=/g) ?? []).length;
		expect(lineCount).toBe(2);
	});

	test("normalizes \\r\\n line endings", () => {
		const html = shikiHtml(["a", "b", "c"], "\r\n");
		const result = decorateHighlightedHtml({ html });

		const lineCount = (result.match(/data-line-number=/g) ?? []).length;
		expect(lineCount).toBe(3);
		// no stray \r in the output
		expect(result).not.toContain("\r");
	});

	test("normalizes bare \\r line endings", () => {
		const html = shikiHtml(["a", "b"], "\r");
		const result = decorateHighlightedHtml({ html });

		const lineCount = (result.match(/data-line-number=/g) ?? []).length;
		expect(lineCount).toBe(2);
		expect(result).not.toContain("\r");
	});

	test("strips trailing \\r\\n sequences", () => {
		const html = shikiHtml(["a"]) + "\r\n\r\n";
		const result = decorateHighlightedHtml({ html });

		const lineCount = (result.match(/data-line-number=/g) ?? []).length;
		expect(lineCount).toBe(1);
	});

	describe("with foldableRanges", () => {
		test("renders a fold toggle button on opener lines", () => {
			const html = shikiHtml(["{", '  "a": 1', "}"]);
			const result = decorateHighlightedHtml({
				html,
				foldableRanges: [{ id: "1", startLine: 1, endLine: 3 }],
			});

			expect(result).toContain('<button type="button" class="mantle-code-fold-toggle"');
			expect(result).toContain('data-fold-line="1"');
			expect(result).toContain('aria-expanded="true"');
			expect(result).toContain('aria-label="Toggle code folding"');
		});

		test("annotates inner content lines with parent fold region IDs", () => {
			const html = shikiHtml(["[", "  1,", "  2", "]"]);
			const result = decorateHighlightedHtml({
				html,
				foldableRanges: [{ id: "1", startLine: 1, endLine: 4 }],
			});

			expect(result).toContain('data-line-number="2" data-fold-regions="1"');
			expect(result).toContain('data-line-number="3" data-fold-regions="1"');
		});

		test("does not annotate the opener or closer lines as descendants", () => {
			const html = shikiHtml(["[", "  1", "]"]);
			const result = decorateHighlightedHtml({
				html,
				foldableRanges: [{ id: "1", startLine: 1, endLine: 3 }],
			});

			expect(result).not.toMatch(/data-line-number="1"\s+data-fold-regions=/);
			expect(result).not.toMatch(/data-line-number="3"\s+data-fold-regions=/);
		});

		test("renders fold gutter even when lineNumberStart is offset", () => {
			const html = shikiHtml(["[", "  1", "]"]);
			const result = decorateHighlightedHtml({
				html,
				foldableRanges: [{ id: "1", startLine: 1, endLine: 3 }],
				lineNumberStart: 100,
			});

			// Displayed line numbers reflect lineNumberStart...
			expect(result).toContain('data-line-number="100"');
			expect(result).toContain('data-line-number="101"');
			expect(result).toContain('data-line-number="102"');
			// ...but the fold opener still resolves against the buffer-relative range.
			expect(result).toContain('data-fold-line="1"');
			expect(result).toContain('data-fold-regions="1"');
		});

		test("tags only opener lines with mantle-code-line-opener so the gutter reset is a flat class, not a per-line :has() probe", () => {
			const html = shikiHtml(["{", '  "a": 1', "}"]);
			const result = decorateHighlightedHtml({
				html,
				foldableRanges: [{ id: "1", startLine: 1, endLine: 3 }],
			});

			// Only the opener line (1) is tagged so CSS can reset its gutter margin
			// (its button already occupies the gutter); the inner/closer lines reserve
			// their gutter via the default rule and stay untagged.
			expect(classesForLine(result, 1)).toContain("mantle-code-line-opener");
			expect(classesForLine(result, 2)).not.toContain("mantle-code-line-opener");
			expect(classesForLine(result, 3)).not.toContain("mantle-code-line-opener");
			// ...and the tag appears exactly once across the whole block.
			expect(result.match(/mantle-code-line-opener/g) ?? []).toHaveLength(1);
		});

		test("marks only opener lines for the fold ellipsis", () => {
			const html = shikiHtml(["[", "  1", "]"]);
			const result = decorateHighlightedHtml({
				html,
				foldableRanges: [{ id: "1", startLine: 1, endLine: 3 }],
			});

			// Why the class: CSS draws the ellipsis after an opener line's content.
			expect(result.match(/mantle-code-line-opener/g)).toHaveLength(1);
			expect(result).not.toContain("⋯");
		});

		test("nests parent regions on lines that belong to multiple folds", () => {
			const html = shikiHtml(["{", "  [", "    1", "  ]", "}"]);
			const result = decorateHighlightedHtml({
				html,
				foldableRanges: [
					{ id: "1", startLine: 1, endLine: 5 },
					{ id: "2", startLine: 2, endLine: 4 },
				],
			});

			expect(result).toContain('data-line-number="3" data-fold-regions="1 2"');
		});

		test("encodes custom fold IDs before writing them to attributes", () => {
			const html = shikiHtml(["{", '  "a": 1', "}"]);
			const result = decorateHighlightedHtml({
				html,
				foldableRanges: [{ id: 'fold "1" & inner', startLine: 1, endLine: 3 }],
			});

			const encoded = "fold%20%221%22%20%26%20inner";
			expect(result).toContain(`data-fold-line="${encoded}"`);
			expect(result).toContain(`data-fold-regions="${encoded}"`);
			expect(result).not.toContain('data-fold-line="fold "1" & inner"');
		});

		test("does not render fold gutter when no ranges are provided", () => {
			const html = shikiHtml(["[", "  1", "]"]);
			const result = decorateHighlightedHtml({ html });
			expect(result).not.toContain("mantle-code-fold-toggle");
			expect(result).not.toContain("mantle-code-fold-ellipsis");
		});
	});
});
