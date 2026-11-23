/**
 * Runs each flow in `flows.ts` under one screen reader against a served docs
 * site, and writes what the reader said at each step, with the result of each
 * expectation, to a JSON file.
 *
 * ```sh
 * node apps/www/screen-reader/run.ts --reader=virtual --base=http://localhost:4001/ --out=/tmp/sr.json
 * ```
 *
 * `--only=select,tabs` runs some flows. VoiceOver runs on macOS with WebKit,
 * NVDA on Windows with Chromium, and both need `npx @guidepup/setup setup`.
 */
import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { chromium, webkit } from "playwright";
import { flows, type Step } from "./flows.ts";
import { openReader, readerNames, type ReaderName } from "./readers.ts";

export type StepResult = {
	label: string;
	spoken: string[];
	failed: string[];
};

export type FlowResult = {
	id: string;
	component: string;
	path: string;
	error?: string;
	steps: StepResult[];
};

export type RunResult = { reader: ReaderName; base: string; flows: FlowResult[] };

const { values } = parseArgs({
	options: {
		reader: { type: "string", default: "virtual" },
		base: { type: "string", default: "http://localhost:4001/" },
		out: { type: "string", default: "screen-reader-results.json" },
		only: { type: "string" },
	},
});

const readerName = readerNames.find((name) => name === values.reader);
if (readerName == null) {
	throw new Error(`--reader must be one of ${readerNames.join(", ")}`);
}
const only = values.only?.split(",");

const labelOf = (step: Step): string => {
	if ("key" in step) {
		return `press ${step.key}`;
	}
	if ("type" in step) {
		return `type "${step.type}"`;
	}
	return "reader next";
};

/** The patterns a step's speech breaks: an `expect` that does not match, or a `reject` that does. */
const failuresOf = (step: Step, spoken: string[]): string[] => {
	const text = spoken.join(" | ");
	const missing = (step.expect ?? []).filter((pattern) => !new RegExp(pattern, "i").test(text));
	const speech = spoken.filter((phrase) => !phrase.startsWith("focus: ")).join(" | ");
	const forbidden = (step.reject ?? []).filter((pattern) => new RegExp(pattern, "i").test(speech));
	return [
		...missing.map((pattern) => `missing /${pattern}/`),
		...forbidden.map((pattern) => `said /${pattern}/`),
	];
};

const browser = await (readerName === "voiceover" ? webkit : chromium).launch({
	headless: readerName === "virtual",
});
const reader = await openReader(browser, readerName);
const results: FlowResult[] = [];

for (const flow of flows.filter((candidate) => only == null || only.includes(candidate.id))) {
	const result: FlowResult = { id: flow.id, component: flow.component, path: flow.path, steps: [] };
	try {
		await reader.open(new URL(`preview/${flow.path}`, values.base).href);
		await reader.drain();
		for (const step of flow.steps) {
			if ("key" in step) {
				await reader.press(step.key);
			} else if ("type" in step) {
				await reader.type(step.type);
			} else {
				await reader.next();
			}
			if (step.wait != null) {
				await new Promise((resolve) => {
					setTimeout(resolve, step.wait);
				});
			}
			const spoken = await reader.drain();
			result.steps.push({ label: labelOf(step), spoken, failed: failuresOf(step, spoken) });
		}
	} catch (error) {
		result.error = error instanceof Error ? error.message.split("\n")[0] : String(error);
	}
	results.push(result);
	const failed = result.steps.reduce((sum, step) => sum + step.failed.length, 0);
	console.log(
		`${flow.id}: ${result.error ? `error: ${result.error}` : `${failed} unmet expectation(s)`}`,
	);
	// Why each flow: a real reader run takes minutes, and a crash keeps the flows done so far.
	const output: RunResult = { reader: readerName, base: values.base, flows: results };
	await writeFile(values.out, `${JSON.stringify(output, null, "\t")}\n`);
}

await reader.close();
await browser.close();
