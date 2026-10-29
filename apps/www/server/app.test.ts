// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { gunzipSync } from "node:zlib";
import { afterAll, describe, expect, it, vi } from "vitest";
import { createApp, redactedUrl, type ServerLogger } from "./app.ts";

const clientDirectory = mkdtempSync(join(tmpdir(), "mantle-www-server-"));
const files: Record<string, string> = {
	"components/actions/button/index.html": "<h1>Button</h1>",
	"components/actions/button.md": "# Button",
	"api/components.json": "{}",
	"assets/entry-abc123.js": "export {};",
	".env": "SECRET=1",
	".well-known/security.txt": "Contact: security@ngrok.com",
};
for (const [path, content] of Object.entries(files)) {
	mkdirSync(dirname(join(clientDirectory, path)), { recursive: true });
	writeFileSync(join(clientDirectory, path), content);
}

afterAll(() => {
	rmSync(clientDirectory, { recursive: true, force: true });
});

function appWith({
	handleRequest = async () =>
		new Response("rendered", { headers: { "Content-Type": "text/html" } }),
	trustForwardedProto = false,
}: {
	handleRequest?: (request: Request) => Promise<Response>;
	trustForwardedProto?: boolean;
} = {}) {
	const log = { info: vi.fn<ServerLogger["info"]>(), error: vi.fn<ServerLogger["error"]>() };
	const app = createApp({
		clientDirectory,
		markdownPaths: new Set(["/components/actions/button.md"]),
		handleRequest,
		log,
		trustForwardedProto,
	});
	return { app, log };
}

describe("the docs server", () => {
	it("serves a prerendered page at its own URL, with no trailing-slash redirect", async () => {
		const response = await appWith().app.request("/components/actions/button");

		expect(response.status).toBe(200);
		expect(await response.text()).toBe("<h1>Button</h1>");
		expect(response.headers.get("Vary")).toContain("Accept");
	});

	it("serves the markdown twin with its loader headers when the client asks for markdown", async () => {
		const response = await appWith().app.request("/components/actions/button", {
			headers: { Accept: "text/markdown" },
		});

		expect(await response.text()).toBe("# Button");
		expect(response.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
		expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
	});

	it("puts the loader's CORS and cache headers back on a prerendered agent file", async () => {
		const response = await appWith().app.request("/api/components.json");

		expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
		expect(response.headers.get("Cache-Control")).toBe(
			"public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
		);
	});

	it("answers 304 to a matching If-None-Match", async () => {
		const { app } = appWith();
		const first = await app.request("/api/components.json");
		const etag = first.headers.get("ETag") ?? "";

		const second = await app.request("/api/components.json", {
			headers: { "If-None-Match": etag },
		});

		expect(etag).toMatch(/^W\/"/);
		expect(second.status).toBe(304);
		expect(await second.text()).toBe("");
	});

	it("serves hashed assets as immutable to any origin", async () => {
		const response = await appWith().app.request("/assets/entry-abc123.js");

		expect(response.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
	});

	it("refuses dotfiles but serves /.well-known/", async () => {
		const { app } = appWith();

		expect((await app.request("/.env")).status).toBe(404);
		expect(await (await app.request("/.well-known/security.txt")).text()).toBe(
			"Contact: security@ngrok.com",
		);
	});

	it("hands every other request to React Router", async () => {
		const response = await appWith().app.request("/components/button", { method: "POST" });

		expect(await response.text()).toBe("rendered");
	});

	it("echoes a request ID and logs the request with the query values redacted", async () => {
		const { app, log } = appWith();

		const response = await app.request("/email/verify?code=123456", {
			headers: { "X-Request-Id": "abc-123" },
		});

		expect(response.headers.get("X-Request-Id")).toBe("abc-123");
		expect(log.info).toHaveBeenCalledTimes(1);
		expect(log.info).toHaveBeenLastCalledWith(
			expect.objectContaining({
				http: expect.objectContaining({
					url: "/email/verify?code=REDACTED",
					status_code: 200,
					request_id: "abc-123",
				}),
			}),
			"request",
		);
	});

	it("reads the scheme from X-Forwarded-Proto only when the flag is on", async () => {
		const handleRequest = async (request: Request) => new Response(new URL(request.url).protocol);

		const trusted = await appWith({ handleRequest, trustForwardedProto: true }).app.request(
			"/page",
			{
				headers: { "X-Forwarded-Proto": "https" },
			},
		);
		const untrusted = await appWith({ handleRequest }).app.request("/page", {
			headers: { "X-Forwarded-Proto": "https" },
		});

		expect(await trusted.text()).toBe("https:");
		expect(await untrusted.text()).toBe("http:");
	});

	it("sends the first gzip chunk of a streamed page before the stream ends", async () => {
		let finish: () => void = () => {};
		const handleRequest = async () =>
			new Response(
				new ReadableStream<Uint8Array>({
					start(controller) {
						controller.enqueue(new TextEncoder().encode("<html>shell"));
						finish = () => {
							controller.enqueue(new TextEncoder().encode("rest</html>"));
							controller.close();
						};
					},
				}),
				{ headers: { "Content-Type": "text/html" } },
			);

		const response = await appWith({ handleRequest }).app.request("/streamed", {
			headers: { "Accept-Encoding": "gzip" },
		});
		const reader = response.body?.getReader();
		const first = await reader?.read();
		finish();

		expect(response.headers.get("Content-Encoding")).toBe("gzip");
		expect(gunzipSync(first?.value ?? new Uint8Array(), { finishFlush: 2 }).toString()).toBe(
			"<html>shell",
		);
	});
});

describe("redactedUrl", () => {
	it("keeps the path and the query keys", () => {
		expect(redactedUrl(new URL("https://mantle.ngrok.com/a?b=1&c=2"))).toBe(
			"/a?b=REDACTED&c=REDACTED",
		);
		expect(redactedUrl(new URL("https://mantle.ngrok.com/a"))).toBe("/a");
	});
});
