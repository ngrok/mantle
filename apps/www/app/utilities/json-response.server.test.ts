import { describe, expect, it } from "vitest";

import { jsonAgentResponse } from "./json-response.server";

const data = { name: "@ngrok/mantle", entries: ["button"] };

describe("jsonAgentResponse", () => {
	it("returns pretty JSON with the agent API headers", async () => {
		const response = jsonAgentResponse(data);

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
		expect(await response.text()).toBe(JSON.stringify(data, null, "\t"));
	});

	it("uses the content type that the caller gives", () => {
		const response = jsonAgentResponse(data, { contentType: "application/schema+json" });

		expect(response.headers.get("Content-Type")).toBe("application/schema+json");
	});
});
