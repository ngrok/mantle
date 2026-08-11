"use client";

import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CodeBlock } from "./code-block.js";
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

	describe("horizontal overflow", () => {
		/**
		 * Mirrors the CSS that lays out `CodeBlock.Code`: the Tailwind utilities on
		 * the `<pre>` and `<code>` (`overflow-x-auto`, `block min-w-full w-max`) and
		 * the `.mantle-code-line` rules from `mantle.css`. We inline the rules
		 * because browser tests load no Tailwind and no mantle stylesheet. Keep the
		 * selectors and values in sync with `mantle.css` — this test pins both
		 * sides of the copy-button clearance contract.
		 */
		const LAYOUT_STYLE = `
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
			[data-slot="code-block-body"]:has([data-slot="code-block-copy-button"])
				.mantle-code-line:nth-child(-n + 2) {
				padding-right: 3.5rem;
			}
			.mantle-code-line-content {
				display: block;
				min-width: 0;
				flex: 1 1 auto;
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
		function makeFixedWidthValue(lineWidths: number[]) {
			const code = lineWidths.map((width) => `line ${width}px`).join("\n");
			const html = decorateHighlightedHtml({
				html: lineWidths
					.map(
						(width) =>
							`<span class="line"><span style="display:inline-block;width:${width}px"></span></span>`,
					)
					.join("\n"),
			});
			return createMantleCodeBlockValue({ language: "typescript", code, preHtml: html });
		}

		function getPre(): HTMLPreElement {
			const pre = document.querySelector("pre[data-slot='code-block-code']");
			if (!(pre instanceof HTMLPreElement)) {
				throw new Error("expected the code block <pre>");
			}
			return pre;
		}

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
});
