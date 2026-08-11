"use client";

import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CodeBlock } from "./code-block.js";
import type { FoldableRange } from "./compute-json-fold-ranges.js";
import { decorateHighlightedHtml } from "./decorate-highlighted-html.js";
import { createMantleCodeBlockValue } from "./mantle-code.js";

function makeValue(code: string, preHtml?: string) {
	return createMantleCodeBlockValue({
		language: "typescript",
		code,
		preHtml: preHtml ?? `<span>${code}</span>`,
	});
}

describe("CodeBlock (browser)", () => {
	describe("CopyButton clipboard integration", () => {
		test("clicking CopyButton writes the code text to the clipboard", async () => {
			const user = userEvent.setup();
			const code = 'const greeting = "hello";';

			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.CopyButton />
						<CodeBlock.Code value={makeValue(code)} />
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			const button = screen.getByRole("button", { name: /copy code/i });
			await user.click(button);

			const clipboardText = await navigator.clipboard.readText();
			expect(clipboardText).toBe(code);
		});

		test("CopyButton copies plain text when value has template val substitutions", async () => {
			const user = userEvent.setup();
			const codeWithPlaceholder = 'const x = "SHIKI_VAL_0";';
			const expectedPlainText = 'const x = "world";';

			const value = createMantleCodeBlockValue({
				language: "typescript",
				code: codeWithPlaceholder,
				preHtml: "<span>const x = &quot;SHIKI_VAL_0&quot;;</span>",
				preVals: ["world"],
			});

			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.CopyButton />
						<CodeBlock.Code value={value} />
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			const button = screen.getByRole("button", { name: /copy code/i });
			await user.click(button);

			const clipboardText = await navigator.clipboard.readText();
			expect(clipboardText).toBe(expectedPlainText);
		});

		test("CopyButton swaps to check icon after clicking", async () => {
			const user = userEvent.setup();

			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.CopyButton />
						<CodeBlock.Code value={makeValue("code")} />
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			const button = screen.getByRole("button", { name: /copy code/i });
			const iconBefore = button.querySelector("svg")?.innerHTML;
			await user.click(button);
			const iconAfter = button.querySelector("svg")?.innerHTML;

			expect(iconAfter).not.toBe(iconBefore);
		});
	});

	/**
	 * The copy-button clearance utility on `CodeBlock.Body`. `LAYOUT_STYLE`
	 * expands it to the CSS Tailwind emits for it, keyed by `CSS.escape` to
	 * this exact class string — when the component's class drifts from this
	 * constant, the rule stops matching and the clearance assertions fail.
	 */
	const CLEARANCE_CLASS =
		"[&:has([data-slot=code-block-copy-button])_.mantle-code-line:nth-child(-n+2)]:pr-14";

	/**
	 * Mirrors the CSS that lays out `CodeBlock.Code`: the Tailwind utilities on
	 * `CodeBlock.Body`, the `<pre>`, and the `<code>` (`overflow-x-auto`,
	 * `block min-w-full w-max`), and the `.mantle-code-line` rules from
	 * `mantle.css`, including the pinned line-number gutter. We inline the rules
	 * because browser tests load no Tailwind and no mantle stylesheet. Keep the
	 * selectors and values in sync with their sources — these tests pin both
	 * sides of the clearance and pinned-gutter contracts. The scroll-driven seam
	 * animation is omitted: its resting value is transparent and nothing here
	 * asserts it.
	 */
	const LAYOUT_STYLE = `
		:root {
			--background-color-base: rgb(16 16 20);
			--mantle-code-line-number-width: 2rem;
			--mantle-code-line-number-gap: 1rem;
			--mantle-code-fold-gutter-width: 1.125rem;
			--mantle-code-fold-gutter-gap: 0.25rem;
		}
		pre[data-slot="code-block-code"] {
			margin: 0;
			padding: 1rem 0;
			overflow-x: auto;
			overflow-y: hidden;
		}
		pre[data-slot="code-block-code"] > code {
			display: block;
			min-width: 100%;
			width: max-content;
		}
		.mantle-code-line {
			display: flex;
			align-items: flex-start;
			min-width: 100%;
			box-sizing: border-box;
		}
		.${CSS.escape(CLEARANCE_CLASS)}:has([data-slot=code-block-copy-button])
			.mantle-code-line:nth-child(-n + 2) {
			padding-right: 3.5rem;
		}
		.mantle-code-line-content {
			display: block;
			min-width: 0;
			flex: 1 1 auto;
		}
		.mantle-code-line-number {
			position: sticky;
			left: 0;
			z-index: 1;
			display: block;
			flex-shrink: 0;
			width: var(--mantle-code-line-number-width);
			margin-right: var(--mantle-code-line-number-gap);
		}
		.mantle-code-line-number::before {
			content: "";
			position: absolute;
			inset: 0 calc(-1 * var(--_gutter-overhang, var(--mantle-code-line-number-gap))) 0 0;
			z-index: -1;
			background-color: var(--background-color-base);
		}
		pre[data-slot="code-block-code"]:has(.mantle-code-fold-toggle) .mantle-code-line-number::before {
			--_gutter-overhang: calc(
				var(--mantle-code-line-number-gap) + var(--mantle-code-fold-gutter-width) +
					var(--mantle-code-fold-gutter-gap)
			);
		}
		pre[data-mantle-line-numbers="true"] .mantle-code-fold-toggle {
			position: sticky;
			left: calc(var(--mantle-code-line-number-width) + var(--mantle-code-line-number-gap));
			z-index: 1;
		}
		.mantle-code-fold-toggle {
			flex-shrink: 0;
			display: inline-flex;
			width: var(--mantle-code-fold-gutter-width);
			margin-right: var(--mantle-code-fold-gutter-gap);
			padding: 0;
			border: 0;
		}
		pre[data-slot="code-block-code"]:has(.mantle-code-fold-toggle) .mantle-code-line-content {
			margin-left: calc(var(--mantle-code-fold-gutter-width) + var(--mantle-code-fold-gutter-gap));
		}
		pre[data-slot="code-block-code"]:has(.mantle-code-fold-toggle)
			.mantle-code-line-opener
			> .mantle-code-line-content {
			margin-left: 0;
		}
	`;

	let styleElement: HTMLStyleElement;

	beforeAll(() => {
		styleElement = document.createElement("style");
		styleElement.textContent = LAYOUT_STYLE;
		document.head.appendChild(styleElement);
	});

	afterAll(() => {
		styleElement.remove();
	});

	/**
	 * Builds a pre-rendered value whose lines have exact pixel widths, so the
	 * geometry assertions do not depend on font metrics.
	 */
	function makeFixedWidthValue(
		lineWidths: number[],
		options?: { showLineNumbers?: boolean; foldableRanges?: FoldableRange[] },
	) {
		const showLineNumbers = options?.showLineNumbers ?? false;
		const code = lineWidths.map((width) => `line ${width}px`).join("\n");
		const html = decorateHighlightedHtml({
			foldableRanges: options?.foldableRanges,
			html: lineWidths
				.map(
					(width) =>
						`<span class="line"><span style="display:inline-block;width:${width}px"></span></span>`,
				)
				.join("\n"),
			showLineNumbers,
		});
		return createMantleCodeBlockValue({
			language: "typescript",
			code,
			preHtml: html,
			showLineNumbers,
		});
	}

	function getPre(): HTMLPreElement {
		const pre = document.querySelector("pre[data-slot='code-block-code']");
		if (!(pre instanceof HTMLPreElement)) {
			throw new Error("expected the code block <pre>");
		}
		return pre;
	}

	describe("horizontal overflow", () => {
		test("no scrollbar when every line fits the container", () => {
			// Regression: a blanket per-line `padding-right: 3.5rem` widened the
			// max-content <code>, so a 300px line in a 340px container scrolled.
			render(
				<div style={{ width: 340 }}>
					<CodeBlock.Root>
						<CodeBlock.Body>
							<CodeBlock.CopyButton />
							<CodeBlock.Code value={makeFixedWidthValue([100, 100, 300])} />
						</CodeBlock.Body>
					</CodeBlock.Root>
				</div>,
			);

			const pre = getPre();
			expect(pre.clientWidth).toBe(340);
			expect(pre.scrollWidth).toBe(pre.clientWidth);
		});

		test("scroll width matches the longest line when a line overflows", () => {
			render(
				<div style={{ width: 340 }}>
					<CodeBlock.Root>
						<CodeBlock.Body>
							<CodeBlock.CopyButton />
							<CodeBlock.Code value={makeFixedWidthValue([100, 100, 400])} />
						</CodeBlock.Body>
					</CodeBlock.Root>
				</div>,
			);

			const pre = getPre();
			expect(pre.scrollWidth).toBeGreaterThan(pre.clientWidth);
			// Why exactly 400: the longest line carries no copy-button clearance.
			expect(pre.scrollWidth).toBe(400);
		});

		test("only the first two lines reserve copy-button clearance, and only when a CopyButton is rendered", () => {
			const { rerender } = render(
				<div style={{ width: 340 }}>
					<CodeBlock.Root>
						<CodeBlock.Body>
							<CodeBlock.CopyButton />
							<CodeBlock.Code value={makeFixedWidthValue([100, 100, 100])} />
						</CodeBlock.Body>
					</CodeBlock.Root>
				</div>,
			);

			const [first, second, third] = Array.from(document.querySelectorAll(".mantle-code-line"));
			if (first == null || second == null || third == null) {
				throw new Error("expected three code lines");
			}
			// Why 56px: 3.5rem at the default 16px root font size.
			expect(getComputedStyle(first).paddingRight).toBe("56px");
			expect(getComputedStyle(second).paddingRight).toBe("56px");
			expect(getComputedStyle(third).paddingRight).toBe("0px");

			rerender(
				<div style={{ width: 340 }}>
					<CodeBlock.Root>
						<CodeBlock.Body>
							<CodeBlock.Code value={makeFixedWidthValue([100, 100, 100])} />
						</CodeBlock.Body>
					</CodeBlock.Root>
				</div>,
			);

			for (const line of document.querySelectorAll(".mantle-code-line")) {
				expect(getComputedStyle(line).paddingRight).toBe("0px");
			}
		});
	});

	describe("pinned line-number gutter", () => {
		test("line numbers stay pinned while the code scrolls", () => {
			render(
				<div style={{ width: 340 }}>
					<CodeBlock.Root>
						<CodeBlock.Body>
							<CodeBlock.Code value={makeFixedWidthValue([100, 400], { showLineNumbers: true })} />
						</CodeBlock.Body>
					</CodeBlock.Root>
				</div>,
			);

			const pre = getPre();
			const number = pre.querySelector(".mantle-code-line-number");
			const content = pre.querySelector(".mantle-code-line-content");
			if (number == null || content == null) {
				throw new Error("expected a line number and line content");
			}

			const preLeft = pre.getBoundingClientRect().left;
			const contentLeftBefore = content.getBoundingClientRect().left;
			expect(number.getBoundingClientRect().left - preLeft).toBe(0);

			pre.scrollLeft = 100;
			expect(pre.scrollLeft).toBe(100);

			expect(number.getBoundingClientRect().left - preLeft).toBe(0);
			expect(content.getBoundingClientRect().left).toBe(contentLeftBefore - 100);
		});

		test("fold toggles pin with the numbers and the backdrop masks the gutter", () => {
			render(
				<div style={{ width: 340 }}>
					<CodeBlock.Root>
						<CodeBlock.Body>
							<CodeBlock.Code
								value={makeFixedWidthValue([100, 400, 100], {
									showLineNumbers: true,
									foldableRanges: [{ id: "1", startLine: 1, endLine: 3 }],
								})}
							/>
						</CodeBlock.Body>
					</CodeBlock.Root>
				</div>,
			);

			const pre = getPre();
			const number = pre.querySelector(".mantle-code-line-number");
			const toggle = pre.querySelector(".mantle-code-fold-toggle");
			if (number == null || toggle == null) {
				throw new Error("expected a line number and fold toggle");
			}

			const preLeft = pre.getBoundingClientRect().left;
			pre.scrollLeft = 100;

			// Why 48px: the 2rem number column plus its 1rem gap.
			expect(toggle.getBoundingClientRect().left - preLeft).toBe(48);
			// The opaque backdrop that masks code scrolling under the gutter.
			expect(getComputedStyle(number, "::before").backgroundColor).toBe("rgb(16, 16, 20)");
		});
	});
});
