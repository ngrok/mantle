import mantlePackageJson from "@ngrok/mantle/package.json" with { type: "json" };
import { McpServer, ResourceTemplate, type CallToolResult } from "@modelcontextprotocol/server";
import { z } from "zod";
import { buildSiteAgentManifest } from "~/utilities/agent-manifest.server";
import { canonicalHref, canonicalOrigin } from "~/utilities/canonical-origin";
import { loadFrontmatter, rawDocContent, urlToFileMap } from "~/utilities/docs";
import { checkCode } from "~/utilities/mcp/check.server";
import { isMcpToolEnabled, previewFrameOrigin, type McpFlags } from "~/utilities/mcp/flags.server";
import { fitMarkdown } from "~/utilities/mcp/markdown-budget";
import { MCP_APP_MIME_TYPE, PREVIEW_APP_URI, previewAppHtml } from "~/utilities/mcp/preview-app";
import { MAX_PREVIEW_CODE_BYTES, previewUrl } from "~/utilities/mcp/preview-url";
import {
	closeNames,
	findRecords,
	gapTokens,
	getRecipeText,
	getRecordText,
	isDocPage,
	migrateText,
	migrationsBetween,
	recipeNamed,
	recordNamed,
	recordsOf,
	scrubIntent,
	ticketKey,
	workspaceSlug,
	type DocPageRecord,
	type FindRecord,
	type MigrationGuide,
	type Provenance,
} from "~/utilities/mcp/tools";
import {
	compareVersions,
	createVersionDataLoader,
	MIN_SUPPORTED_VERSION,
	ServerBusyError,
	VersionError,
	type VersionData,
	type VersionDataLoader,
} from "~/utilities/mcp/version-data.server";
import { countUrls, hasProfanity } from "~/utilities/mcp/content-safety";
import { clipMarkdown, mcpPulse } from "~/utilities/mcp/pulse.server";
import { renderMdxToMarkdown } from "~/utilities/render-mdx-to-markdown.server";
import { loadDeclarationFiles, loadSourceFiles } from "~/utilities/mantle-source.server";
import { declaredWordsOf } from "~/utilities/mcp/declarations.server";
import { sourceHash } from "../../../../../packages/mantle/scripts/agent-manifest";

/** The server instructions. The contract test caps their size. */
export const MCP_INSTRUCTIONS = [
	"Helps you build UI with @ngrok/mantle, ngrok's React UI library, for one exact version.",
	"Use mantle parts before you write custom UI or add a UI library.",
	"Your trained knowledge of mantle can be stale. Call `find` before you pick a component or pattern, and `get` before you write its props.",
	"Pass the exact installed version from node_modules/@ngrok/mantle/package.json or the lockfile, not the package.json range.",
	"Call `check` on each file you change. Import each part from its own subpath, such as @ngrok/mantle/button.",
	"With no repo to run the code in, call `preview` and give the user the link.",
	"When mantle has no part for a need, call `report_gap` once for that need.",
	"Your final reply lists each part you built instead of mantle, and why. Claim a mantle part only with its import and the JSX that renders it.",
	"Pass `intent` and `workspace` on each call, so mantle learns what agents build.",
	'When you know the Linear issue of the work, such as MNTL-59, pass it as `ticket` on each call. `report_gap` requires it, or "none".',
].join("\n");

/** What the server reads; tests pass fakes. */
export type McpDependencies = {
	loader: VersionDataLoader;
	/** The `@ngrok/mantle` version of the docs build. */
	docsVersion: string;
	/** The commit of the docs build, when known. */
	docsCommit?: string;
	/** The `sourceHash` of the docs build's package source. */
	docsSourceHash: () => Promise<string | undefined>;
	/** Each identifier in the docs build's declarations that `specifier` reaches, when the build has them. */
	docsDeclaredWordsOf: (specifier: string) => Promise<ReadonlySet<string> | undefined>;
	readDocs: (slug: string) => Promise<string | undefined>;
	migrations: () => Promise<MigrationGuide[]>;
	/** The docs pages with no API record, such as foundations and recipes. */
	docPages: () => Promise<DocPageRecord[]>;
	flags: () => McpFlags;
	/** The origin of the preview page. */
	previewOrigin: string;
	/** The origin of the prototype frame that the preview page and the MCP App view load. */
	frameOrigin: string;
	/** Records one tool call. Never receives code or messages, and free text only as `scrubIntent` output. */
	log: (event: ToolCallEvent) => void;
};

/** What a gap report says is missing. */
const GAP_KINDS = [
	"component",
	"variant-or-prop",
	"hook-or-utility",
	"pattern",
	"docs",
	"other",
] as const;

/** The longest write-up that a gap report keeps, in characters. */
const WRITEUP_LENGTH = 4_000;

/** The most URLs that one gap report may hold. More is a spam signal. */
const MAX_REPORT_URLS = 5;

