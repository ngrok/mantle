// @vitest-environment happy-dom
// @vitest-environment-options {"settings": {"disableIframePageLoading": true}}
import { describe, expect, it, vi } from "vitest";
import { previewAppHtml } from "./preview-app";

type RpcMessage = {
	jsonrpc: string;
	id?: number;
	method?: string;
	params?: Record<string, unknown>;
	result?: Record<string, unknown>;
};

/**
 * Renders the view's body, then runs its script with a fake `window` whose
 * parent is the host. Why a fake: happy-dom has no parent frame to post to.
 */
function startView() {
	const parsed = new DOMParser().parseFromString(
		previewAppHtml({ pageOrigin: "https://mantle.example", frameOrigin: "https://frame.example" }),
		"text/html",
	);
	const script = parsed.querySelector("script");
	if (script == null) {
		throw new Error("The view has no script.");
	}
	script.remove();
	document.head.innerHTML = parsed.head.innerHTML;
	document.body.innerHTML = parsed.body.innerHTML;

	const host = { postMessage: vi.fn<(message: RpcMessage, target: string) => void>() };
	const listeners: ((event: { source: unknown; data: unknown }) => void)[] = [];
	const view = {
		parent: host,
		addEventListener: (
			type: string,
			listener: (event: { source: unknown; data: unknown }) => void,
		) => {
			if (type === "message") {
				listeners.push(listener);
			}
		},
	};
	new Function("window", script.textContent ?? "")(view);

	const receive = (data: RpcMessage, source: unknown = host) => {
		for (const listener of listeners) {
			listener({ source, data });
		}
	};
	const sent = () => host.postMessage.mock.calls.map(([message]) => message);
	/** Answers the view's `ui/initialize` request and waits for its `initialized` notification. */
	const initialize = async (result: Record<string, unknown>) => {
		const request = sent().find((message) => message.method === "ui/initialize");
		receive({ jsonrpc: "2.0", id: request?.id, result });
		await vi.waitFor(() => {
			expect(sent().map((message) => message.method)).toContain("ui/notifications/initialized");
		});
	};
	const toolResult = (url: string) =>
		receive({
			jsonrpc: "2.0",
			method: "ui/notifications/tool-result",
			params: { content: [], structuredContent: { url } },
		});
	const frame = () => document.querySelector("iframe")?.getAttribute("src") ?? null;
	return { receive, sent, initialize, toolResult, frame };
}

