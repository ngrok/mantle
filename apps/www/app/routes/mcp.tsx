import { createMcpHandler } from "@modelcontextprotocol/server";
import { mcpFlags } from "~/utilities/mcp/flags.server";
import { createMantleMcpServer, productionDependencies } from "~/utilities/mcp/server.server";
import type { Route } from "./+types/mcp";

/** The largest JSON-RPC body `/mcp` reads: a 20 KB `code` argument with room for JSON escapes. */
const MAX_REQUEST_BODY_BYTES = 128 * 1024;

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
	"Access-Control-Allow-Headers":
		"Content-Type, Accept, Mcp-Method, Mcp-Name, MCP-Protocol-Version, Mcp-Session-Id, Last-Event-ID",
	"Access-Control-Expose-Headers": "MCP-Protocol-Version, Mcp-Session-Id",
	"Access-Control-Max-Age": "86400",
} as const;

/** Reads the whole body, so the handler can close before the response leaves. */
async function withCors(response: Response): Promise<Response> {
	const body = response.body == null ? null : await response.arrayBuffer();
	const headers = new Headers(response.headers);
	for (const [name, value] of Object.entries(CORS_HEADERS)) {
		headers.set(name, value);
	}
	headers.set("X-Robots-Tag", "noindex, nofollow");
	return new Response(body, { status: response.status, headers });
}

/**
 * Serves one MCP request. The server is stateless and anonymous: each request
 * gets a new server instance, and CORS allows any origin because no request
 * carries credentials. Returns 404 while the `MANTLE_MCP` flag is off.
 */
async function serve(request: Request): Promise<Response> {
	const flags = mcpFlags();
	if (!flags.enabled) {
		return new Response("Not Found", { status: 404 });
	}
	if (request.method === "OPTIONS") {
		return new Response(null, { status: 204, headers: CORS_HEADERS });
	}
	const dependencies = productionDependencies({
		flags: mcpFlags,
		requestOrigin: new URL(request.url).origin,
	});
	const handler = createMcpHandler(() => createMantleMcpServer(dependencies), {
		maxRequestBodySize: MAX_REQUEST_BODY_BYTES,
		onerror: (error) => {
			console.error("mcp handler error", error.name);
		},
	});
	try {
		return withCors(await handler.fetch(request));
	} finally {
		await handler.close();
	}
}

/** `GET /mcp`: the MCP transport answers a GET (405 for the stateless legacy leg). */
export function loader({ request }: Route.LoaderArgs) {
	return serve(request);
}

/** `POST`, `DELETE`, and `OPTIONS` on `/mcp`. */
export function action({ request }: Route.ActionArgs) {
	return serve(request);
}
