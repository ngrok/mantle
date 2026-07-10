import { describe, expect, test } from "vitest";
import { decorateHighlightedHtml } from "./decorate-highlighted-html.js";

/**
 * Helper that builds a minimal Shiki-like HTML string from line contents.
 * Each line is wrapped in `<span class="line">...</span>` separated by `\n`.
 */
function shikiHtml(lines: string[], lineEnding = "\n"): string {
	return lines.map((line) => `<span class="line">${line}</span>`).join(lineEnding);
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

		expect(result).toContain('data-slot="line-content"> </span>');
	});

	test("adds line numbers when showLineNumbers is true", () => {
		const html = shikiHtml(["a", "b"]);
		const result = decorateHighlightedHtml({ html, showLineNumbers: true });

		expect(result).toContain('class="mantle-code-line-number"');
		expect(result).toContain('data-slot="line-number">1</span>');
		expect(result).toContain('data-slot="line-number">2</span>');
	});

	test("respects lineNumberStart offset", () => {
		const html = shikiHtml(["a", "b"]);
		const result = decorateHighlightedHtml({ html, showLineNumbers: true, lineNumberStart: 10 });

		expect(result).toContain('data-slot="line-number">10</span>');
		expect(result).toContain('data-slot="line-number">11</span>');
		expect(result).toContain('data-line-number="10"');
		expect(result).toContain('data-line-number="11"');
	});

	test("highlights specified lines", () => {
		const html = shikiHtml(["a", "b", "c"]);
		const result = decorateHighlightedHtml({ html, highlightLines: [2] });

		expect(result).toContain('class="mantle-code-line" data-line-number="1"');
		expect(result).toContain(
			'class="mantle-code-line mantle-code-line-highlighted" data-line-number="2"',
		);
		expect(result).toContain('class="mantle-code-line" data-line-number="3"');
	});

	test("highlights line ranges", () => {
		const html = shikiHtml(["a", "b", "c", "d"]);
		const result = decorateHighlightedHtml({ html, highlightLines: ["2-3"] });

		expect(result).toContain('class="mantle-code-line" data-line-number="1"');
		expect(result).toContain(
			'class="mantle-code-line mantle-code-line-highlighted" data-line-number="2"',
		);
		expect(result).toContain(
			'class="mantle-code-line mantle-code-line-highlighted" data-line-number="3"',
		);
		expect(result).toContain('class="mantle-code-line" data-line-number="4"');
	});

	test("omits line numbers when showLineNumbers is false", () => {
		const html = shikiHtml(["a"]);
		const result = decorateHighlightedHtml({ html, showLineNumbers: false });

		expect(result).not.toContain("mantle-code-line-number");
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
				showLineNumbers: true,
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

			// Read a line's class list without pinning the exact class string or
			// `cx()` ordering, so the assertions cover only what matters: which lines
			// carry the opener tag.
			const classesForLine = (lineNumber: number) =>
				result
					.match(new RegExp(`<span class="([^"]*)" data-line-number="${lineNumber}"`))?.[1]
					?.split(" ") ?? [];

			// Only the opener line (1) is tagged so CSS can reset its gutter margin
			// (its button already occupies the gutter); the inner/closer lines reserve
			// their gutter via the default rule and stay untagged.
			expect(classesForLine(1)).toContain("mantle-code-line-opener");
			expect(classesForLine(2)).not.toContain("mantle-code-line-opener");
			expect(classesForLine(3)).not.toContain("mantle-code-line-opener");
			// ...and the tag appears exactly once across the whole block.
			expect(result.match(/mantle-code-line-opener/g) ?? []).toHaveLength(1);
		});

		test("does not tag any line when folding is disabled", () => {
			const html = shikiHtml(["{", '  "a": 1', "}"]);
			const result = decorateHighlightedHtml({ html });

			expect(result).not.toContain("mantle-code-line-opener");
		});

		test("does not emit per-line fold spacers — gutter alignment is CSS-only", () => {
			const html = shikiHtml(["[", "  1", "]"]);
			const result = decorateHighlightedHtml({
				html,
				foldableRanges: [{ id: "1", startLine: 1, endLine: 3 }],
			});

			expect(result).not.toContain("mantle-code-fold-spacer");
			expect(result).not.toContain('data-slot="fold-spacer"');
		});

		test("renders a trailing ellipsis only on opener lines", () => {
			const html = shikiHtml(["[", "  1", "]"]);
			const result = decorateHighlightedHtml({
				html,
				foldableRanges: [{ id: "1", startLine: 1, endLine: 3 }],
			});

			const ellipsisCount = (result.match(/class="mantle-code-fold-ellipsis"/g) ?? []).length;
			expect(ellipsisCount).toBe(1);
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

		test("handles an empty foldableRanges array", () => {
			const html = shikiHtml(["[", "  1", "]"]);
			const result = decorateHighlightedHtml({ html, foldableRanges: [] });
			expect(result).not.toContain("mantle-code-fold-toggle");
		});
	});
});
