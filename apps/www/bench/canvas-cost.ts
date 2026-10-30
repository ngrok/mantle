/**
 * The raw cost of canvas setup and paint for N sparkline-sized canvases, with
 * no React and no engine: how much of a chart's first paint is the browser's.
 * Run: `node bench/canvas-cost.ts [count]`.
 */
import { chromium } from "playwright";

const count = Number(process.argv.slice(2).find((argument) => !argument.startsWith("--")) ?? 40);
const browser = await chromium.launch({ headless: true, channel: "chromium" });
try {
	const context = await browser.newContext({
		viewport: { width: 1280, height: 900 },
		deviceScaleFactor: 2,
	});
	const page = await context.newPage();
	await page.setContent(
		"<!doctype html><main id=m style='display:flex;flex-wrap:wrap;gap:4px'></main>",
	);
	const run = (n: number, mode: string) =>
		page.evaluate(
			({ n, mode }) => {
				const main = document.getElementById("m");
				if (main == null) {
					return null;
				}
				main.replaceChildren();
				const dpr = devicePixelRatio;
				const t0 = performance.now();
				const canvases: HTMLCanvasElement[] = [];
				for (let i = 0; i < n; i += 1) {
					const c = document.createElement("canvas");
					c.style.width = "112px";
					c.style.height = "24px";
					main.append(c);
					canvases.push(c);
				}
				const t1 = performance.now();
				const contexts: CanvasRenderingContext2D[] = [];
				for (const c of canvases) {
					c.width = Math.round(112 * dpr);
					c.height = Math.round(24 * dpr);
					const ctx = c.getContext("2d");
					if (ctx != null) {
						contexts.push(ctx);
					}
				}
				const t2 = performance.now();
				for (const ctx of contexts) {
					if (mode === "font") {
						ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
						ctx.measureText("Jan 12");
					}
					ctx.fillStyle = "oklch(62.2% .203 259)";
					for (let b = 0; b < 12; b += 1) {
						ctx.fillRect(b * 18, 10 + (b % 5) * 6, 14, 48 - (b % 5) * 6);
					}
				}
				const t3 = performance.now();
				return {
					createMs: t1 - t0,
					sizeAndContextMs: t2 - t1,
					paintMs: t3 - t2,
					perCanvasUs: ((t3 - t0) / n) * 1000,
				};
			},
			{ n, mode },
		);
	// Warm up the JIT and the canvas machinery, then measure.
	await run(count, "plain");
	await page.waitForTimeout(200);
	for (const mode of ["plain", "font"]) {
		const results = [];
		for (let i = 0; i < 3; i += 1) {
			results.push(await run(count, mode));
			await page.waitForTimeout(100);
		}
		console.log(`${count} canvases, ${mode}:`, JSON.stringify(results));
	}
} finally {
	await browser.close();
}
