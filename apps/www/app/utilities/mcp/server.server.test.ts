import { createMcpHandler } from "@modelcontextprotocol/server";
import { describe, expect, it, vi } from "vitest";
import { urlToFileMap } from "~/utilities/docs";
import type { McpFlags } from "~/utilities/mcp/flags.server";
import {
	createMantleMcpServer,
	loadMigrationGuides,
	MCP_INSTRUCTIONS,
	type McpDependencies,
	type ToolCallEvent,
} from "~/utilities/mcp/server.server";
import { packageFilesFixture } from "~/utilities/mcp/test-fixtures";
import { versionDataFromFiles } from "~/utilities/mcp/version-data.server";

function dependencies(overrides: Partial<McpDependencies> = {}): McpDependencies {
	const data = versionDataFromFiles("0.93.0", packageFilesFixture());
	return {
		loader: { latestVersion: async () => "0.93.0", load: async () => data },
		docsVersion: "0.93.0",
		readDocs: async (slug) =>
			slug === "components/overlays/dialog" ? "# Dialog\n\n## API Reference\n\nProps." : undefined,
		migrations: async () => [],
		flags: (): McpFlags => ({ enabled: true, disabledTools: new Set() }),
		previewOrigin: "https://mantle.example",
		log: () => {},
		...overrides,
	};
}

let requestId = 0;

/** Sends one 2025-era JSON-RPC request through the stateless HTTP handler. */
async function rpc(deps: McpDependencies, method: string, params: Record<string, unknown> = {}) {
	const handler = createMcpHandler(() => createMantleMcpServer(deps));
	requestId += 1;
	const response = await handler.fetch(
		new Request("https://mantle.example/mcp", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json, text/event-stream",
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
	it("lists the six read-only tools", async () => {
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
		]);
		expect(tools.every((tool) => tool.annotations?.readOnlyHint === true)).toBe(true);
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

	it("returns a tool error with close names for an unknown name", async () => {
		const result = await callTool(dependencies(), "get", { name: "Dialogue" });

		expect(result).toEqual({
			text: '@ngrok/mantle@0.93.0 has no part named "Dialogue". Close matches: Dialog.',
			isError: true,
		});
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

	it("rejects code over the size cap before it parses it", async () => {
		const result = await callTool(dependencies(), "check", { code: "x".repeat(20 * 1024 + 1) });

		expect(result.isError).toBe(true);
		expect(result.text).toBe("The code is over 20480 bytes. Check one file at a time.");
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
