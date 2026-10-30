/**
 * Traces one scenario's mount on the renderer main thread and prints every
 * task between the `lib-loaded` and `charts-painted` marks, with a per-task
 * breakdown and a sampled self-time profile of the same window. Run:
 * `pnpm bench:trace -- "?animate=0&kind=line&mode=list&n=100&points=30" --no-build`.
 * `--runs=N` repeats the page load and prints the task list of the median run;
 * `--per-task=N` adds the top N functions of every task over 2 ms.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import type { Browser } from "playwright";
import { BENCH_PATH, RESULTS_DIR, startServer } from "./serve.ts";

const PORT = 3447;

// Why skip `--`: pnpm hands the separator to the script as its own argument.
const query =
	process.argv.slice(2).find((argument) => !argument.startsWith("--")) ??
	"?animate=0&kind=line&mode=list&n=100&points=30";
const readArg = (name: string, fallback: string): string =>
	process.argv.find((argument) => argument.startsWith(`--${name}=`))?.slice(name.length + 3) ??
	fallback;
const runs = Number(readArg("runs", "1"));
const top = Number(readArg("top", "30"));
const throttle = Number(readArg("throttle", "1"));
const dumpTrace = process.argv.includes("--dump");
const build = !process.argv.includes("--no-build");
const perTaskDepth = Number(readArg("per-task", "0"));

type TraceEvent = {
	name: string;
	cat: string;
	ph: string;
	ts: number;
	dur?: number;
	pid: number;
	tid: number;
	id?: string;
	args?: {
		data?: {
			functionName?: string;
			url?: string;
			lineNumber?: number;
			startTime?: number;
			cpuProfile?: {
				nodes?: ProfileNode[];
				samples?: number[];
			};
			timeDeltas?: number[];
			type?: string;
		};
		name?: string;
	};
};

type ProfileNode = {
	id: number;
	parent?: number;
	callFrame: { functionName: string; url: string; lineNumber: number; columnNumber: number };
};

// Why a guard: Playwright types every collected value as a string map, and a
// trace event carries numbers.
const isTraceEvent = (value: unknown): value is TraceEvent =>
	typeof value === "object" &&
	value != null &&
	"name" in value &&
	"cat" in value &&
	"ph" in value &&
	"ts" in value &&
	"pid" in value &&
	"tid" in value;

type Task = {
	start: number;
	dur: number;
	entry: string;
	self: Map<string, number>;
};

type Analysis = {
	marks: Record<string, number>;
	tasks: Task[];
	perTask: Map<Task, { byTotal: Map<string, number>; bySelf: Map<string, number> }>;
	profile: {
		byFunction: Map<string, number>;
		byTotal: Map<string, number>;
		byBucket: Map<string, number>;
		sampled: number;
	};
};

const CATEGORIES = [
	"toplevel",
	"devtools.timeline",
	"disabled-by-default-devtools.timeline",
	"blink",
	"blink.user_timing",
	"disabled-by-default-v8.cpu_profiler",
	"disabled-by-default-v8.cpu_profiler.hires",
];

const bucketOf = (url: string, functionName: string): string => {
	if (functionName === "(garbage collector)" || functionName === "(program)") {
		return functionName;
	}
	if (functionName === "(idle)") {
		return "(idle)";
	}
	if (url === "") {
		return "(native)";
	}
	const file = url.replace(/^.*\/assets\//, "").replace(/\?.*$/, "");
	if (file.startsWith("react-")) {
		return "react";
	}
	if (file.startsWith("mantle-charts-")) {
		return "mantle-charts";
	}
	if (file.startsWith("index-")) {
		return "app (index chunk)";
	}
	return file;
};

const analyze = (events: TraceEvent[]): Analysis => {
	const marks: Record<string, number> = {};
	let mainPid = -1;
	let mainTid = -1;
	for (const event of events) {
		if (event.cat.includes("blink.user_timing") && marks[event.name] == null) {
			if (["app-start", "lib-loaded", "charts-mounted", "charts-painted"].includes(event.name)) {
				marks[event.name] = event.ts;
				if (event.name === "lib-loaded") {
					mainPid = event.pid;
					mainTid = event.tid;
				}
			}
		}
	}
	const libLoaded = marks["lib-loaded"];
	if (libLoaded == null) {
		throw new Error("No lib-loaded mark in the trace");
	}
	const main = events
		.filter((event) => event.pid === mainPid && event.tid === mainTid && event.ph === "X")
		.toSorted((left, right) => left.ts - right.ts || (right.dur ?? 0) - (left.dur ?? 0));

	// Top-level tasks: toplevel RunTask events with no enclosing RunTask.
	const tasks: Task[] = [];
	let taskEnd = -1;
	for (const event of main) {
		if (!event.cat.includes("toplevel") || !event.name.includes("RunTask")) {
			continue;
		}
		if (event.ts < taskEnd) {
			continue;
		}
		const dur = event.dur ?? 0;
		taskEnd = event.ts + dur;
		if (event.ts + dur < libLoaded) {
			continue;
		}
		tasks.push({ start: event.ts, dur, entry: "", self: new Map() });
	}

	// Self time by event name inside each task, and the first JS entry point.
	let taskIndex = 0;
	const stack: { end: number; name: string; self: number }[] = [];
	const flush = (task: Task, frame: { name: string; self: number }) => {
		task.self.set(frame.name, (task.self.get(frame.name) ?? 0) + frame.self);
	};
	for (const event of main) {
		if (event.cat.includes("toplevel")) {
			continue;
		}
		while (taskIndex < tasks.length) {
			const task = tasks[taskIndex];
			if (task == null || event.ts < task.start + task.dur) {
				break;
			}
			while (stack.length > 0) {
				const frame = stack.pop();
				if (frame != null) {
					flush(task, frame);
				}
			}
			taskIndex += 1;
		}
		const task = tasks[taskIndex];
		if (task == null || event.ts < task.start) {
			continue;
		}
		const dur = event.dur ?? 0;
		while (stack.length > 0 && (stack[stack.length - 1]?.end ?? 0) <= event.ts) {
			const frame = stack.pop();
			if (frame != null) {
				flush(task, frame);
			}
		}
		const parent = stack[stack.length - 1];
		if (parent != null) {
			parent.self -= dur;
		}
		let name = event.name;
		if (event.name === "FunctionCall" && event.args?.data?.functionName != null) {
			const data = event.args.data;
			const file = (data.url ?? "").replace(/^.*\/assets\//, "").replace(/\?.*$/, "");
			const label = `${data.functionName || "(anonymous)"} ${file}:${(data.lineNumber ?? 0) + 1}`;
			if (task.entry === "") {
				task.entry = label;
			}
			name = "FunctionCall";
		}
		stack.push({ end: event.ts + dur, name, self: dur });
	}
	const last = tasks[taskIndex];
	if (last != null) {
		while (stack.length > 0) {
			const frame = stack.pop();
			if (frame != null) {
				flush(last, frame);
			}
		}
	}

	// Sampled profile, restricted to the mount window.
	const painted = marks["charts-painted"] ?? Number.POSITIVE_INFINITY;
	const nodes = new Map<number, ProfileNode>();
	const samples: { node: number; ts: number; dur: number }[] = [];
	// Why by id: the profiler emits its chunks on its own thread, so the tid is
	// not the main thread's. The main thread's profile is the one with the most samples.
	const chunksById = new Map<string, TraceEvent[]>();
	for (const event of events) {
		if (event.ph !== "P" || (event.name !== "Profile" && event.name !== "ProfileChunk")) {
			continue;
		}
		if (event.pid !== mainPid) {
			continue;
		}
		const key = event.id ?? "";
		const group = chunksById.get(key) ?? [];
		group.push(event);
		chunksById.set(key, group);
	}
	let profileEvents: TraceEvent[] = [];
	let most = -1;
	for (const group of chunksById.values()) {
		const count = group.reduce(
			(total, event) => total + (event.args?.data?.cpuProfile?.samples?.length ?? 0),
			0,
		);
		if (count > most) {
			most = count;
			profileEvents = group.toSorted((left, right) => left.ts - right.ts);
		}
	}
	let cursor = 0;
	for (const event of profileEvents) {
		const data = event.args?.data;
		if (event.name === "Profile") {
			cursor = data?.startTime ?? event.ts;
			continue;
		}
		for (const node of data?.cpuProfile?.nodes ?? []) {
			nodes.set(node.id, node);
		}
		const ids = data?.cpuProfile?.samples ?? [];
		const deltas = data?.timeDeltas ?? [];
		for (let index = 0; index < ids.length; index += 1) {
			cursor += deltas[index] ?? 0;
			const node = ids[index];
			if (node != null) {
				samples.push({ node, ts: cursor, dur: 0 });
			}
		}
	}
	for (let index = 0; index + 1 < samples.length; index += 1) {
		const sample = samples[index];
		const next = samples[index + 1];
		if (sample != null && next != null) {
			sample.dur = next.ts - sample.ts;
		}
	}
	const byFunction = new Map<string, number>();
	const byTotal = new Map<string, number>();
	const byBucket = new Map<string, number>();
	let sampled = 0;
	const labelOf = (node: ProfileNode): string => {
		const frame = node.callFrame;
		const file = (frame.url ?? "").replace(/^.*\/assets\//, "").replace(/\?.*$/, "") || "(native)";
		return `${frame.functionName || "(anonymous)"} ${file}:${(frame.lineNumber ?? -1) + 1}`;
	};
	for (const sample of samples) {
		if (sample.ts < libLoaded || sample.ts >= painted) {
			continue;
		}
		const node = nodes.get(sample.node);
		if (node == null) {
			continue;
		}
		sampled += sample.dur;
		const bucket = bucketOf(node.callFrame.url ?? "", node.callFrame.functionName ?? "");
		byBucket.set(bucket, (byBucket.get(bucket) ?? 0) + sample.dur);
		const label = labelOf(node);
		byFunction.set(label, (byFunction.get(label) ?? 0) + sample.dur);
		const seen = new Set<string>();
		for (let current: ProfileNode | undefined = node; current != null;) {
			const name = labelOf(current);
			if (!seen.has(name)) {
				seen.add(name);
				byTotal.set(name, (byTotal.get(name) ?? 0) + sample.dur);
			}
			current = current.parent == null ? undefined : nodes.get(current.parent);
		}
	}
	// Per-task profiles for every task of 2 ms or more.
	const perTask = new Map<Task, { byTotal: Map<string, number>; bySelf: Map<string, number> }>();
	for (const task of tasks) {
		if (task.dur < 2000) {
			continue;
		}
		const totals = new Map<string, number>();
		const selfs = new Map<string, number>();
		for (const sample of samples) {
			if (sample.ts < task.start || sample.ts >= task.start + task.dur) {
				continue;
			}
			const node = nodes.get(sample.node);
			if (node == null) {
				continue;
			}
			const label = labelOf(node);
			selfs.set(label, (selfs.get(label) ?? 0) + sample.dur);
			const seen = new Set<string>();
			for (let current: ProfileNode | undefined = node; current != null;) {
				const name = labelOf(current);
				if (!seen.has(name)) {
					seen.add(name);
					totals.set(name, (totals.get(name) ?? 0) + sample.dur);
				}
				current = current.parent == null ? undefined : nodes.get(current.parent);
			}
		}
		perTask.set(task, { byTotal: totals, bySelf: selfs });
	}
	return { marks, tasks, perTask, profile: { byFunction, byTotal, byBucket, sampled } };
};

const ms = (micros: number): string => (micros / 1000).toFixed(1);

const print = (analysis: Analysis): void => {
	const { marks, tasks, profile } = analysis;
	const libLoaded = marks["lib-loaded"] ?? 0;
	const painted = marks["charts-painted"] ?? libLoaded;
	const rel = (ts: number) => ms(ts - libLoaded).padStart(7);
	console.log(
		`marks (ms from lib-loaded): app-start ${rel(marks["app-start"] ?? libLoaded)}, charts-mounted ${rel(marks["charts-mounted"] ?? libLoaded)}, charts-painted ${rel(painted)}`,
	);
	const inWindow = tasks.filter((task) => task.start < painted);
	// Why clipped: the `lib-loaded` mark lands inside the module-evaluation task,
	// so only the part of that task after the mark counts.
	const busy = inWindow.reduce(
		(total, task) =>
			total + (Math.min(task.start + task.dur, painted) - Math.max(task.start, libLoaded)),
		0,
	);
	const longest = inWindow.reduce((max, task) => Math.max(max, task.dur), 0);
	const tail = tasks.filter((task) => task.start >= painted);
	const tailBusy = tail.reduce((total, task) => total + task.dur, 0);
	console.log(
		`window: wall ${ms(painted - libLoaded)} ms, busy ${ms(busy)} ms in ${inWindow.length} tasks (longest ${ms(longest)} ms), idle ${ms(painted - libLoaded - busy)} ms; tail after painted: ${ms(tailBusy)} ms in ${tail.length} tasks`,
	);
	console.log("\ntasks ≥ 0.3 ms (start, duration, entry point, self time by phase):");
	for (const task of tasks) {
		if (task.dur < 300) {
			continue;
		}
		const phases = [...task.self.entries()]
			.filter(([, micros]) => micros >= 100)
			.toSorted((left, right) => right[1] - left[1])
			.slice(0, 6)
			.map(([name, micros]) => `${name} ${ms(micros)}`)
			.join(" | ");
		const marker = task.start >= painted ? " (tail)" : "";
		console.log(
			`  ${rel(task.start)}  ${ms(task.dur).padStart(6)} ms${marker}  ${task.entry}\n            ${phases}`,
		);
	}
	if (perTaskDepth > 0) {
		console.log("\nper-task profiles (inclusive time, then self time):");
		for (const [task, profiles] of analysis.perTask) {
			console.log(`\n  task at ${rel(task.start)} ms, ${ms(task.dur)} ms: ${task.entry}`);
			const rows = (map: Map<string, number>, limit: number) =>
				[...map.entries()]
					.toSorted((left, right) => right[1] - left[1])
					.slice(0, limit)
					.filter(([name]) => !name.startsWith("(root)"))
					.map(([name, micros]) => `      ${ms(micros).padStart(6)}  ${name}`)
					.join("\n");
			console.log(`    inclusive:\n${rows(profiles.byTotal, perTaskDepth)}`);
			console.log(`    self:\n${rows(profiles.bySelf, Math.ceil(perTaskDepth / 2))}`);
		}
	}
	const printMap = (title: string, map: Map<string, number>, limit: number) => {
		console.log(`\n${title} (window sampled ${ms(profile.sampled)} ms):`);
		const sorted = [...map.entries()].toSorted((left, right) => right[1] - left[1]).slice(0, limit);
		for (const [name, micros] of sorted) {
			console.log(
				`${ms(micros).padStart(8)} ms  ${((micros / Math.max(1, profile.sampled)) * 100).toFixed(1).padStart(5)}%  ${name}`,
			);
		}
	};
	printMap("self time by bucket", profile.byBucket, 20);
	printMap("self time by function", profile.byFunction, top);
	printMap("total (inclusive) time by function", profile.byTotal, top);
};

const traceOnce = async (browser: Browser, base: string): Promise<Analysis> => {
	const context = await browser.newContext({
		viewport: { width: 1280, height: 900 },
		deviceScaleFactor: 2,
	});
	try {
		await context.route(/assets\.ngrok\.com/, (route) => route.abort());
		const page = await context.newPage();
		const cdp = await context.newCDPSession(page);
		if (throttle > 1) {
			await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
		}
		const events: TraceEvent[] = [];
		cdp.on("Tracing.dataCollected", (payload) => {
			for (const item of payload.value) {
				if (isTraceEvent(item)) {
					events.push(item);
				}
			}
		});
		const complete = new Promise<void>((resolve) => {
			cdp.once("Tracing.tracingComplete", () => resolve());
		});
		await cdp.send("Tracing.start", {
			traceConfig: { includedCategories: CATEGORIES, recordMode: "recordUntilFull" },
			transferMode: "ReportEvents",
		});
		await page.goto(`${base}${BENCH_PATH.slice(1)}${query}`, { waitUntil: "commit" });
		await page.waitForFunction(() => window.__bench?.ready, undefined, {
			timeout: 240_000,
			polling: 50,
		});
		await page.waitForTimeout(500);
		await cdp.send("Tracing.end");
		await complete;
		if (dumpTrace) {
			await mkdir(RESULTS_DIR, { recursive: true });
			const slug = query.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
			await writeFile(
				path.join(RESULTS_DIR, `${slug}-x${throttle}.trace.json`),
				JSON.stringify({ traceEvents: events }),
			);
		}
		return analyze(events);
	} finally {
		await context.close();
	}
};

const server = await startServer({ port: PORT, build });
const base = server.base;
const browser = await chromium.launch({ headless: true, channel: "chromium" });
try {
	// Why a warm-up: the first page of a fresh browser pays cold caches no later load pays.
	await traceOnce(browser, base);
	const results: Analysis[] = [];
	for (let run = 0; run < runs; run += 1) {
		results.push(await traceOnce(browser, base));
	}
	const busyOf = (analysis: Analysis) => {
		const painted = analysis.marks["charts-painted"] ?? 0;
		const libLoaded = analysis.marks["lib-loaded"] ?? 0;
		return analysis.tasks
			.filter((task) => task.start < painted)
			.reduce(
				(total, task) =>
					total + (Math.min(task.start + task.dur, painted) - Math.max(task.start, libLoaded)),
				0,
			);
	};
	const sorted = results.toSorted((left, right) => busyOf(left) - busyOf(right));
	console.log(
		`${query} x${throttle}: busy per run ${sorted.map((analysis) => ms(busyOf(analysis))).join(" / ")} ms; wall ${sorted
			.map((analysis) =>
				ms((analysis.marks["charts-painted"] ?? 0) - (analysis.marks["lib-loaded"] ?? 0)),
			)
			.join(" / ")} ms`,
	);
	const median = sorted[Math.floor(sorted.length / 2)];
	if (median != null) {
		print(median);
	}
} finally {
	await browser.close();
	server.close();
}
