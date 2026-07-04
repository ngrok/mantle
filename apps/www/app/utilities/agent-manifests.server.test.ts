import { describe, expect, it } from "vitest";

import { buildHooksManifest, examplesFromJsDoc } from "./hooks-manifest.server";
import { buildManifest } from "./manifest.server";
import { buildUtilitiesManifest } from "./utils-manifest.server";

describe("agent manifests", () => {
	it("builds hooks from bundled Mantle source", async () => {
		const manifest = await buildHooksManifest();
		const useBreakpoint = manifest.hooks.find((hook) => hook.name === "useBreakpoint");
		const useComposedRefs = manifest.hooks.find((hook) => hook.name === "useComposedRefs");

		expect(manifest.hooks.length).toBeGreaterThan(0);
		expect(useBreakpoint).toMatchObject({
			importPath: "@ngrok/mantle/hooks",
			summary: expect.stringContaining("React hook that returns the current breakpoint"),
		});
		expect(useComposedRefs?.summary).toContain("composes multiple refs");
	});

	// Regression: summaries previously leaked raw JSDoc syntax like
	// "{@link ScrollBehavior}" into llms.txt and /api/hooks.json.
	it("renders inline {@link} tags as plain text in summaries", async () => {
		const manifest = await buildHooksManifest();
		const useScrollBehavior = manifest.hooks.find((hook) => hook.name === "useScrollBehavior");

		expect(useScrollBehavior?.summary).toContain("ScrollBehavior");
		expect(useScrollBehavior?.summary).not.toContain("{@link");
	});

	it("builds utility summaries from bundled Mantle source", async () => {
		const manifest = await buildUtilitiesManifest();
		const cx = manifest.utilities.find((utility) => utility.name === "cx");
		const highlightUtils = manifest.utilities.find((utility) => utility.name === "highlight-utils");

		expect(cx?.summary).toContain("Conditionally compose class names");
		expect(highlightUtils?.summary).toContain("React-free highlighting utilities");
	});

	it("adds component JSDoc from bundled Mantle source", async () => {
		const manifest = await buildManifest();
		const button = manifest.components.find((component) => component.name === "Button");
		const componentsMissingJsdoc = manifest.components
			.filter((component) => component.jsdoc == null)
			.map((component) => component.name);

		expect(button).toMatchObject({
			importPath: "@ngrok/mantle/button",
			jsdoc: expect.stringContaining("Renders a button"),
		});
		expect(componentsMissingJsdoc).toEqual([]);
	});

	it("extracts component @example blocks from bundled Mantle source", async () => {
		const manifest = await buildManifest();
		const field = manifest.components.find((component) => component.name === "Field");

		expect(field?.examples?.length).toBeGreaterThan(0);
		// Canonical composition: the control wraps the input and help text
		// sits below it — the exact shape agents should copy.
		expect(field?.examples?.some((example) => example.includes("<Field.Control>"))).toBe(true);
	});
});

describe("examplesFromJsDoc", () => {
	it("returns each @example block and stops at the next real tag", () => {
		const jsdoc = [
			"/**",
			" * Summary.",
			" * @example",
			" * ```tsx",
			" * <Foo />",
			" * ```",
			" * @param x the thing",
			" */",
		].join("\n");

		expect(examplesFromJsDoc(jsdoc)).toEqual(["```tsx\n<Foo />\n```"]);
	});

	it("does not terminate on an @-prefixed line inside a fenced code block", () => {
		const jsdoc = [
			"/**",
			" * @example",
			" * ```tsx",
			" * @Component()",
			" * class Widget {}",
			" * ```",
			" */",
		].join("\n");

		const [example] = examplesFromJsDoc(jsdoc);
		// Without fence tracking, `@Component()` is mistaken for a tag and the
		// example is truncated to just the opening fence.
		expect(example).toContain("@Component()");
		expect(example).toContain("class Widget {}");
	});

	it("returns an empty array when there are no @example blocks", () => {
		expect(examplesFromJsDoc("/**\n * Just a summary.\n */")).toEqual([]);
	});
});
