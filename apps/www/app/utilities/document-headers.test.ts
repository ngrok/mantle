import { describe, expect, it } from "vitest";
import { documentHeaders } from "./document-headers";

const edge = { "x-ngrok-edge": "1" };

describe("documentHeaders", () => {
	it("lets a page through the edge be indexed and cached by the CDN", () => {
		const headers = documentHeaders({
			request: new Request("https://mantle.ngrok.com/components/button", { headers: edge }),
			nonce: "abc",
			isDev: false,
		});

		expect(headers["X-Robots-Tag"]).toBeUndefined();
		expect(headers["Cache-Control"]).toBe("public, max-age=0, must-revalidate");
		expect(headers["CDN-Cache-Control"]).toBe("public, s-maxage=900, stale-while-revalidate=300");
		expect(headers.Vary).toBe("x-ngrok-edge");
	});

	it("blocks indexing and caching for a request with no edge header", () => {
		const headers = documentHeaders({
			request: new Request("https://mantle-1640.ngrok-previews.ngrok.app/components/button"),
			nonce: "abc",
			isDev: false,
		});

		expect(headers["X-Robots-Tag"]).toBe("noindex, nofollow");
		expect(headers["Cache-Control"]).toBe("private, no-store");
		expect(headers["CDN-Cache-Control"]).toBeUndefined();
	});

	it("never caches in development", () => {
		const headers = documentHeaders({
			request: new Request("https://mantle.ngrok.com/", { headers: edge }),
			nonce: "abc",
			isDev: true,
		});

		expect(headers["Cache-Control"]).toBe("private, no-store");
	});

	it("puts the document's nonce in the CSP and refuses framing", () => {
		const headers = documentHeaders({
			request: new Request("https://mantle.ngrok.com/components/button", { headers: edge }),
			nonce: "abc",
			isDev: false,
		});

		expect(headers["Content-Security-Policy"]).toBe(
			"script-src 'nonce-abc' 'self' https://mantle.ngrok.com; base-uri 'self'; object-src 'none'; worker-src 'self' blob:; frame-ancestors 'none'",
		);
		expect(headers["X-Frame-Options"]).toBe("DENY");
	});

	it("lets a framed example preview be framed by its own origin and never indexed", () => {
		const headers = documentHeaders({
			request: new Request("https://mantle.ngrok.com/preview/button-default", { headers: edge }),
			nonce: "abc",
			isDev: false,
		});

		expect(headers["X-Frame-Options"]).toBe("SAMEORIGIN");
		expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'self'");
		expect(headers["X-Robots-Tag"]).toBe("noindex, nofollow");
	});
});
