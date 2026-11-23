#!/usr/bin/env node

/**
 * Installs the Playwright browsers for the vitest browser tests: each engine in
 * `MANTLE_BROWSERS` (a comma-separated list), or Chromium alone.
 *
 * Skips installation when connecting to a remote Playwright server
 * (i.e., PLAYWRIGHT_WS_ENDPOINT is set), since the browser runs remotely.
 *
 * Usage:
 *   node scripts/install-playwright.js
 *
 * To run browser tests with a visible Chromium window locally:
 *   DISABLE_HEADLESS=1 pnpm -w run test -F @ngrok/mantle
 */

import { execSync } from "node:child_process";

if (process.env.PLAYWRIGHT_WS_ENDPOINT) {
	console.log("PLAYWRIGHT_WS_ENDPOINT is set; skipping the local browser install.");
	process.exit(0);
}

const browsers = (process.env.MANTLE_BROWSERS ?? "chromium")
	.split(",")
	.map((browser) => browser.trim())
	.join(" ");

console.log(`Installing Playwright browsers: ${browsers}...`);
execSync(`pnpm --filter @ngrok/mantle exec playwright install ${browsers}`, {
	stdio: "inherit",
});
