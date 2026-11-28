import { describe, expect, test } from "vitest";
import { diffWords, getSplitDiff } from "./split-diff.js";

/** The text of each side of each row, with `…N` for a folded run of N lines. */
function shape(rows: ReturnType<typeof getSplitDiff>) {
	return rows.map((row) => {
		if (row.kind === "hidden") {
			return `…${row.lines.length}`;
		}
		const text = (side: typeof row.line.left) =>
			side == null ? null : side.segments.map((segment) => segment.text).join("");
		return [row.line.kind, text(row.line.left), text(row.line.right)];
	});
}

describe("getSplitDiff", () => {
	test("pairs a changed line and marks only the changed word", () => {
		const rows = getSplitDiff({ left: "a\nstop: 1\nc", right: "a\nstop: 2\nc" });
		const changed = rows[1];
		expect(changed?.kind === "line" && changed.line.left?.segments).toEqual([
			{ text: "stop: ", changed: false, start: 0 },
			{ text: "1", changed: true, start: 6 },
		]);
		expect(changed?.kind === "line" && changed.line.right?.segments.at(-1)).toEqual({
			text: "2",
			changed: true,
			start: 6,
		});
	});

	test("shows no removed line for empty text", () => {
		expect(shape(getSplitDiff({ left: "", right: "hello" }))).toEqual([["changed", null, "hello"]]);
	});

	test("leaves a filler side for a line only one side has", () => {
		expect(shape(getSplitDiff({ left: "a\nb", right: "a\nx\nb" }))).toEqual([
			["context", "a", "a"],
			["changed", null, "x"],
			["context", "b", "b"],
		]);
	});

	test("keeps three lines beside a change and folds the rest of each run", () => {
		const left = Array.from({ length: 20 }, (_, index) => `line ${index}`);
		const right = left.with(10, "changed");
		const rows = shape(getSplitDiff({ left: left.join("\n"), right: right.join("\n") }));
		// 10 lines before the change: 7 fold, 3 stay. 9 after: 3 stay, 6 fold.
		expect(rows[0]).toBe("…7");
		expect(rows.at(-1)).toBe("…6");
		expect(rows).toHaveLength(1 + 3 + 1 + 3 + 1);
	});

	test("does not fold a run of only two hidden lines", () => {
		const left = Array.from({ length: 6 }, (_, index) => `line ${index}`);
		const right = left.with(5, "changed");
		// Five unchanged lines before the change: three stay, so two would fold.
		expect(shape(getSplitDiff({ left: left.join("\n"), right: right.join("\n") }))).not.toContain(
			"…2",
		);
	});

	test("counts lines equal after normalize as unchanged, and shows each side's own text", () => {
		const rows = getSplitDiff({
			left: '  "a": 1,',
			right: '  "a": 1',
			normalize: (line) => line.replace(/,$/, ""),
		});
		expect(shape(rows)).toEqual([["context", '  "a": 1,', '  "a": 1']]);
	});

	test("past the edit limit, shows the middle as removed then added with no word marks", () => {
		const left = Array.from({ length: 1200 }, (_, index) => `l${index}`).join("\n");
		const right = Array.from({ length: 1200 }, (_, index) => `r${index}`).join("\n");
		const rows = getSplitDiff({ left, right });
		const first = rows[0];
		expect(first?.kind === "line" && first.line.kind).toBe("changed");
		expect(first?.kind === "line" && first.line.left?.segments).toEqual([
			{ text: "l0", changed: false, start: 0 },
		]);
		// Why its own row for each line: the two sides are unrelated, so no removed line sits beside an added one.
		expect(rows).toHaveLength(2400);
		expect(first?.kind === "line" && first.line.right).toBeNull();
		const firstAdded = rows[1200];
		expect(firstAdded?.kind === "line" && firstAdded.line.left).toBeNull();
		expect(firstAdded?.kind === "line" && firstAdded.line.right?.lineNumber).toBe(1);
	});
});

describe("diffWords", () => {
	test("keeps a flag in one token", () => {
		expect(diffWords("🇺🇸", "🇺🇦").left).toEqual([{ text: "🇺🇸", changed: true, start: 0 }]);
	});

	test("keeps a text-presentation selector with its character", () => {
		expect(diffWords("☀\uFE0E", "☀").left).toEqual([{ text: "☀\uFE0E", changed: true, start: 0 }]);
	});

	test("keeps an emoji in one token", () => {
		expect(diffWords("a 😀", "a 😁").left).toEqual([
			{ text: "a ", changed: false, start: 0 },
			{ text: "😀", changed: true, start: 2 },
		]);
	});

	test("marks each whole line past the word-edit limit", () => {
		const left = Array.from({ length: 300 }, (_, index) => `a${index}`).join(" ");
		const right = Array.from({ length: 300 }, (_, index) => `b${index}`).join(" ");
		expect(diffWords(left, right).left).toEqual([{ text: left, changed: true, start: 0 }]);
	});
});
