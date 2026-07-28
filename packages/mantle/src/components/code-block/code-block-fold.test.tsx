"use client";

import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import mantleCss from "../../mantle.css?raw";
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
 * fold ranges. Used by the JSX/HTML/CSS tests so they can exercise
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

/** Returns the `<code>` element the fold runtime keeps its state on. */
function getFoldCodeElement(): HTMLElement {
	const codeElement = document.querySelector("pre[data-slot='code-block-code'] code");
	if (!(codeElement instanceof HTMLElement)) {
		throw new Error("expected a rendered CodeBlock.Code <code> element");
	}
	return codeElement;
}

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

	test("a fold-toggle click without data-fold-line is a no-op", async () => {
		const user = userEvent.setup();
		render(
			<CodeBlock.Root>
				<CodeBlock.Body>
					<CodeBlock.Code value={makeJsonValue(SIMPLE_JSON)} />
				</CodeBlock.Body>
			</CodeBlock.Root>,
		);

		const codeElement = getFoldCodeElement();
		const fakeButton = document.createElement("button");
		fakeButton.type = "button";
		fakeButton.className = "mantle-code-fold-toggle";
		codeElement.appendChild(fakeButton);

		await user.click(fakeButton);

		// The delegated handler bails before writing any state for a toggle that
		// addresses no region.
		expect(fakeButton).not.toHaveAttribute("aria-expanded");
		expect(codeElement).not.toHaveAttribute("data-folded-regions");
		expect(document.querySelector('[data-line-number="3"]')).not.toHaveAttribute(
			"data-fold-hidden",
		);
	});

	test("the delegated handler also serves toggles inserted after mount", async () => {
		const user = userEvent.setup();
		render(
			<CodeBlock.Root>
				<CodeBlock.Body>
					<CodeBlock.Code value={makeJsonValue(SIMPLE_JSON)} />
				</CodeBlock.Body>
			</CodeBlock.Root>,
		);

		// A per-toggle React `onClick` could never reach a button appended to the
		// `<code>` after mount; the single delegated listener on the `<pre>` does,
		// which is the invariant `fold-runtime.ts` exists to keep.
		const codeElement = getFoldCodeElement();
		const lateButton = document.createElement("button");
		lateButton.type = "button";
		lateButton.className = "mantle-code-fold-toggle";
		lateButton.dataset.foldLine = "2";
		codeElement.appendChild(lateButton);

		await user.click(lateButton);

		expect(lateButton).toHaveAttribute("aria-expanded", "false");
		expect(codeElement).toHaveAttribute("data-folded-regions", "2");
		expect(document.querySelector('[data-line-number="3"]')).toHaveAttribute(
			"data-fold-hidden",
			"true",
		);
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

describe("CodeBlock JSX folding", () => {
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

// The runtime only writes attributes — `data-fold-hidden` on a line and
// `aria-expanded` on its toggle. The visible half of folding lives entirely in
// `mantle.css`, and no test environment here loads a stylesheet, so pin the two
// declarations those attributes are wired to. Editing either selector in
// mantle.css without updating this test means carets rotate while nothing
// actually collapses.
describe("mantle.css fold rules", () => {
	test("a line marked data-fold-hidden is display:none", () => {
		expect(mantleCss).toMatch(
			/\.mantle-code-line\[data-fold-hidden="true"\]\s*\{\s*display:\s*none/,
		);
	});

	test("the fold ellipsis is revealed only while its own toggle is collapsed", () => {
		// `.mantle-code-fold-ellipsis` is `display: none` by default...
		expect(mantleCss).toMatch(/\.mantle-code-fold-ellipsis\s*\{\s*display:\s*none/);
		// ...and only a collapsed toggle on the same line reveals it.
		expect(mantleCss).toMatch(
			/\.mantle-code-line:has\(>\s*\.mantle-code-fold-toggle\[aria-expanded="false"\]\)\s*\.mantle-code-fold-ellipsis\s*\{\s*display:\s*inline/,
		);
	});
});
