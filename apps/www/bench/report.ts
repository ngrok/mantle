/**
 * Aggregates one or more `bench/results/*.jsonl` files into markdown tables:
 * the median of every run per case, with the spread beside it.
 *
 * Run from the package: `pnpm report -- bench/results/list.jsonl bench/results/dense.jsonl`.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Row = Record<string, unknown> & {
	animate: boolean;
	kind: string;
	mode: string;
	n: number;
	points: number;
	throttle: number;
	/** Absent in a results file from before the runner recorded it; those ran at 2. */
	dpr?: number;
	/** Absent in a results file from before the runner recorded it; those ran with no gate. */
	gate?: string;
	ok: boolean;
	error?: string;
	pageErrors: string[];
};

const rowDpr = (row: Row): number => row.dpr ?? 2;
const rowGate = (row: Row): string => row.gate ?? "none";

const APP_ROOT = path.resolve(import.meta.dirname, "..");

const files = process.argv.slice(2).filter((argument) => !argument.startsWith("--"));
if (files.length === 0) {
	throw new Error("Pass at least one results .jsonl file");
}

const isRow = (value: unknown): value is Row =>
	typeof value === "object" &&
	value != null &&
	"animate" in value &&
	"kind" in value &&
	!("meta" in value);

const rows: Row[] = [];
for (const file of files) {
	const text = await readFile(path.resolve(APP_ROOT, file), "utf8");
	for (const line of text.split("\n")) {
		if (line.trim() === "") {
			continue;
		}
		const parsed: unknown = JSON.parse(line);
		if (isRow(parsed)) {
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

const spread = (values: number[]): string => {
	if (values.length < 2) {
		return "";
	}
	const sorted = values.toSorted((left, right) => left - right);
	return ` (${fmt(sorted[0] ?? 0)}–${fmt(sorted[sorted.length - 1] ?? 0)})`;
};

const fmt = (value: number): string => {
	if (Math.abs(value) >= 100) {
		return String(Math.round(value));
	}
	if (Math.abs(value) >= 10) {
		return value.toFixed(1);
	}
	return value.toFixed(2);
};

/** The animation rows of a section, and the label each one prints. */
const ANIMATE_ORDER = [
	{ animate: true, label: "animated" },
	{ animate: false, label: "static" },
] as const;
const KIND_ORDER = ["line", "bar", "area", "scatter"];

type Column = { label: string; key: string };

const COLUMNS: Record<string, Column[]> = {
	startup: [
		{ label: "mount ms", key: "timing.mountMs" },
		{ label: "quiet at ms", key: "timing.quietAtMs" },
		{ label: "main-thread ms", key: "startup.taskMs" },
		{ label: "script ms", key: "startup.scriptMs" },
		{ label: "layout ms", key: "startup.layoutMs" },
		{ label: "style ms", key: "startup.styleMs" },
		{ label: "style recalcs", key: "startup.styleCount" },
		{ label: "long tasks", key: "startup.longTasks" },
		{ label: "TBT ms", key: "startup.tbtMs" },
		{ label: "frames >50ms", key: "startup.frames.over50" },
		{ label: "worst frame ms", key: "startup.frames.maxMs" },
		{ label: "CLS", key: "timing.cls" },
	],
	update: [
		{ label: "replace main-thread ms", key: "updateReplace.taskMs" },
		{ label: "replace script ms", key: "updateReplace.scriptMs" },
		{ label: "replace long tasks", key: "updateReplace.longTasks" },
		{ label: "replace worst frame ms", key: "updateReplace.frames.maxMs" },
		{ label: "shift×5 main-thread ms", key: "updateShift.taskMs" },
		{ label: "shift×5 script ms", key: "updateShift.scriptMs" },
		{ label: "shift×5 worst frame ms", key: "updateShift.frames.maxMs" },
		{ label: "shift×5 frames >50ms", key: "updateShift.frames.over50" },
	],
	interaction: [
		{ label: "hover main-thread ms", key: "hover.taskMs" },
		{ label: "hover script ms", key: "hover.scriptMs" },
		{ label: "hover layout ms", key: "hover.layoutMs" },
		{ label: "hover frames", key: "hover.frames.count" },
		{ label: "hover p95 frame ms", key: "hover.frames.p95Ms" },
		{ label: "hover worst frame ms", key: "hover.frames.maxMs" },
		{ label: "hover frames >50ms", key: "hover.frames.over50" },
		{ label: "INP ms", key: "input.inp" },
		{ label: "worst event ms", key: "input.maxEventMs" },
		{ label: "scroll p95 frame ms", key: "scroll.frames.p95Ms" },
		{ label: "scroll frames >50ms", key: "scroll.frames.over50" },
	],
	memory: [
		{ label: "JS heap MB", key: "memory.jsHeapMB" },
		{ label: "DOM nodes", key: "memory.domNodes" },
		{ label: "canvases", key: "memory.canvasCount" },
		{ label: "UA memory MB", key: "memory.uaTotalMB" },
		{ label: "canvas MB", key: "memory.uaByTypeMB.Canvas" },
		{ label: "DOM MB", key: "memory.uaByTypeMB.DOM" },
	],
};

type Section = {
	mode: string;
	kind: string;
	n: number;
	points: number;
	throttle: number;
	gate: string;
	dpr: number;
};

/** The case a row belongs to: every scenario input, so a gate or a DPR never merges into another run's median. */
const sectionOf = (row: Row): Section => ({
	mode: row.mode,
	kind: row.kind,
	n: row.n,
	points: row.points,
	throttle: row.throttle,
	gate: rowGate(row),
	dpr: rowDpr(row),
});

const sectionKey = (section: Section): string =>
	`${section.mode}|${section.kind}|${section.n}|${section.points}|${section.throttle}|${section.gate}|${section.dpr}`;

const groupKey = (row: Row): string => `${sectionKey(sectionOf(row))}|${row.animate}`;

const groups = new Map<string, Row[]>();
for (const row of rows) {
	const key = groupKey(row);
	const list = groups.get(key) ?? [];
	list.push(row);
	groups.set(key, list);
}

const sections = new Map<string, Section>();
for (const row of rows) {
	const section = sectionOf(row);
	sections.set(sectionKey(section), section);
}

const sortedSections = [...sections.values()].toSorted((left, right) => {
	if (left.mode !== right.mode) {
		return left.mode === "list" ? -1 : 1;
	}
	if (left.kind !== right.kind) {
		return KIND_ORDER.indexOf(left.kind) - KIND_ORDER.indexOf(right.kind);
	}
	if (left.throttle !== right.throttle) {
		return left.throttle - right.throttle;
	}
	if (left.dpr !== right.dpr) {
		return left.dpr - right.dpr;
	}
	if (left.gate !== right.gate) {
		return left.gate.localeCompare(right.gate);
	}
	if (left.n !== right.n) {
		return left.n - right.n;
	}
	return left.points - right.points;
});

const table = (section: Section, columns: Column[]): string => {
	const header = `| animation | runs | ${columns.map((column) => column.label).join(" | ")} |`;
	const divider = `| --- | ---: | ${columns.map(() => "---:").join(" | ")} |`;
	const lines = [header, divider];
	for (const { animate, label } of ANIMATE_ORDER) {
		const list = groups.get(`${sectionKey(section)}|${animate}`);
		if (list == null) {
			continue;
		}
		const okRows = list.filter((row) => row.ok);
		const cells = columns.map((column) => {
			const values = okRows
				.map((row) => get(row, column.key))
				.filter((value): value is number => value != null);
			const mid = median(values);
			return mid == null ? "—" : `${fmt(mid)}${spread(values)}`;
		});
		const failures = list.length - okRows.length;
		const errors = list.flatMap((row) => row.pageErrors).length;
		const note = `${okRows.length}/${list.length}${failures > 0 ? ` ✗${failures}` : ""}${errors > 0 ? ` ⚠${errors}` : ""}`;
		lines.push(`| ${label} | ${note} | ${cells.join(" | ")} |`);
	}
	return lines.join("\n");
};

const out: string[] = [];
out.push(`# Chart benchmark results\n`);
out.push(
	`Sources: ${files.join(", ")}. Each cell is the median over runs, with the min–max spread in parentheses.\n`,
);
for (const section of sortedSections) {
	const shape =
		section.mode === "dense"
			? `1 chart × ${section.points.toLocaleString()} rows`
			: section.mode === "table"
				? `${section.n} rows × 2 sparklines × ${section.points} bars`
				: `${section.n} charts × ${section.points} rows`;
	const gate =
		section.gate === "none"
			? ""
			: ` · ${section.gate === "cv" ? "content-visibility" : section.gate}`;
	out.push(
		`## ${section.mode} · ${section.kind} · ${shape} · CPU ×${section.throttle} · DPR ${section.dpr}${gate}\n`,
	);
	for (const [name, columns] of Object.entries(COLUMNS)) {
		out.push(`### ${name}\n`);
		out.push(table(section, columns) + "\n");
	}
	const failed = rows.filter(
		(row) =>
			sectionKey(sectionOf(row)) === sectionKey(section) && (!row.ok || row.pageErrors.length > 0),
	);
	if (failed.length > 0) {
		out.push(`### errors\n`);
		for (const row of failed) {
			out.push(
				`- ${row.animate ? "animated" : "static"} run ${String(row.run)}: ${row.error ?? ""} ${[...new Set(row.pageErrors)].slice(0, 3).join(" | ")}`,
			);
		}
		out.push("");
	}
}

const target = process.argv.find((argument) => argument.startsWith("--out="))?.slice(6);
const markdown = out.join("\n");
if (target == null) {
	console.log(markdown);
} else {
	await writeFile(path.resolve(APP_ROOT, target), markdown);
	console.log(`wrote ${target}`);
}
