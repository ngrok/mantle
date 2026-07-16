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

describe("CodeBlock", () => {
	describe("surfaces", () => {
		test("uses the base background for the root and interactive controls", () => {
			const { container } = render(
				<CodeBlock.Root>
					<CodeBlock.Header>
						<CodeBlock.Icon preset="file" />
						<CodeBlock.Title>example.ts</CodeBlock.Title>
					</CodeBlock.Header>
					<CodeBlock.Body>
						<CodeBlock.CopyButton />
						<CodeBlock.Code value={makeValue("code")} />
					</CodeBlock.Body>
					<CodeBlock.ExpanderButton />
				</CodeBlock.Root>,
			);

			expect(container.querySelector("[data-slot='code-block']")).toHaveClass("bg-base");
			expect(container.querySelector("[data-slot='code-block-header']")).toHaveClass("bg-base");
			expect(container.querySelector("[data-slot='code-block-icon']")).toHaveClass("size-5");
			expect(container.querySelector("[data-slot='code-block-title']")).toHaveClass(
				"font-sans",
				"text-xs",
				"font-medium",
			);
			expect(container.querySelector("[data-slot='code-block-copy-button']")).toHaveClass(
				"bg-base",
			);
			expect(screen.getByRole("button", { name: /copy code/i })).toHaveClass(
				"bg-base",
				"not-disabled:hover:bg-neutral-500/15",
			);
			expect(screen.getByRole("button", { name: /show more/i })).toHaveClass(
				"bg-base",
				"hover:bg-base-hover",
			);
		});
	});

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

			expect(onCopy).toHaveBeenCalledWith(code);
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

			expect(onCopy).toHaveBeenCalledWith(code);
		});

		test("fires onCopyError when clipboard write fails", async () => {
			const originalWriteText = navigator.clipboard.writeText;
			navigator.clipboard.writeText = () => Promise.reject(new Error("clipboard denied"));

			const user = userEvent.setup();
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

			expect(onCopyError).toHaveBeenCalledOnce();
			expect(onCopyError.mock.calls[0]?.[0]).toBeInstanceOf(Error);

			navigator.clipboard.writeText = originalWriteText;
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

	describe("TabList", () => {
		test("scrolls horizontally on overflow instead of wrapping", () => {
			render(
				<CodeBlock.Root defaultTab="a">
					<CodeBlock.Header>
						<CodeBlock.TabList>
							<CodeBlock.TabTrigger value="a">example.ts</CodeBlock.TabTrigger>
							<CodeBlock.TabTrigger value="b">example.json</CodeBlock.TabTrigger>
						</CodeBlock.TabList>
					</CodeBlock.Header>
				</CodeBlock.Root>,
			);

			// The list is a scroll container with an edge fade rather than a wrapping row.
			expect(screen.getByRole("tablist")).toHaveClass(
				"scroll-fade-x",
				"overflow-x-auto",
				"min-w-0",
			);

			// Triggers keep their intrinsic width so labels never wrap under width pressure.
			for (const tab of screen.getAllByRole("tab")) {
				expect(tab).toHaveClass(
					"shrink-0",
					"whitespace-nowrap",
					"font-sans",
					"text-xs",
					"font-medium",
				);
			}
		});
	});
});
