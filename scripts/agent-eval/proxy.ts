import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { McpCall } from "./score.ts";

/** The headers that the MCP Streamable HTTP transport reads, in each direction. */
const FORWARDED_HEADERS = [
	"accept",
	"content-type",
	"mcp-protocol-version",
	"mcp-session-id",
	"last-event-id",
	"user-agent",
];

async function readBody(request: IncomingMessage): Promise<string> {
	const chunks: Buffer[] = [];
	for await (const chunk of request) {
		chunks.push(Buffer.from(chunk));
	}
	return Buffer.concat(chunks).toString("utf8");
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value != null && !Array.isArray(value);
}

/** The `tools/call` messages of one JSON-RPC request body: one message or a batch. */
function toolCallsOf(body: string): { id: unknown; name: string; args: Record<string, unknown> }[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(body);
	} catch {
		return [];
	}
	return (Array.isArray(parsed) ? parsed : [parsed]).flatMap((message: unknown) => {
		if (!isRecord(message) || message.method !== "tools/call" || !isRecord(message.params)) {
			return [];
		}
		const { name, arguments: args } = message.params;
		return typeof name === "string"
			? [{ id: message.id, name, args: isRecord(args) ? args : {} }]
			: [];
	});
}

/**
 * Starts a local MCP proxy for the agent eval. Each run gets its own path,
 * `/<run>/mcp`, so the proxy records the tool calls of each run apart, with
 * code arguments replaced by their length. It forwards everything to
 * `target` with `?source=ngrok/mantle-agent-eval`, so pulse can tell eval
 * traffic apart, except `report_gap`, which it answers itself: an eval must
 * not post gap reports to Slack.
 *
 * @example
 * const proxy = await startMcpProxy("https://mantle.ngrok.com/mcp");
 * proxy.urlFor("r01"); // "http://127.0.0.1:52011/r01/mcp"
 */
export async function startMcpProxy(target: string) {
	const calls = new Map<string, McpCall[]>();
	const upstream = new URL(target);
	upstream.searchParams.set("source", "ngrok/mantle-agent-eval");

	const handle = async (request: IncomingMessage, response: ServerResponse) => {
		const run = /^\/([\w-]+)\/mcp$/.exec(request.url ?? "")?.[1];
		if (run == null) {
			response.writeHead(404).end();
			return;
		}
		const body = request.method === "POST" ? await readBody(request) : undefined;
		const toolCalls = body == null ? [] : toolCallsOf(body);
		for (const { name, args } of toolCalls) {
			const logged = { ...args };
			if (typeof logged.code === "string") {
				logged.code = `<${logged.code.length} bytes>`;
			}
			calls.set(run, [...(calls.get(run) ?? []), { tool: name, args: logged }]);
		}

		const gapReport = toolCalls.find(({ name }) => name === "report_gap");
		if (gapReport != null) {
			response.writeHead(200, { "content-type": "application/json" });
			response.end(
				JSON.stringify({
					jsonrpc: "2.0",
					id: gapReport.id,
					result: { content: [{ type: "text", text: "Gap report recorded. Thank you." }] },
				}),
			);
			return;
		}

		const headers = new Headers();
		for (const name of FORWARDED_HEADERS) {
			const value = request.headers[name];
			if (typeof value === "string") {
				headers.set(name, value);
			}
		}
		try {
			const upstreamResponse = await fetch(upstream, { method: request.method, headers, body });
			const outgoing: Record<string, string> = {};
			for (const name of FORWARDED_HEADERS) {
				const value = upstreamResponse.headers.get(name);
				if (value != null) {
					outgoing[name] = value;
				}
			}
			response.writeHead(upstreamResponse.status, outgoing);
			response.end(Buffer.from(await upstreamResponse.arrayBuffer()));
		} catch (error) {
			response.writeHead(502, { "content-type": "text/plain" });
			response.end(String(error));
		}
	};
	const server = createServer((request, response) => {
		void handle(request, response);
	});

	await new Promise<void>((resolve) => {
		server.listen(0, "127.0.0.1", resolve);
	});
	const address = server.address();
	if (address == null || typeof address === "string") {
		throw new Error("The MCP proxy has no port.");
	}
	const { port } = address;

	return {
		urlFor: (run: string) => `http://127.0.0.1:${port}/${run}/mcp`,
		callsOf: (run: string): readonly McpCall[] => calls.get(run) ?? [],
		close: () =>
			new Promise<void>((resolve) => {
				server.close(() => resolve());
			}),
	};
}
