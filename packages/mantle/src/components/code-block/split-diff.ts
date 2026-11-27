/** One run of a sequence diff. */
type DiffOp = { kind: "equal" | "removed" | "added"; text: string };

/**
 * A run of text on one side of a diff line. `changed` marks the words that
 * differ from the paired line, and `start` is the offset of the run in the line.
 */
type DiffSegment = { text: string; changed: boolean; start: number };

/** One side of a split diff line: its 1-based line number and its text in segments. */
type DiffSide = { lineNumber: number; segments: DiffSegment[] };

/**
 * One row of a split diff. A context line has the same text on both sides. A
 * changed line has a removed left side, an added right side, or both, and a
 * missing side is `null`.
 */
type SplitDiffLine = {
	kind: "context" | "changed";
	left: DiffSide | null;
	right: DiffSide | null;
};

/** A line that shows, or a run of unchanged lines that folds until the reader expands it. */
type SplitDiffRow =
	| { kind: "line"; line: SplitDiffLine }
	| { kind: "hidden"; lines: SplitDiffLine[] };

/**
 * The most line edits the diff computes. Past it, the texts share too little
 * for a line diff to help, and the memory of the trace grows with its square.
 */
const MAX_LINE_EDITS = 1000;
/** The most word edits inside one changed line. Past it, the whole line shows as changed. */
const MAX_WORD_EDITS = 200;
/** A folded run hides more lines than this, so an expand row never stands in for one or two lines. */
const MIN_HIDDEN_LINES = 2;
/** The unchanged lines that stay in view on each side of a change. */
const CONTEXT_LINES = 3;

function equalOp(text: string): DiffOp {
	return { kind: "equal", text };
}

/**
 * Myers' diff of two sequences with the common prefix and suffix trimmed first.
 * Past `maxEdits`, the middle is all removed, then all added, and `exact` is `false`.
 *
 * @example
 * diffSequences({ left: ["a", "b"], right: ["a", "c"], maxEdits: 10 }).ops;
 * // [{ kind: "equal", text: "a" }, { kind: "removed", text: "b" }, { kind: "added", text: "c" }]
 */
function diffSequences({
	left,
	right,
	maxEdits,
}: {
	left: readonly string[];
	right: readonly string[];
	maxEdits: number;
}): { ops: DiffOp[]; exact: boolean } {
	let start = 0;
	while (start < left.length && start < right.length && left[start] === right[start]) {
		start += 1;
	}
	let leftEnd = left.length;
	let rightEnd = right.length;
	while (leftEnd > start && rightEnd > start && left[leftEnd - 1] === right[rightEnd - 1]) {
		leftEnd -= 1;
		rightEnd -= 1;
	}
	const leftMiddle = left.slice(start, leftEnd);
	const rightMiddle = right.slice(start, rightEnd);
	const middle = myers(leftMiddle, rightMiddle, maxEdits);
	return {
		ops: [
			...left.slice(0, start).map(equalOp),
			...(middle ?? [
				...leftMiddle.map((text): DiffOp => ({ kind: "removed", text })),
				...rightMiddle.map((text): DiffOp => ({ kind: "added", text })),
			]),
			...left.slice(leftEnd).map(equalOp),
		],
		exact: middle != null,
	};
}

/**
 * The shortest edit script of two sequences, or `null` past `maxEdits`. The
 * trace keeps only the diagonals each step reaches, so memory grows with the
 * square of the edit count, not of the input.
 */
function myers(
	left: readonly string[],
	right: readonly string[],
	maxEdits: number,
): DiffOp[] | null {
	const leftLength = left.length;
	const rightLength = right.length;
	if (leftLength === 0 || rightLength === 0) {
		if (leftLength + rightLength > maxEdits) {
			return null;
		}
		return [
			...left.map((text): DiffOp => ({ kind: "removed", text })),
			...right.map((text): DiffOp => ({ kind: "added", text })),
		];
	}
	const limit = Math.min(leftLength + rightLength, maxEdits);
	// `furthest[offset + k]` is the furthest left index on diagonal k. Each trace entry holds diagonals -d-1 to d+1.
	const offset = limit + 1;
	const furthest = new Int32Array(2 * limit + 3);
	const trace: Int32Array[] = [];
	for (let edits = 0; edits <= limit; edits += 1) {
		trace.push(furthest.slice(offset - edits - 1, offset + edits + 2));
		for (let diagonal = -edits; diagonal <= edits; diagonal += 2) {
			const fromAbove =
				diagonal === -edits ||
				(diagonal !== edits &&
					(furthest[offset + diagonal - 1] ?? 0) < (furthest[offset + diagonal + 1] ?? 0));
			let leftIndex = fromAbove
				? (furthest[offset + diagonal + 1] ?? 0)
				: (furthest[offset + diagonal - 1] ?? 0) + 1;
			let rightIndex = leftIndex - diagonal;
			while (
				leftIndex < leftLength &&
				rightIndex < rightLength &&
				left[leftIndex] === right[rightIndex]
			) {
				leftIndex += 1;
				rightIndex += 1;
			}
			furthest[offset + diagonal] = leftIndex;
			if (leftIndex >= leftLength && rightIndex >= rightLength) {
				return backtrack({ left, right, trace });
			}
		}
	}
	return null;
}

