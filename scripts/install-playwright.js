#!/usr/bin/env node

/**
 * Installs the Chromium browser for Playwright-based vitest browser tests.
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
	console.log("PLAYWRIGHT_WS_ENDPOINT is set — skipping local Chromium install.");
	process.exit(0);
}

console.log("Installing Playwright Chromium browser...");
execSync("pnpm --filter @ngrok/mantle exec playwright install chromium", {
	stdio: "inherit",
});
