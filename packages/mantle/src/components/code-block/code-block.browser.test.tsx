"use client";

import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import axe from "axe-core";
import type { CSSProperties } from "react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import mantleCss from "../../mantle.css?raw";
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
			const iconBefore = button.querySelector("[data-state='active'] > svg")?.innerHTML;
			await user.click(button);
			const iconAfter = button.querySelector("[data-state='active'] > svg")?.innerHTML;

			expect(iconAfter).not.toBe(iconBefore);
		});
	});

	/**
	 * The copy-button clearance utility on `CodeBlock.Body`. `LAYOUT_STYLE`
	 * expands it to the CSS Tailwind emits for it, keyed by `CSS.escape` to
	 * this exact class string. When the component's class drifts from this
	 * constant, the rule stops matching and the clearance assertions fail.
	 */
	const CLEARANCE_CLASS =
		"[&:has([data-slot=code-block-copy-button])_.mantle-code-line:nth-child(-n+2)]:pr-14";

	/**
	 * The end-of-line breathing-room utility on `CodeBlock.Body`: every line
	 * reserves `1rem`, so the longest line stays clear of the container edge
	 * at the end of the scroll range. Keyed to the exact class string the same
	 * way as `CLEARANCE_CLASS`.
	 */
	const BREATHING_ROOM_CLASS = "[&_.mantle-code-line]:pr-4";

	/**
	 * Mirrors the CSS that lays out `CodeBlock.Code`: the Tailwind utilities on
	 * `CodeBlock.Body`, the `<pre>`, and the `<code>` (`overflow-x-auto`,
	 * `block min-w-full w-max`), and the `.mantle-code-line` rules from
	 * `mantle.css`, including the pinned line-number gutter. We inline the rules
	 * because browser tests load no Tailwind and no mantle stylesheet. Keep the
	 * selectors and values in sync with their sources: these tests pin both
	 * sides of the clearance and pinned-gutter contracts.
	 */
	const LAYOUT_STYLE = `
		:root {
			--mantle-code-line-number-width: 2rem;
			--mantle-code-line-number-gap: 1rem;
			--mantle-code-fold-gutter-width: 1.125rem;
			--mantle-code-fold-gutter-gap: 0.25rem;
			--mantle-code-fold-line-height: 1.5rem;
		}
		pre[data-slot="code-block-code"] {
			margin: 0;
			padding: 1rem 0;
			overflow-x: auto;
			overflow-y: hidden;
		}
		/* The \`pl-4\` of the <pre> with line numbers off. Only the hit-area tests opt in. */
		.fixture-pl-4 pre[data-slot="code-block-code"][data-mantle-line-numbers~="false"] {
			padding-left: 1rem;
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
		.${CSS.escape(BREATHING_ROOM_CLASS)} .mantle-code-line {
			padding-right: 1rem;
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
		pre[data-mantle-line-numbers="true"] .mantle-code-fold-toggle {
			position: sticky;
			left: calc(var(--mantle-code-line-number-width) + var(--mantle-code-line-number-gap));
			z-index: 1;
		}
		.mantle-code-fold-toggle {
			flex-shrink: 0;
			display: inline-flex;
			width: var(--mantle-code-fold-gutter-width);
			line-height: inherit;
			height: 1lh;
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

	/**
	 * Mirrors the Tailwind utilities that make the tab row of `CodeBlock.Header`
	 * scroll instead of wrap. Keyed to the class names `CodeBlock.Header`,
	 * `CodeBlock.TabList`, and `CodeBlock.TabTrigger` emit, so dropping one of
	 * `min-w-0`, `overflow-x-auto`, `shrink-0`, or `whitespace-nowrap` changes the
	 * measured geometry. `.flex-wrap` is declared so a trigger row that gains it
	 * can wrap here and fail.
	 */
	const TAB_LAYOUT_STYLE = `
		.flex { display: flex; }
		.flex-wrap { flex-wrap: wrap; }
		.items-center { align-items: center; }
		.gap-1 { gap: 0.25rem; }
		.min-w-0 { min-width: 0; }
		.overflow-x-auto { overflow-x: auto; }
		.px-4 { padding-inline: 1rem; }
		.py-2 { padding-block: 0.5rem; }
		.p-1 { padding: 0.25rem; }
		.-m-1 { margin: -0.25rem; }
		.shrink-0 { flex-shrink: 0; }
		.whitespace-nowrap { white-space: nowrap; }
	`;

	/**
	 * The hit-area rules of the fold toggle, read from `mantle.css` and not
	 * mirrored: the `::before` strip, and the `position: relative` rule that
	 * follows it. A change to either rule changes the hit test here.
	 */
	function foldHitAreaCss(): string {
		const match =
			/\.mantle-code-fold-toggle::before \{[\s\S]*?\n\}[\s\S]*?\.mantle-code-fold-toggle \{[\s\S]*?\n\}/.exec(
				mantleCss,
			);
		if (match == null) {
			throw new Error("mantle.css holds no hit-area rules for the fold toggle.");
		}
		return match[0];
	}

	/**
	 * The line-height rule of foldable code, read from `mantle.css` and not
	 * mirrored. A change to the rule changes the target-size audit here.
	 */
	function foldLineHeightCss(): string {
		const match =
			/pre\[data-slot="code-block-code"\]:has\(\.mantle-code-fold-toggle\) \{\n\tline-height:[\s\S]*?\n\}/.exec(
				mantleCss,
			);
		if (match == null) {
			throw new Error("mantle.css holds no line-height rule for foldable code.");
		}
		return match[0];
	}

	let styleElement: HTMLStyleElement;

	beforeAll(() => {
		styleElement = document.createElement("style");
		styleElement.textContent =
			LAYOUT_STYLE + TAB_LAYOUT_STYLE + foldHitAreaCss() + foldLineHeightCss();
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

	/**
	 * The root font size in pixels. The `rem` values in `LAYOUT_STYLE` resolve
	 * against it, so the pixel expectations derive from it instead of assuming
	 * a 16px browser default.
	 */
	function rootFontSizePx(): number {
		return Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
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

		test("the scroll range ends one breathing-room reserve past the longest line", () => {
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
			// Why 400 plus 1rem: the longest line carries no copy-button clearance,
			// only the end-of-line breathing room.
			expect(pre.scrollWidth).toBe(400 + rootFontSizePx());
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
			const remPx = rootFontSizePx();
			expect(getComputedStyle(first).paddingRight).toBe(`${3.5 * remPx}px`);
			expect(getComputedStyle(second).paddingRight).toBe(`${3.5 * remPx}px`);
			expect(getComputedStyle(third).paddingRight).toBe(`${remPx}px`);

			rerender(
				<div style={{ width: 340 }}>
					<CodeBlock.Root>
						<CodeBlock.Body>
							<CodeBlock.Code value={makeFixedWidthValue([100, 100, 100])} />
						</CodeBlock.Body>
					</CodeBlock.Root>
				</div>,
			);

			// Without a CopyButton the clearance drops, and only the 1rem
			// breathing room remains.
			for (const line of document.querySelectorAll(".mantle-code-line")) {
				expect(getComputedStyle(line).paddingRight).toBe(`${rootFontSizePx()}px`);
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

		test("fold toggles pin with the line numbers while the code scrolls", () => {
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
			const toggle = pre.querySelector(".mantle-code-fold-toggle");
			if (toggle == null) {
				throw new Error("expected a fold toggle");
			}

			const preLeft = pre.getBoundingClientRect().left;
			pre.scrollLeft = 100;

			// Why 48px: the 2rem number column plus its 1rem gap.
			expect(toggle.getBoundingClientRect().left - preLeft).toBe(48);
		});
	});

	describe("fold toggle hit area", () => {
		test.each([{ showLineNumbers: true }, { showLineNumbers: false }])(
			"a click in the strip before or after a toggle folds only that toggle (showLineNumbers: $showLineNumbers)",
			async ({ showLineNumbers }) => {
				const user = userEvent.setup();
				render(
					<div className="fixture-pl-4" style={{ width: 340 }}>
						<CodeBlock.Root>
							<CodeBlock.Body>
								<CodeBlock.Code
									value={makeFixedWidthValue([100, 100, 100, 100, 100, 100], {
										showLineNumbers,
										foldableRanges: [
											{ id: "1", startLine: 1, endLine: 6 },
											{ id: "2", startLine: 2, endLine: 5 },
										],
									})}
								/>
							</CodeBlock.Body>
						</CodeBlock.Root>
					</div>,
				);

				const pre = getPre();
				const outer = pre.querySelector(".mantle-code-fold-toggle[data-fold-line='1']");
				const inner = pre.querySelector(".mantle-code-fold-toggle[data-fold-line='2']");
				const foldedLine = pre.querySelector(".mantle-code-line:nth-child(3)");
				if (outer == null || inner == null || foldedLine == null) {
					throw new Error("expected two fold toggles and a line inside the inner range");
				}

				const rect = inner.getBoundingClientRect();
				const middle = rect.top + rect.height / 2;

				// Why 11px: the strip before the toggle is 0.75rem wide, so this point is 1px inside it.
				const before = document.elementFromPoint(rect.left - 11, middle);
				expect(before).toBe(inner);
				await user.click(inner);
				expect(inner).toHaveAttribute("aria-expanded", "false");
				expect(foldedLine).toHaveAttribute("data-fold-hidden", "true");
				expect(outer).toHaveAttribute("aria-expanded", "true");

				// Why 3px: the strip after the toggle is the 0.25rem gutter gap, so this point is 1px inside it.
				const after = document.elementFromPoint(rect.right + 3, middle);
				expect(after).toBe(inner);

				// The strips do not grow up or down into the toggles of adjacent lines.
				expect(document.elementFromPoint(rect.left - 11, rect.top - 2)).not.toBe(inner);
				expect(document.elementFromPoint(rect.left - 11, rect.bottom + 2)).not.toBe(inner);
			},
		);
	});

	describe("fold toggle target size", () => {
		function renderAdjacentToggles(style?: CSSProperties) {
			return render(
				// Why the type scale: `text-mono` on the <pre> sets it, and the test page loads no Tailwind.
				<div style={{ width: 340, fontSize: "0.8125rem", lineHeight: "1.25rem", ...style }}>
					<CodeBlock.Root>
						<CodeBlock.Body>
							<CodeBlock.Code
								value={makeFixedWidthValue([100, 100, 100, 100], {
									showLineNumbers: true,
									foldableRanges: [
										{ id: "1", startLine: 1, endLine: 4 },
										{ id: "2", startLine: 2, endLine: 3 },
									],
								})}
							/>
						</CodeBlock.Body>
					</CodeBlock.Root>
				</div>,
			);
		}

		async function targetSizeViolations(container: HTMLElement) {
			const results = await axe.run(container, { runOnly: ["target-size"] });
			return results.violations.flatMap((violation) => violation.nodes);
		}

		test("the toggles of adjacent lines pass the target-size audit", async () => {
			const { container } = renderAdjacentToggles();

			expect(await targetSizeViolations(container)).toEqual([]);
		});

		test("a consumer `leading-*` class sets the height of each line and each toggle", () => {
			// Why the layer: Tailwind puts `leading-8` in a layer, and the test page loads no Tailwind.
			const leadingStyle = document.createElement("style");
			leadingStyle.textContent =
				"@layer utilities { .leading-8 { --tw-leading: 2rem; line-height: 2rem; } }";
			document.head.appendChild(leadingStyle);

			try {
				render(
					<CodeBlock.Root>
						<CodeBlock.Body>
							<CodeBlock.Code
								className="leading-8"
								value={makeFixedWidthValue([100, 100], {
									showLineNumbers: true,
									foldableRanges: [{ id: "1", startLine: 1, endLine: 2 }],
								})}
							/>
						</CodeBlock.Body>
					</CodeBlock.Root>,
				);

				const toggle = getPre().querySelector(".mantle-code-fold-toggle");
				const line = toggle?.closest(".mantle-code-line");
				if (toggle == null || line == null) {
					throw new Error("expected a fold toggle in a line");
				}

				expect(line.getBoundingClientRect().height).toBe(32);
				expect(toggle.getBoundingClientRect().height).toBe(32);
			} finally {
				leadingStyle.remove();
			}
		});

		test("the toggles of adjacent lines fail the audit at the 20px line height of `text-mono`", async () => {
			const { container } = renderAdjacentToggles({
				"--mantle-code-fold-line-height": "1.25rem",
			} as CSSProperties);

			expect(await targetSizeViolations(container)).toHaveLength(2);
		});
	});

	describe("tab row overflow", () => {
		test("the tab list scrolls instead of wrapping when the tabs exceed the header", () => {
			render(
				<div style={{ width: 220 }}>
					<CodeBlock.Root defaultTab="a">
						<CodeBlock.Header>
							<CodeBlock.TabList>
								<CodeBlock.TabTrigger value="a">traffic-policy.yml</CodeBlock.TabTrigger>
								<CodeBlock.TabTrigger value="b">traffic-policy.json</CodeBlock.TabTrigger>
								<CodeBlock.TabTrigger value="c">traffic-policy.tf</CodeBlock.TabTrigger>
							</CodeBlock.TabList>
						</CodeBlock.Header>
					</CodeBlock.Root>
				</div>,
			);

			const tabList = screen.getByRole("tablist");
			const tabs = screen.getAllByRole("tab");

			// The row overflows its box...
			expect(tabList.scrollWidth).toBeGreaterThan(tabList.clientWidth);
			// ...into a scroll range, not a second line: every tab shares one
			// offsetTop, and the list accepts a scroll offset.
			expect(new Set(tabs.map((tab) => tab.offsetTop)).size).toBe(1);
			tabList.scrollLeft = 40;
			expect(tabList.scrollLeft).toBe(40);
		});
	});
});