describe("the preview MCP App view", () => {
	// Why another origin in the link: the view takes only the fragment, so the host cannot pick the frame origin.
	it("loads the prototype frame from the link fragment in the host theme", async () => {
		const view = startView();

		await view.initialize({ hostCapabilities: {}, hostContext: { theme: "dark" } });
		view.toolResult("https://evil.example/mcp/preview#code=abc");

		expect(view.sent()[0]).toEqual(
			expect.objectContaining({
				method: "ui/initialize",
				params: expect.objectContaining({ protocolVersion: "2026-01-26" }),
			}),
		);
		expect(view.frame()).toBe("https://frame.example/mcp/preview-frame#code=abc&theme=dark");
	});

	it("ignores a tool result that does not come from the host", async () => {
		const view = startView();
		await view.initialize({ hostCapabilities: {} });

		view.receive(
			{
				jsonrpc: "2.0",
				method: "ui/notifications/tool-result",
				params: { structuredContent: { url: "https://mantle.example/mcp/preview#code=abc" } },
			},
			{},
		);

		expect(view.frame()).toBeNull();
	});

	it("opens the preview page instead when the host does not allow the frame origin", async () => {
		const view = startView();
		await view.initialize({
			hostCapabilities: { sandbox: { csp: { frameDomains: ["https://other.example"] } } },
		});

		view.toolResult("https://mantle.example/mcp/preview#code=abc");
		document.querySelector<HTMLButtonElement>("#open")?.click();

		expect(view.frame()).toBeNull();
		expect(document.querySelector("#status")?.textContent).toBe(
			"This chat cannot show the prototype here. Open it in your browser.",
		);
		expect(view.sent().at(-1)).toEqual(
			expect.objectContaining({
				method: "ui/open-link",
				params: { url: "https://mantle.example/mcp/preview#code=abc&theme=light" },
			}),
		);
	});

	// Why: the MCP Apps spec reads an omitted `frameDomains` as `frame-src 'none'`.
	it("opens the preview page instead when the host's CSP lists no frame domains", async () => {
		const view = startView();
		await view.initialize({ hostCapabilities: { sandbox: { csp: {} } } });

		view.toolResult("https://mantle.example/mcp/preview#code=abc");

		expect(view.frame()).toBeNull();
		expect(document.querySelector<HTMLElement>("#status")?.hidden).toBe(false);
	});

	it("says so when the host answers the open-link request with an error result", async () => {
		const view = startView();
		await view.initialize({ hostCapabilities: { sandbox: { csp: { frameDomains: [] } } } });
		view.toolResult("https://mantle.example/mcp/preview#code=abc");

		document.querySelector<HTMLButtonElement>("#open")?.click();
		const request = view.sent().find((message) => message.method === "ui/open-link");
		view.receive({ jsonrpc: "2.0", id: request?.id, result: { isError: true } });

		await vi.waitFor(() => {
			expect(document.querySelector("#status")?.textContent).toBe(
				"The chat did not open the link.",
			);
		});
	});

	it("loads the frame when a wildcard in the host's frame domains covers its origin", async () => {
		const view = startView();
		await view.initialize({
			hostCapabilities: { sandbox: { csp: { frameDomains: ["https://*.example"] } } },
		});

		view.toolResult("https://mantle.example/mcp/preview#code=abc");

		expect(view.frame()).toBe("https://frame.example/mcp/preview-frame#code=abc&theme=light");
	});

	it("loads the frame when the host allows every frame domain", async () => {
		const view = startView();
		await view.initialize({ hostCapabilities: { sandbox: { csp: { frameDomains: ["*"] } } } });

		view.toolResult("https://mantle.example/mcp/preview#code=abc");

		expect(view.frame()).toBe("https://frame.example/mcp/preview-frame#code=abc&theme=light");
	});

	it("takes no space for the frame before a tool result", async () => {
		const view = startView();
		await view.initialize({ hostCapabilities: {} });

		// Why not "none": happy-dom has no user-agent `[hidden]` rule. A browser
		// applies it when no author rule sets `display` on the hidden frame.
		const frame = document.querySelector("iframe");
		expect(frame?.hidden).toBe(true);
		expect(frame && getComputedStyle(frame).display).not.toBe("block");
	});

	it("replaces a shown prototype with the error text of a later result", async () => {
		const view = startView();
		await view.initialize({ hostCapabilities: {} });
		view.toolResult("https://mantle.example/mcp/preview#code=abc");

		view.receive({
			jsonrpc: "2.0",
			method: "ui/notifications/tool-result",
			params: { content: [{ type: "text", text: "The code did not compile." }] },
		});

		const status = document.querySelector<HTMLElement>("#status");
		expect(status?.hidden).toBe(false);
		expect(status?.textContent).toBe("The code did not compile.");
		expect(document.querySelector<HTMLIFrameElement>("iframe")?.hidden).toBe(true);
		expect(document.querySelector<HTMLButtonElement>("#open")?.hidden).toBe(true);
	});

	it("shows the tool's error text when the result has no link", async () => {
		const view = startView();
		await view.initialize({ hostCapabilities: {} });

		view.receive({
			jsonrpc: "2.0",
			method: "ui/notifications/tool-result",
			params: {
				content: [{ type: "text", text: "The preview tool is turned off on this server." }],
			},
		});

		expect(document.querySelector("#status")?.textContent).toBe(
			"The preview tool is turned off on this server.",
		);
	});

	it("answers a host request such as ui/resource-teardown", async () => {
		const view = startView();
		await view.initialize({ hostCapabilities: {} });

		view.receive({ jsonrpc: "2.0", id: 7, method: "ui/resource-teardown", params: {} });

		expect(view.sent().at(-1)).toEqual({ jsonrpc: "2.0", id: 7, result: {} });
	});
});
