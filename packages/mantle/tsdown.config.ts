import fs from "node:fs";
import { defineConfig } from "tsdown";
import packageJson from "./package.json" with { type: "json" };

const MANTLE_CSS_SRC = new URL("./src/mantle.css", import.meta.url);
const MANTLE_DARK_CSS_SRC = new URL("./src/mantle-dark.css", import.meta.url);
const MANTLE_LIGHT_HC_CSS_SRC = new URL("./src/mantle-light-high-contrast.css", import.meta.url);
const MANTLE_DARK_HC_CSS_SRC = new URL("./src/mantle-dark-high-contrast.css", import.meta.url);
const SOURCE_ALL_CSS_SRC = new URL("./src/source-all.css", import.meta.url);

const DOCS_ORIGIN = "https://mantle.ngrok.com";

/**
 * A set of package names that should not be published to npm.
 */
const doNotPublish = new Set<string>(["portal"]);

/**
 * A set of package names that shouldn't be released yet
 */
const unreleasedPackages = new Set<string>([]);

const componentPath = (name: string) => `./src/components/${name}/index.ts` as const;
const utilPath = (name: string) => `./src/utils/${name}/index.ts` as const;

const allComponents = fs
	.readdirSync("src/components", { withFileTypes: true })
	.filter((dirent) => dirent.isDirectory())
	.map((dirent) => dirent.name);

const allUtils = fs
	.readdirSync("src/utils", { withFileTypes: true })
	.filter((dirent) => dirent.isDirectory())
	.map((dirent) => dirent.name);

const componentPackages = allComponents
	// filter only the publishable component packages then map them to the build entry object
	.filter((packageName) => !doNotPublish.has(packageName) && !unreleasedPackages.has(packageName))
	.reduce<Record<string, string>>((acc, name) => {
		acc[name] = componentPath(name);
		return acc;
	}, {});

/**
 * Util directories that are consolidated into the `./utils` export and
 * should not be built as individual entry points.
 */
const consolidatedIntoUtils = new Set<string>(["compose-refs", "sorting"]);

const utilPackages = allUtils
	.filter((name) => !consolidatedIntoUtils.has(name))
	.reduce<Record<string, string>>((acc, name) => {
		acc[name] = utilPath(name);
		return acc;
	}, {});

/**
 * Sorted list of importable `@ngrok/mantle/*` specifiers, derived from
 * `package.json#exports`. Skips CSS bundles, the `./package.json`
 * passthrough, and the `./agent.json`/`./llms.txt` agent artifacts (those
 * are the artifacts we're describing — listing them in their own subpath
 * inventory would be circular).
 */
function importableSubpaths(): string[] {
	const exports = packageJson.exports;
	const skip = new Set(["./package.json", "./agent.json", "./llms.txt"]);
	return Object.keys(exports)
		.filter((key) => key.startsWith("./") && !skip.has(key) && !key.endsWith(".css"))
		.map((key) => `@ngrok/mantle/${key.slice(2)}`)
		.toSorted((a, b) => a.localeCompare(b));
}

/**
 * Generate the offline agent-discovery artifacts (`dist/agent.json`,
 * `dist/llms.txt`) that ship with the published package as a fallback
 * for agents working without network access. The live source of truth
 * for component/hook/utility metadata is the docs site at `DOCS_ORIGIN`
 * — these files only carry pointers and the package's subpath inventory.
 */
async function writeAgentArtifacts(): Promise<void> {
	const subpaths = importableSubpaths();
	const endpoints = {
		docs: `${DOCS_ORIGIN}/`,
		forAiAgents: `${DOCS_ORIGIN}/for-ai-agents`,
		llmsTxt: `${DOCS_ORIGIN}/llms.txt`,
		llmsFullTxt: `${DOCS_ORIGIN}/llms-full.txt`,
		components: `${DOCS_ORIGIN}/api/components.json`,
		hooks: `${DOCS_ORIGIN}/api/hooks.json`,
		utilities: `${DOCS_ORIGIN}/api/utils.json`,
		package: `${DOCS_ORIGIN}/api/package.json`,
		changelog: `${DOCS_ORIGIN}/api/changelog.json`,
		searchIndex: `${DOCS_ORIGIN}/api/search-index.json`,
		schema: `${DOCS_ORIGIN}/api/schema.json`,
	};

	const agentJson = {
		name: packageJson.name,
		version: packageJson.version,
		origin: DOCS_ORIGIN,
		endpoints,
		subpaths,
	};

	const llmsTxt = [
		`# @ngrok/mantle (${packageJson.version})`,
		"",
		`> Offline discovery hint shipped inside the @ngrok/mantle npm package. Authoritative metadata lives at ${endpoints.forAiAgents}.`,
		"",
		`Docs: ${endpoints.docs}`,
		`Agent guide: ${endpoints.forAiAgents}`,
		`Index: ${endpoints.llmsTxt}`,
		`Full text: ${endpoints.llmsFullTxt}`,
		"",
		"## Endpoints",
		"",
		`- Components: ${endpoints.components}`,
		`- Hooks: ${endpoints.hooks}`,
		`- Utilities: ${endpoints.utilities}`,
		`- Package info: ${endpoints.package}`,
		`- Changelog: ${endpoints.changelog}`,
		`- Search index: ${endpoints.searchIndex}`,
		`- Schemas: ${endpoints.schema}`,
		"",
		"## Importable subpaths",
		"",
		...subpaths.map((subpath) => `- \`${subpath}\``),
		"",
	].join("\n");

	await Promise.all([
		fs.promises.writeFile("./dist/agent.json", `${JSON.stringify(agentJson, null, "\t")}\n`),
		fs.promises.writeFile("./dist/llms.txt", llmsTxt),
	]);
}

export default defineConfig((options) => [
	{
		dts: true,
		// if we set this to true, it will "race" between the two builds and wipe away type declarations
		// for one of the builds. rm -rf dist is run as a "prebuild" script to avoid this issue
		clean: false,
		minify: true,
		// Don't ship source maps: they were ~58% of the published package and
		// embed the full source via `sourcesContent`, despite `src/` not being
		// published. Consumers debug against the minified bundle; agents read the
		// typed `.d.ts` surface and the bundled offline discovery artifacts
		// (dist/agent.json, dist/llms.txt) — not decoded map JSON.
		sourcemap: false,
		target: "ES2025",
		tsconfig: "tsconfig.build.json",
		fixedExtension: false,
		format: "esm",
		entry: {
			...componentPackages,
			...utilPackages,
			"code-block_highlight-utils": "./src/components/code-block/highlight-utils.ts",
			hooks: "./src/hooks/index.ts",
			types: "./src/types/index.ts",
			utils: "./src/utils/index.ts",
		},
		onSuccess: async () => {
			try {
				await Promise.all([
					fs.promises.copyFile(MANTLE_CSS_SRC, "./dist/mantle.css"),
					fs.promises.copyFile(MANTLE_DARK_CSS_SRC, "./dist/mantle-dark.css"),
					fs.promises.copyFile(MANTLE_LIGHT_HC_CSS_SRC, "./dist/mantle-light-high-contrast.css"),
					fs.promises.copyFile(MANTLE_DARK_HC_CSS_SRC, "./dist/mantle-dark-high-contrast.css"),
					fs.promises.copyFile(SOURCE_ALL_CSS_SRC, "./dist/source-all.css"),
					writeAgentArtifacts(),
				]);
			} catch (error) {
				console.error("Failed to populate dist:", error);
				throw error;
			}
		},
		...options,
	},
]);
