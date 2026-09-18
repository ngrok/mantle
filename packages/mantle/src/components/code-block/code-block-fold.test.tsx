"use client";

import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { CodeBlock } from "./code-block.js";
import { computeJsonFoldRanges, type FoldableRange } from "./compute-json-fold-ranges.js";
import { decorateHighlightedHtml } from "./decorate-highlighted-html.js";
import { createMantleCodeBlockValue } from "./mantle-code.js";
import type { SupportedLanguage } from "./supported-languages.js";

/** Wraps each line of code in Shiki's `<span class="line">` markup. */
function shikiLines(code: string): string {
	return code
		.split("\n")
		.map((line) => `<span class="line">${line === "" ? "" : line}</span>`)
		.join("\n");
}

/**
 * Builds a `MantleCodeBlockValue` for JSON tests with build-time-style decoration:
 * computes fold ranges, decorates the highlighted HTML, and packages it.
 */
function makeJsonValue(code: string, foldableRanges?: FoldableRange[]) {
	const ranges = foldableRanges ?? computeJsonFoldRanges(code);
	const html = decorateHighlightedHtml({
		foldableRanges: ranges,
		html: shikiLines(code),
		lineNumberStart: 1,
		showLineNumbers: true,
	});
	return createMantleCodeBlockValue({
		language: "json",
		code,
		preHtml: html,
		showLineNumbers: true,
	});
}

/** Builds a `MantleCodeBlockValue` from code and caller-supplied fold ranges, with no highlighter dependency. */
function makeFoldedValue(
	language: SupportedLanguage,
	code: string,
	foldableRanges: FoldableRange[],
) {
	const html = decorateHighlightedHtml({
		foldableRanges,
		html: shikiLines(code),
		lineNumberStart: 1,
		showLineNumbers: true,
	});
	return createMantleCodeBlockValue({
		language,
		code,
		preHtml: html,
		showLineNumbers: true,
	});
}

const SIMPLE_JSON = ["{", '  "a": [', "    1,", "    2", "  ]", "}"].join("\n");

