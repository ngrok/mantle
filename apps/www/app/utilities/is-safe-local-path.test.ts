import { describe, expect, test } from "vitest";
import { isSafeLocalPath } from "./is-safe-local-path.js";

describe("isSafeLocalPath", () => {
	test("accepts simple absolute paths", () => {
		expect(isSafeLocalPath("/")).toBe(true);
		expect(isSafeLocalPath("/endpoints")).toBe(true);
		expect(isSafeLocalPath("/endpoints/123")).toBe(true);
		expect(isSafeLocalPath("/endpoints?tab=1")).toBe(true);
		expect(isSafeLocalPath("/endpoints#section")).toBe(true);
	});

	test("rejects protocol-relative URLs (open redirect vector)", () => {
		expect(isSafeLocalPath("//evil.com")).toBe(false);
		expect(isSafeLocalPath("//evil.com/foo")).toBe(false);
	});

	// Regression: the WHATWG URL parser treats "\" as a synonym for "/" under
	// special schemes, so every one of these resolves to a third-party origin
	// (`new URL("/\\evil.com", "https://mantle.ngrok.com").href` is
	// "https://evil.com/") while sailing past the leading-"//" check.
	test("rejects backslash-disguised protocol-relative URLs", () => {
		expect(isSafeLocalPath("/\\evil.com")).toBe(false);
		expect(isSafeLocalPath("/\\evil.com/foo")).toBe(false);
		expect(isSafeLocalPath("/\\/evil.com")).toBe(false);
		expect(isSafeLocalPath("/\\\\evil.com")).toBe(false);
		// a backslash anywhere in the path is rejected, not just at the front
		expect(isSafeLocalPath("/endpoints\\..\\..\\evil.com")).toBe(false);
	});

	// The doc comment's own worked example: every rejected form above really
	// does resolve off-origin, and every accepted form really does stay on it.
	test("accepted paths stay on the origin the parser resolves them against", () => {
		const origin = "https://mantle.ngrok.com";
		for (const path of ["/", "/endpoints", "/endpoints/123", "/endpoints?tab=1"]) {
			expect(isSafeLocalPath(path)).toBe(true);
			expect(new URL(path, origin).origin).toBe(origin);
		}
		for (const path of ["//evil.com", "/\\evil.com", "/\\/evil.com"]) {
			expect(isSafeLocalPath(path)).toBe(false);
			expect(new URL(path, origin).origin).toBe("https://evil.com");
		}
	});

	test("rejects absolute URLs and non-http schemes", () => {
		expect(isSafeLocalPath("https://ngrok.com/foo")).toBe(false);
		expect(isSafeLocalPath("http://ngrok.com/foo")).toBe(false);
		expect(isSafeLocalPath("javascript:alert(1)")).toBe(false);
		expect(isSafeLocalPath("mailto:foo@bar.com")).toBe(false);
		expect(isSafeLocalPath("data:text/html,<script>")).toBe(false);
	});

	test("rejects relative paths that don't start with /", () => {
		expect(isSafeLocalPath("foo")).toBe(false);
		expect(isSafeLocalPath("./foo")).toBe(false);
		expect(isSafeLocalPath("../foo")).toBe(false);
		expect(isSafeLocalPath("")).toBe(false);
		expect(isSafeLocalPath("#section")).toBe(false);
		expect(isSafeLocalPath("?query=1")).toBe(false);
	});

	test("rejects control characters and non-ASCII input", () => {
		expect(isSafeLocalPath("/foo\x01bar")).toBe(false);
		expect(isSafeLocalPath("/foo\r\nSet-Cookie: bad")).toBe(false);
		expect(isSafeLocalPath("/foo\u00e9")).toBe(false);
	});

	test("rejects non-string input", () => {
		expect(isSafeLocalPath(undefined)).toBe(false);
		expect(isSafeLocalPath(null)).toBe(false);
		expect(isSafeLocalPath(123)).toBe(false);
		expect(isSafeLocalPath({})).toBe(false);
		expect(isSafeLocalPath([])).toBe(false);
	});
});
