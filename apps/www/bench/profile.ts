/**
 * Captures a CPU profile of one scenario from navigation to settle and prints
 * the functions with the most self time. Run:
 * `pnpm bench:profile -- "?lib=mantle&kind=line&mode=list&n=50&points=30" --no-build`.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { BENCH_PATH, RESULTS_DIR, startServer } from "./serve";

const PORT = 3446;

const query = process.argv[2] ?? "?lib=mantle&kind=line&mode=list&n=50&points=30";
const throttle = Number(
	process.argv.find((argument) => argument.startsWith("--throttle="))?.slice(11) ?? 1,
);
const top = Number(process.argv.find((argument) => argument.startsWith("--top="))?.slice(6) ?? 40);
const build = !process.argv.includes("--no-build");

const server = await startServer({ port: PORT, build });
const base = server.base;
const browser = await chromium.launch({ headless: true, channel: "chromium" });
try {
	const context = await browser.newContext({
		viewport: { width: 1280, height: 900 },
		deviceScaleFactor: 2,
	});
	await context.route(/assets\.ngrok\.com/, (route) => route.abort());
	const page = await context.newPage();
	const cdp = await context.newCDPSession(page);
	if (throttle > 1) {
		await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
	}
	await cdp.send("Profiler.enable");
	await cdp.send("Profiler.setSamplingInterval", { interval: 100 });
	await cdp.send("Profiler.start");
	await page.goto(`${base}${BENCH_PATH.slice(1)}${query}`, { waitUntil: "commit" });
	await page.waitForFunction(() => window.__bench?.ready === true, undefined, {
		timeout: 240_000,
		polling: 250,
	});
	await page.waitForTimeout(2000);
	const { profile } = await cdp.send("Profiler.stop");
	await mkdir(RESULTS_DIR, { recursive: true });
	const slug = query.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
	await writeFile(
		path.join(RESULTS_DIR, `${slug}-x${throttle}.cpuprofile`),
		JSON.stringify(profile),
	);
	printSummary(profile);
} finally {
	await browser.close();
	server.close();
}

type ProfileNode = {
	id: number;
	callFrame: { functionName: string; url: string; lineNumber: number };
};
type Profile = { nodes: ProfileNode[]; samples?: number[]; timeDeltas?: number[] };

function printSummary(profile: Profile): void {
	const selfMicros = new Map<number, number>();
	const deltas = profile.timeDeltas ?? [];
	const samples = profile.samples ?? [];
	for (let index = 0; index < samples.length; index += 1) {
		const node = samples[index];
		if (node == null) {
			continue;
		}
		selfMicros.set(node, (selfMicros.get(node) ?? 0) + (deltas[index] ?? 0));
	}
	const byFunction = new Map<string, number>();
	const byFile = new Map<string, number>();
	let total = 0;
	for (const node of profile.nodes) {
		const micros = selfMicros.get(node.id) ?? 0;
		if (micros === 0) {
			continue;
		}
		const frame = node.callFrame;
		const file = frame.url.replace(/^.*\/assets\//, "").replace(/\?.*$/, "") || "(native)";
		const name = `${frame.functionName || "(anonymous)"} ${file}:${frame.lineNumber + 1}`;
		if (["(idle)", "(program)", "(garbage collector)", "(root)"].includes(frame.functionName)) {
			byFunction.set(frame.functionName, (byFunction.get(frame.functionName) ?? 0) + micros);
			byFile.set(frame.functionName, (byFile.get(frame.functionName) ?? 0) + micros);
		} else {
			byFunction.set(name, (byFunction.get(name) ?? 0) + micros);
			byFile.set(file, (byFile.get(file) ?? 0) + micros);
		}
		total += micros;
	}
	const print = (title: string, map: Map<string, number>) => {
		console.log(`\n${title} (total sampled ${(total / 1000).toFixed(0)} ms)`);
		const sorted = [...map.entries()].toSorted((left, right) => right[1] - left[1]).slice(0, top);
		for (const [name, micros] of sorted) {
			console.log(
				`${(micros / 1000).toFixed(1).padStart(8)} ms  ${((micros / total) * 100).toFixed(1).padStart(5)}%  ${name}`,
			);
		}
	};
	print("self time by file", byFile);
	print("self time by function", byFunction);
}
