"use client";

import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { CodeBlock } from "./code-block.js";
import { createMantleCodeBlockValue } from "./mantle-code.js";

function makeValue(code: string, preHtml?: string) {
	return createMantleCodeBlockValue({
		language: "typescript",
		code,
		preHtml: preHtml ?? `<span>${code}</span>`,
	});
}

const typescriptTabCode = "const a = 1;";
const jsonTabCode = '{ "b": 2 }';

/**
 * A two-tab `CodeBlock` shaped like the documented tabbed composition, so the
 * tab tests can drive both the uncontrolled and the controlled wiring.
 */
function TabbedCodeBlock({
	activeTab,
	defaultTab,
	onActiveTabChange,
	onCopy,
}: {
	activeTab?: string;
	defaultTab?: string;
	onActiveTabChange?: (value: string) => void;
	// `CopyButton` inherits React's `onCopy` clipboard handler type too, so the
	// narrow signature here has to stay compatible with both.
	onCopy?: () => void;
}) {
	return (
		<CodeBlock.Root
			activeTab={activeTab}
			defaultTab={defaultTab}
			onActiveTabChange={onActiveTabChange}
		>
			<CodeBlock.Header>
				<CodeBlock.TabList>
					<CodeBlock.TabTrigger value="a">example.ts</CodeBlock.TabTrigger>
					<CodeBlock.TabTrigger value="b">example.json</CodeBlock.TabTrigger>
				</CodeBlock.TabList>
			</CodeBlock.Header>
			<CodeBlock.Body>
				<CodeBlock.CopyButton onCopy={onCopy} />
				<CodeBlock.TabContent value="a">
					<CodeBlock.Code value={makeValue(typescriptTabCode)} />
				</CodeBlock.TabContent>
				<CodeBlock.TabContent value="b">
					<CodeBlock.Code
						value={createMantleCodeBlockValue({
							language: "json",
							code: jsonTabCode,
							preHtml: `<span>${jsonTabCode}</span>`,
						})}
					/>
				</CodeBlock.TabContent>
			</CodeBlock.Body>
			<CodeBlock.ExpanderButton />
		</CodeBlock.Root>
	);
}

/** Returns the mounted `<pre>` rendered by `CodeBlock.Code`, failing if there isn't exactly one. */
function getCodeElement(): HTMLPreElement {
	const elements = document.querySelectorAll("[data-slot='code-block-code']");
	if (elements.length !== 1) {
		throw new Error(`expected exactly one CodeBlock.Code, found ${elements.length}`);
	}
	const [element] = elements;
	if (!(element instanceof HTMLPreElement)) {
		throw new Error("expected CodeBlock.Code to render a <pre>");
	}
	return element;
}

