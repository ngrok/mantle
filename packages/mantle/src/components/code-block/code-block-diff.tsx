"use client";

import type { ComponentProps, ReactNode } from "react";
import { Fragment, useMemo, useState } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Slot } from "../slot/index.js";
import { TokenView, useCodeBlockContext } from "./code-block.js";
import { jsonLinePaths } from "./json-line-paths.js";
import type { CodeLine, CodeToken } from "./line-tokenizer.js";
import type { MantleCodeBlockValue } from "./mantle-code.js";
import { readCodeLines } from "./read-code-lines.js";
import type { DiffSegment, DiffSide, SplitDiffRow } from "./split-diff.js";
import { getSplitDiff } from "./split-diff.js";

/**
 * One line of one side of a `CodeBlock.Diff`, as its function child reads it.
 */
type CodeBlockDiffLine = {
	/** The value the line comes from: `"from"` on the left, `"to"` on the right. */
	side: "from" | "to";
	/** The 1-based number of the line in its value's code. */
	lineNumber: number;
	/** `"removed"` for a changed line of `from`, `"added"` for a changed line of `to`, else `"unchanged"`. */
	change: "unchanged" | "removed" | "added";
	/** The text of the line. */
	text: string;
	/**
	 * The path of the JSON value on the line, such as `["messages", 0, "role"]`,
	 * when the value's language is `json`. `undefined` for a line that only
	 * closes an object or an array, and for every other language.
	 */
	path: readonly (string | number)[] | undefined;
};

/** A line longer than this always wraps: a browser can paint nothing for a `max-content` box this wide. */
const MAX_UNWRAPPED_LINE_LENGTH = 100_000;

/** JSON puts a comma after each member but the last, so a comma alone never makes two lines differ. */
function withoutTrailingComma(line: string): string {
	return line.replace(/,\s*$/, "");
}

/** The change of one side of a line: a changed line is removed from `from` and added to `to`. */
function changeOf(kind: "context" | "changed", side: "from" | "to"): CodeBlockDiffLine["change"] {
	if (kind === "context") {
		return "unchanged";
	}
	return side === "from" ? "removed" : "added";
}

/** The highlighted lines and the JSON paths of one side. */
function readSide(value: Pick<MantleCodeBlockValue, "code" | "language" | "~preHtml" | "~lines">) {
	return {
		lines: readCodeLines(value),
		paths: value.language === "json" ? jsonLinePaths(value.code) : undefined,
	};
}

/**
 * Splits the tokens of a line at the edges of its diff segments, so each
 * segment renders its own tokens with their colors.
 */
function tokensBySegment(
	line: CodeLine | string,
	segments: readonly DiffSegment[],
): { segment: DiffSegment; tokens: CodeToken[] }[] {
	const tokens: readonly CodeToken[] = typeof line === "string" ? [{ content: line }] : line;
	const result = segments.map((segment) => ({ segment, tokens: [] as CodeToken[] }));
	let offset = 0;
	let segmentIndex = 0;
	for (const token of tokens) {
		let start = 0;
		while (start < token.content.length && segmentIndex < result.length) {
			const entry = result[segmentIndex];
			if (entry == null) {
				break;
			}
			const segmentEnd = entry.segment.start + entry.segment.text.length;
			const end = Math.min(token.content.length, segmentEnd - offset);
			if (end > start) {
				entry.tokens.push({ ...token, content: token.content.slice(start, end) });
			}
			if (offset + end >= segmentEnd) {
				segmentIndex += 1;
			}
			start = end;
		}
		offset += token.content.length;
	}
	return result;
}

