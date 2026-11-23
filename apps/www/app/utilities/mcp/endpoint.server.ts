import { createMcpHandler } from "@modelcontextprotocol/server";
import { mcpFlags } from "~/utilities/mcp/flags.server";
import { mcpPulse } from "~/utilities/mcp/pulse.server";
import { createMantleMcpServer, productionDependencies } from "~/utilities/mcp/server.server";

/** The largest JSON-RPC body `/mcp` reads: a 100 KB `check` argument with room for JSON escapes. */
const MAX_REQUEST_BODY_BYTES = 256 * 1024;

/**
 * Passes the body through as it streams, and calls `onDone` once, when the
 * body ends or the client goes away. Why stream: a `subscriptions/listen`
 * response stays open.
 */
function streamUntilDone(
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
	headers.set("X-Robots-Tag", "noindex, nofollow");
	return new Response(body, { status: response.status, headers });
}

/**
 * Serves one MCP request at `/mcp`. The server is stateless and anonymous:
 * each request gets a new server instance. Returns 404 while the `MANTLE_MCP`
 * flag is off. `server.ts` adds the CORS headers and sends a browser to the
 * setup page instead.
 *
 * @example
 * protocolRoute({ path: "/mcp", handle: serveMcp, cors: { origin: "*" } });
 */
export async function serveMcp(request: Request): Promise<Response> {
	if (!mcpFlags().enabled) {
		return new Response("Not Found", { status: 404 });
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
	// Why: the shutdown digest waits for the calls of this request.
	const release = mcpPulse.hold();
	const close = () => {
		release();
		handler.close().catch((error: unknown) => {
			console.error("mcp handler close error", error instanceof Error ? error.name : "unknown");
		});
	};
	try {
		return streamUntilDone(await handler.fetch(request), {
			signal: request.signal,
			onDone: close,
		});
	} catch (error) {
		close();
		throw error;
	}
}
