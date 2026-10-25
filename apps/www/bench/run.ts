/**
 * The benchmark driver. Builds the site, serves the production build, and
 * loads every case of `/bench/charts` in a fresh browser context while a CDP
 * session reads the main-thread metrics. One JSON line per run lands in
 * `bench/results/`.
 *
 * Run from the package: `pnpm bench -- --matrix=smoke --runs=1`.
 */
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import type { Browser, CDPSession, Page } from "playwright";
import type { Gate, Kind, Mode } from "../app/features/chart-bench/config";
import type { BenchSnapshot } from "../app/features/chart-bench/metrics";
import { BENCH_PATH, RESULTS_DIR, startServer } from "./serve";

type Case = {
	/** Whether the charts play their mount animation. */
	animate: boolean;
	kind: Kind;
	mode: Mode;
	n: number;
	points: number;
	throttle: number;
	dpr: number;
	gate: Gate;
};

type FrameStats = {
	count: number;
	meanMs: number;
	p95Ms: number;
	maxMs: number;
	over33: number;
	over50: number;
	over100: number;
};

type MainThread = {
	taskMs: number;
	scriptMs: number;
	layoutMs: number;
	styleMs: number;
	layoutCount: number;
	styleCount: number;
};

type Result = Case & {
	run: number;
	url: string;
	ok: boolean;
	error?: string;
	timing?: {
		navToReadyMs: number;
		libLoadedMs: number;
		chartsMountedMs: number;
		chartsPaintedMs: number;
		/** From the chart module's load to two frames after the mount commit. */
		mountMs: number;
		/** The last long frame or long task before the settle sample: when the page went quiet. */
		quietAtMs: number;
		fcp?: number;
		lcp?: number;
		cls?: number;
	};
	startup?: MainThread & {
		longTasks: number;
		tbtMs: number;
		frames: FrameStats;
	};
	gpu?: string;
	hover?: MainThread & { longTasks: number; frames: FrameStats };
	input?: { inp?: number; maxEventMs: number; events: number };
	updateReplace?: MainThread & { longTasks: number; frames: FrameStats };
	updateShift?: MainThread & { longTasks: number; frames: FrameStats };
	scroll?: { frames: FrameStats } & MainThread;
	memory?: {
		jsHeapMB: number;
		domNodes: number;
		canvasCount: number;
		uaTotalMB?: number;
		uaByTypeMB?: Record<string, number>;
	};
	pageErrors: string[];
};

const PORT = 3445;
const SETTLE_MS = 2000;

const readArg = (name: string): string | undefined => {
	const prefix = `--${name}=`;
	const hit = process.argv.find((argument) => argument.startsWith(prefix));
	return hit?.slice(prefix.length);
};
const hasFlag = (name: string): boolean => process.argv.includes(`--${name}`);

const ALL_ANIMATE: readonly string[] = ["on", "off"];
const ALL_KINDS: readonly Kind[] = ["line", "bar", "area", "scatter"];

const parseList = <T extends string>(value: string | undefined, all: readonly T[]): T[] => {
	if (value == null || value === "") {
		return [...all];
	}
	const wanted = value.split(",");
	return all.filter((item) => wanted.includes(item));
};

