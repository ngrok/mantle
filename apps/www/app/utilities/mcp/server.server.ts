import mantlePackageJson from "@ngrok/mantle/package.json" with { type: "json" };
import { McpServer, ResourceTemplate, type CallToolResult } from "@modelcontextprotocol/server";
import { z } from "zod";
import { canonicalHref, canonicalOrigin } from "~/utilities/canonical-origin";
import { loadFrontmatter, rawDocContent, urlToFileMap } from "~/utilities/docs";
import { checkCode } from "~/utilities/mcp/check.server";
import { isMcpToolEnabled, type McpFlags } from "~/utilities/mcp/flags.server";
import { fitMarkdown } from "~/utilities/mcp/markdown-budget";
import { MAX_PREVIEW_CODE_BYTES, previewUrl } from "~/utilities/mcp/preview-url";
import {
	closeNames,
	findRecords,
	getRecordText,
	migrateText,
	migrationsBetween,
	recordNamed,
	recordsOf,
	type MigrationGuide,
	type Provenance,
} from "~/utilities/mcp/tools";
import {
	createVersionDataLoader,
	MIN_SUPPORTED_VERSION,
	VersionError,
	type VersionData,
	type VersionDataLoader,
} from "~/utilities/mcp/version-data.server";
import { renderMdxToMarkdown } from "~/utilities/render-mdx-to-markdown.server";

/** The server instructions. The contract test caps their size. */
export const MCP_INSTRUCTIONS = [
	"Answers questions about @ngrok/mantle, ngrok's React UI library, for one exact published version.",
	"Your trained knowledge of mantle can be stale. Call `find` before you pick a component, and `get` before you write its props.",
	"Pass the exact installed version: read it from node_modules/@ngrok/mantle/package.json or the lockfile, not the range in package.json.",
	"Call `check` on each file you change. Import each part from its own subpath, such as @ngrok/mantle/button.",
	"When the user has no repo to run the code in, call `preview` and give them the link.",
].join("\n");

/** What the server reads; tests pass fakes. */
export type McpDependencies = {
	loader: VersionDataLoader;
	/** The `@ngrok/mantle` version of the docs build. */
	docsVersion: string;
	/** The commit of the docs build, when known. */
	docsCommit?: string;
	readDocs: (slug: string) => Promise<string | undefined>;
	migrations: () => Promise<MigrationGuide[]>;
	flags: () => McpFlags;
	/** The origin of the preview page. */
	previewOrigin: string;
	/** Records one tool call. Never receives code, queries, or messages. */
	log: (event: ToolCallEvent) => void;
};

/** One tool call, as the server logs it. */
export type ToolCallEvent = {
	tool: string;
	outcome: "ok" | "error" | "disabled";
	latencyMs: number;
	resultBytes: number;
	dataVersion?: string;
	/** Allowlisted record names from `find` and `get`, and diagnostic codes from `check`. */
	ids?: string[];
};

const versionArgument = z
	.string()
	.optional()
	.describe(
		`The exact installed @ngrok/mantle version, MAJOR.MINOR.PATCH, ${MIN_SUPPORTED_VERSION} or later. Defaults to the latest published version.`,
	);

const sectionsArgument = z
	.array(z.string().max(120))
	.max(12)
	.optional()
	.describe("Docs headings to return, such as `API Reference`. Omit for the default.");

const readOnly = { readOnlyHint: true, idempotentHint: true, openWorldHint: false } as const;

function text(body: string, isError = false): CallToolResult {
	return { content: [{ type: "text", text: body }], isError };
}

function byteLength(body: string): number {
	return new TextEncoder().encode(body).length;
}

function provenanceFor(dependencies: McpDependencies, data: VersionData): Provenance {
	return {
		dataVersion: data.version,
		docsVersion: dependencies.docsVersion,
		docsCommit: dependencies.docsVersion === data.version ? undefined : dependencies.docsCommit,
	};
}

