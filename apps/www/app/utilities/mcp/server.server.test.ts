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
import { packageFilesFixture } from "~/utilities/mcp/test-fixtures";
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
		log: () => {},
		...overrides,
	};
}

let requestId = 0;

/** Sends one 2025-era JSON-RPC request through the stateless HTTP handler. */
async function rpc(deps: McpDependencies, method: string, params: Record<string, unknown> = {}) {
	const handler = createMcpHandler(({ requestInfo }) => createMantleMcpServer(deps, requestInfo));
	requestId += 1;
	const response = await handler.fetch(
		new Request("https://mantle.example/mcp", {
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
}

async function callTool(deps: McpDependencies, name: string, args: Record<string, unknown>) {
	const { result } = await rpc(deps, "tools/call", { name, arguments: args });
	const content = (result?.content ?? []) as { type: string; text: string }[];
	return { text: content.map((block) => block.text).join(""), isError: result?.isError === true };
}

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

	it("logs a gap report with an allowlisted closest part", async () => {
		const log = vi.fn<(event: ToolCallEvent) => void>();

		const { text } = await callTool(dependencies({ log }), "report_gap", {
			need: "Stepper",
			kind: "component",
			workaround: "composed-mantle-parts",
			closestPart: "dialog",
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
				},
			}),
		);
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

describe("loadMigrationGuides", () => {
	it("reads introducedIn from every migration guide", async () => {
		const guides = await loadMigrationGuides();
		const slugs = Array.from(urlToFileMap.keys()).filter((slug) => slug.startsWith("migrations/"));

		expect(guides.map((guide) => guide.slug).toSorted()).toEqual(slugs.toSorted());
		expect(guides.find((guide) => guide.slug.includes("0003"))?.codemodIdempotent).toBe(false);
	});
});