const buildMatrix = (): Case[] => {
	const matrix = readArg("matrix") ?? "smoke";
	// Why on and off: the mount animation is the one chart option the bench varies.
	const animations = parseList(readArg("animate"), ALL_ANIMATE).map((value) => value === "on");
	const kinds = parseList(readArg("kinds"), ALL_KINDS);
	const throttles = (readArg("throttle") ?? "1").split(",").map(Number);
	const dpr = Number(readArg("dpr") ?? 2);
	const gate: Gate = readArg("gate") === "cv" ? "cv" : "none";
	const cases: Case[] = [];
	const listCounts = (readArg("n") ?? "10,50,100").split(",").map(Number);
	const densePoints = (readArg("points") ?? "4000,10000,50000,100000").split(",").map(Number);
	// Libraries vary innermost so the rows of one cell run back to back and share any drift.
	for (const throttle of throttles) {
		for (const kind of kinds) {
			if (matrix === "smoke" || matrix === "list" || matrix === "all") {
				const counts = matrix === "smoke" ? [10] : listCounts;
				for (const n of counts) {
					for (const animate of animations) {
						cases.push({
							animate,
							kind,
							mode: "list",
							n,
							points: kind === "bar" ? 12 : 30,
							throttle,
							dpr,
							gate,
						});
					}
				}
			}
			if ((matrix === "table" || matrix === "all") && kind === "bar") {
				for (const n of listCounts) {
					for (const animate of animations) {
						cases.push({ animate, kind, mode: "table", n, points: 30, throttle, dpr, gate });
					}
				}
			}
			if (matrix === "smoke" || matrix === "dense" || matrix === "all") {
				const sizes = matrix === "smoke" ? [10_000] : densePoints;
				for (const points of sizes) {
					// Bars past 10k categories are narrower than a device pixel.
					const rows = kind === "bar" ? Math.min(points / 10, 10_000) : points;
					for (const animate of animations) {
						cases.push({ animate, kind, mode: "dense", n: 1, points: rows, throttle, dpr, gate });
					}
				}
			}
		}
	}
	return cases;
};

const caseUrl = (base: string, item: Case): string => {
	const params = new URLSearchParams({
		animate: item.animate ? "1" : "0",
		kind: item.kind,
		mode: item.mode,
		n: String(item.n),
		points: String(item.points),
	});
	if (item.gate !== "none") {
		params.set("gate", item.gate);
	}
	return `${base}${BENCH_PATH.slice(1)}?${params.toString()}`;
};

const frameStats = (deltas: number[]): FrameStats => {
	if (deltas.length === 0) {
		return { count: 0, meanMs: 0, p95Ms: 0, maxMs: 0, over33: 0, over50: 0, over100: 0 };
	}
	const sorted = deltas.toSorted((left, right) => left - right);
	const sum = sorted.reduce((total, value) => total + value, 0);
	return {
		count: sorted.length,
		meanMs: sum / sorted.length,
		p95Ms: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0,
		maxMs: sorted[sorted.length - 1] ?? 0,
		over33: sorted.filter((value) => value > 33).length,
		over50: sorted.filter((value) => value > 50).length,
		over100: sorted.filter((value) => value > 100).length,
	};
};

type Metrics = Record<string, number>;

const readMetrics = async (cdp: CDPSession): Promise<Metrics> => {
	const { metrics } = await cdp.send("Performance.getMetrics");
	const map: Metrics = {};
	for (const metric of metrics) {
		map[metric.name] = metric.value;
	}
	return map;
};

const mainThread = (before: Metrics, after: Metrics): MainThread => ({
	taskMs: ((after.TaskDuration ?? 0) - (before.TaskDuration ?? 0)) * 1000,
	scriptMs: ((after.ScriptDuration ?? 0) - (before.ScriptDuration ?? 0)) * 1000,
	layoutMs: ((after.LayoutDuration ?? 0) - (before.LayoutDuration ?? 0)) * 1000,
	styleMs: ((after.RecalcStyleDuration ?? 0) - (before.RecalcStyleDuration ?? 0)) * 1000,
	layoutCount: (after.LayoutCount ?? 0) - (before.LayoutCount ?? 0),
	styleCount: (after.RecalcStyleCount ?? 0) - (before.RecalcStyleCount ?? 0),
});

const ZERO: Metrics = {};

const toMB = (bytes: number) => Math.round((bytes / 1_048_576) * 100) / 100;

const longTasksBetween = (snapshot: BenchSnapshot, from: number, to: number) =>
	snapshot.longTasks.filter((task) => task.start >= from && task.start < to);

const tbt = (tasks: { duration: number }[]): number =>
	tasks.reduce((total, task) => total + Math.max(0, task.duration - 50), 0);

const now = (page: Page) => page.evaluate(() => performance.now());

const startFrames = (page: Page) => page.evaluate(() => window.__bench.frames.start());
const stopFrames = (page: Page) => page.evaluate(() => window.__bench.frames.stop());

