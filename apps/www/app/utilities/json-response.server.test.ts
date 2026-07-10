import { describe, expect, it } from "vitest";

import { etagFor } from "./etag";
import { AGENT_API_CACHE_CONTROL, jsonAgentResponse } from "./json-response.server";

const data = { name: "@ngrok/mantle", entries: ["button"] };
const body = JSON.stringify(data, null, "\t");
const etag = etagFor(body);

describe("jsonAgentResponse", () => {
	it("returns pretty JSON with the shared agent API headers", async () => {
		const response = jsonAgentResponse(
			data,
			new Request("https://mantle.ngrok.com/api/package.json"),
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
		expect(response.headers.get("Cache-Control")).toBe(AGENT_API_CACHE_CONTROL);
		expect(response.headers.get("ETag")).toBe(etag);
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
		expect(await response.text()).toBe(body);
	});

	it("returns matching cache, content-type, etag, and CORS headers for 304 revalidation", async () => {
		const response = jsonAgentResponse(
			data,
			new Request("https://mantle.ngrok.com/api/package.json", {
				headers: { "If-None-Match": etag },
			}),
		);

		expect(response.status).toBe(304);
		expect(response.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
		expect(response.headers.get("Cache-Control")).toBe(AGENT_API_CACHE_CONTROL);
		expect(response.headers.get("ETag")).toBe(etag);
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
		expect(await response.text()).toBe("");
	});

	it("applies a custom content type to both response paths", () => {
		const contentType = "application/schema+json; charset=utf-8";

		const fresh = jsonAgentResponse(data, new Request("https://mantle.ngrok.com/api/schema.json"), {
			contentType,
		});
		const revalidated = jsonAgentResponse(
			data,
			new Request("https://mantle.ngrok.com/api/schema.json", {
				headers: { "If-None-Match": etag },
			}),
			{ contentType },
		);

		expect(fresh.status).toBe(200);
		expect(revalidated.status).toBe(304);
		expect(fresh.headers.get("Content-Type")).toBe(contentType);
		expect(revalidated.headers.get("Content-Type")).toBe(contentType);
	});

	it("honors etag lists, wildcard matches, and weak validators", () => {
		const matchingHeaders = [etag, `"old-etag", ${etag}`, "*", `W/${etag}`];

		for (const ifNoneMatch of matchingHeaders) {
			const response = jsonAgentResponse(
				data,
				new Request("https://mantle.ngrok.com/api/package.json", {
					headers: { "If-None-Match": ifNoneMatch },
				}),
			);

			expect(response.status).toBe(304);
		}
	});
});
