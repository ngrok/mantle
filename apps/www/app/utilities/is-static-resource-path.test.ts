import { describe, expect, test } from "vitest";
import { isStaticResourcePath } from "./is-static-resource-path.js";

describe("isStaticResourcePath", () => {
	test("accepts known static resource extensions", () => {
		expect(isStaticResourcePath("/llms.txt")).toBe(true);
		expect(isStaticResourcePath("/api/components.json")).toBe(true);
		expect(isStaticResourcePath("/changelog.md")).toBe(true);
		expect(isStaticResourcePath("/sitemap.xml")).toBe(true);
		expect(isStaticResourcePath("/data.csv")).toBe(true);
		expect(isStaticResourcePath("/config.yaml")).toBe(true);
		expect(isStaticResourcePath("/config.yml")).toBe(true);
	});

	test("accepts paths with query strings or fragments", () => {
		expect(isStaticResourcePath("/llms.txt?v=1")).toBe(true);
		expect(isStaticResourcePath("/api/components.json#anchor")).toBe(true);
	});

	test("is case-insensitive on the extension", () => {
		expect(isStaticResourcePath("/LLMS.TXT")).toBe(true);
	});

	test("rejects regular SPA route paths", () => {
		expect(isStaticResourcePath("/components/actions/button")).toBe(false);
		expect(isStaticResourcePath("/components/code-block#json")).toBe(false);
	});

	test("rejects unrelated extensions", () => {
		expect(isStaticResourcePath("/style.css")).toBe(false);
	});

	test("rejects an extension that only starts with a known one", () => {
		expect(isStaticResourcePath("/components/actions/button.mdx")).toBe(false);
	});

	test("rejects non-string input", () => {
		expect(isStaticResourcePath(undefined)).toBe(false);
	});
});
