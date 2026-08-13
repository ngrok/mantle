import { playwright, type PlaywrightProviderOptions } from "@vitest/browser-playwright";
import babel from "vite-plugin-babel";
import { configDefaults, defineConfig } from "vitest/config";

type ContextOptions = Pick<PlaywrightProviderOptions, "contextOptions">["contextOptions"];

// Grant clipboard permissions so browser tests can read/write the real clipboard, and pin the
// timezone and locale so date/number formatting is deterministic. Chromium takes these from the
// Playwright context, not `process.env`, so the `env` pin below cannot reach it.
const contextOptions = {
	locale: "en-US",
	permissions: ["clipboard-read", "clipboard-write"],
	timezoneId: "UTC",
} as const satisfies ContextOptions;

// The published dist ships React Compiler output (see `tsdown.config.ts`), so tests must run the
// same compiled components: a suite that runs uncompiled source never executes what npm consumers
// get. Test files stay uncompiled, because a consumer's own code is not compiled either.
const reactCompiler = () =>
	babel({
		include: [`${import.meta.dirname}/src/**/*.{ts,tsx}`],
		exclude: [`${import.meta.dirname}/src/**/*.test.{ts,tsx}`],
		babelConfig: {
			presets: ["@babel/preset-typescript"],
			plugins: ["babel-plugin-react-compiler"],
			sourceMaps: true,
		},
	});

// Both projects inherit every option here (Vitest 5 defaults projects to `extends: true`), so a
// hygiene or locale pin is written once and cannot drift between them.
export default defineConfig({
	test: {
		// A spy or global stub that a test installs and then fails to tear down leaks into every test
		// that runs after it, which turns an unrelated failure into a cascade and makes results depend
		// on order. Restoring centrally means an inline `mockRestore()` is never load-bearing: a test
		// that throws before it reaches its cleanup line still leaves the environment pristine.
		restoreMocks: true,
		unstubEnvs: true,
		unstubGlobals: true,
		// Locale- and timezone-sensitive assertions (chart tick formatting, `Intl` number output) need
		// the pin to survive a single-file run and an editor-driven run, neither of which goes through
		// the package's `test` script, so it lives here rather than in `package.json`.
		// Why a forked pool in both projects: a forked worker reads `LC_ALL` at start, so ICU honors
		// it. A `threads` worker shares the parent's locale, and this pin would not reach `Intl`.
		env: {
			LANG: "en_US.UTF-8",
			LC_ALL: "en_US.UTF-8",
			TZ: "UTC",
		},
		setupFiles: "./vitest.setup.ts",
		projects: [
			{
				plugins: [reactCompiler()],
				test: {
					name: "unit",
					environment: "happy-dom",
					include: ["**/*.test.{ts,tsx}"],
					exclude: [...configDefaults.exclude, "**/*.browser.test.{ts,tsx}"],
					// Why: the theme and chart tests import the shipped stylesheets with `?raw`, and
					// without this Vitest hands them an empty module.
					css: true,
					// Why `vmForks`: `forks` builds a fresh happy-dom for each of 137 files, a third of the
					// run. `vmForks` builds one per worker and still gives each file its own `vm` context.
					// `isolate: false` is as fast, but the suite leaks across files under a shuffled order
					// (`button`, `alert-dialog`), so the per-file context stays.
					pool: "vmForks",
				},
			},
			{
				plugins: [reactCompiler()],
				test: {
					name: "browser",
					include: ["**/*.browser.test.{ts,tsx}"],
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
				},
			},
		],
	},
});
