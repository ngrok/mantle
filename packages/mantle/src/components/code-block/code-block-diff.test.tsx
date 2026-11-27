import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
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
