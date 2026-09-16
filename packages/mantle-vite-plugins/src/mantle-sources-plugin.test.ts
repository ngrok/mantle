import { cpSync, readFileSync, readdirSync } from "node:fs";
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Scanner } from "@tailwindcss/oxide";
import tailwindcss from "@tailwindcss/vite";
import {
	build,
	createBuilder,
	createLogger,
	createServer,
	type InlineConfig,
	type Plugin,
} from "vite";
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import {
	createClientGraph,
	findMissing,
	formatIdList,
	formatSummary,
	mantleSourcesPlugin,
	pendingIds,
	planSourceGroups,
	readDirectoryListing,
	recordLoad,
	recordParsed,
	rewriteSourceAllImports,
	waitForGraph,
} from "./mantle-sources-plugin.js";

const packageRoot = path.resolve(import.meta.dirname, "..");
const pluginSource = path.join(import.meta.dirname, "mantle-sources-plugin.ts");

const appCss = [
	'@import "tailwindcss";',
	'@import "@ngrok/mantle/mantle.css";',
	'@import "@ngrok/mantle/source-all.css";',
	"",
].join("\n");

const indexHtml = [
	"<!doctype html>",
	"<html><body>",
	'<div id="app" class="mt-4"></div>',
	'<script type="module" src="/src/main.ts"></script>',
	"</body></html>",
].join("\n");

const fixtureRoots: string[] = [];

afterAll(async () => {
	await Promise.all(fixtureRoots.map((root) => rm(root, { recursive: true, force: true })));
});

/**
 * Writes an app into a temp directory. `node_modules` links `@ngrok/mantle` and `tailwindcss`
 * from this package's install, so the app resolves them the way a consumer does.
 */
async function createFixture(
	files: Record<string, string>,
	linkedPackages: Record<string, string> = {},
): Promise<string> {
	const root = await realpath(await mkdtemp(path.join(tmpdir(), "mantle-sources-")));
	fixtureRoots.push(root);
	const links: Record<string, string> = {
		"@ngrok/mantle": await realpath(path.join(packageRoot, "node_modules/@ngrok/mantle")),
		"@tailwindcss/vite": await realpath(path.join(packageRoot, "node_modules/@tailwindcss/vite")),
		"magic-string": await realpath(path.join(packageRoot, "node_modules/magic-string")),
		tailwindcss: await realpath(path.join(packageRoot, "node_modules/tailwindcss")),
		...linkedPackages,
	};
	for (const [name, target] of Object.entries(links)) {
		const linkPath = path.join(root, "node_modules", name);
		await mkdir(path.dirname(linkPath), { recursive: true });
		await symlink(target, linkPath, "dir");
	}
	for (const [file, content] of Object.entries(files)) {
		const filePath = path.join(root, file);
		await mkdir(path.dirname(filePath), { recursive: true });
		await writeFile(filePath, content);
	}
	return root;
}

/**
 * Replaces the fixture's mantle link with a copy of `dist` and `package.json` under the
 * fixture's own `node_modules`, the layout npm and pnpm produce for a real install. Mantle's
 * dependencies stay linked so the copy still resolves them.
 */
async function installMantleInRoot(root: string): Promise<string> {
	const linkPath = path.join(root, "node_modules/@ngrok/mantle");
	const mantle = await realpath(linkPath);
	await rm(linkPath);
	await mkdir(linkPath);
	cpSync(path.join(mantle, "dist"), path.join(linkPath, "dist"), { recursive: true });
	cpSync(path.join(mantle, "package.json"), path.join(linkPath, "package.json"));
	await symlink(path.join(mantle, "node_modules"), path.join(linkPath, "node_modules"), "dir");
	return linkPath;
}

type CapturedLogs = {
	info: string[];
	warn: string[];
};

function captureLogger(): { logger: ReturnType<typeof createLogger>; logs: CapturedLogs } {
	const logs: CapturedLogs = { info: [], warn: [] };
	const logger = createLogger("info", { allowClearScreen: false });
	logger.info = (message) => {
		logs.info.push(message);
	};
	logger.warn = (message) => {
		logs.warn.push(message);
	};
	logger.warnOnce = logger.warn;
	logger.error = logger.warn;
	return { logger, logs };
}

/**
 * A `pre` transform placed after the plugin under test. It sees the CSS text the plugin
 * hands to Tailwind, keyed by environment name and module id.
 */
function captureCss(): { plugin: Plugin; seen: Map<string, string> } {
	const seen = new Map<string, string>();
	return {
		seen,
		plugin: {
			name: "capture-css",
			sharedDuringBuild: true,
			transform: {
				order: "pre",
				filter: { id: /\.css(?:\?.*)?$/ },
				handler(code, id) {
					seen.set(`${this.environment.name}:${id}`, code);
					return null;
				},
			},
		},
	};
}

function seenIn(seen: Map<string, string>, id: string, environment = "client"): string {
	const code = seen.get(`${environment}:${id}`);
	if (code == null) {
		throw new Error(`the capture plugin never saw ${id} in ${environment}`);
	}
	return code;
}

type BuildResult = {
	css: string;
	logs: CapturedLogs;
	fileNames: string[];
};

