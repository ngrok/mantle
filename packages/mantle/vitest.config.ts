import { playwright, type PlaywrightProviderOptions } from "@vitest/browser-playwright";
import { configDefaults, defineConfig } from "vitest/config";

type ContextOptions = Pick<PlaywrightProviderOptions, "contextOptions">["contextOptions"];

// Grant clipboard permissions so browser tests can read/write the real clipboard, and pin the
// timezone and locale so date/number formatting is deterministic. Chromium takes these from the
// Playwright context, not `process.env`, so the `localeHygiene` pin below cannot reach it.
const contextOptions = {
	locale: "en-US",
	permissions: ["clipboard-read", "clipboard-write"],
	timezoneId: "UTC",
} as const satisfies ContextOptions;

// A spy or global stub that a test installs and then fails to tear down leaks into every test that
// runs after it, which turns an unrelated failure into a cascade and makes results depend on order.
// Restoring centrally means an inline `mockRestore()` is never load-bearing — a test that throws
// before reaching its cleanup line still leaves the environment pristine.
const mockHygiene = {
	restoreMocks: true,
	unstubEnvs: true,
	unstubGlobals: true,
} as const;

// Locale- and timezone-sensitive assertions (chart tick formatting, `Intl` number output) need the
// pin to survive a single-file run and an editor-driven run, neither of which goes through the
// package's `test` script — so it lives here rather than only in `package.json`.
const localeHygiene = {
	env: {
		LANG: "en_US.UTF-8",
		LC_ALL: "en_US.UTF-8",
		TZ: "UTC",
	},
} as const;

export default defineConfig({
	test: {
		reporters: ["verbose"],
		projects: [
			{
				test: {
					name: "unit",
					environment: "happy-dom",
					include: ["**/*.test.{ts,tsx}"],
					exclude: [...configDefaults.exclude, "**/*.browser.test.{ts,tsx}"],
					setupFiles: "./vitest.setup.ts",
					css: true,
					...mockHygiene,
					...localeHygiene,
				},
			},
			{
				test: {
					name: "browser",
					include: ["**/*.browser.test.{ts,tsx}"],
					...mockHygiene,
					browser: {
						enabled: true,
						screenshotFailures: false,
						headless:
							!process.env.DISABLE_HEADLESS ||
							process.env.CI === "1" ||
							/true/i.test(process.env.CI ?? ""),
						provider: process.env.PLAYWRIGHT_WS_ENDPOINT
							? playwright({
									connectOptions: { wsEndpoint: process.env.PLAYWRIGHT_WS_ENDPOINT },
									contextOptions,
								})
							: playwright({ contextOptions }),
						instances: [{ browser: "chromium" }],
					},
					setupFiles: "./vitest.setup.ts",
				},
			},
		],
	},
});