/** The last frame over 25 ms or long-task end: after it the page is quiet. */
const quietAt = (
	frames: { deltas: number[]; stamps: number[] },
	snapshot: BenchSnapshot,
	floor: number,
): number => {
	let quiet = floor;
	for (let index = 0; index < frames.deltas.length; index += 1) {
		if ((frames.deltas[index] ?? 0) > 25) {
			quiet = Math.max(quiet, frames.stamps[index + 1] ?? 0);
		}
	}
	for (const task of snapshot.longTasks) {
		quiet = Math.max(quiet, task.start + task.duration);
	}
	return quiet;
};

const updatePhase = async (
	page: Page,
	cdp: CDPSession,
	mode: "replace" | "shift",
): Promise<MainThread & { longTasks: number; frames: FrameStats }> => {
	const before = await readMetrics(cdp);
	const from = await now(page);
	await startFrames(page);
	const rounds = mode === "replace" ? 1 : 5;
	for (let round = 0; round < rounds; round += 1) {
		await page.evaluate((update) => window.__bench.update(update), mode);
		await page.waitForTimeout(mode === "replace" ? 1500 : 200);
	}
	if (mode === "shift") {
		await page.waitForTimeout(500);
	}
	const frames = frameStats((await stopFrames(page)).deltas);
	const to = await now(page);
	const after = await readMetrics(cdp);
	const snapshot = await page.evaluate(() => window.__bench.snapshot());
	return {
		...mainThread(before, after),
		longTasks: longTasksBetween(snapshot, from, to).length,
		frames,
	};
};

const hoverSweep = async (page: Page, targets: number): Promise<void> => {
	const cards = page.locator("[data-bench-chart]");
	const count = Math.min(targets, await cards.count());
	for (let index = 0; index < count; index += 1) {
		const card = cards.nth(index);
		await card.scrollIntoViewIfNeeded();
		const box = await card.boundingBox();
		if (box == null) {
			continue;
		}
		const y = box.y + box.height * 0.55;
		const x0 = box.x + 72;
		const x1 = box.x + box.width - 24;
		const steps = 40;
		for (let step = 0; step <= steps; step += 1) {
			await page.mouse.move(x0 + ((x1 - x0) * step) / steps, y);
			await page.waitForTimeout(16);
		}
		await page.mouse.move(box.x + box.width + 40, y);
	}
};

const clickAndKeys = async (page: Page): Promise<void> => {
	const card = page.locator("[data-bench-chart]").first();
	await card.scrollIntoViewIfNeeded();
	const box = await card.boundingBox();
	if (box == null) {
		return;
	}
	const x = box.x + box.width * 0.5;
	const y = box.y + box.height * 0.55;
	await page.mouse.click(x, y);
	await page.waitForTimeout(120);
	await page.mouse.click(x + 40, y);
	await page.waitForTimeout(120);
	const focusable = card.locator('[tabindex="0"]').first();
	if ((await focusable.count()) > 0) {
		await focusable.focus();
		for (let step = 0; step < 8; step += 1) {
			await page.keyboard.press("ArrowRight");
			await page.waitForTimeout(60);
		}
		await page.keyboard.press("Escape");
	}
	await page.waitForTimeout(200);
};

const scrollSweep = async (page: Page): Promise<void> => {
	await page.mouse.move(640, 450);
	for (let step = 0; step < 16; step += 1) {
		await page.mouse.wheel(0, 700);
		await page.waitForTimeout(60);
	}
	await page.waitForTimeout(200);
};

