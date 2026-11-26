"use client";

import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import axe from "axe-core";
import { useState } from "react";
import { renderToString } from "react-dom/server";
import type { ComponentProps, CSSProperties } from "react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { commands, userEvent as browserUserEvent } from "vitest/browser";
import mantleCss from "../../mantle.css?raw";
import * as CodeBlock from "./code-block-parts.js";
import type { FoldableRange } from "./compute-json-fold-ranges.js";
import { decorateHighlightedHtml } from "./decorate-highlighted-html.js";
import { pendingFoldRanges } from "./fold-range-utils.js";
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

		// Why the compiled CSS: the swap lives in the paths' classes, so only computed opacity shows which icon paints.
		test.each(["no-preference", "reduce"] as const)(
			"CopyButton shows exactly one icon before, during, and after a copy (%s motion)",
			async (reducedMotion) => {
				const style = document.createElement("style");
				style.textContent = await commands.tailwindCss("./code-block.tsx");
				document.head.append(style);
				await commands.emulateMedia({ reducedMotion });
				try {
					const user = userEvent.setup();
					// Why an ancestor with `data-copied`: only the button's own attribute swaps the icons.
					render(
						<div data-copied="">
							<CodeBlock.Root>
								<CodeBlock.Body>
									<CodeBlock.CopyButton />
									<CodeBlock.Code value={makeValue("code")} />
								</CodeBlock.Body>
							</CodeBlock.Root>
						</div>,
					);
					const button = screen.getByRole("button", { name: /copy code/i });
					const [copyPath, checkPath] = button.querySelectorAll("path");
					const opacities = () =>
						[copyPath, checkPath].map((path) => getComputedStyle(path as Element).opacity);

					expect(opacities()).toEqual(["1", "0"]);
					await user.click(button);
					await expect.poll(opacities).toEqual(["0", "1"]);
					// The check shows for two seconds, then the copy icon comes back.
					await expect.poll(opacities, { timeout: 4000 }).toEqual(["1", "0"]);
				} finally {
					await commands.emulateMedia({ reducedMotion: "no-preference" });
					style.remove();
				}
			},
		);
	});

	/**
	 * The copy-button clearance utility on `CodeBlock.Body`. `LAYOUT_STYLE`
	 * expands it to the CSS Tailwind emits for it, keyed by `CSS.escape` to
	 * this exact class string. When the component's class drifts from this
	 * constant, the rule stops matching and the clearance assertions fail.
	 */
	const CLEARANCE_CLASS =
		"[&_:is([data-slot~=code-block-copy-button],:has(>[data-slot~=code-block-copy-button]))~*_.mantle-code-line:nth-child(-n+2)]:pr-14";

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
		pre[data-slot~="code-block-code"] {
			margin: 0;
			padding: 1rem 0;
			overflow-x: auto;
			overflow-y: hidden;
		}
		/* The \`pl-4\` of the <pre> with line numbers off. Only the hit-area tests opt in. */
		.fixture-pl-4 pre[data-slot~="code-block-code"][data-mantle-line-numbers~="false"] {
			padding-left: 1rem;
		}
		pre[data-slot~="code-block-code"] > code {
			display: block;
			min-width: 100%;
			width: max-content;
		}
		pre[data-slot~="code-block-code"][data-syntax-highlighted] > code {
			display: flex;
			flex-direction: column;
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
		.${CSS.escape(CLEARANCE_CLASS)}
			:is([data-slot~="code-block-copy-button"], :has(> [data-slot~="code-block-copy-button"]))
			~ *
			.mantle-code-line:nth-child(-n + 2) {
			padding-right: 3.5rem;
		}
		.mantle-code-line-content {
			display: block;
			min-width: 0;
			flex: 1 1 auto;
		}
		pre[data-mantle-line-numbers="true"] > code {
			counter-reset: mantle-line calc(var(--mantle-line-number-start, 1) - 1);
		}
		pre[data-mantle-line-numbers="true"] .mantle-code-line {
			counter-increment: mantle-line;
		}
		pre[data-mantle-line-numbers="true"] .mantle-code-line::before {
			content: counter(mantle-line) / "";
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
		pre[data-slot~="code-block-code"][data-foldable] .mantle-code-line-content {
			margin-left: calc(var(--mantle-code-fold-gutter-width) + var(--mantle-code-fold-gutter-gap));
		}
		pre[data-slot~="code-block-code"][data-foldable]
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
	 * The box rule of the fold toggle, read from `mantle.css` and not mirrored.
	 * A change to its width, height, or margin changes the geometry here.
	 */
	function foldToggleCss(): string {
		const match = /\n\.mantle-code-fold-toggle \{\n\tflex-shrink:[\s\S]*?\n\}/.exec(mantleCss);
		if (match == null) {
			throw new Error("mantle.css holds no box rule for the fold toggle.");
		}
		return match[0];
	}

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
			/pre\[data-slot~="code-block-code"\]\[data-foldable\] \{\n\tline-height:[\s\S]*?\n\}/.exec(
				mantleCss,
			);
		if (match == null) {
			throw new Error("mantle.css holds no line-height rule for foldable code.");
		}
		return match[0];
	}

	/**
	 * The gutter rules of streamed lines, read from `mantle.css` and not
	 * mirrored: the sticky column of each group, its numbers, and the space
	 * that each line keeps for its number.
	 */
	function streamedGutterCss(): string {
		const match =
			/pre\[data-mantle-line-numbers="true"\]:dir\(ltr\) > code\[data-mantle-gutter\] \.mantle-code-gutter \{[\s\S]*?> \.mantle-code-line::before \{[\s\S]*?\n\}/.exec(
				mantleCss,
			);
		if (match == null) {
			throw new Error("mantle.css holds no gutter rules for streamed lines.");
		}
		return match[0];
	}

	let styleElement: HTMLStyleElement;

	beforeAll(() => {
		styleElement = document.createElement("style");
		styleElement.textContent =
			LAYOUT_STYLE +
			TAB_LAYOUT_STYLE +
			foldToggleCss() +
			foldHitAreaCss() +
			foldLineHeightCss() +
			streamedGutterCss();
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

	describe("copy a selection", () => {
		test("a copied selection keeps a blank line", () => {
			const html = decorateHighlightedHtml({
				html: ["alpha", "", "omega"].map((text) => `<span class="line">${text}</span>`).join("\n"),
			});
			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.Code
							value={createMantleCodeBlockValue({
								language: "text",
								code: "alpha\n\nomega",
								preHtml: html,
							})}
						/>
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			const code = getPre().querySelector("code");
			if (code == null) {
				throw new Error("expected the <code>");
			}
			getSelection()?.selectAllChildren(code);
			// Why the space: it is the only empty-line content that each engine copies as one blank line.
			expect(getSelection()?.toString()).toBe("alpha\n \nomega");
		});
	});

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

			// A CopyButton that a wrapper component renders, before tabbed code,
			// in a Body whose child puts its children in an inner element,
			// reserves the same clearance.
			const WrappedCopyButton = () => <CodeBlock.CopyButton />;
			const Panel = ({ children, ...props }: ComponentProps<"section">) => (
				<section {...props}>
					<div>{children}</div>
				</section>
			);
			rerender(
				<div style={{ width: 340 }}>
					<CodeBlock.Root defaultTab="ts">
						<CodeBlock.Body asChild>
							<Panel>
								<WrappedCopyButton />
								<CodeBlock.TabContent value="ts">
									<CodeBlock.Code value={makeFixedWidthValue([100, 100, 100])} />
								</CodeBlock.TabContent>
							</Panel>
						</CodeBlock.Body>
					</CodeBlock.Root>
				</div>,
			);
			const lines = Array.from(document.querySelectorAll(".mantle-code-line"));
			expect(lines.map((line) => getComputedStyle(line).paddingRight)).toEqual([
				`${3.5 * remPx}px`,
				`${3.5 * remPx}px`,
				`${remPx}px`,
			]);

			// A CopyButton in its own wrapper element, before the code, reserves it too.
			rerender(
				<div style={{ width: 340 }}>
					<CodeBlock.Root>
						<CodeBlock.Body>
							<span>
								<CodeBlock.CopyButton />
							</span>
							<CodeBlock.Code value={makeFixedWidthValue([100, 100, 100])} />
						</CodeBlock.Body>
					</CodeBlock.Root>
				</div>,
			);
			expect(
				Array.from(
					document.querySelectorAll(".mantle-code-line"),
					(line) => getComputedStyle(line).paddingRight,
				),
			).toEqual([`${3.5 * remPx}px`, `${3.5 * remPx}px`, `${remPx}px`]);
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
			const line = pre.querySelector(".mantle-code-line");
			const content = pre.querySelector(".mantle-code-line-content");
			if (line == null || content == null) {
				throw new Error("expected a line and its content");
			}

			// Why a hit test: the number is a pseudo-element, and a hit on it
			// returns its line. A gutter that scrolled away exposes the content.
			const preLeft = pre.getBoundingClientRect().left;
			const { top, height } = content.getBoundingClientRect();
			const gutterHit = () => document.elementFromPoint(preLeft + 2, top + height / 2);
			const contentLeftBefore = content.getBoundingClientRect().left;
			expect(gutterHit()).toBe(line);

			pre.scrollLeft = 100;
			expect(pre.scrollLeft).toBe(100);

			expect(gutterHit()).toBe(line);
			expect(content.getBoundingClientRect().left).toBe(contentLeftBefore - 100);
		});

		test("streamed lines pin one gutter for each group of 64 lines while the code scrolls", () => {
			const lines = Array.from({ length: 70 }, (_, index) =>
				index === 65 ? "x".repeat(120) : `line ${index + 1}`,
			);
			render(
				<div style={{ width: 340 }}>
					<CodeBlock.Root>
						<CodeBlock.Body>
							<CodeBlock.Code
								value={createMantleCodeBlockValue({
									language: "text",
									code: lines.join("\n"),
									lines,
									showLineNumbers: true,
								})}
							/>
						</CodeBlock.Body>
					</CodeBlock.Root>
				</div>,
			);

			const pre = getPre();
			const rows = Array.from(pre.querySelectorAll(".mantle-code-line"));
			const gutters = Array.from(pre.querySelectorAll(".mantle-code-gutter"));
			expect(gutters.map((gutter) => gutter.parentElement)).toEqual([rows[0], rows[64]]);

			// Why the height: the numbers of a group fill the rows of its lines, and no more.
			for (const [gutter, first, last] of [
				[gutters[0], rows[0], rows[63]],
				[gutters[1], rows[64], rows[69]],
			] as const) {
				if (gutter == null || first == null || last == null) {
					throw new Error("expected two groups of lines");
				}
				const span = last.getBoundingClientRect().bottom - first.getBoundingClientRect().top;
				expect(Number.parseFloat(getComputedStyle(gutter, "::before").height)).toBeCloseTo(span, 0);
			}

			// Why the box: the gutter takes no clicks, so a hit test passes through it. A gutter that scrolled away moves its box.
			const preLeft = pre.getBoundingClientRect().left;
			const gutterLeft = (gutter: Element | undefined) => {
				if (gutter == null) {
					throw new Error("expected the gutter");
				}
				return gutter.getBoundingClientRect().left - preLeft;
			};
			pre.scrollLeft = 100;
			expect(pre.scrollLeft).toBe(100);
			expect(gutterLeft(gutters[0])).toBe(0);
			expect(gutterLeft(gutters[1])).toBe(0);

			// Why: a click on a number lands on its own line, as it did with a number on each line.
			const row = rows[65];
			if (row == null) {
				throw new Error("expected the line");
			}
			row.scrollIntoView({ block: "center" });
			const { top, height } = row.getBoundingClientRect();
			expect(row.contains(document.elementFromPoint(preLeft + 2, top + height / 2))).toBe(true);
		});

		test("server-rendered streamed lines draw their numbers under a CSP that blocks style attributes", async () => {
			const lines = ["a", "b", "c"];
			const html = renderToString(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.Code
							value={createMantleCodeBlockValue({
								language: "text",
								code: lines.join("\n"),
								lines,
								showLineNumbers: true,
							})}
						/>
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);
			const frame = document.createElement("iframe");
			frame.srcdoc = `<meta http-equiv="Content-Security-Policy" content="style-src-elem 'unsafe-inline'; style-src-attr 'none'"><style>${mantleCss}</style>${html}`;
			const loaded = new Promise((resolve) => {
				frame.addEventListener("load", resolve, { once: true });
			});
			document.body.append(frame);
			await loaded;

			const gutter = frame.contentDocument?.querySelector(".mantle-code-gutter");
			if (gutter == null) {
				throw new Error("expected the gutter");
			}
			const content = getComputedStyle(gutter, "::before").content;
			expect(content).toMatch(/1[\s\S]*2[\s\S]*3/);
			frame.remove();
		});

		test("streamed lines draw one group gutter until the fold ranges arrive, then a number on each line", () => {
			const lines = ["{", "\f", "}"];
			const view = (foldableRanges: readonly FoldableRange[]) => (
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.Code
							value={createMantleCodeBlockValue({
								language: "json",
								code: lines.join("\n"),
								lines,
								foldableRanges,
								showLineNumbers: true,
							})}
						/>
					</CodeBlock.Body>
				</CodeBlock.Root>
			);
			const { rerender } = render(view(pendingFoldRanges));
			const pre = getPre();
			expect(pre.querySelectorAll(".mantle-code-gutter")).toHaveLength(1);
			// Why a form feed: it has no height of its own, and the gutter draws a number for its row.
			const [firstRow, ...otherRows] = Array.from(
				pre.querySelectorAll(".mantle-code-line"),
				(row) => row.getBoundingClientRect().height,
			);
			expect(firstRow).toBeGreaterThan(0);
			expect(otherRows).toEqual([firstRow, firstRow]);

			// Why: a fold hides its lines with `display: none`, and a group gutter would still draw their numbers.
			rerender(view([{ id: "1", startLine: 1, endLine: 3 }]));
			expect(pre.querySelector(".mantle-code-gutter")).toBeNull();
			expect(pre.querySelector("code[data-mantle-gutter]")).toBeNull();
			const contents = Array.from(
				pre.querySelectorAll(".mantle-code-line"),
				(row) => getComputedStyle(row, "::before").content,
			);
			expect(contents).toHaveLength(3);
			for (const content of contents) {
				expect(content).toMatch(/^counter\(mantle-line\)/);
			}
		});

		test("streamed lines right to left draw a number on each line, clear of the copy button", () => {
			const lines = ["a", "b", "c"];
			render(
				<div dir="rtl">
					<CodeBlock.Root>
						<CodeBlock.Body>
							<CodeBlock.Code
								value={createMantleCodeBlockValue({
									language: "text",
									code: lines.join("\n"),
									lines,
									showLineNumbers: true,
								})}
							/>
						</CodeBlock.Body>
					</CodeBlock.Root>
				</div>,
			);

			const pre = getPre();
			const gutter = pre.querySelector(".mantle-code-gutter");
			if (gutter == null) {
				throw new Error("expected the gutter");
			}
			expect(getComputedStyle(gutter, "::before").content).toBe("none");
			for (const row of pre.querySelectorAll(".mantle-code-line")) {
				expect(getComputedStyle(row, "::before").content).toMatch(/^counter\(mantle-line\)/);
			}
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

	// Why inset: the button meets three edges of the root's `overflow-hidden`,
	// which clips a ring drawn outside it.
	test("a keyboard focus draws the ExpanderButton focus ring inside the button", async () => {
		const style = document.createElement("style");
		style.textContent = await commands.tailwindCss("./code-block.tsx");
		document.head.append(style);
		try {
			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.Code value={makeValue("const a = 1;")} />
					</CodeBlock.Body>
					<CodeBlock.ExpanderButton />
				</CodeBlock.Root>,
			);
			const button = screen.getByRole("button", { name: /show more/i });
			await browserUserEvent.keyboard("{Tab}");

			expect(document.activeElement).toBe(button);
			expect(button.matches(":focus-visible")).toBe(true);
			expect(getComputedStyle(button).boxShadow).toMatch(/inset/);

			// Forced colors removes the ring, so the outline fallback must also stay inside.
			await commands.emulateMedia({ forcedColors: "active" });
			expect(getComputedStyle(button)).toMatchObject({
				outlineStyle: "solid",
				outlineOffset: "-2px",
			});
		} finally {
			await commands.emulateMedia({ forcedColors: "none" });
			style.remove();
		}
	});
});

test("a tabbed root applies a defaultTab that arrives after the first render", async () => {
	const LateTabs = () => {
		const [loaded, setLoaded] = useState(false);
		return (
			<>
				<button type="button" onClick={() => setLoaded(true)}>
					Load
				</button>
				<CodeBlock.Root defaultTab={loaded ? "json" : undefined}>
					{loaded && (
						<CodeBlock.Header>
							<CodeBlock.TabList aria-label="Format">
								<CodeBlock.TabTrigger value="yml">policy.yml</CodeBlock.TabTrigger>
								<CodeBlock.TabTrigger value="json">policy.json</CodeBlock.TabTrigger>
							</CodeBlock.TabList>
						</CodeBlock.Header>
					)}
					<CodeBlock.Body>
						{loaded && (
							<>
								<CodeBlock.TabContent value="yml">YAML</CodeBlock.TabContent>
								<CodeBlock.TabContent value="json">JSON</CodeBlock.TabContent>
							</>
						)}
					</CodeBlock.Body>
				</CodeBlock.Root>
			</>
		);
	};
	render(<LateTabs />);

	await userEvent.click(screen.getByRole("button", { name: "Load" }));

	expect(screen.getByRole("tab", { name: "policy.json" })).toHaveAttribute("aria-selected", "true");
	expect(screen.getByRole("tabpanel")).toHaveTextContent("JSON");
});
