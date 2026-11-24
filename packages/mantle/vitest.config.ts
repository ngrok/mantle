import { readFile } from "node:fs/promises";
import path from "node:path";

import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";
import { playwright, type PlaywrightProviderOptions } from "@vitest/browser-playwright";
import type { CDPSession } from "playwright";
import { configDefaults, defineConfig } from "vitest/config";
import type { BrowserCommand } from "vitest/node";

import { compileReact } from "./react-compiler.config.ts";
import { foldCxPlugin } from "./scripts/fold-cx.ts";

type ContextOptions = Pick<PlaywrightProviderOptions, "contextOptions">["contextOptions"];

/** The engines the browser project can run, one Playwright browser each. */
type Engine = "chromium" | "firefox" | "webkit";

/**
 * The engines this run uses: `MANTLE_BROWSERS`, a comma-separated list, or
 * Chromium alone. CI runs one job for each engine, in parallel.
 */
const engines = (process.env.MANTLE_BROWSERS || "chromium").split(",").map((name): Engine => {
	const engine = name.trim();
	if (engine !== "chromium" && engine !== "firefox" && engine !== "webkit") {
		throw new Error(`MANTLE_BROWSERS takes chromium, firefox, or webkit, not "${engine}".`);
	}
	return engine;
});

// Pin the timezone and locale so date/number formatting is deterministic. A browser takes these
// from the Playwright context, not `process.env`, so the `env` pin below cannot reach it.
// Why clipboard permissions in Chromium only: Firefox has none to grant, and Playwright refuses
// the context. `copy-to-clipboard.browser.test.ts` runs in Chromium for the same reason.
const contextOptionsFor = (engine: Engine) =>
	({
		locale: "en-US",
		timezoneId: "UTC",
		...(engine === "chromium" ? { permissions: ["clipboard-read", "clipboard-write"] } : {}),
	}) satisfies ContextOptions;

// Why chromiumSandbox: Playwright starts Chromium with `--no-sandbox` by default. Without the
// sandbox, one renderer bug runs code with the access of the user.
const providerFor = (engine: Engine) =>
	process.env.PLAYWRIGHT_WS_ENDPOINT
		? playwright({
				connectOptions: { wsEndpoint: process.env.PLAYWRIGHT_WS_ENDPOINT },
				contextOptions: contextOptionsFor(engine),
			})
		: playwright({
				contextOptions: contextOptionsFor(engine),
				launchOptions: engine === "chromium" ? { chromiumSandbox: true } : {},
			});

/**
 * The media features a browser test can emulate through `commands.emulateMedia`.
 * A feature left out keeps its current emulation.
 */
type EmulatedMedia = {
	colorScheme?: "light" | "dark";
	reducedMotion?: "reduce" | "no-preference";
	forcedColors?: "active" | "none";
	/** Chromium only. `"none"` turns on touch emulation, which also sets `pointer: coarse`. */
	hover?: "hover" | "none";
};

// Why a command: a media feature such as `prefers-reduced-motion` is a Playwright
// page emulation, and no script inside the test iframe can set it.
// Why wait on the frame: Firefox applies the emulation to the test iframe after
// `emulateMedia` resolves, so a test that renders at once still reads the old value.
// Why touch emulation for `hover`: Playwright's `emulateMedia` has no hover feature,
// and Chromium ignores `hover` in `Emulation.setEmulatedMedia`. Why one session for
// each page: the emulation belongs to the session that turned it on.
const touchSessions = new WeakMap<object, CDPSession>();
const emulateMedia: BrowserCommand<[options: EmulatedMedia]> = async (context, options) => {
	const { hover, ...playwrightOptions } = options;
	await context.page.emulateMedia(playwrightOptions);
	const frame = await context.frame();
	if (hover != null) {
		const session =
			touchSessions.get(context.page) ?? (await context.page.context().newCDPSession(context.page));
		touchSessions.set(context.page, session);
		await session.send("Emulation.setTouchEmulationEnabled", {
			enabled: hover === "none",
			maxTouchPoints: 1,
		});
	}
	const queries = Object.entries({
		"prefers-color-scheme": options.colorScheme,
		"prefers-reduced-motion": options.reducedMotion,
		"forced-colors": options.forcedColors,
		hover,
	}).flatMap(([feature, value]) => (value == null ? [] : [`(${feature}: ${value})`]));
	await frame.waitForFunction((list) => list.every((query) => matchMedia(query).matches), queries);
};

/**
 * The `@custom-variant` rules of `mantle.css`, which sit in one run before its
 * base layer. Without them, Tailwind compiles a class such as
 * `data-state-inactive:invisible` to nothing.
 */
