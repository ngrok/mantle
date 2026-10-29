import { createTestServer } from "@ngrok/app-server/testing";
import type { TestServer } from "@ngrok/app-server/testing";
import { afterEach, describe, expect, it } from "vitest";
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
		expect(policy).toContain("connect-src 'none'");
		expect(policy).toContain("frame-ancestors 'self' https://mantle.ngrok.com");
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
});