async function buildFixture(
	root: string,
	plugins: Plugin[],
	config: Omit<InlineConfig, "root" | "plugins"> = {},
): Promise<BuildResult> {
	const { logger, logs } = captureLogger();
	const result = await build({
		root,
		configFile: false,
		envDir: false,
		// Why warn: the reporter plugin writes its progress lines straight to stdout at "info".
		// The captured logger still receives every message the plugin under test emits.
		logLevel: "warn",
		customLogger: logger,
		...config,
		build: { write: false, ...config.build },
		plugins: [tailwindcss(), ...plugins],
	});
	if (Array.isArray(result) || !("output" in result)) {
		throw new Error("expected one build output");
	}
	const css = result.output
		.filter((output) => output.type === "asset" && output.fileName.endsWith(".css"))
		.map((output) => (output.type === "asset" ? String(output.source) : ""))
		.join("\n");
	return { css, logs, fileNames: result.output.map((output) => output.fileName) };
}

/**
 * Reads the kept files out of a rewritten CSS module: every file in an `@source` directory
 * that no `@source not` line excludes.
 */
function listedFilesIn(seen: Map<string, string>, cssFile: string): string[] {
	const code = seenIn(seen, cssFile);
	const cssDirectory = path.dirname(cssFile);
	const excluded = new Set(
		[...code.matchAll(/@source not "([^"]+)";/g)].map((match) =>
			path.resolve(cssDirectory, (match[1] ?? "").replaceAll("\\", "")),
		),
	);
	return [...code.matchAll(/@source "([^"]+)";/g)].flatMap((match) => {
		const directory = path.resolve(cssDirectory, match[1] ?? "");
		return readdirSync(directory, { withFileTypes: true })
			.filter((entry) => entry.isFile())
			.map((entry) => path.join(directory, entry.name))
			.filter((file) => !excluded.has(file));
	});
}

function candidatesIn(files: readonly string[]): Set<string> {
	const scanner = new Scanner({ sources: [] });
	return new Set(
		scanner.scanFiles(
			files.map((file) => ({
				content: readFileSync(file, "utf8"),
				extension: path.extname(file).slice(1),
			})),
		),
	);
}

/**
 * The candidates that Tailwind turned into a utility rule in `css`. Only plain class names
 * count, so the selector check needs no escaping. The class must end the selector, which
 * rejects a longer class (`.px-1\.5`), a variant prefix (`.first\:mt-0`), and a wrapper
 * such as `:where(.group)`.
 */
function utilitiesIn(css: string, candidates: Iterable<string>): string[] {
	return [...candidates]
		.filter((candidate) => /^[a-z][a-z0-9-]*$/.test(candidate))
		.filter((candidate) => new RegExp(`\\.${candidate}\\s*[{,]`).test(css))
		.toSorted();
}

/**
 * Tailwind emits the base utility next to an opacity-modified one (`bg-red-500/20` also
 * yields `.bg-red-500`), so a candidate counts as carried when a file holds it or holds it
 * with a modifier.
 */
function carries(candidates: ReadonlySet<string>, candidate: string): boolean {
	if (candidates.has(candidate)) {
		return true;
	}
	const prefix = `${candidate}/`;
	return [...candidates].some((other) => other.startsWith(prefix));
}

describe("planSourceGroups", () => {
	const listings: Record<string, { files: string[]; directories: string[] }> = {
		"/m/dist": { files: ["badge.js", "badge.d.ts", "table.js"], directories: ["chunks"] },
		"/m/src/badge": { files: ["badge.tsx", "badge.test.tsx"], directories: [] },
		"/m/src": { files: ["index.ts"], directories: ["badge", "table"] },
	};
	const readDirectory = (directory: string) => {
		const listing = listings[directory];
		if (listing == null) {
			throw new Error(`unexpected directory ${directory}`);
		}
		return listing;
	};

	test("keeps the listed files and excludes every other file and every empty subdirectory", () => {
		expect(planSourceGroups(["/m/dist/badge.js"], readDirectory)).toEqual([
			{ directory: "/m/dist", excluded: ["badge.d.ts", "chunks", "table.js"] },
		]);
	});

	test("does not exclude a subdirectory that holds a kept file", () => {
		expect(planSourceGroups(["/m/src/index.ts", "/m/src/badge/badge.tsx"], readDirectory)).toEqual([
			{ directory: "/m/src", excluded: ["table"] },
			{ directory: "/m/src/badge", excluded: ["badge.test.tsx"] },
		]);
	});

	test("adds a group for a directory between a group and a deeper kept file", () => {
		const nested: Record<string, { files: string[]; directories: string[] }> = {
			"/p/src": { files: ["index.js", "tokens.js"], directories: ["components"] },
			"/p/src/components": { files: ["shared.js"], directories: ["button", "table"] },
			"/p/src/components/button": { files: ["button.js", "button.stories.js"], directories: [] },
		};
		expect(
			planSourceGroups(["/p/src/index.js", "/p/src/components/button/button.js"], (directory) => {
				const listing = nested[directory];
				if (listing == null) {
					throw new Error(`unexpected directory ${directory}`);
				}
				return listing;
			}),
		).toEqual([
			{ directory: "/p/src", excluded: ["tokens.js"] },
			{ directory: "/p/src/components", excluded: ["shared.js", "table"] },
			{ directory: "/p/src/components/button", excluded: ["button.stories.js"] },
		]);
	});
});

describe("readDirectoryListing", () => {
	test("splits entries by kind and follows a symlink to what it points to", async () => {
		const root = await realpath(await mkdtemp(path.join(tmpdir(), "mantle-sources-listing-")));
		fixtureRoots.push(root);
		await writeFile(path.join(root, "badge.js"), "");
		await mkdir(path.join(root, "chunks"));
		await symlink(path.join(root, "badge.js"), path.join(root, "linked.js"), "file");
		await symlink(path.join(root, "chunks"), path.join(root, "linked-dir"), "dir");
		await symlink(path.join(root, "missing.js"), path.join(root, "dangling.js"), "file");
		expect(readDirectoryListing(root)).toEqual({
			files: ["badge.js", "linked.js"],
			directories: ["chunks", "linked-dir"],
		});
	});
});