/** One side of one line: its number, its change, and its text with the changed words marked. */
function DiffLine({
	change,
	line,
	side,
	wrap,
}: {
	change: "unchanged" | "removed" | "added";
	line: CodeLine | string;
	side: DiffSide;
	wrap: boolean;
}) {
	const Mark = change === "added" ? "ins" : "del";
	return (
		<div
			data-slot="code-block-diff-line"
			data-line-number={side.lineNumber}
			data-change={change === "unchanged" ? undefined : change}
			className={cx(
				"flex min-w-full pr-4",
				change === "removed" && "bg-danger-500/10",
				change === "added" && "bg-success-500/10",
			)}
		>
			{/* Why an attribute and `::before`: the number and the sign stay out of the text that a reader copies or hears. */}
			<span
				aria-hidden="true"
				className={cx(
					"sticky left-0 z-1 flex w-14 shrink-0 select-none justify-between bg-base pr-2 pl-2 text-right text-muted",
					"before:flex-1 before:pr-2 before:content-[attr(data-line-number)]",
					change === "removed" &&
						"bg-[color-mix(in_oklab,var(--color-danger-500)_10%,var(--background-color-base))] after:text-danger-600 after:content-['−']",
					change === "added" &&
						"bg-[color-mix(in_oklab,var(--color-success-500)_10%,var(--background-color-base))] after:text-success-600 after:content-['+']",
				)}
				data-line-number={side.lineNumber}
			/>
			{change !== "unchanged" && (
				<span className="sr-only" translate="yes">
					{change === "added" ? "Added: " : "Removed: "}
				</span>
			)}
			<span
				className={cx(
					"min-w-0 flex-1",
					wrap ? "whitespace-pre-wrap wrap-anywhere" : "whitespace-pre",
				)}
				translate="no"
			>
				{/* Why a space: an empty line keeps its height, as in `CodeBlock.Code`. */}
				{side.segments.every((segment) => segment.text === "")
					? " "
					: tokensBySegment(line, side.segments).map(({ segment, tokens }) => {
							const content = tokens.map((token, index) => (
								// oxlint-disable-next-line react/no-array-index-key -- Why: a token has no identity but its position in a segment that renders as a whole.
								<TokenView key={index} token={token} />
							));
							return segment.changed && change !== "unchanged" ? (
								<Mark
									key={segment.start}
									className={cx(
										"rounded-xs text-current",
										change === "added"
											? "bg-success-500/25 underline decoration-success-600"
											: "bg-danger-500/25 line-through decoration-danger-600",
									)}
								>
									{content}
								</Mark>
							) : (
								<span key={segment.start}>{content}</span>
							);
						})}
			</span>
		</div>
	);
}

type CodeBlockDiffProps = Omit<ComponentProps<"div">, "children"> &
	WithDataSlot & {
		/** The code before the change, on the left. */
		from: MantleCodeBlockValue;
		/** The code after the change, on the right. */
		to: MantleCodeBlockValue;
		/**
		 * The accessible name of the left pane.
		 *
		 * @default "Before"
		 */
		fromLabel?: string;
		/**
		 * The accessible name of the right pane.
		 *
		 * @default "After"
		 */
		toLabel?: string;
		/**
		 * Whether long lines wrap in their pane. When `false`, each pane scrolls
		 * sideways on its own. A line over 100,000 characters always wraps.
		 *
		 * @default false
		 */
		wrapLines?: boolean;
		/**
		 * Returns the callout to show under one side of a line, or nothing. It
		 * runs for each side of each line that shows. Return a
		 * `CodeBlock.DiffCallout`.
		 */
		children?: (line: CodeBlockDiffLine) => ReactNode;
	};

/**
 * Two versions of code side by side, in the style of a code review. Lines that
 * changed get a tint, a `+` or `−` sign, and their changed words marked with
 * `<ins>` and `<del>`. Each run of unchanged lines keeps three lines beside
 * each change, and the rest folds behind a button that expands it.
 *
 * It highlights each side with the value's own highlighting: `mantleCode()`,
 * `jsonCodeBlockValue()`, the server highlighter, or `useCodeBlockStream()`.
 * When both values are `json`, a trailing comma alone does not count as a
 * change. Pass `jsonCodeBlockValue(value, { sortKeys: true })` for each side,
 * so the same key sits on the same line.
 *
 * Pass a function child to show a `CodeBlock.DiffCallout` under a line. The
 * other pane keeps a blank row of the same height, so the lines stay aligned.
 *
 * Why no `asChild`: the part renders its own panes, so there is no single child to clone.
 *
 * Over 1,000 changed lines, the lines between the common start and end show
 * as removed and added, with no word marks.
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-side` | `"from"` \| `"to"` | On each `code-block-diff-pane`. The value the pane shows. |
 * | `data-line-number` | a number | On each `code-block-diff-line`. The line number that its gutter shows. |
 * | `data-change` | `"removed"` \| `"added"` | On a `code-block-diff-line` that changed. Omitted on an unchanged line. |
 * | `data-slot` | `"code-block-diff-filler"` | The blank row in place of a line that the other side added or removed. |
 * | `data-slot` | `"code-block-diff-expand"` | The button that shows a folded run of unchanged lines, in the left pane. |
 * | `data-slot` | `"code-block-diff-expand-row"` | The row of the expand button, in each pane. |
 * | `data-slot` | `"code-block-diff-spacer"` | The blank row in one pane beside a callout in the other. |
 *
 * @see https://mantle.ngrok.com/components/data-display/code-block#codeblockdiff
 *
 * @example
 * ```tsx
 * <CodeBlock.Root>
 *   <CodeBlock.Header>
 *     <CodeBlock.Icon preset="file" />
 *     <CodeBlock.Title>request.json</CodeBlock.Title>
 *   </CodeBlock.Header>
 *   <CodeBlock.Diff
 *     from={jsonCodeBlockValue(clientBody, { sortKeys: true })}
 *     to={jsonCodeBlockValue(upstreamBody, { sortKeys: true })}
 *   >
 *     {(line) =>
 *       line.change === "added" && line.path?.join(".") === "max_tokens" && (
 *         <CodeBlock.DiffCallout>The gateway set a default.</CodeBlock.DiffCallout>
 *       )
 *     }
 *   </CodeBlock.Diff>
 * </CodeBlock.Root>
 * ```
 */
