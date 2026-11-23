/**
 * The sheet open benchmark. Builds the site, serves the production build, and
 * taps the trigger of `/bench/sheet` on a throttled phone-sized page, once per
 * run for each implementation (a sheet that mounts on open, and one that
 * stays mounted with `forceMount`), in turn.
 *
 * Each run reports the tap's Interaction to Next Paint (the longest Event
 * Timing entry of the tap) and the longest animation frame in the second
 * after the tap (0 when no frame reaches the 50ms long-frame floor). The load
 * side of the trade-off rides along: the document's HTML bytes and the main
 * thread's script time until the page settles.
 *
 * Run from the package: `pnpm bench:sheet -- --runs=10 --throttle=4`.
 */
import { chromium } from "playwright";
import { startServer } from "./serve.ts";

type Run = {
	impl: "default" | "mounted";
	inpMs: number;
	longestFrameMs: number;
	open: boolean;
	htmlBytes: number;
	loadScriptMs: number;
};

declare global {
	interface Window {
		__sheetBench: {
			events: { interactionId: number; duration: number }[];
			frames: { startTime: number; duration: number }[];
		};
	}
}

const readArg = (name: string): string | undefined =>
	process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1];

const runs = Number(readArg("runs") ?? "10");
const throttle = Number(readArg("throttle") ?? "4");

const median = (values: number[]): number => {
	const sorted = values.toSorted((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
		: (sorted[middle] ?? 0);
};

const p75 = (values: number[]): number => {
	const sorted = values.toSorted((a, b) => a - b);
	return sorted[Math.ceil(sorted.length * 0.75) - 1] ?? 0;
};

const server = await startServer({ port: 3446, build: !process.argv.includes("--no-build") });
const browser = await chromium.launch();

const measure = async (impl: Run["impl"]): Promise<Run> => {
	const context = await browser.newContext({
		viewport: { width: 412, height: 915 },
		deviceScaleFactor: 2.625,
		isMobile: true,
		hasTouch: true,
	});
	// Why: the webfont request is the one network variable between runs.
	await context.route(/assets\.ngrok\.com/, (route) => route.abort());
	await context.addInitScript(() => {
		window.__sheetBench = { events: [], frames: [] };
		new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				if (entry instanceof PerformanceEventTiming && entry.interactionId > 0) {
					window.__sheetBench.events.push({
						interactionId: entry.interactionId,
						duration: entry.duration,
					});
				}
			}
		}).observe({ type: "event", durationThreshold: 16, buffered: true });
		new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				window.__sheetBench.frames.push({ startTime: entry.startTime, duration: entry.duration });
			}
		}).observe({ type: "long-animation-frame", buffered: true });
	});
	const page = await context.newPage();
	const cdp = await context.newCDPSession(page);
	await cdp.send("Performance.enable");
	await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
	const response = await page.goto(`${server.base}bench/sheet?impl=${impl}`, {
		waitUntil: "networkidle",
	});
	const htmlBytes = (await response?.body())?.byteLength ?? 0;
	// Why the settle: hydration and idle work must end before the tap.
	await page.waitForTimeout(3000);
	const { metrics } = await cdp.send("Performance.getMetrics");
	const loadScriptMs =
		(metrics.find((metric) => metric.name === "ScriptDuration")?.value ?? 0) * 1000;

	const tapAt = await page.evaluate(() => performance.now());
	const box = await page.locator("[data-bench-trigger]").boundingBox();
	if (box == null) {
		throw new Error("The bench trigger did not render.");
	}
	await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
	await page.waitForTimeout(1500);

	const result = await page.evaluate((since) => {
		const { events, frames } = window.__sheetBench;
		const lastInteraction = Math.max(0, ...events.map((event) => event.interactionId));
		return {
			inpMs: Math.max(
				0,
				...events
					.filter((event) => event.interactionId === lastInteraction)
					.map((event) => event.duration),
			),
			longestFrameMs: Math.max(
				0,
				...frames
					.filter((frame) => frame.startTime >= since && frame.startTime < since + 1000)
					.map((frame) => frame.duration),
			),
			open: document.querySelector("[data-slot~='sheet-content'][data-state='open']") != null,
		};
	}, tapAt);
	await context.close();
	return { impl, htmlBytes, loadScriptMs, ...result };
};

const results: Run[] = [];
for (let run = 0; run < runs; run += 1) {
	for (const impl of ["default", "mounted"] as const) {
		const result = await measure(impl);
		results.push(result);
		console.log(
			`[${run + 1}/${runs}] ${impl}: INP ${result.inpMs}ms, longest frame ${Math.round(result.longestFrameMs)}ms, open ${result.open}`,
		);
	}
}

await browser.close();
server.close();

console.log(`\n${throttle}x CPU throttle, 412x915, median (p75) of ${runs} taps`);
for (const impl of ["default", "mounted"] as const) {
	const rows = results.filter((result) => result.impl === impl);
	const column = (key: "inpMs" | "longestFrameMs" | "loadScriptMs") =>
		`${Math.round(median(rows.map((row) => row[key])))} (${Math.round(p75(rows.map((row) => row[key])))})`;
	console.log(
		`${impl.padEnd(7)} INP ${column("inpMs")} ms | longest frame after tap ${column("longestFrameMs")} ms | load script ${column("loadScriptMs")} ms | HTML ${rows[0]?.htmlBytes ?? 0} B | opened ${rows.every((row) => row.open)}`,
	);
}
