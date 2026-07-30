import { describe, expect, test } from "vitest";
import { findCookiePair, readCookie } from "./cookie.js";

describe("findCookiePair", () => {
	test("returns the whole name=value pair", () => {
		expect(findCookiePair("mantle-theme=dark", "mantle-theme")).toBe("mantle-theme=dark");
	});

	test("finds the cookie among others, trimming surrounding whitespace", () => {
		expect(findCookiePair("a=1; mantle-theme=dark; b=2", "mantle-theme")).toBe("mantle-theme=dark");
	});

	test("returns undefined for absent, empty, null, and undefined input", () => {
		expect(findCookiePair("a=1", "mantle-theme")).toBeUndefined();
		expect(findCookiePair("", "mantle-theme")).toBeUndefined();
		expect(findCookiePair(null, "mantle-theme")).toBeUndefined();
		expect(findCookiePair(undefined, "mantle-theme")).toBeUndefined();
	});

	test("does not match a cookie whose name merely ends with the requested name", () => {
		// `my-mantle-theme` must not satisfy a request for `mantle-theme`.
		expect(findCookiePair("my-mantle-theme=dark", "mantle-theme")).toBeUndefined();
	});

	test("does not match a cookie whose name is a prefix of the requested name", () => {
		expect(findCookiePair("mantle=dark", "mantle-theme")).toBeUndefined();
	});
});

describe("readCookie", () => {
	test("returns the decoded value", () => {
		expect(readCookie("mantle-theme=dark", "mantle-theme")).toBe("dark");
	});

	test("percent-decodes the value", () => {
		expect(readCookie("greeting=hello%20world", "greeting")).toBe("hello world");
	});

	test("keeps the whole value when it contains '=' — not just the first segment", () => {
		// Regression: `pair.split("=")[1]` truncated a value at its first `=`,
		// which silently corrupts base64 padding.
		expect(readCookie("token=YWJjZA==", "token")).toBe("YWJjZA==");
	});

	test("returns undefined rather than throwing on a malformed percent-escape", () => {
		// Regression: decodeURIComponent raises URIError("URI malformed") here, and
		// a cookie header is client-controlled — any client can send this. Before
		// the shared helper it crashed the SSR render on every page load.
		expect(() => readCookie("mantle-theme=%E0%A4%A", "mantle-theme")).not.toThrow();
		expect(readCookie("mantle-theme=%E0%A4%A", "mantle-theme")).toBeUndefined();
		expect(readCookie("mantle-theme=%", "mantle-theme")).toBeUndefined();
	});

	test("returns an empty string for a present-but-empty cookie", () => {
		// Distinct from `undefined`: the cookie exists and holds nothing.
		expect(readCookie("mantle-theme=", "mantle-theme")).toBe("");
	});

	test("returns undefined for absent, empty, null, and undefined input", () => {
		expect(readCookie("a=1", "mantle-theme")).toBeUndefined();
		expect(readCookie("", "mantle-theme")).toBeUndefined();
		expect(readCookie(null, "mantle-theme")).toBeUndefined();
		expect(readCookie(undefined, "mantle-theme")).toBeUndefined();
	});

	test("reads the cookie from a document.cookie-shaped string", () => {
		expect(readCookie("a=1; mantle-sidebar-state=collapsed; b=2", "mantle-sidebar-state")).toBe(
			"collapsed",
		);
	});
});