/** Walks the trace of `myers` back from the end and returns the runs in order. */
function backtrack({
	left,
	right,
	trace,
}: {
	left: readonly string[];
	right: readonly string[];
	trace: Int32Array[];
}): DiffOp[] {
	const ops: DiffOp[] = [];
	let leftIndex = left.length;
	let rightIndex = right.length;
	for (let edits = trace.length - 1; edits >= 0; edits -= 1) {
		const step = trace[edits] ?? new Int32Array(0);
		const at = (diagonal: number) => step[diagonal + edits + 1] ?? 0;
		const diagonal = leftIndex - rightIndex;
		const previousDiagonal =
			diagonal === -edits || (diagonal !== edits && at(diagonal - 1) < at(diagonal + 1))
				? diagonal + 1
				: diagonal - 1;
		const previousLeft = at(previousDiagonal);
		const previousRight = previousLeft - previousDiagonal;
		while (leftIndex > previousLeft && rightIndex > previousRight) {
			leftIndex -= 1;
			rightIndex -= 1;
			ops.push(equalOp(left[leftIndex] ?? ""));
		}
		if (edits > 0) {
			ops.push(
				leftIndex === previousLeft
					? { kind: "added", text: right[previousRight] ?? "" }
					: { kind: "removed", text: left[previousLeft] ?? "" },
			);
		}
		leftIndex = previousLeft;
		rightIndex = previousRight;
	}
	return ops.toReversed();
}

/** Splits a line into words, whitespace runs, and single punctuation marks. */
function tokenizeWords(line: string): string[] {
	// Why `u`: a character outside the Basic Multilingual Plane, such as an emoji, stays one token.
	return line.match(/\s+|\w+|[^\w\s]/gu) ?? [];
}

/** Joins neighbor runs with the same mark and gives each run its offset in the line. */
function toSegments(parts: { text: string; changed: boolean }[]): DiffSegment[] {
	const segments: DiffSegment[] = [];
	let start = 0;
	for (const part of parts) {
		const last = segments.at(-1);
		if (last?.changed === part.changed) {
			last.text += part.text;
		} else {
			segments.push({ ...part, start });
		}
		start += part.text.length;
	}
	return segments;
}

/** One segment that holds the whole line, with no word marked. */
function plainSegments(text: string): DiffSegment[] {
	return toSegments([{ text, changed: false }]);
}

/**
 * Marks the words that differ between two paired lines. Whitespace runs and
 * punctuation count as words. Past 200 word edits, each whole line is marked.
 *
 * @example
 * diffWords("stop", "end_turn").left; // [{ text: "stop", changed: true, start: 0 }]
 */
function diffWords(left: string, right: string): { left: DiffSegment[]; right: DiffSegment[] } {
	const { ops, exact } = diffSequences({
		left: tokenizeWords(left),
		right: tokenizeWords(right),
		maxEdits: MAX_WORD_EDITS,
	});
	if (!exact) {
		return {
			left: toSegments([{ text: left, changed: true }]),
			right: toSegments([{ text: right, changed: true }]),
		};
	}
	return {
		left: toSegments(
			ops.flatMap((op) =>
				op.kind === "added" ? [] : [{ text: op.text, changed: op.kind === "removed" }],
			),
		),
		right: toSegments(
			ops.flatMap((op) =>
				op.kind === "removed" ? [] : [{ text: op.text, changed: op.kind === "added" }],
			),
		),
	};
}

/**
 * Pairs each change block line by line, removed on the left and added on the
 * right. The ops compare normalized lines, so each side takes its own text from
 * `leftLines` and `rightLines`. `markWords` is `false` for a diff past the edit
 * limit, whose paired lines are unrelated.
 */