describe("CodeBlock", () => {
	describe("Code", () => {
		test("renders plain text fallback when preHtml is missing", () => {
			const value = createMantleCodeBlockValue({
				language: "typescript",
				code: "const x = 1;",
				preHtml: undefined,
			});

			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.Code value={value} />
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			const pre = document.querySelector("pre");
			expect(pre).not.toBeNull();
			expect(pre?.dataset.highlighted).toBe("false");
			const code = document.querySelector("code");
			expect(code?.innerHTML).toBe("const x = 1;");
		});

		test("escapes HTML in plain text fallback", () => {
			const value = createMantleCodeBlockValue({
				language: "html",
				code: '<div class="test">Hello</div>',
				preHtml: undefined,
			});

			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.Code value={value} />
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			const code = document.querySelector("code");
			expect(code?.innerHTML).toContain("&lt;div");
			expect(code?.innerHTML).not.toContain("<div class");
		});

		test("renders pre-rendered HTML content", () => {
			const value = createMantleCodeBlockValue({
				language: "typescript",
				code: "const x = 1;",
				preHtml: '<span class="hl">const x = 1;</span>',
			});

			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.Code value={value} />
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			const pre = document.querySelector("pre[data-lang]");
			expect(pre).not.toBeNull();
			expect(pre?.querySelector("code")?.innerHTML).toBe('<span class="hl">const x = 1;</span>');
		});

		test("substitutes SHIKI_VAL placeholders in rendered HTML with escaped values", () => {
			const value = createMantleCodeBlockValue({
				language: "typescript",
				code: "const x = SHIKI_VAL_0;",
				preHtml: "<span>const x = SHIKI_VAL_0;</span>",
				preVals: ['<script>alert("xss")</script>'],
			});

			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.Code value={value} />
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			const code = document.querySelector("code");
			expect(code?.innerHTML).toContain("&lt;script&gt;");
			expect(code?.innerHTML).not.toContain("<script>");
		});

		test("does not rewrite literal SHIKI_VAL text when a custom preValToken is used", () => {
			const value = createMantleCodeBlockValue({
				language: "typescript",
				code: "const literal = 'SHIKI_VAL_0';\nconst actual = __MANTLE_PRE_VAL_demo_0__;",
				preHtml:
					"<span>const literal = &#39;SHIKI_VAL_0&#39;;</span>\n<span>const actual = __MANTLE_PRE_VAL_demo_0__;</span>",
				preValToken: "__MANTLE_PRE_VAL_demo_",
				preVals: ['"<safe>"'],
			});

			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.Code value={value} />
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			const code = document.querySelector("code");
			expect(code?.innerHTML).toContain("SHIKI_VAL_0");
			expect(code?.innerHTML).toContain('"&lt;safe&gt;"');
		});
	});

	describe("CopyButton", () => {
		test("uses the label prop as the accessible name", () => {
			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.CopyButton label="Copy TypeScript example" />
						<CodeBlock.Code value={makeValue("code")} />
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			expect(screen.getByRole("button", { name: "Copy TypeScript example" })).toBeInTheDocument();
			expect(screen.queryByRole("button", { name: /copy code/i })).not.toBeInTheDocument();
		});

		test("supports asChild composition", async () => {
			const user = userEvent.setup();
			const onCopy = vi.fn<() => void>();
			const code = "const x = 1;";

			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.CopyButton asChild onCopy={onCopy}>
							<button type="button" data-testid="custom-copy-button" />
						</CodeBlock.CopyButton>
						<CodeBlock.Code value={makeValue(code)} />
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			const button = screen.getByTestId("custom-copy-button");
			expect(screen.getByRole("button", { name: /copy code/i })).toBe(button);
			expect(button).toHaveAttribute("data-slot", "icon-button");

			await user.click(button);

			expect(onCopy).toHaveBeenCalledExactlyOnceWith(code);
		});

		test("fires onCopy with the code text after clicking", async () => {
			const user = userEvent.setup();
			const onCopy = vi.fn<() => void>();
			const code = "const x = 1;";

			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.CopyButton onCopy={onCopy} />
						<CodeBlock.Code value={makeValue(code)} />
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			const button = screen.getByRole("button", { name: /copy code/i });
			await user.click(button);

			// One click is one copy: a duplicated handler would fire twice here.
			expect(onCopy).toHaveBeenCalledExactlyOnceWith(code);
		});

		test("fires onCopyError when clipboard write fails", async () => {
			// userEvent.setup() swaps navigator.clipboard for its own stub, so the failure must be
			// installed after setup or the stub silently discards it and the copy succeeds.
			const user = userEvent.setup();
			const writeText = vi
				.spyOn(navigator.clipboard, "writeText")
				.mockRejectedValue(new Error("clipboard denied"));
			const onCopyError = vi.fn<(error: unknown) => void>();

			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.CopyButton onCopyError={onCopyError} />
						<CodeBlock.Code value={makeValue("code")} />
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			const button = screen.getByRole("button", { name: /copy code/i });
			await user.click(button);

			// The rejection reaches the caller intact rather than being swallowed or
			// replaced with a synthesized error.
			expect(writeText).toHaveBeenCalledExactlyOnceWith("code");
			expect(onCopyError).toHaveBeenCalledExactlyOnceWith(new Error("clipboard denied"));
		});

		test("does not fire onCopy when onClick calls preventDefault", async () => {
			const user = userEvent.setup();
			const onCopy = vi.fn<() => void>();

			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.CopyButton
							onCopy={onCopy}
							onClick={(event) => {
								event.preventDefault();
							}}
						/>
						<CodeBlock.Code value={makeValue("code")} />
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			const button = screen.getByRole("button", { name: /copy code/i });
			await user.click(button);

			expect(onCopy).not.toHaveBeenCalled();
		});
	});

	describe("ExpanderButton", () => {
		test("renders the collapse contract and flips it on click", async () => {
			const user = userEvent.setup();

			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.Code value={makeValue("const x = 1;")} />
					</CodeBlock.Body>
					<CodeBlock.ExpanderButton />
				</CodeBlock.Root>,
			);

			const button = screen.getByRole("button", { name: /show more/i });
			const pre = getCodeElement();

			// The button owns the `<pre>` it clamps, and the clamp itself is driven by
			// `aria-expanded="false"` on that `<pre>` (the `aria-collapsed` variant).
			expect(pre.id).not.toBe("");
			expect(button).toHaveAttribute("aria-controls", pre.id);
			expect(button).toHaveAttribute("aria-expanded", "false");
			expect(pre).toHaveAttribute("aria-expanded", "false");

			await user.click(button);

			expect(screen.getByRole("button", { name: /show less/i })).toBe(button);
			expect(button).toHaveAttribute("aria-expanded", "true");
			expect(pre).toHaveAttribute("aria-expanded", "true");

			await user.click(button);

			expect(screen.getByRole("button", { name: /show more/i })).toBe(button);
			expect(button).toHaveAttribute("aria-expanded", "false");
			expect(pre).toHaveAttribute("aria-expanded", "false");
		});

		test("leaves the code uncollapsible when no expander is rendered", () => {
			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.Code value={makeValue("const x = 1;")} />
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			expect(getCodeElement()).not.toHaveAttribute("aria-expanded");
		});

		test("calls a caller's onClick in addition to toggling", async () => {
			const user = userEvent.setup();
			const onClick = vi.fn<() => void>();

			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.Code value={makeValue("const x = 1;")} />
					</CodeBlock.Body>
					<CodeBlock.ExpanderButton onClick={onClick} />
				</CodeBlock.Root>,
			);

			await user.click(screen.getByRole("button", { name: /show more/i }));

			expect(onClick).toHaveBeenCalledTimes(1);
			expect(getCodeElement()).toHaveAttribute("aria-expanded", "true");
		});
	});

	describe("tabs", () => {
		test("uncontrolled defaultTab renders that tab and clicking another swaps the code", async () => {
			const user = userEvent.setup();

			render(<TabbedCodeBlock defaultTab="a" />);

			expect(screen.getByRole("tab", { name: "example.ts" })).toHaveAttribute(
				"aria-selected",
				"true",
			);
			expect(getCodeElement().textContent).toBe(typescriptTabCode);

			await user.click(screen.getByRole("tab", { name: "example.json" }));

			expect(screen.getByRole("tab", { name: "example.json" })).toHaveAttribute(
				"aria-selected",
				"true",
			);
			// Exactly one `<pre>` stays mounted — two would trip the single-`Code` invariant.
			expect(getCodeElement().textContent).toBe(jsonTabCode);
			expect(getCodeElement()).toHaveAttribute("data-lang", "json");
		});

		test("the copy button copies the active tab's code after a switch", async () => {
			const user = userEvent.setup();
			const onCopy = vi.fn<() => void>();

			render(<TabbedCodeBlock defaultTab="a" onCopy={onCopy} />);

			await user.click(screen.getByRole("tab", { name: "example.json" }));
			await user.click(screen.getByRole("button", { name: /copy code/i }));

			expect(onCopy).toHaveBeenCalledTimes(1);
			expect(onCopy).toHaveBeenLastCalledWith(jsonTabCode);
		});

		test("the expander stays wired to the active tab's code element", async () => {
			const user = userEvent.setup();

			render(<TabbedCodeBlock defaultTab="a" />);

			const expander = screen.getByRole("button", { name: /show more/i });
			const firstPre = getCodeElement();
			expect(expander).toHaveAttribute("aria-controls", firstPre.id);

			await user.click(screen.getByRole("tab", { name: "example.json" }));

			const secondPre = getCodeElement();
			expect(secondPre).not.toBe(firstPre);
			expect(expander).toHaveAttribute("aria-controls", secondPre.id);
		});

		test("controlled activeTab only switches once the caller updates the prop", async () => {
			const user = userEvent.setup();
			const onActiveTabChange = vi.fn<(value: string) => void>();

			const { rerender } = render(
				<TabbedCodeBlock activeTab="a" onActiveTabChange={onActiveTabChange} />,
			);

			await user.click(screen.getByRole("tab", { name: "example.json" }));

			expect(onActiveTabChange).toHaveBeenLastCalledWith("b");
			// The prop is still "a", so a controlled code block must not have switched.
			expect(getCodeElement().textContent).toBe(typescriptTabCode);
			expect(screen.getByRole("tab", { name: "example.ts" })).toHaveAttribute(
				"aria-selected",
				"true",
			);

			rerender(<TabbedCodeBlock activeTab="b" onActiveTabChange={onActiveTabChange} />);

			expect(getCodeElement().textContent).toBe(jsonTabCode);
			expect(screen.getByRole("tab", { name: "example.json" })).toHaveAttribute(
				"aria-selected",
				"true",
			);
		});

		test("wraps the root in tab state only when a tab prop is set", () => {
			const { unmount } = render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.Code value={makeValue("const x = 1;")} />
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			// Without `defaultTab` / `activeTab` the root is a plain container — no tab
			// orientation, no tab semantics for a code block that has no tabs.
			expect(document.querySelector("[data-slot='code-block']")).not.toHaveAttribute(
				"data-orientation",
			);

			unmount();
			render(<TabbedCodeBlock defaultTab="a" />);

			expect(document.querySelector("[data-slot='code-block']")).toHaveAttribute(
				"data-orientation",
				"horizontal",
			);
			expect(screen.getAllByRole("tab")).toHaveLength(2);
		});
	});

	describe("polymorphism", () => {
		test("Root, Header, Title, and Body render the child element when asChild is set", () => {
			render(
				<CodeBlock.Root asChild>
					<figure className="custom-root">
						<CodeBlock.Header asChild>
							<hgroup>
								<CodeBlock.Title asChild>
									<h2>example.ts</h2>
								</CodeBlock.Title>
							</hgroup>
						</CodeBlock.Header>
						<CodeBlock.Body asChild>
							<section>
								<CodeBlock.Code value={makeValue("const x = 1;")} />
							</section>
						</CodeBlock.Body>
					</figure>
				</CodeBlock.Root>,
			);

			const root = document.querySelector("[data-slot='code-block']");
			expect(root?.tagName).toBe("FIGURE");
			// The consumer's className survives the merge onto the slotted element.
			expect(root).toHaveClass("custom-root");
			expect(document.querySelector("[data-slot='code-block-header']")?.tagName).toBe("HGROUP");
			expect(document.querySelector("[data-slot='code-block-body']")?.tagName).toBe("SECTION");
			expect(screen.getByRole("heading", { level: 2, name: "example.ts" })).toHaveAttribute(
				"data-slot",
				"code-block-title",
			);
		});

		test("Title renders an h3 by default", () => {
			render(
				<CodeBlock.Root>
					<CodeBlock.Header>
						<CodeBlock.Title>example.ts</CodeBlock.Title>
					</CodeBlock.Header>
				</CodeBlock.Root>,
			);

			expect(screen.getByRole("heading", { level: 3, name: "example.ts" })).toHaveAttribute(
				"data-slot",
				"code-block-title",
			);
		});
	});
});
