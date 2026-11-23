import { createMcpHandler } from "@modelcontextprotocol/server";
import mantlePackageJson from "@ngrok/mantle/package.json" with { type: "json" };
import { z } from "zod";
import { buildSiteAgentManifest } from "~/utilities/agent-manifest.server";
import {
	createMantleMcpServer,
	productionDependencies,
	type McpDependencies,
} from "~/utilities/mcp/server.server";
import { versionDataFromFiles } from "~/utilities/mcp/version-data.server";

let requestId = 0;

const rpcResponse = z.object({
	result: z.record(z.string(), z.unknown()).optional(),
	error: z.object({ message: z.string() }).optional(),
});

/**
 * Sends one 2025-era JSON-RPC request to `url`, with `headers` added, through the stateless HTTP handler.
 *
 * @example
 * const { result } = await rpcAt("https://mantle.example/mcp")(deps, "tools/list");
 */
export function rpcAt(url: string, headers: Record<string, string> = {}) {
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
					...headers,
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
		return rpcResponse.parse(JSON.parse(data));
	};
}

/**
 * The production dependencies over the agent manifest that this checkout
 * builds, so `find` and `get` read the current JSDoc, docs, and recipes.
 * Why one docs read: a dev build rereads every page on each call.
 *
 * @example
 * const { result } = await rpcAt(url)(await currentDependencies(), "tools/call", { name: "find", arguments: { query: "modal" } });
 */
export async function currentDependencies(): Promise<McpDependencies> {
	const manifest = await buildSiteAgentManifest();
	const data = versionDataFromFiles(
		manifest.version,
		new Map([
			["package.json", JSON.stringify(mantlePackageJson)],
			["dist/agent.json", JSON.stringify(manifest)],
		]),
	);
	const production = productionDependencies({
		flags: () => ({ enabled: true, disabledTools: new Set() }),
		requestOrigin: "https://mantle.example",
	});
	const docPages = production.docPages();
	return {
		...production,
		loader: {
			latestVersion: async () => data.version,
			isPublished: async () => true,
			load: async () => data,
		},
		docPages: () => docPages,
		log: () => {},
	};
}