function toSplitLines({
	leftLines,
	markWords,
	ops,
	rightLines,
}: {
	leftLines: readonly string[];
	markWords: boolean;
	ops: DiffOp[];
	rightLines: readonly string[];
}): SplitDiffLine[] {
	const lines: SplitDiffLine[] = [];
	let leftIndex = 0;
	let rightIndex = 0;
	let index = 0;
	while (index < ops.length) {
		if (ops[index]?.kind === "equal") {
			lines.push({
				kind: "context",
				left: { lineNumber: leftIndex + 1, segments: plainSegments(leftLines[leftIndex] ?? "") },
				right: {
					lineNumber: rightIndex + 1,
					segments: plainSegments(rightLines[rightIndex] ?? ""),
				},
			});
			leftIndex += 1;
			rightIndex += 1;
			index += 1;
			continue;
		}
		const removed: number[] = [];
		const added: number[] = [];
		while (index < ops.length && ops[index]?.kind !== "equal") {
			if (ops[index]?.kind === "removed") {
				removed.push(leftIndex);
				leftIndex += 1;
			} else {
				added.push(rightIndex);
				rightIndex += 1;
			}
			index += 1;
		}
		for (let pair = 0; pair < Math.max(removed.length, added.length); pair += 1) {
			const leftAt = removed[pair];
			const rightAt = added[pair];
			const leftText = leftAt == null ? undefined : (leftLines[leftAt] ?? "");
			const rightText = rightAt == null ? undefined : (rightLines[rightAt] ?? "");
			const words =
				markWords && leftText != null && rightText != null
					? diffWords(leftText, rightText)
					: undefined;
			lines.push({
				kind: "changed",
				left:
					leftAt == null || leftText == null
						? null
						: { lineNumber: leftAt + 1, segments: words?.left ?? plainSegments(leftText) },
				right:
					rightAt == null || rightText == null
						? null
						: { lineNumber: rightAt + 1, segments: words?.right ?? plainSegments(rightText) },
			});
		}
	}
	return lines;
}

/** Keeps three unchanged lines beside each change and folds the rest of each unchanged run. */
function foldContext(lines: SplitDiffLine[]): SplitDiffRow[] {
	const rows: SplitDiffRow[] = [];
	const toRow = (line: SplitDiffLine): SplitDiffRow => ({ kind: "line", line });
	let runStart = 0;
	for (let index = 0; index <= lines.length; index += 1) {
		const line = lines[index];
		if (line?.kind === "context") {
			continue;
		}
		// `lines[runStart, index)` is an unchanged run, bounded by changes or by the ends.
		const run = lines.slice(runStart, index);
		const keepBefore = runStart === 0 ? 0 : CONTEXT_LINES;
		const keepAfter = index === lines.length ? 0 : CONTEXT_LINES;
		const hiddenCount = run.length - keepBefore - keepAfter;
		if (hiddenCount > MIN_HIDDEN_LINES) {
			rows.push(...run.slice(0, keepBefore).map(toRow));
			rows.push({ kind: "hidden", lines: run.slice(keepBefore, keepBefore + hiddenCount) });
			rows.push(...run.slice(keepBefore + hiddenCount).map(toRow));
		} else {
			rows.push(...run.map(toRow));
		}
		if (line != null) {
			rows.push(toRow(line));
		}
		runStart = index + 1;
	}
	return rows;
}

/**
 * Builds a split, line-aligned diff of two texts with word marks on changed
 * lines. Each unchanged run keeps three lines beside each change and folds the
 * rest into a hidden row. Two lines count as unchanged when their `normalize`
 * results match, and each side still shows its own text.
 *
 * Past 1,000 line edits, the lines between the common start and end show as
 * removed and added, with no word marks.
 *
 * @example
 * const rows = getSplitDiff({ left: '{\n  "max_output_tokens": 256\n}', right: '{\n  "max_tokens": 256\n}' });
 * rows[1]; // { kind: "line", line: { kind: "changed", left: …, right: … } }
 */
function getSplitDiff({
	left,
	right,
	normalize = (line) => line,
}: {
	left: string;
	right: string;
	normalize?: ((line: string) => string) | undefined;
}): SplitDiffRow[] {
	const leftLines = left.split("\n");
	const rightLines = right.split("\n");
	const { ops, exact } = diffSequences({
		left: leftLines.map(normalize),
		right: rightLines.map(normalize),
		maxEdits: MAX_LINE_EDITS,
	});
	return foldContext(toSplitLines({ leftLines, markWords: exact, ops, rightLines }));
}

export {
	//,
	diffWords,
	getSplitDiff,
};

export type {
	//,
	DiffSegment,
	DiffSide,
	SplitDiffLine,
	SplitDiffRow,
};
