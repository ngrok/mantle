/**
 * A compact cross-table for the write-up: one row per (case, animation) with the
 * handful of columns that decide the comparison. Medians over runs.
 * Run: `pnpm exec tsx bench/summary.ts bench/results/list.jsonl [more.jsonl]`.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

type Row = Record<string, unknown> & {
	animate: boolean;
	kind: string;
	mode: string;
	n: number;
	points: number;
	throttle: number;
	twin?: boolean;
	gate?: string;
	/** Absent in a results file from before the runner recorded it; those ran at 2. */
	dpr?: number;
	ok: boolean;
};

const APP_ROOT = path.resolve(import.meta.dirname, "..");
const files = process.argv.slice(2).filter((argument) => !argument.startsWith("--"));

const isRow = (value: unknown): value is Row =>
	typeof value === "object" &&
	value != null &&
	"animate" in value &&
	"kind" in value &&
	!("meta" in value);

const rows: Row[] = [];
for (const file of files) {
	for (const line of (await readFile(path.resolve(APP_ROOT, file), "utf8")).split("\n")) {
		if (line.trim() === "") {
			continue;
		}
		const parsed: unknown = JSON.parse(line);
		if (isRow(parsed) && parsed.ok) {
			rows.push(parsed);
		}
	}
}

const get = (row: Row, dotted: string): number | undefined => {
	let value: unknown = row;
	for (const key of dotted.split(".")) {
		if (value == null || typeof value !== "object") {
			return undefined;
		}
		value = (value as Record<string, unknown>)[key];
	}
	return typeof value === "number" ? value : undefined;
};

const median = (values: number[]): number | undefined => {
	if (values.length === 0) {
		return undefined;
	}
	const sorted = values.toSorted((left, right) => left - right);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 1
		? sorted[middle]
		: ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
};

const COLUMNS = [
	["mount", "timing.mountMs"],
	["main", "startup.taskMs"],
	["style", "startup.styleMs"],
	["TBT", "startup.tbtMs"],
	["worst frame", "startup.frames.maxMs"],
	["replace", "updateReplace.taskMs"],
	["shift×5", "updateShift.taskMs"],
	["hover", "hover.taskMs"],
	["hover worst", "hover.frames.maxMs"],
	["heap MB", "memory.jsHeapMB"],
	["canvas MB", "memory.uaByTypeMB.Canvas"],
	["DOM", "memory.domNodes"],
] as const;

const ANIMATE_ORDER = [
	{ animate: true, label: "animated" },
	{ animate: false, label: "static" },
] as const;
// Why every input: a gate or a pixel ratio changes the measured scenario, so it never shares a median.
const caseKey = (row: Row) =>
	`${row.mode}|${row.kind}|${row.n}|${row.points}|${row.throttle}|${row.twin ? "twin" : ""}|${row.gate ?? "none"}|${row.dpr ?? 2}`;

const cases = new Map<string, Row[]>();
for (const row of rows) {
	const key = caseKey(row);
	cases.set(key, [...(cases.get(key) ?? []), row]);
}

const fmt = (value: number | undefined): string => {
	if (value == null) {
		return "—";
	}
	return Math.abs(value) >= 100 ? String(Math.round(value)) : value.toFixed(1);
};

console.log(`| case | animation | ${COLUMNS.map(([label]) => label).join(" | ")} |`);
console.log(`| --- | --- | ${COLUMNS.map(() => "---:").join(" | ")} |`);
for (const [key, list] of cases) {
	const [mode, kind, n, points, throttle, twin, gate, dpr] = key.split("|");
	const label = `${mode} ${kind} ${mode === "dense" ? `${Number(points).toLocaleString()} rows` : `n=${n}`} ×${throttle} @${dpr}x${twin ? " +twin" : ""}${gate === "cv" ? " +cv" : ""}`;
	for (const { animate, label: animation } of ANIMATE_ORDER) {
		const libRows = list.filter((row) => row.animate === animate);
		if (libRows.length === 0) {
			continue;
		}
		const cells = COLUMNS.map(([, keyPath]) =>
			fmt(
				median(
					libRows.map((row) => get(row, keyPath)).filter((value): value is number => value != null),
				),
			),
		);
		console.log(`| ${label} | ${animation} (${libRows.length}) | ${cells.join(" | ")} |`);
	}
}