describe("CodeBlock JSON folding", () => {
	test("renders a semantic fold toggle button on opener lines", () => {
		render(
			<CodeBlock.Root>
				<CodeBlock.Body>
					<CodeBlock.Code value={makeJsonValue(SIMPLE_JSON)} />
				</CodeBlock.Body>
			</CodeBlock.Root>,
		);

		const buttons = screen.getAllByRole("button", { name: /toggle code folding/i });
		expect(buttons).toHaveLength(2);
		for (const button of buttons) {
			expect(button).toHaveAttribute("type", "button");
			expect(button).toHaveAttribute("aria-expanded", "true");
		}
	});

	test("clicking a fold toggle hides the inner content lines and updates aria-expanded", async () => {
		const user = userEvent.setup();
		render(
			<CodeBlock.Root>
				<CodeBlock.Body>
					<CodeBlock.Code value={makeJsonValue(SIMPLE_JSON)} />
				</CodeBlock.Body>
			</CodeBlock.Root>,
		);

		const arrayButton = screen
			.getAllByRole("button", { name: /toggle code folding/i })
			.find((button) => button.getAttribute("data-fold-line") === "2");
		if (arrayButton == null) {
			throw new Error("expected fold toggle for array");
		}

		const innerLine3 = document.querySelector('[data-line-number="3"]');
		const innerLine4 = document.querySelector('[data-line-number="4"]');
		expect(innerLine3).not.toBeNull();
		expect(innerLine4).not.toBeNull();
		expect(innerLine3).not.toHaveAttribute("data-fold-hidden");
		expect(innerLine4).not.toHaveAttribute("data-fold-hidden");

		await user.click(arrayButton);

		expect(arrayButton).toHaveAttribute("aria-expanded", "false");
		expect(innerLine3).toHaveAttribute("data-fold-hidden", "true");
		expect(innerLine4).toHaveAttribute("data-fold-hidden", "true");
	});

	test("clicking the same toggle a second time restores visibility", async () => {
		const user = userEvent.setup();
		render(
			<CodeBlock.Root>
				<CodeBlock.Body>
					<CodeBlock.Code value={makeJsonValue(SIMPLE_JSON)} />
				</CodeBlock.Body>
			</CodeBlock.Root>,
		);

		const arrayButton = screen
			.getAllByRole("button", { name: /toggle code folding/i })
			.find((button) => button.getAttribute("data-fold-line") === "2");
		if (arrayButton == null) {
			throw new Error("expected fold toggle for array");
		}

		await user.click(arrayButton);
		await user.click(arrayButton);

		expect(arrayButton).toHaveAttribute("aria-expanded", "true");
		const innerLine3 = document.querySelector('[data-line-number="3"]');
		const innerLine4 = document.querySelector('[data-line-number="4"]');
		expect(innerLine3).not.toHaveAttribute("data-fold-hidden");
		expect(innerLine4).not.toHaveAttribute("data-fold-hidden");
	});

	test("replacing highlighted HTML clears stale folded state from the code element", async () => {
		const user = userEvent.setup();
		const { rerender } = render(
			<CodeBlock.Root>
				<CodeBlock.Body>
					<CodeBlock.Code value={makeJsonValue(SIMPLE_JSON)} />
				</CodeBlock.Body>
			</CodeBlock.Root>,
		);

		const firstButton = screen
			.getAllByRole("button", { name: /toggle code folding/i })
			.find((button) => button.getAttribute("data-fold-line") === "2");
		if (firstButton == null) {
			throw new Error("expected initial fold toggle for array");
		}
		await user.click(firstButton);

		const codeElement = document.querySelector("code");
		expect(codeElement).toHaveAttribute("data-folded-regions", "2");

		const nextJson = ["{", '  "next": {', '    "value": true', "  }", "}"].join("\n");
		rerender(
			<CodeBlock.Root>
				<CodeBlock.Body>
					<CodeBlock.Code value={makeJsonValue(nextJson)} />
				</CodeBlock.Body>
			</CodeBlock.Root>,
		);

		expect(codeElement).not.toHaveAttribute("data-folded-regions");
		const nextButton = screen
			.getAllByRole("button", { name: /toggle code folding/i })
			.find((button) => button.getAttribute("data-fold-line") === "2");
		if (nextButton == null) {
			throw new Error("expected replacement fold toggle for object");
		}
		expect(nextButton).toHaveAttribute("aria-expanded", "true");

		await user.click(nextButton);

		expect(nextButton).toHaveAttribute("aria-expanded", "false");
		expect(codeElement).toHaveAttribute("data-folded-regions", "2");
	});

	test("Enter and Space activate the fold toggle natively", async () => {
		const user = userEvent.setup();
		render(
			<CodeBlock.Root>
				<CodeBlock.Body>
					<CodeBlock.Code value={makeJsonValue(SIMPLE_JSON)} />
				</CodeBlock.Body>
			</CodeBlock.Root>,
		);

		const arrayButton = screen
			.getAllByRole("button", { name: /toggle code folding/i })
			.find((button) => button.getAttribute("data-fold-line") === "2");
		if (arrayButton == null) {
			throw new Error("expected fold toggle for array");
		}

		arrayButton.focus();
		await user.keyboard("{Enter}");
		expect(arrayButton).toHaveAttribute("aria-expanded", "false");

		await user.keyboard(" ");
		expect(arrayButton).toHaveAttribute("aria-expanded", "true");
	});

	test("non-foldable JSON code blocks render no fold toggle", () => {
		render(
			<CodeBlock.Root>
				<CodeBlock.Body>
					<CodeBlock.Code value={makeJsonValue('{"a": 1}')} />
				</CodeBlock.Body>
			</CodeBlock.Root>,
		);

		expect(screen.queryByRole("button", { name: /toggle code folding/i })).toBeNull();
	});

	test("opener lines render an aria-hidden fold ellipsis placeholder", () => {
		render(
			<CodeBlock.Root>
				<CodeBlock.Body>
					<CodeBlock.Code value={makeJsonValue(SIMPLE_JSON)} />
				</CodeBlock.Body>
			</CodeBlock.Root>,
		);

		const ellipses = document.querySelectorAll("[data-slot='fold-ellipsis']");
		expect(ellipses.length).toBe(2);
		for (const ellipsis of ellipses) {
			expect(ellipsis).toHaveAttribute("aria-hidden", "true");
		}
	});

	test("toggles a fold in a 1000+ line JSON block", async () => {
		const user = userEvent.setup();

		const lines: string[] = ["{", '  "items": ['];
		for (let index = 0; index < 1000; index += 1) {
			lines.push(
				`    ${JSON.stringify({ id: index, label: `item-${index}` })}${index === 999 ? "" : ","}`,
			);
		}
		lines.push("  ]");
		lines.push("}");
		const code = lines.join("\n");

		render(
			<CodeBlock.Root>
				<CodeBlock.Body>
					<CodeBlock.Code value={makeJsonValue(code)} />
				</CodeBlock.Body>
			</CodeBlock.Root>,
		);

		const arrayButton = screen
			.getAllByRole("button", { name: /toggle code folding/i })
			.find((button) => button.getAttribute("data-fold-line") === "2");
		if (arrayButton == null) {
			throw new Error("expected fold toggle for items array");
		}

		await user.click(arrayButton);

		expect(arrayButton).toHaveAttribute("aria-expanded", "false");
		const interior = document.querySelector('[data-line-number="500"]');
		expect(interior).toHaveAttribute("data-fold-hidden", "true");
	});

	test("fold state survives toggling the expander button", async () => {
		// Why: an unstable `dangerouslySetInnerHTML` prop reference makes React re-apply
		// `innerHTML` on every unrelated re-render, which wipes the DOM-held fold state.
		const user = userEvent.setup();
		render(
			<CodeBlock.Root>
				<CodeBlock.Body>
					<CodeBlock.Code value={makeJsonValue(SIMPLE_JSON)} />
				</CodeBlock.Body>
				<CodeBlock.ExpanderButton />
			</CodeBlock.Root>,
		);

		const arrayButton = screen
			.getAllByRole("button", { name: /toggle code folding/i })
			.find((button) => button.getAttribute("data-fold-line") === "2");
		if (arrayButton == null) {
			throw new Error("expected fold toggle for array");
		}
		const expanderButton = document.querySelector("[data-slot='code-block-expander-button']");
		if (!(expanderButton instanceof HTMLButtonElement)) {
			throw new Error("expected expander button");
		}
		const innerLineBefore = document.querySelector('[data-line-number="3"]');
		expect(innerLineBefore).not.toBeNull();

		// An expander toggle must leave the code's child DOM untouched.
		await user.click(expanderButton);
		await user.click(expanderButton);

		const innerLineAfter = document.querySelector('[data-line-number="3"]');
		expect(innerLineAfter).toBe(innerLineBefore);

		await user.click(arrayButton);
		expect(arrayButton).toHaveAttribute("aria-expanded", "false");
		expect(innerLineAfter).toHaveAttribute("data-fold-hidden", "true");

		await user.click(expanderButton);
		expect(innerLineAfter).toHaveAttribute("data-fold-hidden", "true");
		expect(arrayButton).toHaveAttribute("aria-expanded", "false");
	});

	test("custom fold IDs with spaces and quotes still toggle their region", async () => {
		const user = userEvent.setup();
		const code = ["{", '  "a": 1', "}"].join("\n");
		render(
			<CodeBlock.Root>
				<CodeBlock.Body>
					<CodeBlock.Code
						value={makeFoldedValue("json", code, [
							{ id: 'fold "one" region', startLine: 1, endLine: 3 },
						])}
					/>
				</CodeBlock.Body>
			</CodeBlock.Root>,
		);

		const button = screen.getByRole("button", { name: /toggle code folding/i });
		expect(button).toHaveAttribute("data-fold-line", "fold%20%22one%22%20region");

		await user.click(button);

		expect(button).toHaveAttribute("aria-expanded", "false");
		expect(document.querySelector('[data-line-number="2"]')).toHaveAttribute(
			"data-fold-hidden",
			"true",
		);
	});
});
