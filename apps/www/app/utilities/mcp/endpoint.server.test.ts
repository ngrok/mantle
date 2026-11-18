import { describe, expect, it } from "vitest";
import { serveMcp } from "~/utilities/mcp/endpoint.server";

/** A `subscriptions/listen` request in the 2026-07-28 envelope. */
function listenRequest(signal: AbortSignal): Request {
	return new Request("https://mantle.example/mcp", {
		method: "POST",
		signal,
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json, text/event-stream",
			"MCP-Protocol-Version": "2026-07-28",
			"Mcp-Method": "subscriptions/listen",
		},
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: 1,
			method: "subscriptions/listen",
			params: {
				notifications: { toolsListChanged: true },
				_meta: {
					"io.modelcontextprotocol/protocolVersion": "2026-07-28",
					"io.modelcontextprotocol/clientCapabilities": {},
					"io.modelcontextprotocol/clientInfo": { name: "test", version: "1.0.0" },
				},
			},
		}),
	});
}

describe("serveMcp", () => {
	it("streams an open subscription instead of waiting for its end", async () => {
		const controller = new AbortController();

		const response = await serveMcp(listenRequest(controller.signal));
		const reader = response.body?.getReader();
		const first = await reader?.read();
		controller.abort();
		await reader?.cancel();

		expect(new TextDecoder().decode(first?.value)).toContain(
			"notifications/subscriptions/acknowledged",
		);
	});
});