function provenanceLine(provenance: Provenance): string {
	const commit = provenance.docsCommit == null ? "" : ` (commit ${provenance.docsCommit})`;
	return `dataVersion: ${provenance.dataVersion}; docsVersion: ${provenance.docsVersion}${commit}`;
}

/**
 * Creates one MCP server instance with the mantle tools, resources, and
 * prompt. The HTTP handler calls it once per request, so it holds no state.
 *
 * @example
 * const handler = createMcpHandler(() => createMantleMcpServer(dependencies));
 */
export function createMantleMcpServer(dependencies: McpDependencies): McpServer {
	const server = new McpServer(
		{ name: "mantle", title: "ngrok mantle", version: dependencies.docsVersion },
		{
			instructions: MCP_INSTRUCTIONS,
			cacheHints: {
				"tools/list": { ttlMs: 300_000, cacheScope: "public" },
				"prompts/list": { ttlMs: 300_000, cacheScope: "public" },
				"resources/list": { ttlMs: 300_000, cacheScope: "public" },
				"resources/templates/list": { ttlMs: 300_000, cacheScope: "public" },
				"resources/read": { ttlMs: 300_000, cacheScope: "public" },
			},
		},
	);

	/** Runs a tool body behind the kill switch, maps a version error to a tool error, and logs the call. */
	const run =
		<Args>(
			tool: string,
			body: (
				args: Args,
			) => Promise<{ result: CallToolResult; dataVersion?: string; ids?: string[] }>,
		) =>
		async (args: Args): Promise<CallToolResult> => {
			const started = performance.now();
			const finish = (
				outcome: ToolCallEvent["outcome"],
				result: CallToolResult,
				extra: Pick<ToolCallEvent, "dataVersion" | "ids"> = {},
			) => {
				const resultText = result.content
					.map((block) => (block.type === "text" ? block.text : ""))
					.join("");
				dependencies.log({
					tool,
					outcome,
					latencyMs: Math.round(performance.now() - started),
					resultBytes: byteLength(resultText),
					...extra,
				});
				return result;
			};
			if (!isMcpToolEnabled(dependencies.flags(), tool)) {
				return finish("disabled", text(`The ${tool} tool is turned off on this server.`, true));
			}
			try {
				const { result, dataVersion, ids } = await body(args);
				return finish(result.isError === true ? "error" : "ok", result, { dataVersion, ids });
			} catch (error) {
				if (error instanceof VersionError) {
					return finish("error", text(error.message, true));
				}
				throw error;
			}
		};

	server.registerTool(
		"find",
		{
			title: "Find mantle parts",
			description: `Ranks mantle components, layouts, hooks, and utilities for an intent ("confirm before delete") or a name from another library ("modal"). Returns up to 8 records with import paths. Supports ${MIN_SUPPORTED_VERSION} and later.`,
			inputSchema: z.object({
				query: z.string().min(1).max(200).describe("An intent or a component name."),
				kind: z.enum(["component", "layout", "hook", "utility"]).optional(),
				version: versionArgument,
			}),
			annotations: readOnly,
		},
		run("find", async ({ query, kind, version }) => {
			const data = await dependencies.loader.load(version);
			const found = findRecords(recordsOf(data), { query, kind });
			const body =
				found.length === 0
					? `No mantle part matches. Try a shorter intent or another name. (${provenanceLine(provenanceFor(dependencies, data))})`
					: [
							provenanceLine(provenanceFor(dependencies, data)),
							"",
							...found.map((record) =>
								[
									`- ${record.name} (${record.kind}${record.status === "preview" ? ", preview" : ""}): \`${record.importPath}\``,
									record.useWhen == null ? undefined : `  Use when: ${record.useWhen}`,
									record.summary == null ? undefined : `  ${record.summary}`,
									...(record.siblings ?? []).map(
										(sibling) => `  Instead \`${sibling.name}\`: ${sibling.boundary}`,
									),
									`  Docs: ${record.docsUrl}`,
								]
									.filter((line) => line != null)
									.join("\n"),
							),
							"",
							"Call `get` with a name for its examples and props.",
						].join("\n");
			return {
				result: text(body),
				dataVersion: data.version,
				ids: found.map((record) => record.name),
			};
		}),
	);

	server.registerTool(
		"get",
		{
			title: "Get a mantle part",
			description: `Returns one component, layout, hook, or utility: its import, examples, and prop contract for the selected version. Supports ${MIN_SUPPORTED_VERSION} and later.`,
			inputSchema: z.object({
				name: z
					.string()
					.min(1)
					.max(100)
					.describe('A name from `find`, such as "Dialog" or "useBreakpoint".'),
				sections: sectionsArgument,
				version: versionArgument,
			}),
			annotations: readOnly,
		},
		run("get", async ({ name, sections, version }) => {
			const data = await dependencies.loader.load(version);
			const records = recordsOf(data);
			const record = recordNamed(records, name);
			if (record == null) {
				const close = closeNames(records, name);
				const hint =
					close.length > 0 ? ` Close matches: ${close.join(", ")}.` : " Call `find` first.";
				return {
					result: text(
						`@ngrok/mantle@${data.version} has no part named ${JSON.stringify(name)}.${hint}`,
						true,
					),
					dataVersion: data.version,
				};
			}
			const provenance = provenanceFor(dependencies, data);
			const body = getRecordText({
				record,
				data,
				provenance,
				docsMarkdown: await dependencies.readDocs(record.docsSlug),
				sections,
			});
			return {
				result: text(`${provenanceLine(provenance)}\n\n${body}`),
				dataVersion: data.version,
				ids: [record.name],
			};
		}),
	);

	server.registerTool(
		"read_docs",
		{
			title: "Read a mantle docs page",
			description:
				"Returns a docs page as markdown, or an outline when the page is long. The docs are always the latest build.",
			inputSchema: z.object({
				path: z
					.string()
					.min(1)
					.max(200)
					.describe('A docs slug, such as "components/overlays/dialog" or "base/colors".'),
				sections: sectionsArgument,
			}),
			annotations: readOnly,
		},
		run("read_docs", async ({ path, sections }) => {
			const slug = path.replace(/^\/+|\/+$/g, "").replace(/\.mdx?$/, "") || "index";
			const markdown = await dependencies.readDocs(slug);
			if (markdown == null) {
				return {
					result: text(
						`No docs page at ${JSON.stringify(path)}. Call \`find\`, or read mantle://llms.txt for the page list.`,
						true,
					),
				};
			}
			const fitted = fitMarkdown({ markdown, sections });
			const missing =
				fitted.kind === "sections" && fitted.missing.length > 0
					? `\n\nNo heading matched: ${fitted.missing.join(", ")}.`
					: "";
			return {
				result: text(
					`docsVersion: ${dependencies.docsVersion} (latest)\n\n${fitted.text}${missing}`,
				),
			};
		}),
	);

	server.registerTool(
		"migrate",
		{
			title: "Plan a mantle upgrade",
			description:
				"Lists the migration guides between two versions, in order, with the codemod command for each guide that ships one.",
			inputSchema: z.object({
				from: z
					.string()
					.regex(/^\d+\.\d+\.\d+$/)
					.describe("The installed version."),
				to: z
					.string()
					.regex(/^\d+\.\d+\.\d+$/)
					.optional()
					.describe("The target version. Defaults to the latest."),
			}),
			annotations: readOnly,
		},
		run("migrate", async ({ from, to }) => {
			const target = to ?? (await dependencies.loader.latestVersion());
			const guides = migrationsBetween(await dependencies.migrations(), { from, to: target });
			return {
				result: text(migrateText({ guides, from, to: target })),
				ids: guides.map((guide) => guide.slug),
			};
		}),
	);

	server.registerTool(
		"check",
		{
			title: "Check mantle code",
			description: `Returns feedback on one TSX file: mantle import paths and names for the selected version, foreign UI libraries, and className construction. No type check. Max ${MAX_PREVIEW_CODE_BYTES} bytes. Supports ${MIN_SUPPORTED_VERSION} and later.`,
			inputSchema: z.object({
				code: z.string().min(1).describe("The TSX source of one file."),
				version: versionArgument,
			}),
			annotations: readOnly,
		},
		run("check", async ({ code, version }) => {
			if (byteLength(code) > MAX_PREVIEW_CODE_BYTES) {
				return {
					result: text(
						`The code is over ${MAX_PREVIEW_CODE_BYTES} bytes. Check one file at a time.`,
						true,
					),
				};
			}
			const data = await dependencies.loader.load(version);
			const diagnostics = checkCode({ code, data });
			const summary =
				diagnostics.length === 0
					? "No findings. This check does not run TypeScript; run tsc where you can."
					: `${diagnostics.length} finding(s).`;
			return {
				result: {
					content: [
						{
							type: "text",
							text: `${provenanceLine(provenanceFor(dependencies, data))}\n\n${summary}\n\n${JSON.stringify(diagnostics, null, 1)}`,
						},
					],
					structuredContent: { dataVersion: data.version, diagnostics },
				},
				dataVersion: data.version,
				ids: diagnostics.map((diagnostic) => diagnostic.code),
			};
		}),
	);

	server.registerTool(
		"preview",
		{
			title: "Preview mantle code",
			description: `Returns a link that renders one self-contained TSX file with a default export, in a sandbox in the user's browser. Imports react and @ngrok/mantle/* only. The server never stores the code; it travels in the link. Max ${MAX_PREVIEW_CODE_BYTES} bytes.`,
			inputSchema: z.object({
				code: z.string().min(1).describe("The TSX source of one file with one default export."),
			}),
			annotations: readOnly,
		},
		run("preview", async ({ code }) => {
			if (byteLength(code) > MAX_PREVIEW_CODE_BYTES) {
				return {
					result: text(
						`The code is over ${MAX_PREVIEW_CODE_BYTES} bytes. Split it or remove unused parts.`,
						true,
					),
				};
			}
			const data = await dependencies.loader.load(undefined);
			const diagnostics = checkCode({ code, data }).filter(
				(diagnostic) => diagnostic.severity !== "info",
			);
			const url = await previewUrl({ origin: dependencies.previewOrigin, code });
			return {
				result: {
					content: [
						{
							type: "text",
							text: [
								`Preview: ${url}`,
								`The page renders @ngrok/mantle@${dependencies.docsVersion}.`,
								diagnostics.length === 0
									? "check found nothing."
									: `check found ${diagnostics.length} issue(s); fix them first:\n${JSON.stringify(diagnostics, null, 1)}`,
							].join("\n"),
						},
					],
					structuredContent: { url, renderedVersion: dependencies.docsVersion, diagnostics },
				},
				dataVersion: data.version,
				ids: diagnostics.map((diagnostic) => diagnostic.code),
			};
		}),
	);

	server.registerResource(
		"llms.txt",
		"mantle://llms.txt",
		{
			title: "mantle llms.txt",
			description: "The page index of the latest published version.",
			mimeType: "text/plain",
		},
		async (uri) => {
			const data = await dependencies.loader.load(undefined);
			return { contents: [{ uri: uri.href, mimeType: "text/plain", text: data.llmsTxt ?? "" }] };
		},
	);

	server.registerResource(
		"agent.json",
		"mantle://agent.json",
		{
			title: "mantle agent manifest",
			description: "Every component, hook, and utility record of the latest published version.",
			mimeType: "application/json",
		},
		async (uri) => {
			const data = await dependencies.loader.load(undefined);
			return {
				contents: [
					{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data.manifest) },
				],
			};
		},
	);

	server.registerResource(
		"docs",
		new ResourceTemplate("mantle://docs/{+path}", { list: undefined }),
		{
			title: "mantle docs page",
			description: "One docs page as markdown, or an outline when it is long.",
			mimeType: "text/markdown",
		},
		async (uri, variables) => {
			const path = typeof variables.path === "string" ? variables.path : "";
			const markdown = await dependencies.readDocs(path);
			if (markdown == null) {
				throw new Error(`No docs page at ${JSON.stringify(path)}.`);
			}
			return {
				contents: [
					{ uri: uri.href, mimeType: "text/markdown", text: fitMarkdown({ markdown }).text },
				],
			};
		},
	);

	server.registerPrompt(
		"build-with-mantle",
		{
			title: "Build with mantle",
			description: "Loads the mantle conventions and the tool order for a UI task.",
		},
		async () => {
			const page = (await dependencies.readDocs("for-ai-agents")) ?? "";
			const conventions = fitMarkdown({
				markdown: page,
				sections: ["Conventions agents should know", "When to ask vs. when to act"],
			}).text;
			return {
				messages: [
					{
						role: "user",
						content: { type: "text", text: `${MCP_INSTRUCTIONS}\n\n${conventions}` },
					},
				],
			};
		},
	);

	return server;
}

