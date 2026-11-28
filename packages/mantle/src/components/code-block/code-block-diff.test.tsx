import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import * as CodeBlock from "./code-block-parts.js";
import type { CodeBlockDiffLine } from "./code-block-diff.js";
import { jsonCodeBlockValue } from "./json-highlight.js";
import { createMantleCodeBlockValue } from "./mantle-code.js";

const text = (code: string) => createMantleCodeBlockValue({ code, language: "text" });

function renderDiff(props: {
	from: ReturnType<typeof text>;
	to: ReturnType<typeof text>;
	children?: (line: CodeBlockDiffLine) => ReactNode;
}) {
	return render(
		<CodeBlock.Root>
			<CodeBlock.Diff data-testid="diff" {...props} />
		</CodeBlock.Root>,
	);
}

function pane(name: "Before" | "After") {
	return screen.getByRole("group", { name });
}

describe("CodeBlock.Diff", () => {
	test("names each pane and marks a changed line and its changed word", () => {
		renderDiff({ from: text("a\nstop\nc"), to: text("a\nend_turn\nc") });
		const removed = within(pane("Before"))
			.getByText("stop")
			.closest("[data-slot='code-block-diff-line']");
		expect(removed).toHaveAttribute("data-change", "removed");
		expect(removed).toHaveAttribute("data-line-number", "2");
		// Why the tag: `<del>` and `<ins>` carry the change for a reader who does not see the tint.
		expect(within(pane("Before")).getByText("stop").closest("del")).not.toBeNull();
		expect(within(pane("After")).getByText("end_turn").closest("ins")).not.toBeNull();
		expect(removed).toHaveTextContent("Removed: stop");
		const unchanged = within(pane("After"))
			.getByText("a")
			.closest("[data-slot='code-block-diff-line']");
		expect(unchanged).not.toHaveAttribute("data-change");
	});

	test("keeps both panes at the same row count when one side adds a line", () => {
		renderDiff({ from: text("a\nb"), to: text("a\nx\nb") });
		expect(pane("Before").children).toHaveLength(pane("After").children.length);
		expect(pane("Before").querySelector("[data-slot='code-block-diff-filler']")).not.toBeNull();
	});

	test("expands a folded run of unchanged lines", async () => {
		const user = userEvent.setup();
		const lines = Array.from({ length: 12 }, (_, index) => `line ${index}`);
		renderDiff({ from: text(lines.join("\n")), to: text(lines.with(11, "end").join("\n")) });
		expect(screen.queryByText("line 0")).toBeNull();
		await user.click(screen.getByRole("button", { name: "Expand 8 unchanged lines" }));
		expect(within(pane("After")).getByText("line 0")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /Expand/ })).toBeNull();
	});

	test("shows a callout under one side with a spacer in the other, and passes the JSON path", () => {
		const seen: CodeBlockDiffLine[] = [];
		renderDiff({
			from: jsonCodeBlockValue({ a: 1, b: 1 }, { sortKeys: true }),
			to: jsonCodeBlockValue({ b: 2, a: 1 }, { sortKeys: true }),
			children: (line) => {
				seen.push(line);
				return (
					line.change === "added" &&
					line.path?.join(".") === "b" && <CodeBlock.DiffCallout>Clamped.</CodeBlock.DiffCallout>
				);
			},
		});
		expect(within(pane("After")).getByText("Clamped.")).toHaveAttribute(
			"data-slot",
			"code-block-diff-callout",
		);
		expect(pane("Before").querySelector("[data-slot='code-block-diff-spacer']")).not.toBeNull();
		// Sorted keys put `a` on line 2 of both sides, so it is unchanged.
		expect(seen.find((line) => line.side === "from" && line.lineNumber === 2)).toMatchObject({
			change: "unchanged",
			path: ["a"],
		});
	});

	test("shows a callout under a removed line in the left pane, with its path and array index", () => {
		const seen: CodeBlockDiffLine[] = [];
		renderDiff({
			from: jsonCodeBlockValue({ messages: [{ cache: true, role: "user" }] }),
			to: jsonCodeBlockValue({ messages: [{ role: "user" }] }),
			children: (line) => {
				seen.push(line);
				return (
					line.change === "removed" && (
						<CodeBlock.DiffCallout>Removed by the provider.</CodeBlock.DiffCallout>
					)
				);
			},
		});
		expect(within(pane("Before")).getByText("Removed by the provider.")).toBeInTheDocument();
		expect(pane("After").querySelector("[data-slot='code-block-diff-spacer']")).not.toBeNull();
		// Why the exact shape: consumers match a parameter by its keys and drop the numbers.
		expect(seen.find((line) => line.change === "removed")?.path).toEqual(["messages", 0, "cache"]);
	});

	test("keeps an expanded run open when the values get new lines with the same code", async () => {
		const user = userEvent.setup();
		const lines = Array.from({ length: 12 }, (_, index) => `line ${index}`);
		const streamed = (code: string) =>
			createMantleCodeBlockValue({ code, language: "text", lines: code.split("\n") });
		const fromCode = lines.join("\n");
		const toCode = lines.with(11, "end").join("\n");
		const view = render(
			<CodeBlock.Root>
				<CodeBlock.Diff from={streamed(fromCode)} to={streamed(toCode)} />
			</CodeBlock.Root>,
		);
		await user.click(screen.getByRole("button", { name: "Expand 8 unchanged lines" }));
		view.rerender(
			<CodeBlock.Root>
				<CodeBlock.Diff from={streamed(fromCode)} to={streamed(toCode)} />
			</CodeBlock.Root>,
		);
		expect(within(pane("After")).getByText("line 0")).toBeInTheDocument();
	});

	test("copies the to code from a CopyButton in the same body", async () => {
		const user = userEvent.setup();
		render(
			<CodeBlock.Root>
				<CodeBlock.Body>
					<CodeBlock.CopyButton />
					<CodeBlock.Diff from={text("old")} to={text("new")} />
				</CodeBlock.Body>
			</CodeBlock.Root>,
		);
		await user.click(screen.getByRole("button", { name: "Copy code" }));
		expect(await navigator.clipboard.readText()).toBe("new");
	});

	test("shows the interpolated values of a mantleCode() value", () => {
		const interpolated = (url: string) =>
			createMantleCodeBlockValue({
				code: "fetch(SHIKI_VAL_0)",
				language: "typescript",
				preHtml:
					'<span class="mantle-code-line" data-line-number="1"><span class="mantle-code-line-content"><span class="tf">fetch</span>(SHIKI_VAL_0)</span></span>',
				preVals: [url],
			});
		renderDiff({ from: interpolated("https://a.test"), to: interpolated("https://b.test") });
		expect(within(pane("Before")).getByText("a")).toBeInTheDocument();
		expect(pane("After")).toHaveTextContent("fetch(https://b.test)");
		expect(screen.queryByText(/SHIKI_VAL/)).toBeNull();
	});

	test("defaults to left to right in a right-to-left page", () => {
		render(
			<div dir="rtl">
				<CodeBlock.Root>
					<CodeBlock.Diff from={text("a")} to={text("b")} />
				</CodeBlock.Root>
			</div>,
		);
		expect(pane("Before").parentElement).toHaveAttribute("dir", "ltr");
	});

	test("swaps a bare-text callout for an element on a translated page", () => {
		const diff = (callout: ReactNode) => (
			<CodeBlock.Root>
				<CodeBlock.Diff from={text("a")} to={text("b")}>
					{(line) => line.change === "added" && callout}
				</CodeBlock.Diff>
			</CodeBlock.Root>
		);
		const view = render(diff("Clamped."));
		translateTextNodes(view.container);
		view.rerender(diff(<CodeBlock.DiffCallout>Removed.</CodeBlock.DiffCallout>));
		expect(within(pane("After")).getByText("Removed.")).toBeInTheDocument();
		expect(within(pane("After")).getByText("b")).toBeInTheDocument();
	});

	test("keeps a callout mounted when the other side adds a line", async () => {
		const user = userEvent.setup();
		const diff = (to: string) => (
			<CodeBlock.Root>
				<CodeBlock.Diff from={text("same\nlast")} to={text(to)}>
					{(line) =>
						line.side === "from" &&
						line.lineNumber === 2 && (
							<CodeBlock.DiffCallout>
								<input aria-label="Note" />
							</CodeBlock.DiffCallout>
						)
					}
				</CodeBlock.Diff>
			</CodeBlock.Root>
		);
		const view = render(diff("same\nlast"));
		await user.type(screen.getByRole("textbox", { name: "Note" }), "draft");
		view.rerender(diff("new\nsame\nlast"));
		expect(screen.getByRole("textbox", { name: "Note" })).toHaveValue("draft");
	});

	test("keeps a callout's draft with its JSON field when an earlier key is added", async () => {
		const user = userEvent.setup();
		const diff = (to: object) => (
			<CodeBlock.Root>
				<CodeBlock.Diff
					from={jsonCodeBlockValue({})}
					to={jsonCodeBlockValue(to, { sortKeys: true })}
				>
					{(line) =>
						line.side === "to" &&
						line.path?.length === 1 && (
							<CodeBlock.DiffCallout>
								<input aria-label={String(line.path[0])} />
							</CodeBlock.DiffCallout>
						)
					}
				</CodeBlock.Diff>
			</CodeBlock.Root>
		);
		const view = render(diff({ beta: 1, gamma: 2 }));
		await user.type(screen.getByRole("textbox", { name: "gamma" }), "note");
		view.rerender(diff({ alpha: 0, beta: 1, gamma: 2 }));
		expect(screen.getByRole("textbox", { name: "gamma" })).toHaveValue("note");
		expect(screen.getByRole("textbox", { name: "beta" })).toHaveValue("");
	});

	test("lets the keyboard reach a pane that holds a control", async () => {
		const user = userEvent.setup();
		renderDiff({
			from: text("a"),
			to: text("b"),
			children: (line) =>
				line.side === "to" && (
					<CodeBlock.DiffCallout>
						<input aria-label="Note" />
					</CodeBlock.DiffCallout>
				),
		});
		await user.tab();
		expect(pane("Before")).toHaveFocus();
		await user.tab();
		expect(pane("After")).toHaveFocus();
		await user.tab();
		expect(screen.getByRole("textbox", { name: "Note" })).toHaveFocus();
	});

	test("ends a line at a CR or a CRLF", () => {
		const lines: CodeBlockDiffLine[] = [];
		renderDiff({
			from: text("head\rold\r\ntail"),
			to: text("head\nnew\ntail"),
			children: (line) => {
				lines.push(line);
				return null;
			},
		});
		expect(
			lines.filter((line) => line.side === "to").map(({ change, text }) => [change, text]),
		).toEqual([
			["unchanged", "head"],
			["added", "new"],
			["unchanged", "tail"],
		]);
	});

	test("does not count a trailing comma as a change in JSON", () => {
		renderDiff({
			from: jsonCodeBlockValue({ a: 1, b: 2 }),
			to: jsonCodeBlockValue({ a: 1 }),
		});
		const line = within(pane("After")).getByText("1").closest("[data-slot='code-block-diff-line']");
		expect(line).not.toHaveAttribute("data-change");
	});

	test("renders the folds and the marks on the server", () => {
		const html = renderToString(
			<CodeBlock.Root>
				<CodeBlock.Diff from={text("a\nb")} to={text("a\nc")} />
			</CodeBlock.Root>,
		);
		expect(html).toContain('data-change="removed"');
		expect(html).toContain("<ins");
	});

	test("forwards className and data attributes and joins data-slot", () => {
		render(
			<CodeBlock.Root>
				<CodeBlock.Diff
					data-slot="outer"
					data-x="1"
					className="custom"
					from={text("a")}
					to={text("b")}
				/>
			</CodeBlock.Root>,
		);
		const root = pane("Before").parentElement;
		expect(root).toHaveAttribute("data-slot", "outer code-block-diff");
		expect(root).toHaveAttribute("data-x", "1");
		expect(root).toHaveClass("custom");
	});

	test("throws outside CodeBlock.Root", () => {
		expect(() => render(<CodeBlock.Diff from={text("a")} to={text("b")} />)).toThrow(
			/CodeBlock.Root/,
		);
	});
});

describe("CodeBlock.DiffCallout", () => {
	test("merges its props into the child with asChild", () => {
		render(
			<CodeBlock.DiffCallout asChild className="extra" data-x="1">
				<aside>Note</aside>
			</CodeBlock.DiffCallout>,
		);
		const note = screen.getByText("Note");
		expect(note.tagName).toBe("ASIDE");
		expect(note).toHaveAttribute("data-slot", "code-block-diff-callout");
		expect(note).toHaveAttribute("data-x", "1");
		expect(note).toHaveClass("extra");
	});
});
