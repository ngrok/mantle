"use client";

import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CodeBlock } from "./code-block.js";
import { createMantleCodeBlockValue } from "./mantle-code.js";

function makeValue(code: string, preHtml?: string) {
	return createMantleCodeBlockValue({
		language: "typescript",
		code,
		preHtml: preHtml ?? `<span>${code}</span>`,
	});
}

/**
 * Mirrors the CSS Tailwind 4 emits for the utilities `CodeBlock.Header`,
 * `CodeBlock.TabList`, and `CodeBlock.TabTrigger` rely on to scroll their tab row
 * instead of wrapping it. The test pipeline runs no Tailwind build, so without
 * this the tab row has no layout to observe at all.
 *
 * Keyed on the class names the components actually emit, so dropping one of them
 * (`min-w-0`, `overflow-x-auto`, `shrink-0`, `whitespace-nowrap`) changes the
 * measured geometry. `.flex-wrap` is declared even though nothing uses it today —
 * that is the exact regression this guards, and it has to be able to wrap here
 * for the test to see it.
 */
const TAB_LAYOUT_STYLE = `
@layer utilities {
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
	.px-1\\.5 { padding-inline: 0.375rem; }
}
`;

let styleElement: HTMLStyleElement;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = TAB_LAYOUT_STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

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

	describe("TabList overflow", () => {
		test("scrolls horizontally instead of wrapping when the tabs exceed the header", () => {
			render(
				<div style={{ width: "220px" }}>
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
			expect(tabs).toHaveLength(3);

			// The row overflows...
			expect(tabList.scrollWidth).toBeGreaterThan(tabList.clientWidth);
			// ...and it overflows into a scroll box rather than onto a second row:
			// every trigger stays on the same line, and the list accepts a scroll
			// offset (an unscrollable box clamps scrollLeft back to 0).
			const offsetTops = new Set(tabs.map((tab) => tab.offsetTop));
			expect(offsetTops.size).toBe(1);

			tabList.scrollLeft = 40;
			expect(tabList.scrollLeft).toBeGreaterThan(0);
		});
	});
});