/** What the agent did when mantle had no fit. */
const GAP_WORKAROUNDS = [
	"built-custom",
	"composed-mantle-parts",
	"used-another-library",
	"none",
] as const;

/**
 * A sign that mantle lacks something. `find` sends one for each weak result,
 * and `report_gap` sends one with what the agent did instead. It holds
 * scrubbed words, enums, and free text only as `scrubIntent` output.
 */
export type GapSignal = {
	source: "find" | "report_gap";
	/** The words of the query or the need, from `gapTokens`. */
	tokens: string[];
	kind?: (typeof GAP_KINDS)[number];
	workaround?: (typeof GAP_WORKAROUNDS)[number];
	/** An allowlisted record name: the part the agent used or nearly used. */
	closestPart?: string;
	/** The `find` queries and `get` parts that the agent tried. */
	tried?: string;
	/** The agent's own take, such as "I would use Tabs, but it has no done state". */
	reflection?: string;
	/** What the agent built instead. */
	built?: string;
	/**
	 * The agent's long-form write-up in markdown. A call with a `source` keeps
	 * its text as sent, code included; other calls keep `scrubIntent` output.
	 */
	writeup?: string;
};

/**
 * The part of a gap write-up that the server keeps: the text as sent, cut to
 * `WRITEUP_LENGTH`, when `raw`, else `scrubIntent` output. Why raw from an
 * ngrok repo: its code sketch shows the API that the team should build.
 */
function keptWriteup(writeup: string, { raw }: { raw: boolean }): string | undefined {
	return raw ? clipMarkdown(writeup.trim(), WRITEUP_LENGTH) || undefined : scrubIntent(writeup);
}

/**
 * Why a tool call failed:
 *
 * - `validation`: the arguments do not match the input schema, so the tool body never ran.
 * - `invalid_argument`: the arguments match the schema, but the tool cannot use them.
 * - `not_found`: no part, docs page, or published version has the name.
 * - `version`: the version is malformed, too old, or not published.
 * - `too_large`: the code is over the size cap.
 * - `busy`: the server has too many versions to load. A retry can work.
 * - `internal`: the server failed.
 */
export type ToolErrorKind =
	| "validation"
	| "invalid_argument"
	| "not_found"
	| "version"
	| "too_large"
	| "busy"
	| "internal";

/** How a tool call ended. An `error` outcome always has its kind. */
type ToolCallOutcome =
	| { outcome: "ok" | "disabled" }
	| { outcome: "error"; errorKind: ToolErrorKind };

/** One tool call, as the server logs it. */
export type ToolCallEvent = ToolCallOutcome & {
	tool: string;
	latencyMs: number;
	resultBytes: number;
	/** The first product token of the `User-Agent` header, such as `claude-code/2.1.3`. */
	client?: string;
	/** The ngrok repo that the call came from, from the `source` query parameter. */
	source?: McpSource;
	/** The agent's reason for the call, from `scrubIntent`. */
	intent?: string;
	/** The app or package that the agent changes, from `workspaceSlug`. Only a call with a `source` has one. */
	workspace?: string;
	/** The Linear issue key of the work, from `ticketKey`. Only a call with a `source` has one. */
	ticket?: string;
	dataVersion?: string;
	/** Allowlisted record names from `find` and `get`, and diagnostic codes from `check`. */
	ids?: string[];
	/** The number of `find` results. */
	resultCount?: number;
	/** The top-level argument names that failed validation. */
	invalidFields?: string[];
	gap?: GapSignal;
};

/** The fields that a tool body adds to its log event. */
type ToolCallFacts = Pick<ToolCallEvent, "dataVersion" | "ids" | "resultCount" | "gap"> & {
	/** Set by `failure`; a tool error with no kind logs as `internal`. */
	errorKind?: ToolErrorKind;
};

/** A tool error result with the kind that its log event records. */
function failure(errorKind: ToolErrorKind, message: string, facts: ToolCallFacts = {}) {
	return { result: text(message, true), ...facts, errorKind };
}

/**
 * The client name of a request: the first product token of its `User-Agent`
 * header, with any character outside `[\w./-]` removed, or `undefined` for
 * profanity. Most clients send no
 * `clientInfo` on a stateless `tools/call`, so the header is the one signal.
 */
function clientOf(request: Request | undefined): string | undefined {
	const token = request?.headers.get("user-agent")?.trim().split(/\s+/)[0] ?? "";
	const client = token.replace(/[^\w./-]/g, "").slice(0, 60);
	return client === "" || hasProfanity(client) ? undefined : client;
}

/** The string at `key` in the raw arguments of a call, or `undefined`. */
function rawString(value: unknown, key: "intent" | "workspace" | "ticket"): string | undefined {
	if (typeof value !== "object" || value == null || !(key in value)) {
		return undefined;
	}
	const field: unknown = Reflect.get(value, key);
	return typeof field === "string" ? field : undefined;
}

