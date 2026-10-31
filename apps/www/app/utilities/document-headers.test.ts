import type { EntryContext } from "react-router";
import { describe, expect, it } from "vitest";
import { documentHeaders } from "./document-headers";

const edge = { "x-ngrok-edge": "1" };

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the headers read only these fields.
const routerContext = {
	manifest: {
		entry: { module: "/assets/entry.client.js", imports: ["/assets/chunk.js"] },
		routes: {
			root: { module: "/assets/root.js", css: ["/assets/root.css"] },
			page: { module: "/assets/page.js", css: ["/assets/root.css", "/assets/page.css"] },
		},
	},
	staticHandlerContext: { matches: [{ route: { id: "root" } }, { route: { id: "page" } }] },
} as unknown as EntryContext;

describe("documentHeaders", () => {
	it("lets a page through the edge be indexed and cached by the CDN", () => {
		const headers = documentHeaders({
			request: new Request("https://mantle.ngrok.com/components/button", { headers: edge }),
			routerContext,
			nonce: "abc",
			isDev: false,
			hasMarkdownVariant: false,
		});

		expect(headers["X-Robots-Tag"]).toBeUndefined();
		expect(headers["Cache-Control"]).toBe("public, max-age=0, must-revalidate");
		expect(headers["CDN-Cache-Control"]).toBe("public, s-maxage=900, stale-while-revalidate=300");
		expect(headers.Vary).toBe("x-ngrok-edge");
	});

	it("blocks indexing and caching for a request with no edge header", () => {
		const headers = documentHeaders({
			request: new Request("https://mantle-1640.ngrok-previews.ngrok.app/components/button"),
			routerContext,
			nonce: "abc",
			isDev: false,
			hasMarkdownVariant: false,
		});

		expect(headers["X-Robots-Tag"]).toBe("noindex, nofollow");
		expect(headers["Cache-Control"]).toBe("private, no-store");
		expect(headers["CDN-Cache-Control"]).toBeUndefined();
	});

	it("never caches in development", () => {
		const headers = documentHeaders({
			request: new Request("https://mantle.ngrok.com/", { headers: edge }),
			routerContext,
			nonce: "abc",
			isDev: true,
			hasMarkdownVariant: false,
		});

		expect(headers["Cache-Control"]).toBe("private, no-store");
	});

	it("puts the document's nonce in the CSP and refuses framing", () => {
		const headers = documentHeaders({
			request: new Request("https://mantle.ngrok.com/components/button", { headers: edge }),
			routerContext,
			nonce: "abc",
			isDev: false,
			hasMarkdownVariant: false,
		});

		expect(headers["Content-Security-Policy"]).toBe(
			"script-src 'nonce-abc' 'strict-dynamic'; base-uri 'self'; object-src 'none'; worker-src 'self' blob:; frame-ancestors 'none'",
		);
		expect(headers["X-Frame-Options"]).toBe("DENY");
	});

	it("lets a framed example preview be framed by its own origin and never indexed", () => {
		const headers = documentHeaders({
			request: new Request("https://mantle.ngrok.com/preview/button-default", { headers: edge }),
			routerContext,
			nonce: "abc",
			isDev: false,
			hasMarkdownVariant: false,
		});

		expect(headers["X-Frame-Options"]).toBe("SAMEORIGIN");
		expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'self'");
		expect(headers["X-Robots-Tag"]).toBe("noindex, nofollow");
	});

	it("preloads the matched routes' CSS and modules once each, at low priority", () => {
		const headers = documentHeaders({
			request: new Request("https://mantle.ngrok.com/components/button", { headers: edge }),
			routerContext,
			nonce: "abc",
			isDev: false,
			hasMarkdownVariant: false,
		});

		expect(headers.Link).toBe(
			[
				"</assets/root.css>; rel=preload; as=style",
				"</assets/page.css>; rel=preload; as=style",
				"</assets/entry.client.js>; rel=modulepreload; fetchpriority=low",
				"</assets/chunk.js>; rel=modulepreload; fetchpriority=low",
				"</assets/root.js>; rel=modulepreload; fetchpriority=low",
				"</assets/page.js>; rel=modulepreload; fetchpriority=low",
			].join(", "),
		);
	});

	it("trusts a prerendered page's inline scripts by hash and sends no Link header", () => {
		const headers = documentHeaders({
			request: new Request("https://mantle.ngrok.com/components/button", { headers: edge }),
			scriptHashes: ["aGFzaDE=", "aGFzaDI="],
			isDev: false,
			hasMarkdownVariant: false,
		});

		expect(headers["Content-Security-Policy"]).toBe(
			"script-src 'self' 'sha256-aGFzaDE=' 'sha256-aGFzaDI='; base-uri 'self'; object-src 'none'; worker-src 'self' blob:; frame-ancestors 'none'",
		);
		expect(headers.Link).toBeUndefined();
	});

	it("keys caches on Accept for a page with a markdown answer", () => {
		const headers = documentHeaders({
			request: new Request("https://mantle.ngrok.com/components/button", { headers: edge }),
			routerContext,
			nonce: "abc",
			isDev: false,
			hasMarkdownVariant: true,
		});

		expect(headers.Vary).toBe("x-ngrok-edge, Accept");
	});
});
