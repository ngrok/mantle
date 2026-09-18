import { describe, expect, test } from "vitest";
import { isSafeLocalPath } from "./is-safe-local-path.js";

describe("isSafeLocalPath", () => {
	test("accepts a path that starts with a single /", () => {
		expect(isSafeLocalPath("/")).toBe(true);
		expect(isSafeLocalPath("/endpoints/123")).toBe(true);
		// Why \x20 and \x7E: a class narrowed by one code point still accepts a mid-range letter.
		expect(isSafeLocalPath("/foo bar")).toBe(true);
		expect(isSafeLocalPath("/foo~")).toBe(true);
	});

	test("rejects protocol-relative URLs (open redirect vector)", () => {
		expect(isSafeLocalPath("//evil.com")).toBe(false);
	});

	test("rejects a value that does not start with a single /", () => {
		expect(isSafeLocalPath("")).toBe(false);
	});

	test("rejects a character outside printable ASCII", () => {
		// Why \x1F and \x7F: a class widened by one code point still rejects \x01, so only the edge turns the test red.
		expect(isSafeLocalPath("/foo\x1Fbar")).toBe(false);
		expect(isSafeLocalPath("/foo\x7Fbar")).toBe(false);
	});

	test("rejects a non-string even when it coerces to a safe path", () => {
		// Why an array: String(["/endpoints"]) is "/endpoints", so the regex guards alone accept it.
		expect(isSafeLocalPath(["/endpoints"])).toBe(false);
	});
});
