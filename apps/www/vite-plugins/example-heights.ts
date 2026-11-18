import { mkdir, readFile, writeFile } from "node:fs/promises";
import { availableParallelism } from "node:os";
import path from "node:path";
import type { Browser, Page } from "playwright";
import { globSync } from "tinyglobby";
import { preview, type Plugin, type ResolvedConfig } from "vite";
import {
	exampleHeightsFile,
	previewHydratedEvent,
	type ExampleHeight,
	type ExampleHeights,
} from "../app/features/example-heights.ts";

/** The window widths the measure uses for a desktop and a phone reader. */
const windowWidths = { wide: 1440, narrow: 390 } as const;

/** A docs page with a content-height example, to find the frame width at each window width. */
const probePage = "/components/actions/button";

/** The number of preview documents to measure at the same time: one for each core, eight at most. */
const concurrency = Math.min(8, availableParallelism());

/**
 * Measures the height of each docs page example after the production build
 * and before React Router prerenders the pages. It writes the heights to
 * `exampleHeightsFile`, and the `doc-page` loader gives each page the heights
 * of its own examples. Each frame then has its example's height at the first
 * paint, so the page does not shift when the preview loads.
 *
 * It runs only when `MEASURE_EXAMPLE_HEIGHTS=1`, because it needs Chromium:
 * the production image build sets it. Without it, each frame grows to its
 * example's height after the preview loads.
 *
 * Why `buildApp` with `order: "post"`: React Router builds the bundles in its
 * own `buildApp` hook and prerenders in a later `post` hook from a plugin with
 * `enforce: "post"`, so this hook runs between the two.
 */
export function exampleHeights(docsDir: string): Plugin {
	let config: ResolvedConfig;
	return {
		name: "example-heights",
		apply: "build",
		configResolved(resolved) {
			config = resolved;
		},
		buildApp: {
			order: "post",
			async handler() {
				if (process.env.MEASURE_EXAMPLE_HEIGHTS !== "1") {
					return;
				}
				const keys = await contentHeightExampleKeys(docsDir);
				const started = performance.now();
				const heights = await measure(config, keys);
				const outputPath = path.resolve(config.root, exampleHeightsFile);
				await mkdir(path.dirname(outputPath), { recursive: true });
				await writeFile(outputPath, `${JSON.stringify(heights)}\n`);
				const seconds = ((performance.now() - started) / 1000).toFixed(1);
				config.logger.info(`Measured ${keys.length} example heights in ${seconds}s`);
			},
		},
	};
}

/**
 * The preview key of each `<Example>` that grows to its content: a page
 * example (`<page>/<name>`) without `height="fixed"`.
 */
async function contentHeightExampleKeys(docsDir: string): Promise<ReadonlyArray<string>> {
	const keys = new Set<string>();
	for (const file of globSync("**/*.mdx", { cwd: docsDir })) {
		const source = await readFile(path.join(docsDir, file), "utf8");
		for (const [, attributes = ""] of source.matchAll(/<Example\b([^>]*)>/g)) {
			const name = /\bname="([^"]+)"/.exec(attributes)?.[1];
			if (name?.includes("/") && !/\bheight="fixed"/.test(attributes)) {
				keys.add(name);
			}
		}
	}
	return [...keys].toSorted();
}

async function measure(
	config: ResolvedConfig,
	keys: ReadonlyArray<string>,
): Promise<ExampleHeights> {
	const server = await preview({
		configFile: config.configFile,
		logLevel: "silent",
		preview: { port: 0, open: false },
	});
	let browser: Browser | undefined;
	try {
		const base = server.resolvedUrls?.local[0];
		if (base == null) {
			throw new Error("The preview server has no local URL to measure the examples on.");
		}
		// Why a dynamic import: the dev server and the tests load this config too.
		const { chromium } = await import("playwright");
		browser = await chromium.launch();
		const context = await browser.newContext();
		const frameWidths = await measureFrameWidths(await context.newPage(), base);
		const heights: ExampleHeights = {};
		const queue = [...keys];
		await Promise.all(
			Array.from({ length: concurrency }, async () => {
				const page = await context.newPage();
				const measureExample = exampleMeasurer(page, frameWidths);
				for (let key = queue.shift(); key != null; key = queue.shift()) {
					const url = new URL(`preview/${key}`, base);
					// Why one retry: on a busy build machine, one request can stall a page
					// that loads in under a second on the next try.
					heights[key] = await measureExample(url).catch((error: unknown) => {
						config.logger.warn(`Measuring ${url.pathname} again: ${String(error)}`);
						return measureExample(url);
					});
				}
				await page.close();
			}),
		);
		return Object.fromEntries(Object.entries(heights).toSorted(([a], [b]) => a.localeCompare(b)));
	} finally {
		await browser?.close();
		await server.close();
	}
}