const measure = async ({
	browser,
	base,
	item,
	run,
}: {
	browser: Browser;
	base: string;
	item: Case;
	run: number;
}): Promise<Result> => {
	const url = caseUrl(base, item);
	const pageErrors: string[] = [];
	const context = await browser.newContext({
		viewport: { width: 1280, height: 900 },
		deviceScaleFactor: item.dpr,
	});
	const result: Result = { ...item, run, url, ok: false, pageErrors };
	try {
		// Why: the webfont request is the one network variable; blocking it keeps
		// text measurement on the same fallback font in every run.
		await context.route(/assets\.ngrok\.com/, (route) => route.abort());
		const page = await context.newPage();
		page.on("pageerror", (error) => {
			pageErrors.push(error.message);
		});
		page.on("console", (message) => {
			// The blocked webfont logs one ERR_FAILED per run; it is not a chart error.
			if (message.type() === "error" && !message.text().includes("ERR_FAILED")) {
				pageErrors.push(message.text());
			}
		});
		const cdp = await context.newCDPSession(page);
		await cdp.send("Performance.enable");
		if (item.throttle > 1) {
			await cdp.send("Emulation.setCPUThrottlingRate", { rate: item.throttle });
		}
		const navStart = Date.now();
		await page.goto(url, { waitUntil: "commit" });
		await page.waitForFunction(() => window.__bench?.ready, undefined, {
			timeout: 240_000,
			polling: 250,
		});
		const navToReadyMs = Date.now() - navStart;
		await page.waitForTimeout(SETTLE_MS);
		const startupRecording = await stopFrames(page);
		const startupFrames = frameStats(startupRecording.deltas);
		const settleAt = await now(page);
		const metricsSettled = await readMetrics(cdp);
		const snapSettled = await page.evaluate(() => window.__bench.snapshot());
		if (run === 0 && item.throttle === 1) {
			await mkdir(path.join(RESULTS_DIR, "shots"), { recursive: true });
			await page.screenshot({
				path: path.join(
					RESULTS_DIR,
					"shots",
					`${item.animate ? "animated" : "static"}-${item.kind}-${item.mode}-n${item.n}-p${item.points}.png`,
				),
			});
		}
		const startupTasks = longTasksBetween(snapSettled, 0, settleAt);
		const libLoadedMs = snapSettled.marks["lib-loaded"] ?? -1;
		const chartsPaintedMs = snapSettled.marks["charts-painted"] ?? -1;
		result.timing = {
			navToReadyMs,
			libLoadedMs,
			chartsMountedMs: snapSettled.marks["charts-mounted"] ?? -1,
			chartsPaintedMs,
			mountMs: chartsPaintedMs - libLoadedMs,
			quietAtMs: quietAt(startupRecording, snapSettled, chartsPaintedMs),
			fcp: snapSettled.vitals.FCP,
			lcp: snapSettled.vitals.LCP,
			cls: snapSettled.vitals.CLS,
		};
		// Why from ZERO: the CDP counters are cumulative from navigation, so these
		// durations cover the whole load through the settle. `timing.mountMs` is
		// the mount window alone, and `trace.ts` breaks that window down.
		result.startup = {
			...mainThread(ZERO, metricsSettled),
			longTasks: startupTasks.length,
			tbtMs: tbt(startupTasks),
			frames: startupFrames,
		};

		// Why re-read: the snapshot walks and the screenshot above are harness work, not hover work.
		const metricsBeforeHover = await readMetrics(cdp);
		await startFrames(page);
		const hoverFrom = await now(page);
		await hoverSweep(page, 3);
		const hoverFrames = frameStats((await stopFrames(page)).deltas);
		const hoverTo = await now(page);
		const metricsHover = await readMetrics(cdp);
		const snapHover = await page.evaluate(() => window.__bench.snapshot());
		result.hover = {
			...mainThread(metricsBeforeHover, metricsHover),
			longTasks: longTasksBetween(snapHover, hoverFrom, hoverTo).length,
			frames: hoverFrames,
		};

		await clickAndKeys(page);
		const snapInput = await page.evaluate(() => window.__bench.snapshot());
		const inputEvents = snapInput.events.filter((event) => event.start >= hoverTo);
		result.input = {
			inp: snapInput.vitals.INP,
			maxEventMs: inputEvents.reduce((max, event) => Math.max(max, event.duration), 0),
			events: inputEvents.length,
		};

		await page.mouse.move(5, 5);
		await page.waitForTimeout(200);
		result.updateReplace = await updatePhase(page, cdp, "replace");
		result.updateShift = await updatePhase(page, cdp, "shift");

		const metricsBeforeScroll = await readMetrics(cdp);
		if (item.mode === "list") {
			await startFrames(page);
			await scrollSweep(page);
			const scrollFrames = frameStats((await stopFrames(page)).deltas);
			const metricsScroll = await readMetrics(cdp);
			result.scroll = { frames: scrollFrames, ...mainThread(metricsBeforeScroll, metricsScroll) };
		}

		const metricsEnd = await readMetrics(cdp);
		const memory = await page.evaluate(() => window.__bench.memory());
		const snapEnd = await page.evaluate(() => window.__bench.snapshot());
		result.memory = {
			jsHeapMB: toMB(metricsEnd.JSHeapUsedSize ?? 0),
			domNodes: snapEnd.domNodes,
			canvasCount: snapEnd.canvasCount,
			uaTotalMB: memory == null ? undefined : toMB(memory.total),
			uaByTypeMB:
				memory == null
					? undefined
					: Object.fromEntries(
							Object.entries(memory.byType).map(([key, bytes]) => [key, toMB(bytes)]),
						),
		};
		pageErrors.push(...snapEnd.errors);
		result.ok = true;
	} catch (error) {
		result.error = error instanceof Error ? error.message : String(error);
	} finally {
		await context.close();
	}
	return result;
};

