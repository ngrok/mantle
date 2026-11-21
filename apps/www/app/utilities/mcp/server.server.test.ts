import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createMcpHandler } from "@modelcontextprotocol/server";
import mantlePackageJson from "@ngrok/mantle/package.json" with { type: "json" };
import { describe, expect, it, vi } from "vitest";
import { buildSiteAgentManifest } from "~/utilities/agent-manifest.server";
import { urlToFileMap } from "~/utilities/docs";
import type { McpFlags } from "~/utilities/mcp/flags.server";
import {
	createMantleMcpServer,
	loadMigrationGuides,
	MCP_INSTRUCTIONS,
	productionDependencies,
	type McpDependencies,
	type ToolCallEvent,
} from "~/utilities/mcp/server.server";
import type { LinearGaps, LinearIssue } from "~/utilities/mcp/linear.server";
import { packageFilesFixture } from "~/utilities/mcp/test-fixtures";
import { recordNamed, recordsOf, type DocPageRecord } from "~/utilities/mcp/tools";
import { ServerBusyError, versionDataFromFiles } from "~/utilities/mcp/version-data.server";

function dependencies(overrides: Partial<McpDependencies> = {}): McpDependencies {
	const data = versionDataFromFiles("0.93.0", packageFilesFixture());
	return {
		loader: {
			latestVersion: async () => "0.93.0",
			isPublished: async (version) => ["0.90.0", "0.93.0"].includes(version),
			load: async () => data,
		},
		docsVersion: "0.93.0",
		readDocs: async (slug) =>
			slug === "components/overlays/dialog" ? "# Dialog\n\n## API Reference\n\nProps." : undefined,
		migrations: async () => [],
		docPages: async () => [
			{
				name: "Colors",
				kind: "page",
				summary: "Color system with automatic dark mode support",
				docsUrl: "https://mantle.ngrok.com/base/colors",
				docsSlug: "base/colors",
			},
		],
		flags: (): McpFlags => ({ enabled: true, disabledTools: new Set() }),
		previewOrigin: "https://mantle.example",
		frameOrigin: "https://frame.example",
		log: () => {},
		...overrides,
	};
}

let requestId = 0;

/** Sends one 2025-era JSON-RPC request to `url` through the stateless HTTP handler. */
function rpcAt(url: string) {
	return async (deps: McpDependencies, method: string, params: Record<string, unknown> = {}) => {
		const handler = createMcpHandler(({ requestInfo }) => createMantleMcpServer(deps, requestInfo));
		requestId += 1;
		const response = await handler.fetch(
			new Request(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json, text/event-stream",
					"User-Agent": "claude-code/2.1.3 (cli; darwin)",
				},
				body: JSON.stringify({ jsonrpc: "2.0", id: requestId, method, params }),
			}),
		);
		// Why: the 2025-era leg answers over SSE, so the JSON-RPC response is the `data:` line.
		const raw = await response.text();
		await handler.close();
		const data =
			raw
				.split("\n")
				.find((line) => line.startsWith("data: "))
				?.slice("data: ".length) ?? raw;
		const body: unknown = JSON.parse(data);
		return body as { result?: Record<string, unknown>; error?: { message: string } };
	};
}

/** Calls one tool at `url`, and returns its text and error flag. */
function callToolAt(url: string) {
	const send = rpcAt(url);
	return async (deps: McpDependencies, name: string, args: Record<string, unknown>) => {
		const { result } = await send(deps, "tools/call", { name, arguments: args });
		const content = (result?.content ?? []) as { type: string; text: string }[];
		return { text: content.map((block) => block.text).join(""), isError: result?.isError === true };
	};
}

const rpc = rpcAt("https://mantle.example/mcp");
const callTool = callToolAt("https://mantle.example/mcp");
const callToolFromFrontend = callToolAt("https://mantle.example/mcp?source=frontend");