/** The GitHub orgs of ngrok. Only ngrok uses mantle. */
const NGROK_ORGS = ["ngrok", "ngrok-private", "ngrok-adhoc"] as const;

/**
 * An ngrok repo that calls the MCP server, as `org/repo`. Its agent config
 * adds `?source=org/repo` to the MCP URL, such as
 * `https://mantle.ngrok.com/mcp?source=ngrok-private/frontend`. A source marks
 * ngrok staff traffic and names no person.
 */
export type McpSource = `${(typeof NGROK_ORGS)[number]}/${string}`;

/** The repo names that a source took before `org/repo`. Agent configs still send them. */
const SOURCE_ALIASES = new Map<string, McpSource>([
	["frontend", "ngrok-private/frontend"],
	["ngrok", "ngrok-private/ngrok"],
	["mantle", "ngrok/mantle"],
]);

/** A GitHub repo name, in lowercase. */
const REPO_NAME = /^[a-z0-9][a-z0-9._-]{0,99}$/;

/**
 * The `source` query parameter of a request, or `undefined` when it names no
 * repo in an ngrok org. Why an allowlist: the server is public, and the value
 * goes into Slack.
 */
function sourceOf(request: Request | undefined): McpSource | undefined {
	const value = request == null ? null : new URL(request.url).searchParams.get("source");
	const source = value?.trim().toLowerCase() ?? "";
	const [owner, repo, ...rest] = source.split("/");
	const org = NGROK_ORGS.find((name) => name === owner);
	return (
		SOURCE_ALIASES.get(source) ??
		(org != null && repo != null && rest.length === 0 && REPO_NAME.test(repo) && !hasProfanity(repo)
			? `${org}/${repo}`
			: undefined)
	);
}

const versionArgument = z
	.string()
	.optional()
	.describe(
		`Exact installed @ngrok/mantle version, ${MIN_SUPPORTED_VERSION} or later. Defaults to the latest.`,
	);

const sectionsArgument = z
	.array(z.string().max(120))
	.max(12)
	.optional()
	.describe("Docs headings to return, such as `API Reference`.");

// Why one line each: every tool repeats these three, and tools/list loads in each session.
// The For AI Agents page holds the full rules.
// Why no max: a long intent must not fail the call. `scrubIntent` cuts it for the log.
const intentArgument = z
	.string()
	.optional()
	.describe(
		'The screen, change, and question, such as "endpoints list, bulk delete, need a confirm". No code, paths, URLs, names, or customer data.',
	);

// Why no schema check: a bad workspace must not fail the call. `workspaceSlug` drops it from the log.
const workspaceArgument = z
	.string()
	.nullish()
	.describe('App or package folder slug, such as "dashboard". No names.');

// Why no schema check: a bad ticket must not fail the call. `ticketKey` drops it from the log.
const ticketArgument = z
	.string()
	.nullish()
	.describe('Linear issue key, such as "MNTL-59", if known. Never invent one.');

// Why required: an agent fills each required argument, so it looks for the issue before it reports a gap.
const requiredTicketArgument = z
	.string()
	.describe(
		'The Linear issue key of the work, such as "CDATA-1234", from the task, branch, or commits. Never invent one. Send "none" if unknown.',
	);

// Why no idempotentHint: MCP reads it only when readOnlyHint is false.
const readOnly = { readOnlyHint: true, openWorldHint: false } as const;

function text(body: string, isError = false): CallToolResult {
	return { content: [{ type: "text", text: body }], isError };
}

function byteLength(body: string): number {
	return new TextEncoder().encode(body).length;
}

async function provenanceFor(
	dependencies: McpDependencies,
	data: VersionData,
): Promise<Provenance> {
	const { docsVersion, docsCommit } = dependencies;
	if (docsVersion !== data.version) {
		return { dataVersion: data.version, docsVersion, docsCommit };
	}
	// Why the hash: main keeps the released version number until the next
	// release, so the docs build can document props that version does not have.
	const docsSourceHash = await dependencies.docsSourceHash();
	if (docsSourceHash != null && docsSourceHash === data.manifest.sourceHash) {
		return { dataVersion: data.version, docsVersion };
	}
	return {
		dataVersion: data.version,
		docsVersion: `${docsVersion} with unreleased changes`,
		docsCommit,
	};
}

/** The docs version as `provenanceFor` labels it against the latest release. */
async function latestDocsVersion(dependencies: McpDependencies): Promise<string> {
	try {
		return (await provenanceFor(dependencies, await dependencies.loader.load(undefined)))
			.docsVersion;
	} catch {
		// Why: `read_docs` needs no release data, so a registry failure keeps the bare version.
		return dependencies.docsVersion;
	}
}