const main = async (): Promise<void> => {
	const runs = Number(readArg("runs") ?? 1);
	const headed = hasFlag("headed");
	const cases = buildMatrix();
	const stamp = new Date().toISOString().replace(/[:.]/g, "-");
	const outFile = path.join(RESULTS_DIR, `${readArg("out") ?? `run-${stamp}`}.jsonl`);
	await mkdir(RESULTS_DIR, { recursive: true });

	const server = await startServer({ port: PORT, build: !hasFlag("no-build") });
	const base = server.base;
	const browser = await chromium.launch({ headless: !headed, channel: "chromium" });
	console.log(`${cases.length} cases × ${runs} runs → ${outFile}`);
	const browserCdp = await browser.newBrowserCDPSession();
	const info = await browserCdp.send("SystemInfo.getInfo");
	const gpu = JSON.stringify({
		featureStatus: info.gpu.featureStatus,
		driver: info.gpu.devices.map((device) => `${device.vendorString} ${device.deviceString}`),
	});
	console.log(`browser: ${browser.version()} headless=${!headed} gpu=${gpu}`);
	await appendFile(
		outFile,
		`${JSON.stringify({ meta: true, browser: browser.version(), headless: !headed, gpu })}\n`,
	);
	// Why a warm-up: the first page of a fresh browser pays cold caches no later case pays.
	const first = cases[0];
	if (first != null) {
		await measure({ browser, base, item: first, run: -1 });
	}
	let done = 0;
	const total = cases.length * runs;
	const started = Date.now();
	try {
		for (let run = 0; run < runs; run += 1) {
			for (const item of cases) {
				const result = await measure({ browser, base, item, run });
				await appendFile(outFile, `${JSON.stringify(result)}\n`);
				done += 1;
				const elapsed = (Date.now() - started) / 1000;
				const eta = Math.round((elapsed / done) * (total - done));
				const summary = result.ok
					? `mount ${Math.round(result.timing?.mountMs ?? 0)}ms quiet ${Math.round(result.timing?.quietAtMs ?? 0)}ms task ${Math.round(result.startup?.taskMs ?? 0)}ms tbt ${Math.round(result.startup?.tbtMs ?? 0)}ms upd ${Math.round(result.updateReplace?.taskMs ?? 0)}/${Math.round(result.updateShift?.taskMs ?? 0)}ms heap ${result.memory?.jsHeapMB}MB`
					: `ERROR ${result.error}`;
				console.log(
					`[${done}/${total} eta ${eta}s] ${item.animate ? "animated" : "static"} ${item.kind} ${item.mode} n=${item.n} p=${item.points} x${item.throttle}: ${summary}${result.pageErrors.length > 0 ? ` pageErrors=${result.pageErrors.length}` : ""}`,
				);
			}
		}
	} finally {
		await browser.close();
		server.close();
	}
};

await main();
