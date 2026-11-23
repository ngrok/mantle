/**
 * Turns one run, or a base run and a head run, into a Markdown report. Each
 * flow lists its steps with what the reader said; a step whose speech changed
 * between base and head, or that breaks an expectation, is marked.
 *
 * ```sh
 * node apps/www/screen-reader/report.ts --head=main.json --base=release.json > report.md
 * ```
 *
 * `--strict` exits 1 when a step breaks an expectation, for a blocking job.
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

const cell = (spoken: string[] | undefined): string => {
	if (spoken == null) {
		return "—";
	}
	return spoken.length === 0 ? "(silent)" : spoken.join("<br>").replaceAll("|", "\\|");
};

const unmet = (flow: FlowResult) =>
	flow.steps.reduce((sum, step) => sum + step.failed.length, 0) + (flow.error ? 1 : 0);

const lines: string[] = [];
const total = head.flows.reduce((sum, flow) => sum + unmet(flow), 0);
lines.push(`## Screen reader check: ${head.reader}`, "");
lines.push(
	`${head.flows.length} flows, ${total} unmet expectation(s).${values.strict ? "" : " Report only: this check does not fail the build."}`,
	"",
);

for (const flow of head.flows) {
	const before = base?.flows.find((candidate) => candidate.id === flow.id);
	const changed = flow.steps.filter(
		(step, index) => before != null && cell(step.spoken) !== cell(before.steps[index]?.spoken),
	).length;
	const marks = [
		unmet(flow) > 0 ? `${unmet(flow)} unmet` : "ok",
		base ? `${changed} changed` : null,
	].filter(Boolean);
	lines.push(`### ${flow.component} — \`${flow.id}\` (${marks.join(", ")})`, "");
	if (flow.error) {
		lines.push(`Error: ${flow.error}`, "");
	}
	lines.push(base ? "| Step | Base | Head | Unmet |" : "| Step | Spoken | Unmet |");
	lines.push(base ? "| --- | --- | --- | --- |" : "| --- | --- | --- |");
	flow.steps.forEach((step, index) => {
		const old = before?.steps[index]?.spoken;
		const mark = base && cell(old) !== cell(step.spoken) ? "Δ " : "";
		const failed = step.failed.join("<br>").replaceAll("|", "\\|");
		lines.push(
			base
				? `| ${mark}${step.label} | ${cell(old)} | ${cell(step.spoken)} | ${failed} |`
				: `| ${step.label} | ${cell(step.spoken)} | ${failed} |`,
		);
	});
	lines.push("");
}

process.stdout.write(`${lines.join("\n")}\n`);
if (values.strict && total > 0) {
	process.exitCode = 1;
}