describe("the mantle MCP server", () => {
	it("lists the tools, and marks each read-only but report_gap", async () => {
		const { result } = await rpc(dependencies(), "tools/list");
		const tools = (result?.tools ?? []) as {
			name: string;
			annotations?: { readOnlyHint?: boolean };
		}[];

		expect(tools.map((tool) => tool.name)).toEqual([
			"find",
			"get",
			"read_docs",
			"migrate",
			"check",
			"preview",
			"report_gap",
		]);
		expect(
			tools.filter((tool) => tool.annotations?.readOnlyHint !== true).map((tool) => tool.name),
		).toEqual(["report_gap"]);
	});

	it("finds a docs page next to the API records", async () => {
		const { text } = await callTool(dependencies(), "find", { query: "colors" });

		expect(text).toContain('- Colors (docs page): `read_docs` path "base/colors"');
	});

	it("logs a weak find as a gap with scrubbed words only", async () => {
		const log = vi.fn<(event: ToolCallEvent) => void>();

		const { text } = await callTool(dependencies({ log }), "find", {
			query: "stepper for acme-corp.example.com onboarding v2",
		});

		expect(text).toContain("No result is a strong match");
		expect(log).toHaveBeenLastCalledWith(
			expect.objectContaining({
				tool: "find",
				resultCount: 0,
				gap: {
					source: "find",
					tokens: ["stepper", "onboarding"],
				},
			}),
		);
	});

	it("logs no gap for a strong find", async () => {
		const log = vi.fn<(event: ToolCallEvent) => void>();

		await callTool(dependencies({ log }), "find", { query: "modal" });

		expect(log.mock.lastCall?.[0].gap).toBeUndefined();
	});

	it("logs a gap report with an allowlisted closest part and scrubbed context", async () => {
		const log = vi.fn<(event: ToolCallEvent) => void>();

		const { text } = await callTool(dependencies({ log }), "report_gap", {
			ticket: "none",
			need: "Stepper",
			kind: "component",
			workaround: "composed-mantle-parts",
			closestPart: "dialog",
			intent: "onboarding page, add a setup checklist, need numbered steps",
			tried: "find `stepper`, find wizard, get Tabs, see src/steps.tsx",
			reflection: "I would use Tabs, but it has no numbered steps or a done state",
			built: "Render <Steps current={2} />",
		});

		expect(text).toBe("Reported: stepper. Thank you. Do not report this need again in this task.");
		expect(log).toHaveBeenLastCalledWith(
			expect.objectContaining({
				tool: "report_gap",
				gap: {
					source: "report_gap",
					tokens: ["stepper"],
					kind: "component",
					workaround: "composed-mantle-parts",
					closestPart: "Dialog",
					tried: "find stepper, find wizard, get Tabs, see",
					reflection: "I would use Tabs, but it has no numbered steps or a done state",
					built: undefined,
				},
			}),
		);
	});

	it("requires a ticket on report_gap, and logs none as no ticket", async () => {
		const log = vi.fn<(event: ToolCallEvent) => void>();
		const gap = {
			need: "stepper",
			kind: "component",
			workaround: "built-custom",
			intent: "onboarding page, need steps",
			tried: "find stepper",
			reflection: "I would use Tabs, but it has no steps",
		};

		const missing = await callToolFromFrontend(dependencies({ log }), "report_gap", gap);
		const missingEvent = log.mock.lastCall?.[0];
		const none = await callToolFromFrontend(dependencies({ log }), "report_gap", {
			...gap,
			ticket: "none",
		});

		expect(missing.isError).toBe(true);
		expect(missingEvent).toMatchObject({ errorKind: "validation", invalidFields: ["ticket"] });
		expect(none.isError).toBe(false);
		expect(log).toHaveBeenLastCalledWith(
			expect.objectContaining({
				outcome: "ok",
				source: "ngrok-private/frontend",
				ticket: undefined,
			}),
		);
	});

	describe("report_gap with Linear", () => {
		const issues: Record<string, LinearIssue> = {
			"CDATA-1234": { id: "u1", key: "CDATA-1234", title: "Usage page: cost breakdown" },
			"MNTL-121": { id: "u2", key: "MNTL-121", title: "Stepper component" },
		};

		/** A fake Linear with `issues`, the `similar` results, and spies on the writes. */
		function fakeLinear(similar: LinearIssue[] = []) {
			return {
				issue: vi.fn<LinearGaps["issue"]>(async (key) => issues[key]),
				similar: vi.fn<LinearGaps["similar"]>(async () => similar),
				create: vi.fn<LinearGaps["create"]>(async () => "MNTL-130"),
				comment: vi.fn<LinearGaps["comment"]>(async () => true),
			};
		}

		const gap = {
			need: "stepper",
			kind: "component",
			workaround: "built-custom",
			intent: "usage page, add a setup checklist, need numbered steps",
			tried: "find stepper, get Tabs",
			reflection: "I would use Tabs, but it has no numbered steps",
			ticket: "cdata-1234",
		};

		it("creates an MNTL issue for a novel gap from a real ngrok ticket, and logs the ticket", async () => {
			const log = vi.fn<(event: ToolCallEvent) => void>();
			const linear = fakeLinear();

			const { text } = await callTool(dependencies({ log, linear }), "report_gap", gap);

			expect(text).toBe(
				"Reported as MNTL-130. Thank you. Do not report this need again in this task.",
			);
			expect(linear.create.mock.lastCall?.[0].description).toContain(
				"- **Working on:** [CDATA-1234](https://linear.app/ngrok/issue/CDATA-1234) Usage page: cost breakdown",
			);
			expect(log.mock.lastCall?.[0]).toMatchObject({
				source: undefined,
				ticket: "CDATA-1234",
				gap: { work: "Usage page: cost breakdown", issue: { key: "MNTL-130", action: "created" } },
			});
		});

		it("lists similar MNTL issues and writes nothing until the agent picks one", async () => {
			const log = vi.fn<(event: ToolCallEvent) => void>();
			const linear = fakeLinear([issues["MNTL-121"] as LinearIssue]);

			const first = await callTool(dependencies({ log, linear }), "report_gap", gap);
			const firstEvent = log.mock.lastCall?.[0];
			const second = await callTool(dependencies({ log, linear }), "report_gap", {
				...gap,
				matches: "MNTL-121",
			});

			expect(first.text).toContain("- MNTL-121: Stepper component");
			expect(firstEvent?.gap).toBeUndefined();
			expect(second.text).toContain("Added this report to MNTL-121.");
			expect(linear.comment).toHaveBeenCalledWith("u2", expect.stringContaining("**Tried:**"));
			expect(linear.create).not.toHaveBeenCalled();
			expect(log.mock.lastCall?.[0].gap?.issue).toEqual({ key: "MNTL-121", action: "commented" });
		});

		it('creates a new issue when the agent answers "none"', async () => {
			const linear = fakeLinear([issues["MNTL-121"] as LinearIssue]);

			const { text } = await callTool(dependencies({ linear }), "report_gap", {
				...gap,
				matches: "none",
			});

			expect(text).toContain("Reported as MNTL-130.");
			expect(linear.similar).not.toHaveBeenCalled();
		});

		it("writes nothing to Linear and logs no ticket for a caller that is not ngrok", async () => {
			const log = vi.fn<(event: ToolCallEvent) => void>();
			const linear = fakeLinear();

			const { text } = await callTool(dependencies({ log, linear }), "report_gap", {
				...gap,
				ticket: "ACME-77",
			});

			expect(text).toContain("Reported: stepper.");
			expect(linear.create).not.toHaveBeenCalled();
			expect(log.mock.lastCall?.[0]).toMatchObject({
				ticket: undefined,
				gap: { issue: undefined },
			});
		});
	});

	it("keeps the instructions under 1 KB", () => {
		expect(new TextEncoder().encode(MCP_INSTRUCTIONS).length).toBeLessThan(1024);
	});

	it("answers get with the record and the docs contract, and logs the record name", async () => {
		const log = vi.fn<(event: ToolCallEvent) => void>();

		const { text } = await callTool(dependencies({ log }), "get", { name: "dialog" });

		expect(text).toContain('`import { Dialog } from "@ngrok/mantle/dialog";`');
		expect(text).toContain("## Contract (docs for 0.93.0)\n\n## API Reference\n\nProps.");
		expect(log).toHaveBeenCalledTimes(1);
		expect(log).toHaveBeenLastCalledWith(
			expect.objectContaining({
				tool: "get",
				outcome: "ok",
				dataVersion: "0.93.0",
				ids: ["Dialog"],
			}),
		);
	});

	it("answers get for a pattern alias with its parts at the selected version and its docs page", async () => {
		const pattern: DocPageRecord = {
			name: "Delete Flow",
			kind: "pattern",
			aliases: ["remove with confirmation"],
			parts: ["Dialog", "Toast"],
			docsUrl: "https://mantle.ngrok.com/recipes/delete-flow",
			docsSlug: "recipes/delete-flow",
		};
		const deps = dependencies({
			docPages: async () => [pattern],
			readDocs: async (slug) =>
				slug === pattern.docsSlug ? "# Delete Flow\n\nThe code." : undefined,
		});

		const { text, isError } = await callTool(deps, "get", { name: "Remove with confirmation" });

		expect(isError).toBe(false);
		expect(text).toContain("# Delete Flow");
		expect(text).toContain(
			"  - Dialog: `@ngrok/mantle/dialog`\n  - Toast: not in @ngrok/mantle@0.93.0",
		);
		expect(text).toContain("The code.");
	});

	it("returns a tool error with close names for an unknown name, and logs it as not_found", async () => {
		const log = vi.fn<(event: ToolCallEvent) => void>();

		const result = await callTool(dependencies({ log }), "get", { name: "Dialogue" });

		expect(result).toEqual({
			text: '@ngrok/mantle@0.93.0 has no part named "Dialogue". Close matches: Dialog.',
			isError: true,
		});
		expect(log).toHaveBeenLastCalledWith(
			expect.objectContaining({ tool: "get", outcome: "error", errorKind: "not_found" }),
		);
	});

	it("logs a call that fails schema validation, with the argument names only", async () => {
		const log = vi.fn<(event: ToolCallEvent) => void>();

		const result = await callTool(dependencies({ log }), "find", {
			query: "",
			kind: "widget",
		});

		expect(result.isError).toBe(true);
		expect(log).toHaveBeenCalledTimes(1);
		expect(log).toHaveBeenLastCalledWith(
			expect.objectContaining({
				tool: "find",
				outcome: "error",
				errorKind: "validation",
				client: "claude-code/2.1.3",
				invalidFields: ["query", "kind"],
			}),
		);
	});

	it("logs the scrubbed intent of a call that fails schema validation", async () => {
		const log = vi.fn<(event: ToolCallEvent) => void>();

		await callTool(dependencies({ log }), "get", { name: "", intent: "Danger zone for acme.io" });

		expect(log).toHaveBeenLastCalledWith(
			expect.objectContaining({
				errorKind: "validation",
				intent: "Danger zone for",
				invalidFields: ["name"],
			}),
		);
	});

	it("logs the client and the scrubbed intent", async () => {
		const log = vi.fn<(event: ToolCallEvent) => void>();

		const { text } = await callTool(dependencies({ log }), "find", {
			query: "modal",
			intent: "Confirm before a user deletes a domain at https://dashboard.example.com/domains/42",
		});

		expect(text).toContain("Dialog");
		expect(log).toHaveBeenLastCalledWith(
			expect.objectContaining({
				tool: "find",
				outcome: "ok",
				client: "claude-code/2.1.3",
				intent: "Confirm before a user deletes a domain at",
			}),
		);
	});

	it("logs the ngrok repo from the source parameter and the workspace slug", async () => {
		const log = vi.fn<(event: ToolCallEvent) => void>();

		await callToolFromFrontend(dependencies({ log }), "find", {
			query: "modal",
			workspace: " Dashboard ",
		});

		expect(log).toHaveBeenLastCalledWith(
			expect.objectContaining({ source: "ngrok-private/frontend", workspace: "dashboard" }),
		);
	});

	it.each([
		["a repo in an ngrok org", "ngrok-adhoc/Demo-App", "ngrok-adhoc/demo-app"],
		["a repo in ngrok-private", "ngrok-private/frontend", "ngrok-private/frontend"],
		["a short name from before org/repo", "mantle", "ngrok/mantle"],
	])("logs the source of %s as org/repo", async (_, source, logged) => {
		const log = vi.fn<(event: ToolCallEvent) => void>();

		const call = callToolAt(`https://mantle.example/mcp?source=${encodeURIComponent(source)}`);
		await call(dependencies({ log }), "find", { query: "modal" });

		expect(log).toHaveBeenLastCalledWith(expect.objectContaining({ source: logged }));
	});

	it.each([
		["an unknown repo and a path", "acme", "apps/dashboard"],
		["an external org and a path", "acme/frontend", "apps/dashboard"],
		["an ngrok org with no repo", "ngrok-private", "dashboard!"],
		["a nested path", "ngrok/mantle/apps", "a b"],
		["a name and an email", "Jane Doe", "jane@example.com"],
		["markup and a long value", "<!channel>", "a".repeat(33)],
	])("logs no source or workspace for %s", async (_, source, workspace) => {
		const log = vi.fn<(event: ToolCallEvent) => void>();

		const call = callToolAt(`https://mantle.example/mcp?source=${encodeURIComponent(source)}`);
		const result = await call(dependencies({ log }), "find", { query: "modal", workspace });

		expect(result.isError).toBe(false);
		expect(log).toHaveBeenLastCalledWith(
			expect.objectContaining({ source: undefined, workspace: undefined }),
		);
	});

	it("logs no workspace for a call with no source", async () => {
		const log = vi.fn<(event: ToolCallEvent) => void>();

		await callTool(dependencies({ log }), "find", { query: "modal", workspace: "acme-billing" });

		expect(log).toHaveBeenLastCalledWith(expect.objectContaining({ workspace: undefined }));
	});

	it("answers a call with a null workspace and ticket", async () => {
		const log = vi.fn<(event: ToolCallEvent) => void>();

		const result = await callToolFromFrontend(dependencies({ log }), "find", {
			query: "modal",
			workspace: null,
			ticket: null,
		});

		expect(result.isError).toBe(false);
		expect(log).toHaveBeenLastCalledWith(
			expect.objectContaining({ outcome: "ok", workspace: undefined, ticket: undefined }),
		);
	});

	it("logs the Linear issue key of a call from an ngrok repo", async () => {
		const log = vi.fn<(event: ToolCallEvent) => void>();

		await callToolFromFrontend(dependencies({ log }), "find", {
			query: "modal",
			ticket: "fep-1867",
		});

		expect(log).toHaveBeenLastCalledWith(expect.objectContaining({ ticket: "FEP-1867" }));
	});

	it("logs no issue key for a call with no source", async () => {
		const log = vi.fn<(event: ToolCallEvent) => void>();

		await callTool(dependencies({ log }), "find", { query: "modal", ticket: "FEP-1867" });

		expect(log).toHaveBeenLastCalledWith(expect.objectContaining({ ticket: undefined }));
	});

	it("logs the source, workspace, and ticket of a call that fails schema validation", async () => {
		const log = vi.fn<(event: ToolCallEvent) => void>();

		await callToolFromFrontend(dependencies({ log }), "get", {
			name: "",
			workspace: "blog",
			ticket: "FEP-1867",
		});

		expect(log).toHaveBeenLastCalledWith(
			expect.objectContaining({
				errorKind: "validation",
				source: "ngrok-private/frontend",
				workspace: "blog",
				ticket: "FEP-1867",
			}),
		);
	});

	it("gives each tool an intent, a workspace, and a ticket argument", async () => {
		const { result } = await rpc(dependencies(), "tools/list");
		const tools = (result?.tools ?? []) as { name: string; inputSchema: { properties: object } }[];

		const missing = tools
			.filter(({ inputSchema }) => !("intent" in inputSchema.properties))
			.concat(tools.filter(({ inputSchema }) => !("workspace" in inputSchema.properties)))
			.concat(tools.filter(({ inputSchema }) => !("ticket" in inputSchema.properties)))
			.map(({ name }) => name);

		expect(tools.length).toBeGreaterThan(0);
		expect(missing).toEqual([]);
	});

	it("turns off one tool with the kill switch", async () => {
		const flags = (): McpFlags => ({ enabled: true, disabledTools: new Set(["preview"]) });

		const result = await callTool(dependencies({ flags }), "preview", {
			code: "export default () => null;",
		});

		expect(result).toEqual({
			text: "The preview tool is turned off on this server.",
			isError: true,
		});
	});

	it("returns a preview link that carries the code in the fragment", async () => {
		const { text } = await callTool(dependencies(), "preview", {
			code: 'import { Button } from "@ngrok/mantle/button";\nexport default () => <Button intent="neutral">Hi</Button>;',
		});

		expect(text).toMatch(/^Preview: https:\/\/mantle\.example\/mcp\/preview#code=[\w-]+\n/);
		expect(text).toContain("check found nothing.");
	});

	it("links the preview tool to an MCP App view that resources/read serves with the frame origin", async () => {
		const { result: listed } = await rpc(dependencies(), "tools/list");
		const preview = (
			(listed?.tools ?? []) as { name: string; _meta?: { ui?: { resourceUri?: string } } }[]
		).find((tool) => tool.name === "preview");
		const resourceUri = preview?._meta?.ui?.resourceUri ?? "";

		const { result: read } = await rpc(dependencies(), "resources/read", { uri: resourceUri });
		const [content] = (read?.contents ?? []) as {
			uri: string;
			mimeType: string;
			text: string;
			_meta?: { ui?: { csp?: { frameDomains?: string[] } } };
		}[];

		expect(resourceUri).toMatch(/^ui:\/\//);
		expect(content?.mimeType).toBe("text/html;profile=mcp-app");
		expect(content?._meta?.ui?.csp?.frameDomains).toEqual(["https://frame.example"]);
		expect(content?.text).toContain('"https://frame.example"');
	});

	// Why: the MCP App view reads the link from `structuredContent.url`, so a rename breaks the inline preview.
	it("puts the preview link of the text result in its structured content", async () => {
		const { result } = await rpc(dependencies(), "tools/call", {
			name: "preview",
			arguments: { code: "export default () => null;" },
		});
		const text = ((result?.content ?? []) as { text: string }[])[0]?.text ?? "";
		const structured = result?.structuredContent as { url?: string } | undefined;

		expect(text).toContain(`Preview: ${structured?.url}\n`);
		expect(structured?.url).toMatch(/^https:\/\/mantle\.example\/mcp\/preview#code=[\w-]+$/);
	});

	it("reports a preview with no default export and keeps the local-module note", async () => {
		const { text } = await callTool(dependencies(), "preview", {
			code: 'import { thing } from "./thing";\nexport const App = () => thing;',
		});

		expect(text).toContain('"code": "missing-default-export"');
		expect(text).toContain('"code": "incomplete-context"');
	});

	it("refuses a migration range that runs backward or ends at an unpublished version", async () => {
		const backward = await callTool(dependencies(), "migrate", { from: "0.93.0", to: "0.90.0" });
		const unpublished = await callTool(dependencies(), "migrate", { from: "0.90.0", to: "0.91.7" });

		expect(backward).toEqual({
			text: "The target 0.90.0 is older than 0.93.0. Pass a newer `to`.",
			isError: true,
		});
		expect(unpublished).toEqual({
			text: "@ngrok/mantle@0.91.7 is not a published version.",
			isError: true,
		});
	});

	it("logs a tool call that fails with an unexpected error", async () => {
		const log = vi.fn<(event: ToolCallEvent) => void>();
		const loader = {
			latestVersion: async () => "0.93.0",
			isPublished: async () => true,
			load: async () => {
				throw new Error("registry down");
			},
		};

		await callTool(dependencies({ log, loader }), "get", { name: "Dialog" });

		expect(log).toHaveBeenCalledTimes(1);
		expect(log).toHaveBeenLastCalledWith(
			expect.objectContaining({ tool: "get", outcome: "error", errorKind: "internal" }),
		);
	});

	it("logs a full download queue as busy, not as a version error", async () => {
		const log = vi.fn<(event: ToolCallEvent) => void>();
		const loader = {
			latestVersion: async () => "0.93.0",
			isPublished: async () => true,
			load: async () => {
				throw new ServerBusyError("The server is busy loading other versions. Try again soon.");
			},
		};

		const result = await callTool(dependencies({ log, loader }), "get", { name: "Dialog" });

		expect(result).toEqual({
			text: "The server is busy loading other versions. Try again soon.",
			isError: true,
		});
		expect(log).toHaveBeenLastCalledWith(
			expect.objectContaining({ tool: "get", outcome: "error", errorKind: "busy" }),
		);
	});

	it("rejects code over the size cap before it parses it", async () => {
		const result = await callTool(dependencies(), "check", { code: "x".repeat(20 * 1024 + 1) });

		expect(result.isError).toBe(true);
		expect(result.text).toBe("The code is over 20480 bytes. Check one file at a time.");
	});
});

/** The production dependencies, with the current docs build as the published version. */
async function currentDependencies(): Promise<McpDependencies> {
	const manifest = await buildSiteAgentManifest();
	const data = versionDataFromFiles(
		manifest.version,
		new Map([
			["package.json", JSON.stringify(mantlePackageJson)],
			["dist/agent.json", JSON.stringify(manifest)],
		]),
	);
	return {
		...productionDependencies({
			flags: () => ({ enabled: true, disabledTools: new Set() }),
			requestOrigin: "https://mantle.example",
		}),
		loader: {
			latestVersion: async () => data.version,
			isPublished: async () => true,
			load: async () => data,
		},
		log: () => {},
	};
}

/** The queries in `("…")` form, as the `find` description and the For AI Agents page quote them. */
function quotedExamples(text: string): string[] {
	return Array.from(text.matchAll(/\("([^"]+)"\)/g), (match) => match[1] ?? "");
}

describe("the documented find examples", () => {
	const topResultByExample = { "confirm before delete": "Alert Dialog", modal: "Dialog" };

	it("are the examples that the find description and the For AI Agents page name", async () => {
		const { result } = await rpc(dependencies(), "tools/list");
		const tools = (result?.tools ?? []) as { name: string; description?: string }[];
		const page = readFileSync(
			fileURLToPath(new URL("../../docs/for-ai-agents.mdx", import.meta.url)),
			"utf8",
		);
		const findRow = page.split("\n").find((line) => line.startsWith("| `find`")) ?? "";

		const findDescription = tools.find((tool) => tool.name === "find")?.description ?? "";

		expect(quotedExamples(findDescription)).toEqual(Object.keys(topResultByExample));
		expect(quotedExamples(findRow)).toEqual(Object.keys(topResultByExample));
	});

	it.each(Object.entries(topResultByExample))(
		'finds "%s" as a strong match to %s in the current docs build',
		async (query, name) => {
			const { result } = await rpc(await currentDependencies(), "tools/call", {
				name: "find",
				arguments: { query },
			});
			const found = result?.structuredContent as {
				strongMatch: boolean;
				results: { name: string }[];
			};

			expect(found.strongMatch).toBe(true);
			expect(found.results[0]?.name).toBe(name);
		},
	);
});

/**
 * Golden queries: how designers and agents describe a need, and the record
 * that must answer it. Each one came from a real search, such as Ricky's
 * words for Strata in Slack. Add a query when a weak find turns out to be a
 * find bug, not a gap.
 */
describe("the golden find queries", () => {
	const topResultByQuery = {
		"form sections (our 2column layouts with label/description on left, inputs or controls on right)":
			"Strata",
		"this group of info on left, form fields on right": "Strata",
		"form section with label and description on the left": "Strata",
		"description left controls right": "Strata",
		"two-column settings layout": "Strata",
		"settings page": "Strata",
		"icon on the left text on the right": "Media Object",
		"checkbox on the left label and description on the right": "Choice",
		"avatar initials from name": "Avatar",
		"app shell sidebar header": "App Layout",
		"centered login page": "Centered Layout",
		"page heading with actions": "App Layout",
		"list page with filters and a table": "List Page Loading States",
		"skeleton rows while a table loads": "List Page Loading States",
		"dialog loading state": "Overlays + Async Data (React Query)",
		"sparkline in each table row": "Sparklines in a List",
	};

	it.each(Object.entries(topResultByQuery))(
		'finds "%s" as a strong match to %s first',
		async (query, name) => {
			const { result } = await rpc(await currentDependencies(), "tools/call", {
				name: "find",
				arguments: { query },
			});
			const found = result?.structuredContent as {
				strongMatch: boolean;
				results: { name: string }[];
			};

			expect(found.strongMatch).toBe(true);
			expect(found.results[0]?.name).toBe(name);
		},
	);

	it.each(["stepper", "file drop zone"])(
		'calls "%s" weak, so find reports the gap',
		async (query) => {
			const { result } = await rpc(await currentDependencies(), "tools/call", {
				name: "find",
				arguments: { query },
			});
			const found = result?.structuredContent as { strongMatch: boolean };

			expect(found.strongMatch).toBe(false);
		},
	);

	it("names a part of the current build in each part of each pattern", async () => {
		const deps = await currentDependencies();
		const records = recordsOf(await deps.loader.load(mantlePackageJson.version));
		const patterns = (await deps.docPages()).filter((page) => page.kind === "pattern");

		const unknown = patterns.flatMap(({ name, parts }) =>
			parts == null || parts.length === 0
				? [`${name}: no parts`]
				: parts
						.filter((part) => recordNamed(records, part) == null)
						.map((part) => `${name}: ${part}`),
		);

		expect(patterns.length).toBeGreaterThan(0);
		expect(unknown).toEqual([]);
	});
});

describe("loadMigrationGuides", () => {
	it("reads introducedIn from every migration guide", async () => {
		const guides = await loadMigrationGuides();
		const slugs = Array.from(urlToFileMap.keys()).filter((slug) => slug.startsWith("migrations/"));

		expect(guides.map((guide) => guide.slug).toSorted()).toEqual(slugs.toSorted());
		expect(guides.find((guide) => guide.slug.includes("0003"))?.codemodIdempotent).toBe(false);
	});
});