describe("formatIdList", () => {
	test("shows twenty ids relative to the root and counts the rest", () => {
		const ids = Array.from(
			{ length: 23 },
			(_, index) => `/app/src/m${String(index).padStart(2, "0")}.ts`,
		);
		const lines = formatIdList("/app", ids).split("\n");
		expect(lines).toHaveLength(21);
		expect(lines[0]).toBe("  - src/m00.ts");
		expect(lines[19]).toBe("  - src/m19.ts");
		expect(lines[20]).toBe("  … and 3 more");
	});

	test("keeps an id outside the root absolute", () => {
		expect(formatIdList("/app", ["/elsewhere/x.js"])).toBe("  - /elsewhere/x.js");
	});
});

describe("rewriteSourceAllImports", () => {
	test("replaces the import with the directory and one negation per excluded entry", () => {
		const result = rewriteSourceAllImports({
			code: appCss,
			cssFile: "/app/src/app.css",
			groups: [
				{ directory: "/app/node_modules/@ngrok/mantle/dist", excluded: ["table.js", "types.d.ts"] },
			],
		});
		expect(result?.code).toBe(
			[
				'@import "tailwindcss";',
				'@import "@ngrok/mantle/mantle.css";',
				'@source "../node_modules/@ngrok/mantle/dist";',
				'@source not "../node_modules/@ngrok/mantle/dist/table.js";',
				'@source not "../node_modules/@ngrok/mantle/dist/types.d.ts";',
				"",
			].join("\n"),
		);
	});

	test("prefixes a sibling path with ./ and escapes glob characters in a name", () => {
		const result = rewriteSourceAllImports({
			code: appCss,
			cssFile: "/app/app.css",
			groups: [
				{ directory: "/app/vendor", excluded: ["[id].js", "a*b.js", "x{1,2}.js", 'q"t.js'] },
			],
		});
		expect(result?.code).toContain('@source "./vendor";');
		expect(result?.code).toContain('@source not "./vendor/\\[id\\].js";');
		expect(result?.code).toContain('@source not "./vendor/a\\*b.js";');
		// Why kept in the scan: the scanner brace-expands a name, and a quote ends the CSS string.
		expect(result?.code).not.toContain("x{1,2}.js");
		expect(result?.code).not.toContain("x\\{1,2\\}.js");
		expect(result?.code).not.toContain('q"t.js');
	});

	test("matches single quotes, url(), and a layer clause", () => {
		const code = [
			"@import url('@ngrok/mantle/source-all.css') layer(mantle);",
			'@import "../node_modules/@ngrok/mantle/dist/source-all.css";',
		].join("\n");
		const result = rewriteSourceAllImports({
			code,
			cssFile: "/app/app.css",
			groups: [{ directory: "/app/dist", excluded: [] }],
		});
		expect(result?.code).toBe('@source "./dist";\n@source "./dist";');
	});

	test("leaves a comment when no mantle module is in the graph", () => {
		const result = rewriteSourceAllImports({ code: appCss, cssFile: "/app/app.css", groups: [] });
		expect(result?.code).toContain(
			"/* mantle sources: the client bundle holds no @ngrok/mantle module */",
		);
		expect(result?.code).not.toContain("source-all.css");
	});

	test("leaves a consumer's own file named source-all.css alone", () => {
		const code = [
			'@import "tailwindcss";',
			'@import "./source-all.css";',
			"@import url('../styles/some-source-all.css');",
		].join("\n");
		expect(
			rewriteSourceAllImports({
				code,
				cssFile: "/app/app.css",
				groups: [{ directory: "/app/dist", excluded: [] }],
			}),
		).toBeNull();
	});

	test("returns null without the import", () => {
		expect(
			rewriteSourceAllImports({
				code: '@import "tailwindcss";',
				cssFile: "/app/app.css",
				groups: [{ directory: "/app/dist", excluded: [] }],
			}),
		).toBeNull();
	});
});

describe("formatSummary", () => {
	test("lists every package with its count and the source-all total", () => {
		expect(
			formatSummary({
				cssPath: "src/app.css",
				counts: new Map([
					["@ngrok/mantle", 18],
					["@pkg/ui", 1],
				]),
				sourceAllCount: 253,
			}),
		).toBe(
			"mantle sources: 18 @ngrok/mantle files and 1 @pkg/ui file listed for src/app.css (source-all.css scans 253)",
		);
	});

	test("keeps an include package at zero, so a consumer sees the bundle reached none of it", () => {
		expect(
			formatSummary({
				cssPath: "app.css",
				counts: new Map([
					["@ngrok/mantle", 3],
					["@pkg/ui", 0],
				]),
				sourceAllCount: null,
			}),
		).toBe("mantle sources: 3 @ngrok/mantle files and 0 @pkg/ui files listed for app.css");
	});

	test("omits the total when the dist directory is unknown", () => {
		expect(formatSummary({ cssPath: "app.css", counts: new Map(), sourceAllCount: null })).toBe(
			"mantle sources: 0 @ngrok/mantle files listed for app.css",
		);
	});
});

describe("findMissing", () => {
	test("returns the bundle ids the list lacks, sorted", () => {
		expect(
			findMissing({
				bundleFiles: new Set(["/m/tooltip.js", "/m/badge.js", "/m/cx.js"]),
				listed: new Set(["/m/badge.js"]),
			}),
		).toEqual(["/m/cx.js", "/m/tooltip.js"]);
	});
});

