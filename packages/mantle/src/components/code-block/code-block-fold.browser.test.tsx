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

/**
 * Builds a `MantleCodeBlockValue` from arbitrary code + caller-supplied
 * fold ranges. Used by the JSX/HTML/CSS browser tests so they can exercise
 * the runtime against any fold range layout the AST strategies produce
 * without taking a build-time dependency on the highlighter package.
 */
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

describe("CodeBlock JSON folding (browser)", () => {
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
		expect(arrayButton).toBeDefined();
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

	test("collapsing an outer fold hides everything inside it without overriding inner state", async () => {
		const user = userEvent.setup();
		render(
			<CodeBlock.Root>
				<CodeBlock.Body>
					<CodeBlock.Code value={makeJsonValue(SIMPLE_JSON)} />
				</CodeBlock.Body>
			</CodeBlock.Root>,
		);

		const buttons = screen.getAllByRole("button", { name: /toggle code folding/i });
		const outerButton = buttons.find((button) => button.getAttribute("data-fold-line") === "1");
		const innerButton = buttons.find((button) => button.getAttribute("data-fold-line") === "2");
		if (outerButton == null || innerButton == null) {
			throw new Error("expected fold toggles for outer and inner ranges");
		}

		await user.click(innerButton);
		await user.click(outerButton);

		expect(outerButton).toHaveAttribute("aria-expanded", "false");
		expect(innerButton).toHaveAttribute("aria-expanded", "false");

		const innerContent = document.querySelector('[data-line-number="3"]');
		expect(innerContent).toHaveAttribute("data-fold-hidden", "true");

		// Re-expand only the outer fold; inner stays collapsed.
		await user.click(outerButton);
		expect(outerButton).toHaveAttribute("aria-expanded", "true");
		expect(innerButton).toHaveAttribute("aria-expanded", "false");
		expect(innerContent).toHaveAttribute("data-fold-hidden", "true");
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
		// Regression: an unstable `dangerouslySetInnerHTML` prop reference
		// caused React to re-apply `innerHTML` on unrelated re-renders,
		// wiping fold state.
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

		// Toggle expander twice — should be a complete no-op as far as the
		// code's child DOM is concerned.
		await user.click(expanderButton);
		await user.click(expanderButton);

		const innerLineAfter = document.querySelector('[data-line-number="3"]');
		expect(innerLineAfter).toBe(innerLineBefore);

		// Now folding still works against the same elements.
		await user.click(arrayButton);
		expect(arrayButton).toHaveAttribute("aria-expanded", "false");
		expect(innerLineAfter).toHaveAttribute("data-fold-hidden", "true");

		// And folding state survives another expander toggle.
		await user.click(expanderButton);
		expect(innerLineAfter).toHaveAttribute("data-fold-hidden", "true");
		expect(arrayButton).toHaveAttribute("aria-expanded", "false");
	});

	test("a single click handler is shared across all fold toggles", async () => {
		const user = userEvent.setup();
		render(
			<CodeBlock.Root>
				<CodeBlock.Body>
					<CodeBlock.Code value={makeJsonValue(SIMPLE_JSON)} />
				</CodeBlock.Body>
			</CodeBlock.Root>,
		);

		// Sanity: clicking on a button that does NOT have a data-fold-line is a no-op.
		const fakeButton = document.createElement("button");
		fakeButton.className = "mantle-code-fold-toggle";
		const codeElement = document.querySelector("pre[data-slot='code-block-code']");
		expect(codeElement).not.toBeNull();
		codeElement?.querySelector("code")?.appendChild(fakeButton);

		await user.click(fakeButton);
		// No exception, no aria-expanded mutation.
		expect(fakeButton).not.toHaveAttribute("aria-expanded");
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

describe("CodeBlock JSX folding (browser)", () => {
	const JSX_SOURCE = ["<Outer>", "  <Inner>", "    text", "  </Inner>", "</Outer>"].join("\n");

	const JSX_RANGES: FoldableRange[] = [
		{ id: "1", startLine: 1, endLine: 5 },
		{ id: "2", startLine: 2, endLine: 4 },
	];

	test("clicking a JSX element fold toggle hides nested element children", async () => {
		const user = userEvent.setup();
		render(
			<CodeBlock.Root>
				<CodeBlock.Body>
					<CodeBlock.Code value={makeFoldedValue("tsx", JSX_SOURCE, JSX_RANGES)} />
				</CodeBlock.Body>
			</CodeBlock.Root>,
		);

		const innerButton = screen
			.getAllByRole("button", { name: /toggle code folding/i })
			.find((button) => button.getAttribute("data-fold-line") === "2");
		expect(innerButton).toBeDefined();
		if (innerButton == null) {
			throw new Error("expected fold toggle for inner JSX element");
		}

		const innerLine3 = document.querySelector('[data-line-number="3"]');
		expect(innerLine3).not.toBeNull();
		expect(innerLine3).not.toHaveAttribute("data-fold-hidden");

		await user.click(innerButton);

		expect(innerButton).toHaveAttribute("aria-expanded", "false");
		expect(innerLine3).toHaveAttribute("data-fold-hidden", "true");
	});

	test("a multi-line JSX block exposes one toggle per fold range", () => {
		render(
			<CodeBlock.Root>
				<CodeBlock.Body>
					<CodeBlock.Code value={makeFoldedValue("tsx", JSX_SOURCE, JSX_RANGES)} />
				</CodeBlock.Body>
			</CodeBlock.Root>,
		);

		const buttons = screen.getAllByRole("button", { name: /toggle code folding/i });
		// One per JSX fold (outer + inner element).
		expect(buttons).toHaveLength(2);
	});
});
