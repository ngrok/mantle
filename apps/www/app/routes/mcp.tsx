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

/**
 * Adds the CORS headers, and passes the body through as it streams. Calls
 * `onDone` once, when the body ends or the client goes away. Why stream: a
 * `subscriptions/listen` response stays open.
 */
function withCors(
	response: Response,
	{ signal, onDone }: { signal: AbortSignal; onDone: () => void },
): Response {
	let done = false;
	const finish = () => {
		if (!done) {
			done = true;
			onDone();
		}
	};
	signal.addEventListener("abort", finish, { once: true });
	const body = response.body?.pipeThrough(new TransformStream({ flush: finish })) ?? null;
	if (body == null) {
		finish();
	}
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
	const handler = createMcpHandler(
		({ requestInfo }) => createMantleMcpServer(dependencies, requestInfo),
		{
			maxRequestBodySize: MAX_REQUEST_BODY_BYTES,
			onerror: (error) => {
				// Why no message: a JSON parse message quotes the request body.
				const frames = error.stack?.split("\n").slice(1).join("\n") ?? "";
				console.error("mcp handler error", error.name, frames);
			},
		},
	);
	const close = () => {
		handler.close().catch((error: unknown) => {
			console.error("mcp handler close error", error instanceof Error ? error.name : "unknown");
		});
	};
	try {
		return withCors(await handler.fetch(request), { signal: request.signal, onDone: close });
	} catch (error) {
		close();
		throw error;
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
