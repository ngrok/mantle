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
