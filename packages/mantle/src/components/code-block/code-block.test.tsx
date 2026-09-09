"use client";

import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
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

		test('renders translate="no" so a translation engine skips the code', () => {
			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.Code value={makeValue("const x = 1;")} />
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			expect(document.querySelector("pre")).toHaveAttribute("translate", "no");
		});

		test('keeps translate="no" when a call site passes translate', () => {
			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.Code
							// @ts-expect-error `translate` is omitted from the props type on purpose. This
							// pins the runtime guard for a caller who spreads a wider props object past it.
							translate="yes"
							value={makeValue("const x = 1;")}
						/>
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			expect(document.querySelector("pre")).toHaveAttribute("translate", "no");
		});

		test("calls a callback ref once for the mount, not once per re-render", async () => {
			const user = userEvent.setup();
			const refSpy = vi.fn<(node: HTMLPreElement | null) => void>();

			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.Code ref={refSpy} value={makeValue("const x = 1;")} />
					</CodeBlock.Body>
					<CodeBlock.ExpanderButton />
				</CodeBlock.Root>,
			);

			// The expander's registration re-renders `Code` once after mount, and the
			// click re-renders it again. An inline `composeRefs` detaches and
			// re-attaches the consumer's ref on each of those.
			await user.click(screen.getByRole("button", { name: "Show more" }));

			expect(refSpy).toHaveBeenCalledTimes(1);
			expect(refSpy).toHaveBeenLastCalledWith(document.querySelector("pre"));
		});
	});

	describe("Title", () => {
		test('renders translate="no" so a translation engine skips the filename', () => {
			render(
				<CodeBlock.Root>
					<CodeBlock.Header>
						<CodeBlock.Title>example.ts</CodeBlock.Title>
					</CodeBlock.Header>
				</CodeBlock.Root>,
			);

			expect(screen.getByRole("heading", { name: "example.ts" })).toHaveAttribute(
				"translate",
				"no",
			);
		});

		test('a call site can opt back in with translate="yes"', () => {
			// The slot takes arbitrary children, so a title that is prose rather than a
			// filename can override the default — unlike `CodeBlock.Code`.
			render(
				<CodeBlock.Root>
					<CodeBlock.Header>
						<CodeBlock.Title translate="yes">Request headers</CodeBlock.Title>
					</CodeBlock.Header>
				</CodeBlock.Root>,
			);

			expect(screen.getByRole("heading", { name: "Request headers" })).toHaveAttribute(
				"translate",
				"yes",
			);
		});

		test('asChild carries translate="no" onto the consumer\'s element', () => {
			render(
				<CodeBlock.Root>
					<CodeBlock.Header>
						<CodeBlock.Title asChild>
							<span data-testid="title">example.ts</span>
						</CodeBlock.Title>
					</CodeBlock.Header>
				</CodeBlock.Root>,
			);

			const title = screen.getByTestId("title");
			expect(title.tagName).toBe("SPAN");
			expect(title).toHaveAttribute("translate", "no");
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

		test("announces 'Copied' through a live region after a copy", async () => {
			const user = userEvent.setup();

			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.CopyButton />
						<CodeBlock.Code value={makeValue("const x = 1;")} />
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			// Why always mounted: a live region that appears with its text is not
			// announced. The element must exist, empty, before the copy.
			const status = screen.getByRole("status");
			expect(status).toHaveTextContent("");

			await user.click(screen.getByRole("button", { name: /copy code/i }));

			await vi.waitFor(() => {
				expect(status).toHaveTextContent("Copied");
			});
		});

		test("announces again when a second copy lands inside the reset window", async () => {
			const user = userEvent.setup();

			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.CopyButton />
						<CodeBlock.Code value={makeValue("const x = 1;")} />
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			const status = screen.getByRole("status");
			const button = screen.getByRole("button", { name: /copy code/i });

			await user.click(button);
			await vi.waitFor(() => {
				expect(status).toHaveTextContent("Copied");
			});
			const first = status.textContent;

			await user.click(button);
			// A live region announces a DOM change, so a repeat must differ from the
			// text before it. The trailing no-break space reads the same.
			await vi.waitFor(() => {
				expect(status.textContent).not.toBe(first);
			});
			expect(status).toHaveTextContent("Copied");
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
			// Why after setup: when this test runs first, `userEvent.setup()` swaps in
			// its own clipboard stub and drops a patch installed before it.
			const user = userEvent.setup();
			vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("clipboard denied"));
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
		});

		test("routes a throw from onClick into onCopyError and skips onCopy", async () => {
			const user = userEvent.setup();
			const onCopy = vi.fn<() => void>();
			const onCopyError = vi.fn<(error: unknown) => void>();

			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.CopyButton
							onCopy={onCopy}
							onCopyError={onCopyError}
							onClick={() => {
								throw new Error("boom");
							}}
						/>
						<CodeBlock.Code value={makeValue("code")} />
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			await user.click(screen.getByRole("button", { name: /copy code/i }));

			expect(onCopyError).toHaveBeenCalledOnce();
			expect(onCopyError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
			expect(onCopy).not.toHaveBeenCalled();
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
				expect(tab).toHaveClass("shrink-0", "whitespace-nowrap");
			}
		});
	});

	describe("TabContent", () => {
		test("a tab switch remounts Code without tripping the single-Code guard", async () => {
			const user = userEvent.setup();

			render(
				<CodeBlock.Root defaultTab="a">
					<CodeBlock.Header>
						<CodeBlock.TabList>
							<CodeBlock.TabTrigger value="a">example.ts</CodeBlock.TabTrigger>
							<CodeBlock.TabTrigger value="b">example.json</CodeBlock.TabTrigger>
						</CodeBlock.TabList>
					</CodeBlock.Header>
					<CodeBlock.Body>
						<CodeBlock.TabContent value="a">
							<CodeBlock.Code value={makeValue("const a = 1;")} />
						</CodeBlock.TabContent>
						<CodeBlock.TabContent value="b">
							<CodeBlock.Code value={makeValue("const b = 2;")} />
						</CodeBlock.TabContent>
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			expect(document.querySelectorAll("pre")).toHaveLength(1);
			expect(document.querySelector("code")).toHaveTextContent("const a = 1;");

			await user.click(screen.getByRole("tab", { name: "example.json" }));

			// Why this pins the guard: the inactive Code unregisters before the active
			// one registers, so a lost decrement makes this mount throw.
			expect(document.querySelectorAll("pre")).toHaveLength(1);
			expect(document.querySelector("code")).toHaveTextContent("const b = 2;");
		});
	});

	describe("ExpanderButton", () => {
		test("owns the ARIA state and points at the <pre>, which carries data-state instead", async () => {
			const user = userEvent.setup();

			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.Code value={makeValue("const x = 1;")} />
					</CodeBlock.Body>
					<CodeBlock.ExpanderButton />
				</CodeBlock.Root>,
			);

			const button = screen.getByRole("button", { name: "Show more" });
			const pre = document.querySelector("pre");
			expect(pre).not.toBeNull();
			expect(button).toHaveAttribute("aria-expanded", "false");
			expect(button).toHaveAttribute("aria-controls", pre?.getAttribute("id") ?? "");
			// Why: `aria-expanded` is not valid on a `<pre>`; styling reads `data-state`.
			expect(pre).not.toHaveAttribute("aria-expanded");
			expect(pre).toHaveAttribute("data-state", "collapsed");

			await user.click(button);

			expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute(
				"aria-expanded",
				"true",
			);
			expect(pre).toHaveAttribute("data-state", "expanded");
		});

		test("without an expander the <pre> carries no data-state", () => {
			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.Code value={makeValue("const x = 1;")} />
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			expect(document.querySelector("pre")).not.toHaveAttribute("data-state");
		});

		test("points aria-controls at the <pre> id in the server HTML", () => {
			// Why renderToString: `render` runs every effect before the first assertion,
			// so it cannot see an id that reaches the button only after mount.
			const html = renderToString(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.Code value={makeValue("const x = 1;")} />
					</CodeBlock.Body>
					<CodeBlock.ExpanderButton />
				</CodeBlock.Root>,
			);
			const template = document.createElement("template");
			template.innerHTML = html;
			const pre = template.content.querySelector("pre");
			const button = template.content.querySelector('[data-slot="code-block-expander-button"]');
			if (pre == null || button == null) {
				throw new Error("expected the <pre> and the expander button in the server HTML");
			}

			const preId = pre.getAttribute("id") ?? "";
			expect(preId).not.toBe("");
			expect(button).toHaveAttribute("aria-controls", preId);
		});

		test("stamps data-state on the <pre> in the same task as the mount commit", async () => {
			// Why not `render`: its `act()` flushes layout and passive effects together,
			// so it cannot tell which one wrote the attribute. `MutationObserver`
			// reports in the microtask right after the commit, before React runs a
			// passive effect in a later task. A passive registration paints one frame
			// at full height; a layout effect re-renders before paint.
			vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", false);
			const container = document.createElement("div");
			document.body.appendChild(container);
			const firstObservedState = new Promise<string | null>((resolve) => {
				const observer = new MutationObserver(() => {
					observer.disconnect();
					resolve(container.querySelector("pre")?.getAttribute("data-state") ?? null);
				});
				observer.observe(container, { attributes: true, childList: true, subtree: true });
			});
			const root = createRoot(container);
			root.render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.Code value={makeValue("const x = 1;")} />
					</CodeBlock.Body>
					<CodeBlock.ExpanderButton />
				</CodeBlock.Root>,
			);

			try {
				await expect(firstObservedState).resolves.toBe("collapsed");
			} finally {
				root.unmount();
				container.remove();
			}
		});
	});
});