const mantleCustomVariants = async (): Promise<string> => {
	const css = await readFile(path.join(import.meta.dirname, "src/mantle.css"), "utf8");
	const start = css.indexOf("@custom-variant");
	const end = css.indexOf("@layer base", start);
	if (start === -1 || end === -1) {
		throw new Error("mantle.css holds no run of @custom-variant rules before its base layer.");
	}
	return css.slice(start, end);
};

/**
 * The `focus-ring`, `theme-switcher-name`, `otp-input-overlay`, and
 * `scroll-cue-y` utilities of `mantle.css`. Without them, Tailwind compiles
 * `focus-visible:focus-ring` to nothing, so a focused element keeps the
 * browser outline, a `ThemeSwitcher` has no name, the `OtpInput` input does
 * not lie over its slots, and a picker list shows no scroll cue.
 */
const mantleUtilities = async (): Promise<string> => {
	const css = await readFile(path.join(import.meta.dirname, "src/mantle.css"), "utf8");
	const rules = css.match(
		/^@utility (?:focus-ring|theme-switcher-name|otp-input-overlay|scroll-cue-y)[^{]*\{[\s\S]*?^\}/gm,
	);
	if (rules == null) {
		throw new Error("mantle.css holds no focus-ring or theme-switcher-name utilities.");
	}
	return rules.join("\n");
};

/**
 * The `--animate-*` tokens and their keyframes from the `@theme inline` block of
 * `mantle.css`. Without them, Tailwind compiles `animate-shake` to nothing.
 */
const mantleAnimations = async (): Promise<string> => {
	const css = await readFile(path.join(import.meta.dirname, "src/mantle.css"), "utf8");
	const tokens = [...css.matchAll(/^\t--animate-([\w-]+):[^;]*;/gm)];
	if (tokens.length === 0) {
		throw new Error("mantle.css holds no --animate-* tokens.");
	}
	const rules = tokens.map(([token, name]) => {
		const keyframes = new RegExp(`^\\t@keyframes ${name} \\{[\\s\\S]*?^\\t\\}`, "m").exec(css);
		if (keyframes == null) {
			throw new Error(`mantle.css holds no keyframes for --animate-${name}.`);
		}
		return `${token}\n${keyframes[0]}`;
	});
	return `@theme inline {\n${rules.join("\n")}\n}`;
};

/** The `ease-*` tokens of mantle's theme, so a test reads the curve that a component's class compiles to. */
const mantleEasings = async (): Promise<string> => {
	const css = await readFile(path.join(import.meta.dirname, "src/mantle.css"), "utf8");
	const tokens = css.match(/^\s*--ease-[\w-]+:[^;]+;/gm);
	if (tokens == null) {
		throw new Error("mantle.css holds no ease tokens.");
	}
	return `@theme {${tokens.join("")}}`;
};

// Why a command: a browser test asserts layout, so it needs the CSS that Tailwind
// really compiles for a component. A hand-written copy keeps passing when Tailwind
// drops a rule. The path is relative to the test file.
const tailwindCss: BrowserCommand<[sourceFile: string]> = async ({ testPath }, sourceFile) => {
	if (testPath == null) {
		throw new Error("tailwindCss runs only inside a test file.");
	}
	const file = path.resolve(path.dirname(testPath), sourceFile);
	const content = await readFile(file, "utf8");
	const candidates = new Scanner({ sources: [] })
		.getCandidatesWithPositions({ content, extension: path.extname(file).slice(1) })
		.map(({ candidate }) => candidate);
	const compiler = await compile(
		`@import "tailwindcss/theme"; @import "tailwindcss/utilities";\n${await mantleEasings()}\n${await mantleCustomVariants()}\n${await mantleUtilities()}\n${await mantleAnimations()}`,
		{
			base: import.meta.dirname,
			onDependency: () => {},
		},
	);
	return compiler.build(candidates);
};

// Tests run the same opt-in React Compiler pass as the published dist (see `tsdown.config.ts`): a
// suite that skips it never executes what npm consumers get. Test files stay uncompiled, because a consumer's own code is not compiled either.
// Why `enforce: "pre"`: Vite's own transform strips JSX, and the compiler must see the original
// source.
const reactCompiler = () => ({
	name: "react-compiler",
	enforce: "pre" as const,
	transform: {
		filter: {
			id: {
				include: [/[\\/]packages[\\/]mantle[\\/]src[\\/].+\.tsx?$/],
				exclude: [/\.test\.tsx?$/],
			},
		},
		handler: async (code: string, id: string) => {
			return compileReact(id, code);
		},
	},
});

// `MANTLE_REACT_COMPILER=off` runs the suite on uncompiled source: the way to bisect a failure to
// the compiler, and the baseline arm when you profile the compiled output.
// The fold runs first in each mode, because the dist ships folded `cx` calls (see `tsdown.config.ts`).
const compilerPlugins =
	process.env.MANTLE_REACT_COMPILER === "off"
		? [foldCxPlugin()]
		: [foldCxPlugin(), reactCompiler()];

// Both projects inherit every option here (Vitest 5 defaults projects to `extends: true`), so a
// hygiene or locale pin is written once and cannot drift between them.
export default defineConfig({
	// Why an alias, not a resolve condition: a condition reaches every dependency. The unit
	// and browser projects run in a DOM, so they get the encoder file a browser bundle gets.
	resolve: {
		alias: {
			"#qr-code-encoder": path.join(
				import.meta.dirname,
				"src/components/qr-code/qr-code-encoder.browser.ts",
			),
		},
	},
	test: {
		// A spy or global stub that a test installs and then fails to tear down leaks into every test
		// that runs after it, which turns an unrelated failure into a cascade and makes results depend
		// on order. Restoring centrally means no test depends on an inline `mockRestore()`: a test
		// that throws before it reaches its cleanup line still leaves the environment pristine.
		clearMocks: true,
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
				plugins: compilerPlugins,
				test: {
					name: "unit",
					environment: "happy-dom",
					include: ["**/*.test.{ts,tsx}"],
					exclude: [
						...configDefaults.exclude,
						"**/*.browser.test.{ts,tsx}",
						"**/*.consumer.test.{ts,tsx}",
					],
					// Why: the theme and chart tests import the shipped stylesheets with `?raw`, and
					// without this Vitest hands them an empty module.
					css: true,
					// Why `isolate: false`: an isolated worker builds a new happy-dom and imports React
					// and the rest again for each file. The setup file reset keeps the files
					// independent in the shared worker.
					isolate: false,
					setupFiles: ["./vitest.setup-file-reset.ts"],
				},
			},
			{
				plugins: compilerPlugins,
				test: {
					// Why a jsdom project with no shims: a consumer's suite runs mantle in plain jsdom, which
					// has no popover API, no `showModal()`, no observers, and no `matchMedia`. The unit
					// project's happy-dom shims hide each of those paths.
					name: "consumer",
					environment: "jsdom",
					include: ["**/*.consumer.test.{ts,tsx}"],
				},
			},
			{
				plugins: compilerPlugins,
				// Why: the compiler adds the `react/compiler-runtime` import in the transform, so Vite's
				// dependency scanner never sees it in source. Without this include, the first browser run
				// discovers it mid-run, re-optimizes, reloads, and loads two copies of React.
				// `tailwindcss` has the same first-run reload: the theme sweeps compile mantle.css with it.
				optimizeDeps: { include: ["react/compiler-runtime", "tailwindcss"] },
				test: {
					name: "browser",
					include: ["**/*.browser.test.{ts,tsx}"],
					// Why: `VITEST_MAX_WORKERS` marks a small machine, such as an Amp orb. There, Chromium
					// and the unit forks at the same time run out of memory, so this project starts after
					// the unit project ends.
					sequence: { groupOrder: process.env.VITEST_MAX_WORKERS ? 1 : 0 },
					// Why a bench project: the `bench` test-context fixture refuses to run in a regular
					// project, so this derives a `browser (chromium) (bench)` project that runs
					// `*.browser.bench.ts` under `vitest run`. CI selects both with `--project='browser*'`.
					// Why Chromium only: the benches pin V8's cost of mantle's caches, and a run that
					// adds Firefox or WebKit checks behavior, not that cost.
					benchmark: {
						enabled: engines.every((engine) => engine === "chromium"),
						include: ["**/*.browser.bench.ts"],
					},
					browser: {
						enabled: true,
						screenshotFailures: false,
						headless:
							!process.env.DISABLE_HEADLESS ||
							process.env.CI === "1" ||
							/true/i.test(process.env.CI ?? ""),
						// Why Firefox runs one file at a time: Firefox keeps mouse capture and
						// drag state for the whole browser, so a real drag in one page breaks a
						// drag or a selection in another. CI splits Firefox into shards instead.
						// Why a WebKit setup file: see `vitest.setup-webkit.ts`.
						instances: engines.map((engine) => ({
							browser: engine,
							provider: providerFor(engine),
							...(engine === "firefox" ? { fileParallelism: false } : {}),
							...(engine === "webkit"
								? {
										setupFiles: ["vitest.setup.ts", "vitest.setup-webkit.ts"].map((file) =>
											path.join(import.meta.dirname, file),
										),
									}
								: {}),
						})),
						commands: { emulateMedia, tailwindCss },
					},
				},
			},
		],
	},
});
