import { describe, expect, it } from "vitest";
import { allowsOpaqueOriginLoad, publicModulePaths } from "./opaque-origin-module-cors.ts";

const publicPaths = publicModulePaths("/repo");
const opaqueScript = { origin: "null", "sec-fetch-dest": "script" };

describe("allowsOpaqueOriginLoad", () => {
	it("allows a module, a stylesheet, or a font from a public path", () => {
		expect(
			allowsOpaqueOriginLoad({ headers: opaqueScript, url: "/app/root.tsx", publicPaths }),
		).toBe(true);
		expect(
			allowsOpaqueOriginLoad({
				headers: { origin: "null", "sec-fetch-dest": "style" },
				url: "/@fs/repo/packages/mantle/src/mantle.css?raw",
				publicPaths,
			}),
		).toBe(true);
	});

	it("refuses a fetch, which another site could use to read the source", () => {
		const headers = { origin: "null", "sec-fetch-dest": "empty" };

		expect(allowsOpaqueOriginLoad({ headers, url: "/app/root.tsx", publicPaths })).toBe(false);
	});

	it("refuses a file outside the public paths, also through a dot segment", () => {
		for (const url of [
			"/@fs/repo/local/frontend/secret.ts?raw",
			"/@fs/repo/PLAN.md?raw",
			"/@fs/repo/packages/../local/secret.ts?raw",
			"/@fs/repo/packages/%2e%2e/local/secret.ts?raw",
			"/@fs/etc/hosts?raw",
			"/@id//repo/CONVENTIONS.md?raw",
		]) {
			expect(allowsOpaqueOriginLoad({ headers: opaqueScript, url, publicPaths })).toBe(false);
		}
	});

	it("refuses a named origin", () => {
		expect(
			allowsOpaqueOriginLoad({
				headers: { origin: "https://example.com", "sec-fetch-dest": "script" },
				url: "/app/root.tsx",
				publicPaths,
			}),
		).toBe(false);
	});
});
