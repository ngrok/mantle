"use client";

import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import type { ReactElement } from "react";
import { describe, expect, test, vi } from "vitest";
import * as CodeBlock from "./code-block-parts.js";
import { jsonCodeBlockValue } from "./json-highlight.js";
import { createMantleCodeBlockValue } from "./mantle-code.js";
import { useCodeBlockStream } from "./use-code-block-stream.js";

function makeValue(code: string, preHtml?: string) {
	return createMantleCodeBlockValue({
		language: "typescript",
		code,
		preHtml: preHtml ?? `<span>${code}</span>`,
	});
}

const typescriptTabCode = "const a = 1;";
const jsonTabCode = '{ "b": 2 }';

/** A two-tab code block, so the tab tests can drive the uncontrolled and the controlled wiring. */
function TabbedCodeBlock({
	activeTab,
	defaultTab,
	onActiveTabChange,
	onCopy,
}: {
	activeTab?: string;
	defaultTab?: string;
	onActiveTabChange?: (value: string) => void;
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
					<CodeBlock.Code value={makeValue(jsonTabCode)} />
				</CodeBlock.TabContent>
			</CodeBlock.Body>
		</CodeBlock.Root>
	);
}

describe("CodeBlock", () => {
	describe("Code", () => {
		// Firefox reads `-moz-tab-size` as an alias of `tab-size`, and React writes
		// a numeric `MozTabSize` with `px`, so a tab shrank to two pixels there.
		test("sets a tab to two spaces, with no prefixed tab size", () => {
			const html = renderToString(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.Code value={makeValue("\tconst x = 1;")} />
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			expect(html).toMatch(/tab-size:2[;"]/);
			expect(html).not.toContain("-moz-tab-size");
		});

		test("marks the <pre> foldable only when its HTML has a fold toggle", () => {
			const pre = (value: ReturnType<typeof jsonCodeBlockValue>) => {
				const { container, unmount } = render(
					<CodeBlock.Root>
						<CodeBlock.Body>
							<CodeBlock.Code value={value} />
						</CodeBlock.Body>
					</CodeBlock.Root>,
				);
				const foldable = container.querySelector("pre")?.hasAttribute("data-foldable");
				unmount();
				return foldable;
			};

			const foldable = jsonCodeBlockValue({ a: [1, 2] });
			expect(pre(foldable)).toBe(true);
			// Why: HTML that a consumer serialized again can reorder the attributes.
			expect(
				pre({
					...foldable,
					"~preHtml": (foldable["~preHtml"] ?? "").replaceAll(
						'type="button" class="mantle-code-fold-toggle"',
						'class="mantle-code-fold-toggle" type="button"',
					),
				}),
			).toBe(true);
			// Why: the class name in the code's text is not a fold toggle.
			expect(
				pre(
					jsonCodeBlockValue(
						{ '<button type="button" class="mantle-code-fold-toggle"': [1, 2] },
						{ foldable: false },
					),
				),
			).toBe(false);
		});

		test("drops a prefixed tab size from a consumer style", () => {
			const html = renderToString(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.Code style={{ MozTabSize: 4 }} value={makeValue("\tconst x = 1;")} />
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			expect(html).toMatch(/tab-size:2[;"]/);
			expect(html).not.toContain("-moz-tab-size");
		});

		// On a client mount, React writes each style key, an `undefined` value as
		// `""`. The alias below acts as Firefox does, so a `MozTabSize` write of
		// any value replaces `tab-size`.
		test("keeps a tab at two spaces on a client mount in Firefox", () => {
			Object.defineProperty(CSSStyleDeclaration.prototype, "MozTabSize", {
				configurable: true,
				get(this: CSSStyleDeclaration) {
					return this.tabSize;
				},
				set(this: CSSStyleDeclaration, value: string) {
					this.tabSize = value;
				},
			});
			try {
				const { container } = render(
					<>
						<CodeBlock.Root>
							<CodeBlock.Body>
								<CodeBlock.Code value={makeValue("\tconst x = 1;")} />
							</CodeBlock.Body>
						</CodeBlock.Root>
						<CodeBlock.Root>
							<CodeBlock.Body>
								<CodeBlock.Code style={{ MozTabSize: 4 }} value={makeValue("\tconst y = 2;")} />
							</CodeBlock.Body>
						</CodeBlock.Root>
					</>,
				);

				const tabSizes = [...container.querySelectorAll("pre")].map((pre) => pre.style.tabSize);
				expect(tabSizes).toEqual(["2", "2"]);
			} finally {
				Reflect.deleteProperty(CSSStyleDeclaration.prototype, "MozTabSize");
			}
		});

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
			expect(pre).not.toHaveAttribute("data-syntax-highlighted");
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

			expect(screen.getByRole("heading", { level: 3, name: "example.ts" })).toHaveAttribute(
				"translate",
				"no",
			);
		});

		test('a call site can opt back in with translate="yes"', () => {
			// The slot takes arbitrary children, so a title that is prose rather than a
			// filename can override the default (unlike `CodeBlock.Code`).
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

			expect(onCopy).toHaveBeenCalledTimes(1);
			expect(onCopy).toHaveBeenLastCalledWith(code);
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

		test("shares one live region across code blocks", async () => {
			const user = userEvent.setup();

			render(
				<>
					{["a", "b", "c"].map((code) => (
						<CodeBlock.Root key={code}>
							<CodeBlock.Body>
								<CodeBlock.CopyButton />
								<CodeBlock.Code value={makeValue(code)} />
							</CodeBlock.Body>
						</CodeBlock.Root>
					))}
				</>,
			);

			// Why: an answer with many fences must not hold a polite region for each.
			const [status, ...rest] = screen.getAllByRole("status");
			expect(rest).toHaveLength(0);

			await user.click(screen.getAllByRole("button", { name: /copy code/i }).at(-1) as HTMLElement);
			await vi.waitFor(() => {
				expect(status).toHaveTextContent("Copied");
			});
		});

		test("announces a copy from a second code block after a copy from the first", async () => {
			const user = userEvent.setup();

			render(
				<>
					{["a", "b"].map((code) => (
						<CodeBlock.Root key={code}>
							<CodeBlock.Body>
								<CodeBlock.CopyButton />
								<CodeBlock.Code value={makeValue(code)} />
							</CodeBlock.Body>
						</CodeBlock.Root>
					))}
				</>,
			);

			const status = screen.getByRole("status");
			const [first, second] = screen.getAllByRole("button", { name: /copy code/i });
			await user.click(first as HTMLElement);
			await vi.waitFor(() => {
				expect(status).toHaveTextContent("Copied");
			});
			const before = status.textContent;

			await user.click(second as HTMLElement);
			// Why: the region is shared, so the second button's text must differ from the first's.
			await vi.waitFor(() => {
				expect(status.textContent).not.toBe(before);
			});
			expect(status).toHaveTextContent("Copied");
		});

		test("announces in the dialog that a copy button moved into", async () => {
			const user = userEvent.setup();

			const { container } = render(
				<>
					<dialog open />
					<CodeBlock.Root>
						<CodeBlock.Body>
							<CodeBlock.CopyButton />
							<CodeBlock.Code value={makeValue("const x = 1;")} />
						</CodeBlock.Body>
					</CodeBlock.Root>
				</>,
			);

			const dialog = container.querySelector("dialog") as HTMLDialogElement;
			const button = screen.getByRole("button", { name: /copy code/i });
			// Why a DOM move: a portal host such as `OverlayPrompt` moves its content and keeps the ref.
			dialog.append(button);

			await user.click(button);
			await vi.waitFor(() => {
				expect(within(dialog).getByRole("status")).toHaveTextContent("Copied");
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

			expect(onCopy).toHaveBeenCalledTimes(1);
			expect(onCopy).toHaveBeenLastCalledWith(code);
		});

		test("fires onCopyError when clipboard write fails", async () => {
			// Why after setup: when this test runs first, `userEvent.setup()` swaps in
			// its own clipboard stub and drops a patch installed before it.
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

			// The rejection reaches the caller as is, not swallowed or replaced
			// by a synthesized error.
			expect(writeText).toHaveBeenCalledTimes(1);
			expect(writeText).toHaveBeenLastCalledWith("code");
			expect(onCopyError).toHaveBeenCalledTimes(1);
			expect(onCopyError).toHaveBeenLastCalledWith(new Error("clipboard denied"));
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

		test("returns the copy icon when onClick cancels a click after a copy", async () => {
			const user = userEvent.setup();
			let cancel = false;

			render(
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.CopyButton
							onClick={(event) => {
								if (cancel) {
									event.preventDefault();
								}
							}}
						/>
						<CodeBlock.Code value={makeValue("code")} />
					</CodeBlock.Body>
				</CodeBlock.Root>,
			);

			const button = screen.getByRole("button", { name: /copy code/i });
			await user.click(button);
			await vi.waitFor(() => {
				expect(button).toHaveAttribute("data-copied");
			});

			cancel = true;
			await user.click(button);
			// Why: the cancel clears the timeout that returns the copy icon.
			expect(button).not.toHaveAttribute("data-copied");
		});
	});

	describe("TabList", () => {
		// Why the class: a cross-file spelling pin. `mantle.css` declares
		// `@utility scroll-fade-x`, so a rename here alone drops the edge fade with
		// every other test green.
		test("carries the scroll-fade-x edge mask", () => {
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

			expect(screen.getByRole("tablist")).toHaveClass("scroll-fade-x");
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

		test("CopyButton copies the active tab's code after a switch", async () => {
			const user = userEvent.setup();
			const onCopy = vi.fn<() => void>();

			render(<TabbedCodeBlock defaultTab="a" onCopy={onCopy} />);

			await user.click(screen.getByRole("tab", { name: "example.json" }));
			await user.click(screen.getByRole("button", { name: /copy code/i }));

			// Why: each `Code` writes its text into the root on mount, so a switch
			// that skipped the write would copy the first tab.
			expect(onCopy).toHaveBeenCalledTimes(1);
			expect(onCopy).toHaveBeenLastCalledWith(jsonTabCode);
		});
	});

	describe("Root", () => {
		test("a controlled activeTab switches only when the consumer updates the prop", async () => {
			const user = userEvent.setup();
			const onActiveTabChange = vi.fn<(value: string) => void>();

			const { rerender } = render(
				<TabbedCodeBlock activeTab="a" onActiveTabChange={onActiveTabChange} />,
			);

			// Why the keyboard: one key press is one activation, with no mousedown
			// and focus pair in it.
			screen.getByRole("tab", { name: "example.ts" }).focus();
			await user.keyboard("{ArrowRight}");

			expect(onActiveTabChange).toHaveBeenCalledTimes(1);
			expect(onActiveTabChange).toHaveBeenLastCalledWith("b");
			expect(screen.getByRole("tab", { name: "example.ts" })).toHaveAttribute(
				"aria-selected",
				"true",
			);
			expect(document.querySelector("code")).toHaveTextContent(typescriptTabCode);

			rerender(<TabbedCodeBlock activeTab="b" onActiveTabChange={onActiveTabChange} />);

			expect(screen.getByRole("tab", { name: "example.json" })).toHaveAttribute(
				"aria-selected",
				"true",
			);
			expect(document.querySelector("code")).toHaveTextContent(jsonTabCode);
		});

		test("asChild on Root, Header, and Body renders the consumer's element with the part's slot", () => {
			render(
				<CodeBlock.Root asChild className="custom-root">
					<figure>
						<CodeBlock.Header asChild>
							<hgroup>
								<CodeBlock.Title>example.ts</CodeBlock.Title>
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
			expect(root).toHaveClass("custom-root");
			expect(document.querySelector("[data-slot='code-block-header']")?.tagName).toBe("HGROUP");
			expect(document.querySelector("[data-slot='code-block-body']")?.tagName).toBe("SECTION");
		});
	});

	describe("ExpanderButton", () => {
		test("owns the ARIA state and points at the <pre>, which carries data-expanded instead", async () => {
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
			// Why: `aria-expanded` is not valid on a `<pre>`; it mirrors as `data-expanded`.
			expect(pre).not.toHaveAttribute("aria-expanded");
			expect(pre).not.toHaveAttribute("data-expanded");

			await user.click(button);

			expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute(
				"aria-expanded",
				"true",
			);
			expect(pre).toHaveAttribute("data-expanded");
		});

		test("runs a consumer's onClick and still toggles", async () => {
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

			await user.click(screen.getByRole("button", { name: "Show more" }));

			expect(onClick).toHaveBeenCalledTimes(1);
			expect(document.querySelector("pre")).toHaveAttribute("data-expanded");
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

		test("collapses the <pre> in the same task as the mount commit", async () => {
			// Why not `render`: its `act()` flushes layout and passive effects together,
			// so it cannot tell which one wrote the attribute. `MutationObserver`
			// reports in the microtask right after the commit, before React runs a
			// passive effect in a later task. A passive registration paints one frame
			// at full height; a layout effect re-renders before paint.
			vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", false);
			const container = document.createElement("div");
			document.body.appendChild(container);
			// Why a class: the collapse is the max height itself, and no attribute
			// marks a collapsed `<pre>`.
			const firstObservedCollapsed = new Promise<boolean>((resolve) => {
				const observer = new MutationObserver(() => {
					observer.disconnect();
					resolve(container.querySelector("pre")?.classList.contains("max-h-[13.6rem]") ?? false);
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
				await expect(firstObservedCollapsed).resolves.toBe(true);
			} finally {
				root.unmount();
				container.remove();
			}
		});
	});
});

describe("useCodeBlockStream", () => {
	function StreamedCode({ code }: { code: string }) {
		return (
			<CodeBlock.Root>
				<CodeBlock.Body>
					<CodeBlock.Code value={useCodeBlockStream({ code, language: "text" })} />
				</CodeBlock.Body>
			</CodeBlock.Root>
		);
	}

	test("reserves the fold gutter only for a caller that passes complete, in a language that folds", () => {
		function Folding({ complete, language }: { complete?: boolean; language: "ts" | "text" }) {
			return (
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.Code value={useCodeBlockStream({ code: "a {\n}", language, complete })} />
					</CodeBlock.Body>
				</CodeBlock.Root>
			);
		}
		const foldable = (element: ReactElement) => {
			const { container, unmount } = render(element);
			const value = container.querySelector("pre")?.hasAttribute("data-foldable");
			unmount();
			return value;
		};
		expect(foldable(<Folding language="ts" />)).toBe(false);
		expect(foldable(<Folding language="ts" complete={false} />)).toBe(true);
		expect(foldable(<Folding language="text" complete={false} />)).toBe(false);
	});

	test("server HTML of CRLF code holds one line break for each line ending", () => {
		const container = document.createElement("div");
		container.innerHTML = renderToString(<StreamedCode code={"alpha\r\nbeta"} />);
		const code = container.querySelector("[data-slot='code-block-code'] code");
		expect(code?.textContent).toBe("alpha\nbeta");
	});

	test("a long block keeps each line break and line number as it streams past 64 lines", () => {
		const lines = Array.from({ length: 130 }, (_, index) => `line ${index + 1}`);
		const { container, rerender } = render(<StreamedCode code={lines.slice(0, 70).join("\n")} />);
		const code = container.querySelector("[data-slot='code-block-code'] code");
		// Why the same length first: a group with the same count of lines must still show an edited line.
		lines[65] = "line 66 changed";
		rerender(<StreamedCode code={lines.slice(0, 70).join("\n")} />);
		expect(code?.textContent).toBe(lines.slice(0, 70).join("\n"));

		rerender(<StreamedCode code={lines.join("\n")} />);
		expect(code?.textContent).toBe(lines.join("\n"));
		const numbers = [...container.querySelectorAll(".mantle-code-line")].map((line) =>
			Number(line.getAttribute("data-line-number")),
		);
		expect(numbers).toEqual(lines.map((_, index) => index + 1));
	});

	test("a line that fills a hole in the lines shows", () => {
		function LineCode({ code, lines }: { code: string; lines: readonly string[] }) {
			return (
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.Code value={createMantleCodeBlockValue({ language: "text", code, lines })} />
					</CodeBlock.Body>
				</CodeBlock.Root>
			);
		}
		// Why `length`: it leaves a hole at index 1, as a caller that reserves slots does.
		const sparse: string[] = ["A"];
		sparse.length = 2;
		const { container, rerender } = render(<LineCode code="A" lines={sparse} />);
		rerender(<LineCode code={"A\nB"} lines={["A", "B"]} />);

		expect(container.querySelector("[data-slot='code-block-code'] code")?.textContent).toBe("A\nB");
	});
});