describe("graph tracking", () => {
	const main = "/app/src/main.ts";
	const route = "/app/src/route.ts";
	const css = "/app/src/app.css";
	const parsedMain = { id: main, importedIds: [css], dynamicallyImportedIds: [route] };
	const noImports = { importedIds: [], dynamicallyImportedIds: [] };
	const internal = {
		resolve: vi.fn<(source: string) => Promise<{ id: string; external: false }>>(
			async (source) => ({ id: source, external: false }),
		),
	};
	const idleTimeoutMs = 15_000;

	afterEach(() => {
		vi.useRealTimers();
	});

	test("holds for a dependency the parsed module names, static or dynamic, until it parses", () => {
		const graph = createClientGraph();
		recordLoad(graph, main);
		expect(pendingIds(graph)).toEqual([main]);
		recordParsed(graph, parsedMain);
		expect(pendingIds(graph)).toEqual([css, route]);
		recordLoad(graph, route);
		expect(pendingIds(graph)).toEqual([route, css]);
		recordParsed(graph, { id: route, ...noImports });
		recordLoad(graph, css);
		recordParsed(graph, { id: css, ...noImports });
		expect(pendingIds(graph)).toEqual([]);
	});

	test("counts a module another plugin loaded as seen once it parses", () => {
		const graph = createClientGraph();
		recordLoad(graph, main);
		recordParsed(graph, parsedMain);
		recordParsed(graph, { id: route, ...noImports });
		expect(pendingIds(graph)).toEqual([css]);
		expect(graph.seen.has(route)).toBe(true);
	});

	test("does not wait for a CSS module held in the plugin's own transform", () => {
		const graph = createClientGraph();
		recordLoad(graph, css);
		graph.waiting.add(css);
		expect(pendingIds(graph)).toEqual([]);
	});

	test("resolves once the last pending module parses and leaves no timer behind", async () => {
		vi.useFakeTimers();
		const graph = createClientGraph();
		recordLoad(graph, main);
		let settled = false;
		const wait = waitForGraph({ graph, context: internal, idleTimeoutMs }).then(() => {
			settled = true;
			return settled;
		});
		await vi.advanceTimersByTimeAsync(14_000);
		expect(settled).toBe(false);
		recordParsed(graph, { id: main, ...noImports });
		await wait;
		expect(vi.getTimerCount()).toBe(0);
		expect(graph.listeners.size).toBe(0);
		expect(graph.stalled).toBeNull();
	});

	test("asks the resolver about an expected dependency once and skips it when external", async () => {
		const graph = createClientGraph();
		const resolve = vi.fn<(source: string) => Promise<{ id: string; external: boolean }>>(
			async (source) => ({ id: source, external: source === "react-dom" }),
		);
		recordLoad(graph, main);
		recordParsed(graph, { id: main, importedIds: ["react-dom", css], dynamicallyImportedIds: [] });
		const wait = waitForGraph({ graph, context: { resolve }, idleTimeoutMs });
		recordLoad(graph, css);
		recordParsed(graph, { id: css, ...noImports });
		await wait;
		// Why one call: `css` started to load before the resolver reached it, so only the
		// dependency that never loads costs a resolve.
		expect(resolve).toHaveBeenCalledTimes(1);
		expect(resolve).toHaveBeenLastCalledWith("react-dom", main);
		expect(graph.external.has("react-dom")).toBe(true);
	});

	test("skips a bare specifier another plugin renamed while marking it external", async () => {
		const graph = createClientGraph();
		const resolve = vi.fn<(source: string) => Promise<{ id: string; external: boolean }>>(
			async () => ({ id: "react", external: false }),
		);
		recordLoad(graph, main);
		recordParsed(graph, { id: main, importedIds: ["some-external"], dynamicallyImportedIds: [] });
		await waitForGraph({ graph, context: { resolve }, idleTimeoutMs });
		expect(resolve).toHaveBeenCalledTimes(1);
		expect(graph.external.has("some-external")).toBe(true);
		expect(graph.stalled).toBeNull();
	});

	test("gives up after the idle limit, records the pending modules, and resolves", async () => {
		vi.useFakeTimers();
		const graph = createClientGraph();
		const ids = Array.from(
			{ length: 23 },
			(_, index) => `/app/src/module-${String(index).padStart(2, "0")}.ts`,
		);
		for (const id of ids) {
			recordLoad(graph, id);
		}
		let settled = false;
		const wait = waitForGraph({ graph, context: internal, idleTimeoutMs }).then(() => {
			settled = true;
			return settled;
		});
		await vi.advanceTimersByTimeAsync(14_999);
		expect(settled).toBe(false);
		await vi.advanceTimersByTimeAsync(1);
		await wait;
		expect(graph.stalled).toEqual(ids);
		expect(graph.listeners.size).toBe(0);
	});
});