const Diff = ({
	"data-slot": dataSlot,
	children,
	className,
	from,
	fromLabel = "Before",
	to,
	toLabel = "After",
	wrapLines = false,
	...props
}: CodeBlockDiffProps) => {
	useCodeBlockContext();
	// Why the fields and not the values: a caller that builds a value in each render must not reset the folds.
	const fromCode = from.code;
	const toCode = to.code;
	const fromHtml = from["~preHtml"];
	const toHtml = to["~preHtml"];
	const fromLines = from["~lines"];
	const toLines = to["~lines"];
	const fromLanguage = from.language;
	const toLanguage = to.language;
	const isJson = fromLanguage === "json" && toLanguage === "json";
	const { rows, sides, mustWrap } = useMemo(
		() => ({
			rows: getSplitDiff({
				left: fromCode,
				right: toCode,
				normalize: isJson ? withoutTrailingComma : undefined,
			}),
			sides: {
				from: readSide({
					code: fromCode,
					language: fromLanguage,
					"~preHtml": fromHtml,
					"~lines": fromLines,
				}),
				to: readSide({ code: toCode, language: toLanguage, "~preHtml": toHtml, "~lines": toLines }),
			},
			mustWrap: [fromCode, toCode].some((code) =>
				code.split("\n").some((line) => line.length > MAX_UNWRAPPED_LINE_LENGTH),
			),
		}),
		[fromCode, fromHtml, fromLanguage, fromLines, isJson, toCode, toHtml, toLanguage, toLines],
	);
	const [expanded, setExpanded] = useState<{ rows: SplitDiffRow[]; runs: ReadonlySet<number> }>({
		rows,
		runs: new Set(),
	});
	// Why: new code gets new folds, so an expanded run of the old code does not expand a run of the new.
	const expandedRuns = expanded.rows === rows ? expanded.runs : new Set<number>();
	const wrap = wrapLines || mustWrap;

	const fromCells: ReactNode[] = [];
	const toCells: ReactNode[] = [];
	const addLineCells = (line: {
		kind: "context" | "changed";
		left: DiffSide | null;
		right: DiffSide | null;
	}) => {
		const key = `${line.left?.lineNumber ?? "-"}:${line.right?.lineNumber ?? "-"}`;
		const callouts = (["from", "to"] as const).map((sideName) => {
			const side = sideName === "from" ? line.left : line.right;
			if (side == null || children == null) {
				return undefined;
			}
			const callout = children({
				side: sideName,
				lineNumber: side.lineNumber,
				change: changeOf(line.kind, sideName),
				text: side.segments.map((segment) => segment.text).join(""),
				path: sides[sideName].paths?.[side.lineNumber - 1],
			});
			return callout == null || callout === false ? undefined : callout;
		});
		for (const [index, sideName] of (["from", "to"] as const).entries()) {
			const side = sideName === "from" ? line.left : line.right;
			const cells = sideName === "from" ? fromCells : toCells;
			cells.push(
				side == null ? (
					<div
						key={key}
						aria-hidden="true"
						data-slot="code-block-diff-filler"
						className="bg-neutral-500/10"
					/>
				) : (
					<DiffLine
						key={key}
						change={changeOf(line.kind, sideName)}
						line={sides[sideName].lines[side.lineNumber - 1] ?? ""}
						side={side}
						wrap={wrap}
					/>
				),
			);
			if (callouts[0] != null || callouts[1] != null) {
				// Why a keyed `Fragment`: the callout comes from the consumer, who cannot know its place in the pane.
				cells.push(
					<Fragment key={`${key}:callout`}>
						{callouts[index] ?? <div aria-hidden="true" data-slot="code-block-diff-spacer" />}
					</Fragment>,
				);
			}
		}
	};

	for (const row of rows) {
		if (row.kind === "line") {
			addLineCells(row.line);
			continue;
		}
		const runKey = row.lines[0]?.left?.lineNumber ?? 0;
		if (expandedRuns.has(runKey)) {
			for (const line of row.lines) {
				addLineCells(line);
			}
			continue;
		}
		const rowClassName = "bg-info-500/5 font-sans text-xs";
		fromCells.push(
			<div key={`run:${runKey}`} data-slot="code-block-diff-expand-row" className={rowClassName}>
				<button
					type="button"
					data-slot="code-block-diff-expand"
					className={cx(
						"sticky left-0 inline-flex h-7 items-center gap-1.5 px-3 text-muted hover:text-strong",
						"focus-visible:focus-ring focus-visible:ring-inset",
					)}
					onClick={() => {
						setExpanded({ rows, runs: new Set([...expandedRuns, runKey]) });
					}}
				>
					{`Expand ${row.lines.length} unchanged lines`}
				</button>
			</div>,
		);
		toCells.push(
			<div
				key={`run:${runKey}`}
				aria-hidden="true"
				data-slot="code-block-diff-expand-row"
				className={rowClassName}
			/>,
		);
	}

	const rowCount = fromCells.length;
	const paneClassName = cx(
		// Why no container query on the pane: its layout containment turns `subgrid` into `none`, and the panes lose their shared rows.
		"grid grid-rows-subgrid overflow-x-auto overscroll-x-none scrollbar",
		wrap ? "whitespace-pre-wrap" : "whitespace-pre",
	);
	return (
		<div
			data-slot={joinDataSlot(dataSlot, "code-block-diff")}
			className={cx("@container grid grid-cols-2 text-mono", className)}
			{...props}
		>
			<div
				role="group"
				aria-label={fromLabel}
				data-slot="code-block-diff-pane"
				data-side="from"
				className={paneClassName}
				style={{ gridRow: `span ${rowCount}` }}
			>
				{fromCells}
			</div>
			<div
				role="group"
				aria-label={toLabel}
				data-slot="code-block-diff-pane"
				data-side="to"
				className={cx(paneClassName, "border-l border-gray-300")}
				style={{ gridRow: `span ${rowCount}` }}
			>
				{toCells}
			</div>
		</div>
	);
};

