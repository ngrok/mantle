import { describe, expect, it } from "vitest";
import { allowsOpaqueOriginLoad } from "./opaque-origin-module-cors.ts";

describe("allowsOpaqueOriginLoad", () => {
	it("allows a module script or a stylesheet from an opaque origin", () => {
		expect(allowsOpaqueOriginLoad({ origin: "null", "sec-fetch-dest": "script" })).toBe(true);
		expect(allowsOpaqueOriginLoad({ origin: "null", "sec-fetch-dest": "style" })).toBe(true);
	});

	it("refuses a fetch, which another site could use to read the source", () => {
		expect(allowsOpaqueOriginLoad({ origin: "null", "sec-fetch-dest": "empty" })).toBe(false);
		expect(allowsOpaqueOriginLoad({ origin: "null" })).toBe(false);
	});

	it("refuses a named origin", () => {
		expect(
			allowsOpaqueOriginLoad({ origin: "https://example.com", "sec-fetch-dest": "script" }),
		).toBe(false);
	});
});