const markdownCache = new Map<string, string>();

/** Reads one docs page as markdown from the docs build. */
async function readDocs(slug: string): Promise<string | undefined> {
	const filePath = urlToFileMap.get(slug);
	const raw = filePath == null ? undefined : rawDocContent[filePath];
	if (filePath == null || raw == null) {
		return undefined;
	}
	const cached = markdownCache.get(filePath);
	if (cached != null && import.meta.env.PROD) {
		return cached;
	}
	const markdown = renderMdxToMarkdown(raw);
	markdownCache.set(filePath, markdown);
	return markdown;
}

const migrationGuideFrontmatter = z.object({
	title: z.string(),
	description: z.string(),
	introducedIn: z.string().regex(/^\d+\.\d+\.\d+$/),
	codemodIn: z
		.string()
		.regex(/^\d+\.\d+\.\d+$/)
		.optional(),
	codemodIdempotent: z.boolean().default(true),
});

/**
 * Every migration guide with its frontmatter and `## Codemod` section. Throws
 * when a guide lacks `introducedIn`, so a new guide cannot ship without it.
 */
export async function loadMigrationGuides(): Promise<MigrationGuide[]> {
	const slugs = Array.from(urlToFileMap.keys()).filter((slug) => slug.startsWith("migrations/"));
	return Promise.all(
		slugs.map(async (slug): Promise<MigrationGuide> => {
			const filePath = urlToFileMap.get(slug) ?? "";
			const frontmatter = migrationGuideFrontmatter.parse(await loadFrontmatter(filePath));
			const markdown = (await readDocs(slug)) ?? "";
			return {
				slug,
				...frontmatter,
				url: canonicalHref(`/${slug}`),
				codemodSection: fitMarkdown({ markdown, sections: ["Codemod"] }).text,
			};
		}),
	);
}

let loader: VersionDataLoader | undefined;

/**
 * The production dependencies: one version loader for the process. The
 * preview links point at `MANTLE_PREVIEW_ORIGIN` when set, else at the request
 * origin in dev and the canonical origin in production.
 */
export function productionDependencies({
	flags,
	requestOrigin,
}: {
	flags: () => McpFlags;
	requestOrigin: string;
}): McpDependencies {
	loader ??= createVersionDataLoader();
	return {
		loader,
		docsVersion: mantlePackageJson.version,
		docsCommit: process.env.COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA,
		readDocs,
		migrations: loadMigrationGuides,
		flags,
		previewOrigin:
			process.env.MANTLE_PREVIEW_ORIGIN ?? (import.meta.env.DEV ? requestOrigin : canonicalOrigin),
		log: (event) => {
			console.info(JSON.stringify({ event: "mcp.tool_call", ...event }));
		},
	};
}
