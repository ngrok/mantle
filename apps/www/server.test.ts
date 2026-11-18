import { createTestServer } from "@ngrok/app-server/testing";
import type { TestServer } from "@ngrok/app-server/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DIGEST_INTERVAL_MS, mcpPulse } from "~/utilities/mcp/pulse.server";
import { createDocsServer } from "./server.ts";

const THEME_SCRIPT = "document.documentElement.dataset.theme = 'dark';";

let server: TestServer | undefined;

afterEach(async () => {
	await server?.close();
	server = undefined;
});

async function start(): Promise<TestServer> {
	server = await createTestServer({
		app: createDocsServer(),
		files: {
			"components/actions/button/index.html": `<!doctype html><html><head><script>${THEME_SCRIPT}</script></head><body></body></html>`,
			"components/actions/button.md": "# Button",
			"preview/button-demo/index.html": "<!doctype html><html><body></body></html>",
			"llms.txt": "# mantle",
			"mcp/preview-frame/index.html": "<!doctype html><html><body></body></html>",
			"mcp/preview/index.html": "<!doctype html><html><body></body></html>",
			"assets/entry-abc123.js": "export {};",
		},
	});
	return server;
}

describe("the docs app server", () => {
	it("trusts the inline scripts of a prerendered page by hash and refuses a frame", async () => {
		const response = await (await start()).request("/components/actions/button");

		const policy = response.headers.get("Content-Security-Policy");
		expect(policy).toMatch(/script-src 'self' 'sha256-[^']+'/);
		expect(policy).toContain("frame-ancestors 'none'");
	});

	it("lets a docs page frame an example preview", async () => {
		const response = await (await start()).request("/preview/button-demo");

		expect(response.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'self'");
		expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
	});

	it("sandboxes the MCP prototype frame and blocks its network requests", async () => {
		const policy = (await (await start()).request("/mcp/preview-frame")).headers.get(
			"Content-Security-Policy",
		);

		expect(policy).toContain("sandbox allow-scripts");
		expect(policy).toContain("default-src 'none'");
		expect(policy).not.toContain("'strict-dynamic'");
		expect(policy).toContain("frame-ancestors 'self' https://mantle.ngrok.com");
		// The MCP App view of a chat host frames the prototype inline.
		expect(policy).toContain("https://claude.ai");
	});

	it("limits where a frame can navigate from a page", async () => {
		const policy = (await (await start()).request("/mcp/preview")).headers.get(
			"Content-Security-Policy",
		);

		expect(policy).toContain("frame-src 'self'");
	});

	it("sandboxes the prototype frame in any path case, as the router matches it", async () => {
		// Why a server of its own: a case-insensitive disk merges `MCP/` with `mcp/`.
		server = await createTestServer({
			app: createDocsServer(),
			files: { "MCP/preview-frame/index.html": "<!doctype html><html><body></body></html>" },
		});

		const policy = (await server.request("/MCP/preview-frame")).headers.get(
			"Content-Security-Policy",
		);

		expect(policy).toContain("sandbox allow-scripts");
		expect(policy).toContain(", script-src 'self' 'unsafe-inline' 'unsafe-eval'");
	});

	it("lets the opaque-origin prototype frame load a build asset", async () => {
		const response = await (await start()).request("/assets/entry-abc123.js");

		expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
	});

	it("allows indexing only for a document request through the mantle.ngrok.com edge", async () => {
		const app = await start();

		const direct = await app.request("/components/actions/button");
		const edge = await app.request("/components/actions/button", {
			headers: { "x-ngrok-edge": "1" },
		});

		expect(direct.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
		expect(edge.headers.get("X-Robots-Tag")).toBeNull();
		expect(edge.headers.get("Vary")).toMatch(/x-ngrok-edge/i);
	});

	it("keeps the edge in the Vary of a 304 for a document", async () => {
		const app = await start();
		const etag = (await app.request("/components/actions/button")).headers.get("ETag") ?? "";

		const response = await app.request("/components/actions/button", {
			headers: { "If-None-Match": etag },
		});

		expect(response.status).toBe(304);
		expect(response.headers.get("Vary")).toMatch(/x-ngrok-edge/i);
	});

	it("leaves the indexing headers off a file that is not a document", async () => {
		const response = await (await start()).request("/llms.txt");

		expect(response.headers.get("X-Robots-Tag")).toBeNull();
		expect(response.headers.get("Vary") ?? "").not.toMatch(/x-ngrok-edge/i);
	});

	it("sends the markdown twin of a page to a request that prefers markdown", async () => {
		const response = await (
			await start()
		).request("/components/actions/button", {
			headers: { Accept: "text/markdown" },
		});

		expect(await response.text()).toBe("# Button");
		expect(response.headers.get("Vary")).toMatch(/Accept/);
	});

	it("sends a browser at /mcp to the setup page and an MCP client to the server", async () => {
		server = await createTestServer({
			app: createDocsServer(),
			framework: async () =>
				new Response("<!doctype html><title>setup</title>", {
					headers: { "Content-Type": "text/html" },
				}),
		});

		const page = await server.request("/mcp", { headers: { Accept: "text/html" } });
		const rpc = await server.request("/mcp", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json, text/event-stream",
				Origin: "https://agent.example",
			},
			body: "{}",
		});

		expect(await page.text()).toContain("<title>setup</title>");
		expect(page.headers.get("Vary")).toMatch(/Accept/);
		expect(await rpc.json()).toMatchObject({ jsonrpc: "2.0", error: {} });
		expect(rpc.headers.get("Access-Control-Allow-Origin")).toBe("*");
		expect(rpc.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
	});

	it("redirects an MCP request at another form of /mcp to /mcp with its method", async () => {
		const app = await start();

		const slash = await app.request("/mcp/?source=frontend", { method: "POST", body: "{}" });
		const upper = await app.request("/MCP", { method: "DELETE" });

		expect(slash.status).toBe(308);
		expect(slash.headers.get("Location")).toBe("/mcp?source=frontend");
		expect(upper.status).toBe(308);
		expect(upper.headers.get("Location")).toBe("/mcp");
	});

	it("answers a CORS preflight and refuses a call while MANTLE_MCP is off", async () => {
		vi.stubEnv("MANTLE_MCP", "off");
		try {
			const app = await start();

			const preflight = await app.request("/mcp", {
				method: "OPTIONS",
				headers: {
					Origin: "https://agent.example",
					"Access-Control-Request-Method": "POST",
				},
			});
			const rpc = await app.request("/mcp", {
				method: "POST",
				headers: { "Content-Type": "application/json", Accept: "application/json" },
				body: "{}",
			});

			expect(preflight.status).toBe(204);
			expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe("*");
			expect(rpc.status).toBe(404);
		} finally {
			vi.unstubAllEnvs();
		}
	});

	it("stops the daily MCP digest when the app shuts down", async () => {
		vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
		const flush = vi.spyOn(mcpPulse, "flush");
		try {
			const app = await start();
			await app.request("/llms.txt");
			await app.close();
			server = undefined;
			flush.mockClear();
			vi.advanceTimersByTime(DIGEST_INTERVAL_MS);

			expect(flush).not.toHaveBeenCalled();
		} finally {
			flush.mockRestore();
			vi.useRealTimers();
		}
	});
});