/** The inner width of a docs frame at the desktop and the phone window width. */
async function measureFrameWidths(page: Page, base: string) {
	const frameWidth = async (windowWidth: number) => {
		await page.setViewportSize({ width: windowWidth, height: 900 });
		await page.goto(new URL(probePage, base).href);
		return page
			.locator('iframe[src^="/preview/"]')
			.first()
			.evaluate((frame) => frame.clientWidth);
	};
	const widths = {
		wide: await frameWidth(windowWidths.wide),
		narrow: await frameWidth(windowWidths.narrow),
	};
	await page.close();
	// Why 768: the frame picks the `wide` height from 48rem (`@3xl`) up.
	if (widths.wide < 768 || widths.narrow >= 768) {
		throw new Error(`The docs frame widths do not straddle 48rem: ${JSON.stringify(widths)}`);
	}
	return widths;
}

/**
 * Returns a function that loads a preview in `page` and measures its canvas
 * at each frame width.
 */
function exampleMeasurer(page: Page, frameWidths: { wide: number; narrow: number }) {
	const openRequests = new Set<string>();
	page.on("request", (request) => openRequests.add(request.url()));
	page.on("requestfinished", (request) => openRequests.delete(request.url()));
	page.on("requestfailed", (request) => openRequests.delete(request.url()));
	// Why: a docs frame keeps the measured height until its preview hydrates, so
	// measure the hydrated preview.
	const hydrated = page.locator("html[data-preview-hydrated]");
	const watchHydration = page.addInitScript((event) => {
		addEventListener(event, () => {
			document.documentElement.dataset.previewHydrated = "";
		});
	}, previewHydratedEvent);
	const canvasHeight = async (width: number) => {
		await page.setViewportSize({ width, height: 900 });
		const canvasLocator = page.locator("[data-preview-canvas]");
		// Why wait: React can keep a streamed canvas in a hidden container until its
		// reveal timer runs, after the load event.
		await canvasLocator.waitFor({ state: "visible" });
		return canvasLocator.evaluate(async (canvas) => {
			// Why: a docs frame is as tall as its canvas, so it never shows a scrollbar
			// that takes width from the example.
			document.documentElement.style.scrollbarWidth = "none";
			await document.fonts.ready;
			if ([...document.fonts].some((font) => font.status === "error")) {
				throw new Error("A web font did not load, so the height would be wrong.");
			}
			// Why two frames: the layout settles after the resize and the hydration.
			await new Promise((resolve) => {
				requestAnimationFrame(() => {
					requestAnimationFrame(resolve);
				});
			});
			const height = Math.ceil(canvas.getBoundingClientRect().height);
			if (height <= 0) {
				throw new Error(`The canvas is ${height}px tall.`);
			}
			return height;
		});
	};
	return async (url: URL): Promise<ExampleHeight> => {
		await watchHydration;
		const response = await page.goto(url.href, { waitUntil: "load" }).catch((error: unknown) => {
			const open = [...openRequests].join(", ") || "none";
			throw new Error(`The preview ${url.pathname} did not load. Open requests: ${open}`, {
				cause: error,
			});
		});
		if (!response?.ok()) {
			throw new Error(`The preview ${url.pathname} answered ${response?.status()}.`);
		}
		try {
			await hydrated.waitFor({ state: "attached" });
			return {
				wide: await canvasHeight(frameWidths.wide),
				narrow: await canvasHeight(frameWidths.narrow),
			};
		} catch (error) {
			throw new Error(`Could not measure the preview ${url.pathname}.`, { cause: error });
		}
	};
}
