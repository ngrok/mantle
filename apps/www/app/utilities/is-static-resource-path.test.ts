import { describe, expect, test } from "vitest";
import { isStaticResourcePath } from "./is-static-resource-path.js";

describe("isStaticResourcePath", () => {
	test("accepts known static resource extensions", () => {
		expect(isStaticResourcePath("/llms.txt")).toBe(true);
		expect(isStaticResourcePath("/llms-full.txt")).toBe(true);
		expect(isStaticResourcePath("/api/components.json")).toBe(true);
		expect(isStaticResourcePath("/api/hooks.json")).toBe(true);
		expect(isStaticResourcePath("/changelog.md")).toBe(true);
		expect(isStaticResourcePath("/components/actions/button.md")).toBe(true);
		expect(isStaticResourcePath("/sitemap.xml")).toBe(true);
		expect(isStaticResourcePath("/data.csv")).toBe(true);
		expect(isStaticResourcePath("/config.yaml")).toBe(true);
		expect(isStaticResourcePath("/config.yml")).toBe(true);
	});

	test("accepts paths with query strings or fragments", () => {
		expect(isStaticResourcePath("/llms.txt?v=1")).toBe(true);
		expect(isStaticResourcePath("/api/components.json#anchor")).toBe(true);
		expect(isStaticResourcePath("/components/actions/button.md?foo=bar#baz")).toBe(true);
	});

	test("is case-insensitive on the extension", () => {
		expect(isStaticResourcePath("/LLMS.TXT")).toBe(true);
		expect(isStaticResourcePath("/Components.JSON")).toBe(true);
	});

	test("rejects regular SPA route paths", () => {
		expect(isStaticResourcePath("/")).toBe(false);
		expect(isStaticResourcePath("/components/actions/button")).toBe(false);
		expect(isStaticResourcePath("/changelog")).toBe(false);
		expect(isStaticResourcePath("/hooks")).toBe(false);
	});

	test("rejects unrelated extensions", () => {
		expect(isStaticResourcePath("/image.png")).toBe(false);
		expect(isStaticResourcePath("/script.js")).toBe(false);
		expect(isStaticResourcePath("/style.css")).toBe(false);
	});

	test("rejects non-string input", () => {
		expect(isStaticResourcePath(undefined)).toBe(false);
		expect(isStaticResourcePath(null)).toBe(false);
		expect(isStaticResourcePath(123)).toBe(false);
		expect(isStaticResourcePath({})).toBe(false);
	});
});
