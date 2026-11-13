/**
 * Traces the hover sweep of one scenario and prints where the main thread
 * spends it: the time per trace event (style, layout, paint, script) and the
 * functions with the most sampled self time. Run:
 * `pnpm bench:hover -- "?kind=bar&mode=agents&n=20&points=30" --no-build`.
 * `--cards=N` sets how many cards the sweep crosses (default 5).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { BENCH_PATH, RESULTS_DIR, startServer } from "./serve.ts";

const PORT = 3448;

// Why skip `--`: pnpm hands the separator to the script as its own argument.
const query =
	process.argv.slice(2).find((argument) => !argument.startsWith("--")) ??
	"?kind=bar&mode=agents&n=20&points=30";
const readArg = (name: string, fallback: string): string =>
	process.argv.find((argument) => argument.startsWith(`--${name}=`))?.slice(name.length + 3) ??
	fallback;
const cards = Number(readArg("cards", "5"));
const top = Number(readArg("top", "30"));
const build = !process.argv.includes("--no-build");

type ProfileData = {
	cpuProfile?: {
		nodes?: { id: number; callFrame: { functionName: string; url: string; lineNumber: number } }[];
		samples?: number[];
	};
	timeDeltas?: number[];
};

type TraceEvent = {
	name: string;
	ph: string;
	ts: number;
	dur?: number;
	tid: number;
	pid: number;
	args?: { name?: string; data?: ProfileData };
};

// Why a guard: `JSON.parse` returns `unknown` data, and a trace event carries numbers.
const isTraceEvent = (value: unknown): value is TraceEvent =>
	typeof value === "object" &&
	value != null &&
	"name" in value &&
	"ph" in value &&
	"ts" in value &&
	"pid" in value &&
	"tid" in value;

const readEvents = (buffer: Buffer): TraceEvent[] => {
	const parsed: unknown = JSON.parse(buffer.toString());
	const list: unknown =
		typeof parsed === "object" && parsed != null && "traceEvents" in parsed
			? parsed.traceEvents
			: [];
	return Array.isArray(list) ? list.filter(isTraceEvent) : [];
};

const server = await startServer({ port: PORT, build });
const browser = await chromium.launch({ headless: true, channel: "chromium" });
try {
	const context = await browser.newContext({
		viewport: { width: 1280, height: 900 },
		deviceScaleFactor: 2,
	});
	await context.route(/assets\.ngrok\.com/, (route) => route.abort());
	const page = await context.newPage();
	await page.goto(`${server.base}${BENCH_PATH.slice(1)}${query}`, { waitUntil: "commit" });
	await page.waitForFunction(() => window.__bench?.ready, undefined, {
		timeout: 240_000,
		polling: 250,
	});
	await page.waitForTimeout(1000);
	const targets = page.locator(
		"[data-bench-hover], [data-bench-chart]:not(:has([data-bench-hover]))",
	);
	const count = Math.min(cards, await targets.count());
	await browser.startTracing(page, {
		categories: [
			"devtools.timeline",
			"disabled-by-default-devtools.timeline",
			"disabled-by-default-v8.cpu_profiler",
			"v8.execute",
		],
	});
	let moves = 0;
	for (let index = 0; index < count; index += 1) {
		const target = targets.nth(index);
		await target.scrollIntoViewIfNeeded();
		const box = await target.boundingBox();
		if (box == null) {
			continue;
		}
		const y = box.y + box.height * 0.55;
		for (let step = 0; step <= 40; step += 1) {
			await page.mouse.move(box.x + 2 + ((box.width - 4) * step) / 40, y);
			await page.waitForTimeout(16);
			moves += 1;
		}
		await page.mouse.move(box.x + box.width + 40, y);
	}
	await page.waitForTimeout(300);
	const buffer = await browser.stopTracing();
	const traceEvents = readEvents(buffer);
	await mkdir(RESULTS_DIR, { recursive: true });
	const slug = query.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
	await writeFile(path.join(RESULTS_DIR, `${slug}-hover.trace.json`), buffer);

	const main = traceEvents.find(
		(event) => event.name === "thread_name" && event.args?.name === "CrRendererMain",
	);
	const tid = main?.tid;
	const pid = main?.pid;
	const onMain = traceEvents.filter(
		(event) => event.tid === tid && event.pid === pid && event.ph === "X" && event.dur != null,
	);
	const byName = new Map<string, number>();
	for (const event of onMain) {
		byName.set(event.name, (byName.get(event.name) ?? 0) + (event.dur ?? 0));
	}
	const tasks = onMain.filter((event) => event.name === "RunTask");
	const taskTotal = tasks.reduce((sum, event) => sum + (event.dur ?? 0), 0);
	console.log(`\n${moves} pointer moves over ${count} cards`);
	console.log(
		`main-thread tasks ${(taskTotal / 1000).toFixed(0)} ms, ${(taskTotal / 1000 / moves).toFixed(2)} ms per move`,
	);
	console.log("\nInclusive time by event (top level and nested)");
	for (const [name, micros] of [...byName.entries()]
		.toSorted((left, right) => right[1] - left[1])
		.slice(0, top)) {
		console.log(`${(micros / 1000).toFixed(1).padStart(9)} ms  ${name}`);
	}
	const counts = new Map<string, number>();
	for (const event of onMain) {
		counts.set(event.name, (counts.get(event.name) ?? 0) + 1);
	}
	console.log(
		`\nLayout ${counts.get("Layout") ?? 0}, UpdateLayoutTree ${counts.get("UpdateLayoutTree") ?? 0}, Paint ${counts.get("Paint") ?? 0}, PrePaint ${counts.get("PrePaint") ?? 0}`,
	);

	// Self time from the sampled profile chunks.
	const nodes = new Map<number, { name: string; url: string; line: number }>();
	const selfMicros = new Map<number, number>();
	for (const event of traceEvents) {
		if (event.name !== "ProfileChunk") {
			continue;
		}
		const data = event.args?.data;
		for (const node of data?.cpuProfile?.nodes ?? []) {
			nodes.set(node.id, {
				name: node.callFrame.functionName || "(anonymous)",
				url: (node.callFrame.url ?? "").replace(/^.*\/assets\//, "").replace(/\?.*$/, ""),
				line: node.callFrame.lineNumber + 1,
			});
		}
		const samples = data?.cpuProfile?.samples ?? [];
		const deltas = data?.timeDeltas ?? [];
		for (let index = 0; index < samples.length; index += 1) {
			const id = samples[index];
			if (id != null) {
				selfMicros.set(id, (selfMicros.get(id) ?? 0) + (deltas[index] ?? 0));
			}
		}
	}
	const byFunction = new Map<string, number>();
	for (const [id, micros] of selfMicros) {
		const node = nodes.get(id);
		if (node == null || node.name === "(idle)" || node.name === "(root)") {
			continue;
		}
		const key = `${node.name} ${node.url || "(native)"}:${node.line}`;
		byFunction.set(key, (byFunction.get(key) ?? 0) + micros);
	}
	console.log("\nSampled self time by function");
	for (const [name, micros] of [...byFunction.entries()]
		.toSorted((left, right) => right[1] - left[1])
		.slice(0, top)) {
		console.log(`${(micros / 1000).toFixed(1).padStart(9)} ms  ${name}`);
	}
} finally {
	await browser.close();
	server.close();
}