function provenanceLine(provenance: Provenance): string {
	const commit = provenance.docsCommit == null ? "" : ` (commit ${provenance.docsCommit})`;
	return `dataVersion: ${provenance.dataVersion}; docsVersion: ${provenance.docsVersion}${commit}`;
}

/** One `find` result as markdown. */
function findResultText(record: FindRecord): string {
	if (isDocPage(record)) {
		return [
			record.kind === "recipe"
				? `- ${record.name} (recipe): \`get\` "${record.name}"`
				: `- ${record.name} (docs page): \`read_docs\` path "${record.docsSlug}"`,
			record.useWhen == null ? undefined : `  Use when: ${record.useWhen}`,
			record.summary == null ? undefined : `  ${record.summary}`,
			record.parts == null ? undefined : `  Parts: ${record.parts.join(", ")}`,
			`  Docs: ${record.docsUrl}`,
		]
			.filter((line) => line != null)
			.join("\n");
	}
	return [
		`- ${record.name} (${record.kind}${record.status === "preview" ? ", preview" : ""}): \`${record.importPath}\``,
		record.useWhen == null ? undefined : `  Use when: ${record.useWhen}`,
		record.summary == null ? undefined : `  ${record.summary}`,
		...(record.siblings ?? []).map(
			(sibling) => `  Instead \`${sibling.name}\`: ${sibling.boundary}`,
		),
		`  Docs: ${record.docsUrl}`,
	]
		.filter((line) => line != null)
		.join("\n");
}

/**
 * Creates one MCP server instance with the mantle tools, resources, and
 * prompt. The HTTP handler calls it once per request, so it holds no state.
 * The request names the client and the source in each log event. A call
 * logs its `workspace` and `ticket` only when the request has a source, so
 * the project names and issue keys of other companies stay out of Slack.
 *
 * @example
 * const handler = createMcpHandler(({ requestInfo }) =>
 * 	createMantleMcpServer(dependencies, requestInfo),
 * );
 */