/**
 * A note under one side of a line of a `CodeBlock.Diff`, such as why a value
 * changed. Its width is half of the `CodeBlock.Diff`, the width of one pane. Return it from the function child of `CodeBlock.Diff`. It stays in
 * view as its pane scrolls sideways, and it wraps at the width of its pane.
 *
 * It takes `translate="yes"`, because it holds prose inside code that a
 * translation engine skips. Pass `translate="no"` when it holds code.
 *
 * @see https://mantle.ngrok.com/components/data-display/code-block#codeblockdiffcallout
 *
 * @example
 * ```tsx
 * <CodeBlock.Root>
 *   <CodeBlock.Header>
 *     <CodeBlock.Icon preset="file" />
 *     <CodeBlock.Title>request.json</CodeBlock.Title>
 *   </CodeBlock.Header>
 *   <CodeBlock.Diff
 *     from={jsonCodeBlockValue(clientBody, { sortKeys: true })}
 *     to={jsonCodeBlockValue(upstreamBody, { sortKeys: true })}
 *   >
 *     {(line) =>
 *       line.change === "added" && line.path?.join(".") === "max_tokens" && (
 *         <CodeBlock.DiffCallout>The gateway set a default.</CodeBlock.DiffCallout>
 *       )
 *     }
 *   </CodeBlock.Diff>
 * </CodeBlock.Root>
 * ```
 */
const DiffCallout = ({
	"data-slot": dataSlot,
	asChild = false,
	className,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Component = asChild ? Slot : "div";
	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "code-block-diff-callout")}
			translate="yes"
			className={cx(
				"sticky left-0 w-[calc(50cqi-1px)] border-y border-warning-500/30 bg-warning-500/10 px-3 py-1.5 font-sans text-xs whitespace-normal text-strong",
				className,
			)}
			{...props}
		/>
	);
};

export {
	//,
	Diff,
	DiffCallout,
};

export type {
	//,
	CodeBlockDiffLine,
};
