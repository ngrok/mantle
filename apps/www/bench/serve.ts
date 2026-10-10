/**
 * Builds the docs site and serves the production build for a benchmark run.
 * Every driver in this directory goes through `startServer`, so a run always
 * measures the same bundle a deploy ships.
 */
import { execFileSync, spawn } from "node:child_process";
import path from "node:path";

export const APP_ROOT = path.resolve(import.meta.dirname, "..");
export const RESULTS_DIR = path.join(APP_ROOT, "bench", "results");

/** The page every driver loads; the scenario rides in the query string. */
export const BENCH_PATH = "/bench/charts";

export type Server = {
	/** The origin the server answers on, with a trailing slash. */
	base: string;
	close: () => void;
};

const readyAt = async (url: string, attempts: number): Promise<void> => {
	for (let attempt = 0; attempt < attempts; attempt += 1) {
		try {
			const response = await fetch(url, { method: "HEAD" });
			if (response.ok || response.status === 404) {
				return;
			}
		} catch {
			// Not listening yet.
		}
		await new Promise((resolve) => {
			setTimeout(resolve, 250);
		});
	}
	throw new Error(`The server at ${url} did not come up`);
};

/**
 * Build (unless `build` is false) and serve the site on `port`. Resolves once
 * the server answers.
 *
 * @example
 * ```ts
 * const server = await startServer({ port: 3445, build: !hasFlag("no-build") });
 * await page.goto(`${server.base}bench/charts?mode=table&n=100`);
 * server.close();
 * ```
 */
export const startServer = async (options: { port: number; build: boolean }): Promise<Server> => {
	if (options.build) {
		execFileSync("pnpm", ["run", "build"], { cwd: APP_ROOT, stdio: "inherit" });
	}
	const child = spawn("pnpm", ["exec", "react-router-serve", "build/server/index.js"], {
		cwd: APP_ROOT,
		env: { ...process.env, PORT: String(options.port), NODE_ENV: "production" },
		stdio: ["ignore", "ignore", "inherit"],
	});
	const base = `http://localhost:${options.port}/`;
	try {
		await readyAt(base, 120);
	} catch (error) {
		child.kill();
		throw error;
	}
	return {
		base,
		close: () => {
			child.kill();
		},
	};
};
