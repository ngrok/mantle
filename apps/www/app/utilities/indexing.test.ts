import { describe, expect, it } from "vitest";
import { allowsIndexing } from "./indexing";

describe("allowsIndexing", () => {
	it("allows a request that came through the mantle.ngrok.com edge", () => {
		const request = new Request("http://ngrok-mantle.ngrok.app/", {
			headers: { "x-ngrok-edge": "1" },
		});

		expect(allowsIndexing(request)).toBe(true);
	});

	it("blocks a request with no edge header, such as a preview", () => {
		const request = new Request("https://mantle-1640.ngrok-previews.ngrok.app/");

		expect(allowsIndexing(request)).toBe(false);
	});
});
