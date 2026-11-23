/**
 * Turns one run, or a base run and a head run, into a Markdown report. Each
 * flow lists its steps with what the reader said; a step whose speech changed
 * between base and head, or that breaks an expectation, is marked.
 *
 * ```sh
 * node apps/www/screen-reader/report.ts --head=main.json --base=release.json > report.md
 * ```
 *
 * `--strict` exits 1 for a blocking job: when a step breaks an expectation, or,
 * with `--base`, only when it breaks one that the base run met.
 */
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { z } from "zod";
import { readerNames } from "./readers.ts";
import type { FlowResult, RunResult } from "./run.ts";

const { values } = parseArgs({
	options: {
		head: { type: "string" },
		base: { type: "string" },
		strict: { type: "boolean", default: false },
	},
});
if (values.head == null) {
	throw new Error("Pass --head=<run.json>");
}

const runSchema = z.object({
	reader: z.enum(readerNames),
	base: z.string(),
	flows: z.array(
		z.object({
			id: z.string(),
			component: z.string(),
			path: z.string(),
			error: z.string().optional(),
			steps: z.array(
				z.object({ label: z.string(), spoken: z.array(z.string()), failed: z.array(z.string()) }),
			),
		}),
	),
});

const load = async (file: string): Promise<RunResult> =>
	runSchema.parse(JSON.parse(await readFile(file, "utf8")));
const head = await load(values.head);
const base = values.base == null ? null : await load(values.base);

if (base != null && base.reader !== head.reader) {
	throw new Error(
		`--base ran ${base.reader} and --head ran ${head.reader}; compare runs of one reader`,
	);
}

const cell = (spoken: string[] | undefined): string => {
	if (spoken == null) {
		return "—";
	}
	return spoken.length === 0 ? "(silent)" : escape(spoken.join("<br>"));
};

/** Why: a `|` or a line break in speech would end the table cell or row. */
const escape = (text: string) => text.replaceAll("|", "\\|").replaceAll(/\r?\n/g, "<br>");

/** A step's speech without the punctuation and spacing a reader varies from run to run. */
const words = (spoken: string[] | undefined) =>
	(spoken ?? []).join(" ").toLowerCase().replaceAll(/[.,]/g, "").replaceAll(/\s+/g, " ").trim();

const differs = (before: string[] | undefined, after: string[] | undefined): boolean =>
	words(before) !== words(after);

/** The unmet expectations of a flow, as `<step index>:<pattern>` keys; `error` marks a flow that threw. */
const unmetKeys = (flow: FlowResult | undefined): string[] =>
	flow == null
		? []
		: [
				...flow.steps.flatMap((step, index) => step.failed.map((failure) => `${index}:${failure}`)),
				...(flow.error ? ["error"] : []),
			];

const ids = [...new Set([...head.flows, ...(base?.flows ?? [])].map((flow) => flow.id))];
const flowIn = (run: RunResult | null, id: string) => run?.flows.find((flow) => flow.id === id);
const total = head.flows.reduce((sum, flow) => sum + unmetKeys(flow).length, 0);
/** Why only new failures with a base: a gap the release already had is a follow-up, not a regression. */
const regressions = ids.reduce((sum, id) => {
	const old = new Set(unmetKeys(flowIn(base, id)));
	return sum + unmetKeys(flowIn(head, id)).filter((key) => base == null || !old.has(key)).length;
}, 0);

const lines: string[] = [];
lines.push(`## Screen reader check: ${head.reader}`, "");
lines.push(
	`${head.flows.length} flows, ${total} unmet expectation(s)${base ? `, ${regressions} new since base` : ""}.${values.strict ? "" : " Report only: this check does not fail the build."}`,
	"",
);

for (const id of ids) {
	const flow = flowIn(head, id);
	const before = flowIn(base, id);
	const shown = flow ?? before;
	if (shown == null) {
		continue;
	}
	const steps = Math.max(flow?.steps.length ?? 0, before?.steps.length ?? 0);
	const indexes = Array.from({ length: steps }, (_, index) => index);
	const changed = indexes.filter(
		(index) => base != null && differs(before?.steps[index]?.spoken, flow?.steps[index]?.spoken),
	).length;
	const unmet = unmetKeys(flow).length;
	const marks = [
		flow == null ? "only in base" : null,
		flow != null && before == null && base ? "only in head" : null,
		unmet > 0 ? `${unmet} unmet` : "ok",
		base ? `${changed} changed` : null,
	].filter(Boolean);
	lines.push(`### ${shown.component} — \`${id}\` (${marks.join(", ")})`, "");
	if (flow?.error) {
		lines.push(`Error: ${escape(flow.error)}`, "");
	}
	lines.push(base ? "| Step | Base | Head | Unmet |" : "| Step | Spoken | Unmet |");
	lines.push(base ? "| --- | --- | --- | --- |" : "| --- | --- | --- |");
	for (const index of indexes) {
		const step = flow?.steps[index];
		const old = before?.steps[index];
		const label = step?.label ?? old?.label ?? "";
		const failed = escape((step?.failed ?? []).join("<br>"));
		const mark = base && differs(old?.spoken, step?.spoken) ? "Δ " : "";
		lines.push(
			base
				? `| ${mark}${label} | ${cell(old?.spoken)} | ${cell(step?.spoken)} | ${failed} |`
				: `| ${label} | ${cell(step?.spoken)} | ${failed} |`,
		);
	}
	lines.push("");
}

process.stdout.write(`${lines.join("\n")}\n`);
if (values.strict && regressions > 0) {
	process.exitCode = 1;
}
