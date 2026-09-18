import { describe, expect, it } from "vitest";

import { etagFor } from "./etag";

describe("etagFor", () => {
	it("differs for different inputs", () => {
		expect(etagFor("hello")).not.toBe(etagFor("world"));
	});

	it("differs for inputs that vary only in trailing whitespace", () => {
		expect(etagFor("hello")).not.toBe(etagFor("hello "));
		expect(etagFor("hello")).not.toBe(etagFor("hello\n"));
	});

	it("hashes the empty string", () => {
		// sha256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
		expect(etagFor("")).toBe('"e3b0c44298fc1c14"');
	});

	it("treats a string and its UTF-8 byte equivalent as identical", () => {
		const text = "mantle — ngrok";
		const bytes = new TextEncoder().encode(text);
		expect(etagFor(text)).toBe(etagFor(bytes));
	});

	it("uses the SHA-256 prefix (regression: known vector for 'hello')", () => {
		// sha256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
		expect(etagFor("hello")).toBe('"2cf24dba5fb0a30e"');
	});
});