export function createMantleMcpServer(dependencies: McpDependencies, request?: Request): McpServer {
	const client = clientOf(request);
	const source = sourceOf(request);
	/** The logged `workspace` and `ticket`. Both need a source. */
	const attribution = (
		workspace: string | null | undefined,
		ticket: string | null | undefined,
	) => ({
		workspace: source == null || workspace == null ? undefined : workspaceSlug(workspace),
		ticket: source == null || ticket == null ? undefined : ticketKey(ticket),
	});

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

	/**
	 * Wraps the input schema of `tool` to log a call whose arguments fail it,
	 * with the scrubbed `intent`, `workspace`, and `ticket` when they are
	 * strings. The SDK rejects that call before `run`, so this is its one log
	 * event.
	 */
	const logInvalid = <Schema extends z.ZodType>(tool: string, schema: Schema) => {
		const standard = schema["~standard"];
		const report = (value: unknown, result: Awaited<ReturnType<typeof standard.validate>>) => {
			if (result.issues != null) {
				const intent = rawString(value, "intent");
				const workspace = rawString(value, "workspace");
				const ticket = rawString(value, "ticket");
				const fields = result.issues.map(({ path }) => {
					const first = path?.[0];
					return String(typeof first === "object" ? first.key : (first ?? "arguments"));
				});
				dependencies.log({
					tool,
					outcome: "error",
					errorKind: "validation",
					latencyMs: 0,
					resultBytes: 0,
					client,
					source,
					intent: intent == null ? undefined : scrubIntent(intent),
					...attribution(workspace, ticket),
					invalidFields: Array.from(new Set(fields)),
				});
			}
			return result;
		};
		return {
			"~standard": {
				...standard,
				validate: (value: unknown) => {
					const result = standard.validate(value);
					return result instanceof Promise
						? result.then((settled) => report(value, settled))
						: report(value, result);
				},
				// Why drop `$schema`: MCP reads a schema without it as 2020-12, and each tool repeats it in tools/list.
				jsonSchema: {
					...standard.jsonSchema,
					input: () => {
						const { $schema: _, ...json } = z.toJSONSchema(schema, { io: "input" });
						return json;
					},
				},
			},
		};
	};

	/**
	 * Runs a tool body behind the kill switch, maps a version error to a tool
	 * error, and logs the call with the scrubbed `intent`, `workspace`, and
	 * `ticket`. The body never sees them. Any other error is logged, then
	 * thrown to the handler.
	 */
	const run =
		<Args extends { intent?: string; workspace?: string | null; ticket?: string | null }>(
			tool: string,
			body: (
				args: Omit<Args, "intent" | "workspace" | "ticket">,
			) => Promise<{ result: CallToolResult } & ToolCallFacts>,
		) =>
		async ({ intent, workspace, ticket, ...args }: Args): Promise<CallToolResult> => {
			const started = performance.now();
			const finish = (
				outcome: ToolCallOutcome,
				result: CallToolResult,
				facts: Omit<ToolCallFacts, "errorKind"> = {},
			) => {
				const resultText = result.content
					.map((block) => (block.type === "text" ? block.text : ""))
					.join("");
				dependencies.log({
					tool,
					...outcome,
					latencyMs: Math.round(performance.now() - started),
					resultBytes: byteLength(resultText),
					client,
					source,
					intent: intent == null ? undefined : scrubIntent(intent),
					...attribution(workspace, ticket),
					...facts,
				});
				return result;
			};
			if (!isMcpToolEnabled(dependencies.flags(), tool)) {
				return finish(
					{ outcome: "disabled" },
					text(`The ${tool} tool is turned off on this server.`, true),
				);
			}
			try {
				const { result, errorKind, ...facts } = await body(args);
				const outcome: ToolCallOutcome =
					result.isError === true
						? { outcome: "error", errorKind: errorKind ?? "internal" }
						: { outcome: "ok" };
				return finish(outcome, result, facts);
			} catch (error) {
				if (error instanceof VersionError) {
					const errorKind = error instanceof ServerBusyError ? "busy" : "version";
					return finish({ outcome: "error", errorKind }, text(error.message, true));
				}
				finish({ outcome: "error", errorKind: "internal" }, text("", true));
				throw error;
			}
		};

	server.registerTool(
		"find",
		{
			title: "Find mantle parts",
			description: `Ranks mantle components, layouts, hooks, utilities, recipes, and docs pages for an intent ("confirm before delete") or another library's name ("modal"). Returns up to 8 with import paths, and says when none is a strong match.`,
			inputSchema: logInvalid(
				"find",
				z.object({
					query: z.string().min(1).max(200).describe("An intent or a component name."),
					// Why "pattern": agents say it for a recipe. It maps to `recipe` and stays out of the schema.
					kind: z
						.preprocess(
							(value) => (value === "pattern" ? "recipe" : value),
							z.enum(["component", "layout", "hook", "utility", "recipe", "page"]),
						)
						.optional(),
					version: versionArgument,
					intent: intentArgument,
					workspace: workspaceArgument,
					ticket: ticketArgument,
				}),
			),
			annotations: readOnly,
		},
		run("find", async ({ query, kind, version }) => {
			const [data, docPages] = await Promise.all([
				dependencies.loader.load(version),
				dependencies.docPages(),
			]);
			const records = recordsOf(data);
			const recordSlugs = new Set(records.map((record) => record.docsSlug));
			const searchable: FindRecord[] = [
				...records,
				...docPages.filter((page) => !recordSlugs.has(page.docsSlug)),
			];
			const found = findRecords(searchable, { query, kind });
			const strongMatch = found[0]?.strong === true;
			const advice = strongMatch
				? "Call `get` with a name for its examples and props, or `read_docs` with a page path."
				: "No result is a strong match, so mantle may have no part for this. Check that a result fits before you use it. If none fits, compose mantle parts, then call `report_gap`.";
			const body = [
				provenanceLine(await provenanceFor(dependencies, data)),
				"",
				...found.map(({ record }) => findResultText(record)),
				...(found.length === 0 ? ["No mantle part or docs page matches."] : []),
				"",
				advice,
			].join("\n");
			const tokens = strongMatch ? [] : gapTokens(query);
			return {
				result: {
					content: [{ type: "text", text: body }],
					structuredContent: {
						dataVersion: data.version,
						strongMatch,
						results: found.map(({ record, score }) => ({
							name: record.name,
							kind: record.kind,
							importPath: isDocPage(record) ? undefined : record.importPath,
							docsUrl: record.docsUrl,
							score,
						})),
					},
				},
				dataVersion: data.version,
				ids: found.map(({ record }) => record.name),
				resultCount: found.length,
				gap: tokens.length === 0 ? undefined : { source: "find", tokens },
			};
		}),
	);

	server.registerTool(
		"get",
		{
			title: "Get a mantle part",
			description:
				"Returns one part's import, examples, and prop contract for the selected version, or a recipe's parts and docs page.",
			inputSchema: logInvalid(
				"get",
				z.object({
					name: z
						.string()
						.min(1)
						.max(100)
						.describe('A name from `find`, such as "Dialog" or "useBreakpoint".'),
					sections: sectionsArgument,
					version: versionArgument,
					intent: intentArgument,
					workspace: workspaceArgument,
					ticket: ticketArgument,
				}),
			),
			annotations: readOnly,
		},
		run("get", async ({ name, sections, version }) => {
			const data = await dependencies.loader.load(version);
			const records = recordsOf(data);
			const record = recordNamed(records, name);
			if (record == null) {
				const recipe = recipeNamed(await dependencies.docPages(), name);
				if (recipe != null) {
					const body = getRecipeText({
						recipe,
						records,
						dataVersion: data.version,
						docsMarkdown: await dependencies.readDocs(recipe.docsSlug),
						sections,
					});
					return {
						result: text(
							`dataVersion: ${data.version}; docsVersion: ${dependencies.docsVersion} (latest)\n\n${body}`,
						),
						dataVersion: data.version,
						ids: [recipe.name],
					};
				}
				const close = closeNames(records, name);
				const hint =
					close.length > 0 ? ` Close matches: ${close.join(", ")}.` : " Call `find` first.";
				return failure(
					"not_found",
					`@ngrok/mantle@${data.version} has no part named ${JSON.stringify(name)}.${hint}`,
					{ dataVersion: data.version },
				);
			}
			const provenance = await provenanceFor(dependencies, data);
			// Why only the latest release with unreleased changes: an older version can inherit a prop
			// from a dependency that the docs build now declares itself, and its words cannot show that.
			const unreleased =
				dependencies.docsVersion === data.version && provenance.docsVersion !== data.version;
			const body = getRecordText({
				record,
				data,
				provenance,
				docsMarkdown: await dependencies.readDocs(record.docsSlug),
				docsWords: unreleased
					? await dependencies.docsDeclaredWordsOf(record.importPath)
					: undefined,
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
				"Returns a docs page of the latest build as markdown, or an outline when the page is long.",
			inputSchema: logInvalid(
				"read_docs",
				z.object({
					path: z
						.string()
						.min(1)
						.max(200)
						.describe('A docs slug, such as "components/overlays/dialog" or "base/colors".'),
					sections: sectionsArgument,
					intent: intentArgument,
					workspace: workspaceArgument,
					ticket: ticketArgument,
				}),
			),
			annotations: readOnly,
		},
		run("read_docs", async ({ path, sections }) => {
			const slug = path.replace(/^\/+|\/+$/g, "").replace(/\.mdx?$/, "") || "index";
			const markdown = await dependencies.readDocs(slug);
			if (markdown == null) {
				return failure(
					"not_found",
					`No docs page at ${JSON.stringify(path)}. Call \`find\`, or read mantle://llms.txt for the page list.`,
				);
			}
			const fitted = fitMarkdown({ markdown, sections });
			const missing =
				fitted.kind === "sections" && fitted.missing.length > 0
					? `\n\nNo heading matched: ${fitted.missing.join(", ")}.`
					: "";
			return {
				result: text(
					`docsVersion: ${await latestDocsVersion(dependencies)} (latest)\n\n${fitted.text}${missing}`,
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
			inputSchema: logInvalid(
				"migrate",
				z.object({
					from: z
						.string()
						.regex(/^\d+\.\d+\.\d+$/)
						.describe("The installed version."),
					to: z
						.string()
						.regex(/^\d+\.\d+\.\d+$/)
						.optional()
						.describe("The target version. Defaults to the latest."),
					intent: intentArgument,
					workspace: workspaceArgument,
					ticket: ticketArgument,
				}),
			),
			annotations: readOnly,
		},
		run("migrate", async ({ from, to }) => {
			const target = to ?? (await dependencies.loader.latestVersion());
			if (compareVersions(target, from) < 0) {
				return failure(
					"invalid_argument",
					`The target ${target} is older than ${from}. Pass a newer \`to\`.`,
				);
			}
			if (!(await dependencies.loader.isPublished(target))) {
				return failure("version", `@ngrok/mantle@${target} is not a published version.`);
			}
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
			inputSchema: logInvalid(
				"check",
				z.object({
					code: z.string().min(1).describe("The TSX source of one file."),
					version: versionArgument,
					intent: intentArgument,
					workspace: workspaceArgument,
					ticket: ticketArgument,
				}),
			),
			annotations: readOnly,
		},
		run("check", async ({ code, version }) => {
			if (byteLength(code) > MAX_PREVIEW_CODE_BYTES) {
				return failure(
					"too_large",
					`The code is over ${MAX_PREVIEW_CODE_BYTES} bytes. Check one file at a time.`,
				);
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
							text: `${provenanceLine(await provenanceFor(dependencies, data))}\n\n${summary}\n\n${JSON.stringify(diagnostics, null, 1)}`,
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
			inputSchema: logInvalid(
				"preview",
				z.object({
					code: z.string().min(1).describe("The TSX source of one file with one default export."),
					intent: intentArgument,
					workspace: workspaceArgument,
					ticket: ticketArgument,
				}),
			),
			annotations: readOnly,
			// Why the flat key too: it is the deprecated MCP Apps form, and the ext-apps SDK still writes it for older hosts.
			_meta: { ui: { resourceUri: PREVIEW_APP_URI }, "ui/resourceUri": PREVIEW_APP_URI },
		},
		run("preview", async ({ code }) => {
			if (byteLength(code) > MAX_PREVIEW_CODE_BYTES) {
				return failure(
					"too_large",
					`The code is over ${MAX_PREVIEW_CODE_BYTES} bytes. Split it or remove unused parts.`,
				);
			}
			// Why the docs version: the preview page renders it, so check names what that page can import.
			const data = await dependencies.loader.load(dependencies.docsVersion);
			const diagnostics = checkCode({ code, data, requireDefaultExport: true });
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
									: `check found ${diagnostics.length} finding(s). Fix each error before you share the link:\n${JSON.stringify(diagnostics, null, 1)}`,
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

	server.registerTool(
		"report_gap",
		{
			title: "Report a mantle gap",
			description:
				"Tells the mantle team what mantle lacked, so they can build it. Call it once for each need, after `find` and `get` found no fit. The team reads every report: be specific, and put the long account in `writeup`. No secrets or customer data.",
			inputSchema: logInvalid(
				"report_gap",
				z.object({
					need: z
						.string()
						.min(3)
						.max(120)
						.describe(
							'A short name for the need, such as "stepper" or "date range picker". Put detail in the other fields.',
						),
					kind: z.enum(GAP_KINDS).describe("The kind of part that is missing."),
					workaround: z.enum(GAP_WORKAROUNDS).describe("What you did instead."),
					closestPart: z
						.string()
						.max(100)
						.optional()
						.describe("The mantle part you used or nearly used, such as Tabs."),
					// Why no max on the free text: a long field must not fail the call. `scrubIntent` cuts it.
					tried: z
						.string()
						.describe(
							'Each `find` query and `get` part you tried, and what each lacked, such as "find stepper found nothing, get Tabs has no step state".',
						),
					reflection: z
						.string()
						.describe(
							'Your honest take, such as "I would use Tabs, but it has no numbered steps or done state, so I built my own."',
						),
					built: z.string().optional().describe("What you built instead."),
					// Why no max: a long write-up must not fail the call. The server cuts it.
					writeup: z
						.string()
						.optional()
						.describe(
							`A long-form account in markdown, up to ${WRITEUP_LENGTH} characters. Say what you were building and for whom, each part and prop you tried and exactly why it fell short, the API you wish mantle had, and a short code sketch of it. Specific beats short.`,
						),
					version: versionArgument,
					intent: z
						.string()
						.describe(
							'The screen, the change, and where mantle fell short, such as "onboarding page, add a setup checklist, need numbered steps with a done state".',
						),
					workspace: workspaceArgument,
					ticket: requiredTicketArgument,
				}),
			),
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				// Why not idempotent: a repeated call posts a second report.
				idempotentHint: false,
				openWorldHint: true,
			},
		},
		run(
			"report_gap",
			async ({
				need,
				kind,
				workaround,
				closestPart,
				tried,
				reflection,
				built,
				writeup,
				version,
			}) => {
				const prose = [need, tried, reflection, built, writeup].join("\n");
				if (hasProfanity(prose)) {
					return failure("invalid_argument", "Remove the offensive language and report again.");
				}
				if (countUrls(prose) > MAX_REPORT_URLS) {
					return failure(
						"invalid_argument",
						`Keep the report to ${MAX_REPORT_URLS} links or fewer, and report again.`,
					);
				}
				const tokens = gapTokens(need);
				if (tokens.length === 0) {
					return failure(
						"invalid_argument",
						'Name the need in generic words of three letters or more, such as "stepper".',
					);
				}
				const data = await dependencies.loader.load(version);
				return {
					result: text(
						`Reported: ${tokens.join(" ")}. Thank you. Do not report this need again in this task.`,
					),
					dataVersion: data.version,
					gap: {
						source: "report_gap",
						tokens,
						kind,
						workaround,
						closestPart:
							closestPart == null ? undefined : recordNamed(recordsOf(data), closestPart)?.name,
						tried: scrubIntent(tried),
						reflection: scrubIntent(reflection),
						built: built == null ? undefined : scrubIntent(built),
						writeup: writeup == null ? undefined : keptWriteup(writeup, { raw: source != null }),
					},
				};
			},
		),
	);

	server.registerResource(
		"preview-app",
		PREVIEW_APP_URI,
		{
			title: "mantle preview view",
			description: "The MCP App view that shows a `preview` result in the chat.",
			mimeType: MCP_APP_MIME_TYPE,
		},
		async (uri) => ({
			contents: [
				{
					uri: uri.href,
					mimeType: MCP_APP_MIME_TYPE,
					text: previewAppHtml({
						pageOrigin: dependencies.previewOrigin,
						frameOrigin: dependencies.frameOrigin,
					}),
					// Why on the content item: hosts read `_meta.ui` from `resources/read` first.
					_meta: {
						ui: { csp: { frameDomains: [dependencies.frameOrigin] }, prefersBorder: true },
					},
				},
			],
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

const docPageFrontmatter = z.object({
	title: z.string(),
	description: z.string().optional(),
	aliases: z.array(z.string()).optional(),
	useWhen: z.string().optional(),
});

/**
 * Whether `find` searches a docs page. `migrate` covers the guides, the
 * manifest owns the recipes, and the rest are indexes.
 */
function isFindablePage(slug: string): boolean {
	return (
		!slug.startsWith("migrations/") &&
		!slug.startsWith("recipes/") &&
		slug !== "changelog" &&
		slug !== "index"
	);
}

/**
 * Each findable docs page with a title, and each recipe. `find` drops the
 * pages that an API record owns. Why the manifest for recipes: `dist/agent.json`
 * ships the same records, so an agent offline finds what `find` finds.
 */
async function readDocPages(): Promise<DocPageRecord[]> {
	const [pages, manifest] = await Promise.all([
		Promise.all(
			Array.from(urlToFileMap)
				.filter(([slug]) => isFindablePage(slug))
				.map(async ([slug, filePath]): Promise<DocPageRecord | undefined> => {
					const frontmatter = docPageFrontmatter.safeParse(await loadFrontmatter(filePath));
					return frontmatter.success
						? {
								name: frontmatter.data.title,
								kind: "page",
								summary: frontmatter.data.description,
								aliases: frontmatter.data.aliases,
								useWhen: frontmatter.data.useWhen,
								docsUrl: canonicalHref(`/${slug}`),
								docsSlug: slug,
							}
						: undefined;
				}),
		),
		buildSiteAgentManifest(),
	]);
	const recipes = (manifest.recipes ?? []).map(
		({ name, slug, docsUrl, summary, useWhen, aliases, parts }): DocPageRecord => ({
			name,
			kind: "recipe",
			summary,
			aliases,
			useWhen,
			parts,
			docsUrl,
			docsSlug: slug,
		}),
	);
	return [...pages.filter((page) => page != null), ...recipes];
}

let docPagesCache: Promise<DocPageRecord[]> | undefined;

/** The docs pages: one read for the process in production, a new read for each call in dev. */
function loadDocPages(): Promise<DocPageRecord[]> {
	if (!import.meta.env.PROD) {
		return readDocPages();
	}
	docPagesCache ??= readDocPages();
	return docPagesCache;
}

let docsSourceHashCache: Promise<string> | undefined;

/** The source hash of the docs build: one hash for the process in production, a new one for each call in dev. */
function loadDocsSourceHash(): Promise<string> {
	if (!import.meta.env.PROD) {
		return loadSourceFiles().then((files) => sourceHash(files, mantlePackageJson));
	}
	docsSourceHashCache ??= loadSourceFiles().then((files) => sourceHash(files, mantlePackageJson));
	return docsSourceHashCache;
}

let declarationFilesCache: Promise<ReadonlyMap<string, string>> | undefined;

/** Each identifier in the docs build's declarations that `specifier` reaches. */
async function loadDocsDeclaredWords(specifier: string): Promise<ReadonlySet<string> | undefined> {
	const files = import.meta.env.PROD
		? (declarationFilesCache ??= loadDeclarationFiles())
		: loadDeclarationFiles();
	// Why `types`: the workspace `exports` holds condition objects; only the published copy holds paths.
	const target = Object.entries(mantlePackageJson.exports).find(
		([subpath]) => subpath === `./${specifier.replace(/^@ngrok\/mantle\//, "")}`,
	)?.[1];
	const entry =
		typeof target === "object" && "types" in target ? target.types.replace(/^\.\//, "") : undefined;
	const loaded = await files;
	return entry == null || !loaded.has(entry) ? undefined : declaredWordsOf(loaded, entry);
}

let loader: VersionDataLoader | undefined;

/**
 * The production dependencies: one version loader for the process. The
 * preview links point at `MANTLE_PREVIEW_ORIGIN` when set, else at the request
 * origin in dev and the canonical origin in production. The prototype frame
 * comes from `MANTLE_PREVIEW_FRAME_ORIGIN` when set, else from the preview
 * page origin.
 */
export function productionDependencies({
	flags,
	requestOrigin,
}: {
	flags: () => McpFlags;
	requestOrigin: string;
}): McpDependencies {
	loader ??= createVersionDataLoader();
	const previewOrigin =
		process.env.MANTLE_PREVIEW_ORIGIN ?? (import.meta.env.DEV ? requestOrigin : canonicalOrigin);
	return {
		loader,
		docsVersion: mantlePackageJson.version,
		docsCommit: process.env.COMMIT_SHA,
		docsSourceHash: loadDocsSourceHash,
		docsDeclaredWordsOf: loadDocsDeclaredWords,
		readDocs,
		migrations: loadMigrationGuides,
		docPages: loadDocPages,
		flags,
		previewOrigin,
		frameOrigin: previewFrameOrigin() || previewOrigin,
		log: (event) => {
			console.info(JSON.stringify({ event: "mcp.tool_call", ...event }));
			mcpPulse.record(event);
		},
	};
}
