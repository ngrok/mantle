import { describe, expect, test } from "vitest";
import { mdxUrlToCanonicalPath } from "./mdx-url.js";

describe("mdxUrlToCanonicalPath", () => {
	test("strips a trailing .mdx extension", () => {
		expect(mdxUrlToCanonicalPath("/docs/components/actions/button.mdx")).toBe(
			"/docs/components/actions/button",
		);
		expect(mdxUrlToCanonicalPath("/recipes/sheet-async.mdx")).toBe("/recipes/sheet-async");
	});

	test("leaves non-.mdx paths unchanged", () => {
		expect(mdxUrlToCanonicalPath("/docs/components/actions/button")).toBe(
			"/docs/components/actions/button",
		);
		expect(mdxUrlToCanonicalPath("/docs/components/actions/button.md")).toBe(
			"/docs/components/actions/button.md",
		);
	});

	test("only strips the extension, not .mdx elsewhere in the path", () => {
		expect(mdxUrlToCanonicalPath("/docs/mdx/button.mdx")).toBe("/docs/mdx/button");
	});
});