describe("mantleSourcesPlugin build", () => {
	let root: string;
	let mantleDist: string;
	let full: BuildResult;
	let trimmed: BuildResult;
	let listed: string[];
	let unlisted: string[];
	/** Utilities the full scan emits that no listed file carries. The trimmed CSS must lack them. */
	let unreachedUtilities: string[];
	/** Utilities the full scan emits that a listed file carries. The trimmed CSS must keep them. */
	let reachedUtilities: string[];

	beforeAll(async () => {
		const files = {
			"index.html": indexHtml,
			"src/app.css": appCss,
			"src/main.ts": [
				'import { Badge } from "@ngrok/mantle/badge";',
				'import "./app.css";',
				'document.getElementById("app")?.addEventListener("click", () => import("./route.ts"));',
				"console.log(Badge);",
			].join("\n"),
			"src/route.ts": 'export { Tooltip } from "@ngrok/mantle/tooltip";',
		};
		root = await createFixture(files);
		mantleDist = path.join(await realpath(path.join(root, "node_modules/@ngrok/mantle")), "dist");

		// Why a baseline: `mantle.css` and the app's own files emit utilities with no mantle scan.
		// Those must not count as "only an unreached file carries it".
		const baseline = await buildFixture(
			await createFixture({
				...files,
				"src/app.css": appCss.replace('@import "@ngrok/mantle/source-all.css";\n', ""),
			}),
			[],
		);
		full = await buildFixture(root, []);
		const capture = captureCss();
		trimmed = await buildFixture(root, [mantleSourcesPlugin(), capture.plugin]);
		listed = listedFilesIn(capture.seen, path.join(root, "src/app.css"));
		// Why this guard: the tooltip assertions below mean "reached through a split chunk".
		if (!trimmed.fileNames.some((name) => /route-[\w-]+\.js$/.test(name))) {
			throw new Error("the fixture did not split route.ts into its own chunk");
		}

		unlisted = readdirSync(mantleDist)
			.map((file) => path.join(mantleDist, file))
			.filter((file) => !listed.includes(file) && !file.endsWith(".css"));
		const listedCandidates = candidatesIn(listed);
		const onlyUnlisted = new Set(
			[...candidatesIn(unlisted)].filter((candidate) => !carries(listedCandidates, candidate)),
		);
		const baselineUtilities = new Set(utilitiesIn(baseline.css, onlyUnlisted));
		unreachedUtilities = utilitiesIn(full.css, onlyUnlisted).filter(
			(utility) => !baselineUtilities.has(utility),
		);
		reachedUtilities = utilitiesIn(full.css, listedCandidates);
	});

	test("lists the reached mantle files, chunks included, and no other", () => {
		const names = listed.map((file) => path.basename(file));
		expect(names).toContain("badge.js");
		expect(names).toContain("tooltip.js");
		expect(names).not.toContain("data-table.js");
		expect(listed.every((file) => file.startsWith(mantleDist))).toBe(true);
		expect(listed.some((file) => /^cx-[\w-]+\.js$/.test(path.basename(file)))).toBe(true);
	});

	test("drops every utility only an unreached file carries", () => {
		expect(unreachedUtilities.length).toBeGreaterThan(0);
		expect(utilitiesIn(trimmed.css, unreachedUtilities)).toEqual([]);
	});

	test("keeps every utility a reached file carries", () => {
		expect(reachedUtilities.length).toBeGreaterThan(0);
		expect(utilitiesIn(trimmed.css, reachedUtilities)).toEqual(reachedUtilities);
	});

	test("keeps the app's own classes and shrinks the stylesheet", () => {
		expect(trimmed.css).toMatch(/\.mt-4(?![\w-])/);
		expect(trimmed.css.length).toBeLessThan(full.css.length);
	});

	test("logs one summary line with the listed count and the source-all total", () => {
		// Why the sum: the oracle partitions dist into listed and unlisted files and skips the
		// stylesheets Tailwind never scans, so the total comes from the partition, not from the
		// plugin's own directory read.
		const distCount = listed.length + unlisted.length;
		expect(trimmed.logs.info).toContain(
			`mantle sources: ${listed.length} @ngrok/mantle files listed for src/app.css (source-all.css scans ${distCount})`,
		);
	});

	test("narrows the scan when mantle is installed under the project root", async () => {
		const files = {
			"index.html": indexHtml,
			"src/app.css": appCss,
			"src/main.ts":
				'import { Badge } from "@ngrok/mantle/badge";\nimport "./app.css";\nconsole.log(Badge);',
		};
		const inRoot = await createFixture(files);
		await installMantleInRoot(inRoot);
		const fullInRoot = await buildFixture(inRoot, []);
		const capture = captureCss();
		const trimmedInRoot = await buildFixture(inRoot, [mantleSourcesPlugin(), capture.plugin]);
		const rewritten = seenIn(capture.seen, path.join(inRoot, "src/app.css"));
		expect(rewritten).toContain('@source "../node_modules/@ngrok/mantle/dist";');
		expect(rewritten).toContain('@source not "../node_modules/@ngrok/mantle/dist/data-table.js";');
		expect(rewritten).not.toContain('@source not "../node_modules/@ngrok/mantle/dist/badge.js";');
		expect(trimmedInRoot.logs.warn).toEqual([]);
		expect(trimmedInRoot.css.length).toBeLessThan(fullInRoot.css.length);
		expect(utilitiesIn(trimmedInRoot.css, unreachedUtilities)).toEqual([]);
		expect(trimmedInRoot.css).toMatch(/\.mt-4\s*[{,]/);
	});

	test("starts every client build from an empty graph, so a shared plugin lists no stale file", async () => {
		const plugin = mantleSourcesPlugin();
		await buildFixture(root, [plugin]);
		const tooltipOnly = await createFixture({
			"index.html": indexHtml,
			"src/app.css": appCss,
			"src/main.ts":
				'import { Tooltip } from "@ngrok/mantle/tooltip";\nimport "./app.css";\nconsole.log(Tooltip);',
		});
		const capture = captureCss();
		const second = await buildFixture(tooltipOnly, [plugin, capture.plugin]);
		const names = listedFilesIn(capture.seen, path.join(tooltipOnly, "src/app.css")).map((file) =>
			path.basename(file),
		);
		expect(names).toContain("tooltip.js");
		expect(names).not.toContain("badge.js");
		expect(second.logs.warn).toEqual([]);
	});

	test("produces the same CSS with the plugin before tailwindcss()", async () => {
		const { logger, logs } = captureLogger();
		const result = await build({
			root,
			configFile: false,
			envDir: false,
			logLevel: "warn",
			customLogger: logger,
			build: { write: false },
			plugins: [mantleSourcesPlugin(), tailwindcss()],
		});
		if (Array.isArray(result) || !("output" in result)) {
			throw new Error("expected one build output");
		}
		const css = result.output
			.filter((output) => output.type === "asset" && output.fileName.endsWith(".css"))
			.map((output) => (output.type === "asset" ? String(output.source) : ""))
			.join("\n");
		expect(css).toBe(trimmed.css);
		expect(logs.warn).toEqual([]);
	});

	test("completes when the graph names an external import that never loads", async () => {
		const result = await buildFixture(root, [mantleSourcesPlugin()], {
			build: { rolldownOptions: { external: ["react-dom"] } },
		});
		expect(result.css).toBe(trimmed.css);
		expect(result.logs.warn).toEqual([]);
	});

	test("stays inactive in the dev server", async () => {
		const capture = captureCss();
		const server = await createServer({
			root,
			configFile: false,
			envDir: false,
			logLevel: "silent",
			server: { middlewareMode: true, watch: null, hmr: false },
			plugins: [tailwindcss(), mantleSourcesPlugin(), capture.plugin],
		});
		try {
			const result = await server.environments.client.transformRequest("/src/app.css?direct");
			expect(seenIn(capture.seen, `${path.join(root, "src/app.css")}?direct`)).toContain(
				'@import "@ngrok/mantle/source-all.css";',
			);
			expect(utilitiesIn(result?.code ?? "", unreachedUtilities)).toEqual(unreachedUtilities);
		} finally {
			await server.close();
		}
	});

	test("prints every listed path with verbose", async () => {
		const result = await buildFixture(root, [mantleSourcesPlugin({ verbose: true })]);
		const verbose = result.logs.info.find((line) =>
			line.startsWith("mantle sources: src/app.css lists"),
		);
		expect(verbose?.split("\n").slice(1)).toEqual(
			listed.map((file) => `  ${path.relative(path.join(root, "src"), file)}`),
		);
	});
});

describe("mantleSourcesPlugin graph shapes", () => {
	test("lists a mantle import that only a linked package reaches, and scans that package with include", async () => {
		const uiPackage = await createFixture({
			"package.json": JSON.stringify({
				name: "@fixture/ui",
				type: "module",
				exports: "./index.js",
			}),
			"index.js": [
				'import { Badge } from "@ngrok/mantle/badge";',
				'import labels from "./labels.json";',
				'export const Severity = () => ({ badge: Badge, className: "mb-[13px]", label: labels.warning });',
			].join("\n"),
			// Why JSON: a component package can keep class names in data, and the scan must reach it.
			"labels.json": JSON.stringify({ warning: "mt-[17px]" }),
		});
		const root = await createFixture(
			{
				"index.html": indexHtml,
				"src/app.css": appCss,
				"src/main.ts":
					'import { Severity } from "@fixture/ui";\nimport "./app.css";\nconsole.log(Severity());',
			},
			{ "@fixture/ui": uiPackage },
		);

		const plain = captureCss();
		const withoutInclude = await buildFixture(root, [mantleSourcesPlugin(), plain.plugin]);
		const plainFiles = listedFilesIn(plain.seen, path.join(root, "src/app.css"));
		expect(plainFiles.map((file) => path.basename(file))).toContain("badge.js");
		expect(plainFiles).not.toContain(path.join(uiPackage, "index.js"));
		expect(withoutInclude.css).not.toContain("margin-bottom:13px");
		expect(withoutInclude.css).not.toContain("margin-top:17px");

		const included = captureCss();
		const withInclude = await buildFixture(root, [
			mantleSourcesPlugin({ include: ["@fixture/ui"] }),
			included.plugin,
		]);
		const includedFiles = listedFilesIn(included.seen, path.join(root, "src/app.css"));
		expect(includedFiles).toContain(path.join(uiPackage, "index.js"));
		expect(includedFiles).toContain(path.join(uiPackage, "labels.json"));
		expect(withInclude.css).toContain("margin-bottom:13px");
		expect(withInclude.css).toContain("margin-top:17px");
		expect(withInclude.logs.info).toContainEqual(
			expect.stringMatching(
				/^mantle sources: \d+ @ngrok\/mantle files and 2 @fixture\/ui files listed for src\/app\.css/,
			),
		);
	});

	test("rewrites a CSS root imported with ?url", async () => {
		const root = await createFixture({
			"index.html": indexHtml,
			"src/app.css": appCss,
			"src/main.ts": [
				'import { Badge } from "@ngrok/mantle/badge";',
				'import href from "./app.css?url";',
				"console.log(Badge, href);",
			].join("\n"),
		});
		const capture = captureCss();
		const result = await buildFixture(root, [mantleSourcesPlugin(), capture.plugin]);
		const rewrittenIds = [...capture.seen]
			.filter(([, code]) => code.includes("@source "))
			.map(([key]) => key.replace(/^client:/, ""));
		expect(rewrittenIds).toHaveLength(1);
		expect(rewrittenIds[0]?.startsWith(`${path.join(root, "src/app.css")}?`)).toBe(true);
		expect(result.css).toMatch(/\.mt-4(?![\w-])/);
		expect(result.logs.info).toContainEqual(
			expect.stringMatching(
				/^mantle sources: \d+ @ngrok\/mantle files listed for src\/app\.css \(/,
			),
		);
	});

	test("skips a mantle file the app only imports as text", async () => {
		const root = await createFixture({
			"index.html": indexHtml,
			"src/app.css": appCss,
			"src/main.ts":
				'import source from "@ngrok/mantle/badge?raw";\nimport "./app.css";\nconsole.log(source.length);',
		});
		const capture = captureCss();
		const result = await buildFixture(root, [mantleSourcesPlugin(), capture.plugin]);
		expect(seenIn(capture.seen, path.join(root, "src/app.css"))).toContain(
			"/* mantle sources: the client bundle holds no @ngrok/mantle module */",
		);
		expect(result.logs.warn).toEqual([]);
	});

	test("rewrites two CSS roots that both import source-all.css without waiting on each other", async () => {
		const root = await createFixture({
			"index.html": indexHtml,
			"src/app.css": appCss,
			"src/other.css": appCss,
			"src/main.ts": [
				'import { Badge } from "@ngrok/mantle/badge";',
				'import "./app.css";',
				'import "./other.css";',
				"console.log(Badge);",
			].join("\n"),
		});
		const capture = captureCss();
		const result = await buildFixture(root, [mantleSourcesPlugin(), capture.plugin]);
		const appFiles = listedFilesIn(capture.seen, path.join(root, "src/app.css"));
		const otherFiles = listedFilesIn(capture.seen, path.join(root, "src/other.css"));
		expect(appFiles.map((file) => path.basename(file))).toContain("badge.js");
		expect(otherFiles).toEqual(appFiles);
		expect(result.logs.warn).toEqual([]);
		const summaries = result.logs.info.filter((line) => line.startsWith("mantle sources:"));
		expect(summaries).toHaveLength(2);
		expect(summaries).toEqual(
			expect.arrayContaining([
				expect.stringMatching(
					/^mantle sources: \d+ @ngrok\/mantle files listed for src\/app\.css \(/,
				),
				expect.stringMatching(
					/^mantle sources: \d+ @ngrok\/mantle files listed for src\/other\.css \(/,
				),
			]),
		);
	});

	test("replaces the import with a comment when the client graph holds no mantle module", async () => {
		const root = await createFixture({
			"index.html": indexHtml,
			"src/app.css": appCss,
			"src/main.ts": 'import "./app.css";',
		});
		const capture = captureCss();
		const result = await buildFixture(root, [mantleSourcesPlugin(), capture.plugin]);
		expect(seenIn(capture.seen, path.join(root, "src/app.css"))).toContain(
			"/* mantle sources: the client bundle holds no @ngrok/mantle module */",
		);
		expect(result.logs.info).toContain(
			"mantle sources: 0 @ngrok/mantle files listed for src/app.css",
		);
	});

	test("warns when mantle is in the bundle and no CSS imports source-all.css", async () => {
		const root = await createFixture({
			"index.html": indexHtml,
			"src/app.css": appCss.replace('@import "@ngrok/mantle/source-all.css";\n', ""),
			"src/main.ts":
				'import { Badge } from "@ngrok/mantle/badge";\nimport "./app.css";\nconsole.log(Badge);',
		});
		const result = await buildFixture(root, [mantleSourcesPlugin()]);
		expect(result.logs.warn).toContainEqual(
			expect.stringContaining(
				'no CSS module that Vite processes holds the `@import "@ngrok/mantle/source-all.css";` line, so the plugin changed nothing',
			),
		);
	});
});

describe("mantleSourcesPlugin bundle check", () => {
	/**
	 * Emits a mantle chunk from a transform that runs after the plugin's own, so the module
	 * enters the bundle after the CSS is final.
	 */
	function lateEmit(): Plugin {
		let emitted = false;
		return {
			name: "late-emit",
			transform: {
				filter: { id: /src\/app\.css$/ },
				handler() {
					if (!emitted) {
						emitted = true;
						this.emitFile({ type: "chunk", id: "@ngrok/mantle/tooltip" });
					}
					return null;
				},
			},
		};
	}

	async function createLateEmitFixture(): Promise<string> {
		return createFixture({
			"index.html": indexHtml,
			"src/app.css": appCss,
			"src/main.ts":
				'import { Badge } from "@ngrok/mantle/badge";\nimport "./app.css";\nconsole.log(Badge);',
		});
	}

	test("fails the build and names the file a late chunk adds", async () => {
		const root = await createLateEmitFixture();
		await expect(buildFixture(root, [mantleSourcesPlugin(), lateEmit()])).rejects.toThrow(
			/the client bundle holds \d+ listed file\(s\) that src\/app\.css does not list:[\s\S]*dist\/tooltip\.js/,
		);
	});

	test("does not flag a module the bundler parsed after the rewrite and then dropped", async () => {
		const root = await createLateEmitFixture();
		const parsedIds: string[] = [];
		const lateLoad: Plugin = {
			name: "late-load",
			moduleParsed(info) {
				parsedIds.push(info.id);
			},
			transform: {
				filter: { id: /src\/app\.css$/ },
				async handler() {
					const resolved = await this.resolve("@ngrok/mantle/tooltip");
					if (resolved == null) {
						throw new Error("could not resolve @ngrok/mantle/tooltip");
					}
					// Why load and not emit: the module parses and enters the graph, and no chunk
					// imports it, so the bundler drops it. Only `chunk.moduleIds` knows that.
					await this.load({ id: resolved.id });
					return null;
				},
			},
		};
		const result = await buildFixture(root, [mantleSourcesPlugin(), lateLoad]);
		// Why this guard: the test only means something if the bundler parsed the module.
		expect(parsedIds.some((id) => id.endsWith("dist/tooltip.js"))).toBe(true);
		expect(result.logs.warn).toEqual([]);
		expect(result.fileNames.some((name) => /tooltip/.test(name))).toBe(false);
	});

	test("stops waiting after the idle limit and reports the stall next to the miss", async () => {
		const root = await createFixture({
			"index.html": indexHtml,
			"src/app.css": appCss,
			"src/main.ts": [
				'import { Badge } from "@ngrok/mantle/badge";',
				'import { Tooltip } from "./slow.ts";',
				'import "./app.css";',
				"console.log(Badge, Tooltip);",
			].join("\n"),
			"src/slow.ts": 'export { Tooltip } from "@ngrok/mantle/tooltip";',
		});
		let release = () => {};
		const released = new Promise<void>((resolve) => {
			release = resolve;
		});
		const slowLoad: Plugin = {
			name: "slow-load",
			load: {
				filter: { id: /src\/slow\.ts$/ },
				async handler() {
					// Why a held promise: this stands in for a module whose transform outlasts the idle
					// limit. It finishes only after the rewrite landed, so the order never depends on timing.
					await released;
					return null;
				},
			},
		};
		const releaseAfterRewrite: Plugin = {
			name: "release-after-rewrite",
			transform: {
				order: "pre",
				filter: { id: /src\/app\.css$/ },
				handler(code) {
					if (code.includes("@source ")) {
						release();
					}
					return null;
				},
			},
		};
		const result = await buildFixture(root, [
			mantleSourcesPlugin({ onMiss: "warn", idleTimeoutMs: 50 }),
			releaseAfterRewrite,
			slowLoad,
		]);
		expect(result.logs.warn).toContainEqual(
			expect.stringMatching(
				/the CSS lists the files parsed before the wait gave up[\s\S]*0\.05s[\s\S]*src\/slow\.ts/,
			),
		);
		expect(result.logs.warn).toContainEqual(
			expect.stringMatching(
				/does not list:[\s\S]*dist\/tooltip[\w-]*\.js[\s\S]*The wait for the module graph gave up before these modules parsed\. Pass `idleTimeoutMs` to wait longer/,
			),
		);
		expect(result.logs.warn.filter((line) => line.includes("does not list:"))).toEqual([
			expect.not.stringContaining("A plugin added the module"),
		]);
	});

	test("warns instead with onMiss: warn", async () => {
		const root = await createLateEmitFixture();
		const result = await buildFixture(root, [mantleSourcesPlugin({ onMiss: "warn" }), lateEmit()]);
		expect(result.logs.warn).toContainEqual(
			expect.stringMatching(/does not list:[\s\S]*dist\/tooltip\.js/),
		);
		expect(result.css).toMatch(/\.mt-4(?![\w-])/);
	});
});

describe("mantleSourcesPlugin environments", () => {
	test("leaves the server CSS alone and warns about a server-only mantle import, across environments a config function re-creates", async () => {
		const root = await createFixture({
			"index.html": indexHtml,
			"src/app.css": appCss,
			"src/main.ts":
				'import { Badge } from "@ngrok/mantle/badge";\nimport "./app.css";\nconsole.log(Badge);',
			"src/entry.server.ts": [
				'import { Badge } from "@ngrok/mantle/badge";',
				'import { Tooltip } from "@ngrok/mantle/tooltip";',
				'import "./app.css";',
				"export const render = () => [Badge, Tooltip];",
			].join("\n"),
			// Why a function: `vite build --app` evaluates it once per environment, so each
			// environment gets a fresh plugin object unless the plugin opts into sharing.
			"vite.config.mjs": [
				'import tailwindcss from "@tailwindcss/vite";',
				`import { mantleSourcesPlugin } from ${JSON.stringify(pluginSource)};`,
				"export default () => ({",
				"\tbuild: { write: false },",
				"\tenvironments: {",
				'\t\tclient: { build: { rolldownOptions: { input: "index.html" } } },',
				'\t\tssr: { build: { ssr: true, rolldownOptions: { input: "src/entry.server.ts" } } },',
				"\t},",
				"\tssr: { noExternal: true },",
				"\tplugins: [tailwindcss(), mantleSourcesPlugin()],",
				"});",
			].join("\n"),
		});
		const { logger, logs } = captureLogger();
		const capture = captureCss();
		const builder = await createBuilder({
			root,
			configFile: path.join(root, "vite.config.mjs"),
			envDir: false,
			logLevel: "warn",
			customLogger: logger,
			plugins: [capture.plugin],
		});
		await builder.buildApp();

		const cssFile = path.join(root, "src/app.css");
		expect(seenIn(capture.seen, cssFile, "client")).toContain("@source ");
		expect(seenIn(capture.seen, cssFile, "ssr")).toContain(
			'@import "@ngrok/mantle/source-all.css";',
		);
		expect(logs.info).toContainEqual(
			expect.stringMatching(
				/^mantle sources: \d+ @ngrok\/mantle files listed for src\/app\.css \(/,
			),
		);
		expect(logs.warn).toContainEqual(
			expect.stringMatching(
				/the ssr bundle holds \d+ listed file\(s\) the client bundle does not reach:[\s\S]*dist\/tooltip[\w-]*\.js/,
			),
		);
	});
});
