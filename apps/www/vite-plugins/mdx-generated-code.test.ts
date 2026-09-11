import { expect, test } from "vitest";
import { fillGeneratedCode } from "./mdx-generated-code";

const stubSources = {
	stubScript: async () => "(function(a){a.b=1})({b:0})",
};

test("replaces a marker line with the formatted generator output at the marker's indentation", async () => {
	const source = ["<script>", "\t\t// @mantle-generated stubScript()", "</script>"].join("\n");

	const result = await fillGeneratedCode(source, stubSources);

	expect(result).toBe(
		["<script>", "\t\t(function (a) {", "\t\t\ta.b = 1;", "\t\t})({ b: 0 });", "</script>"].join(
			"\n",
		),
	);
});

test("fills every marker in one source", async () => {
	const source = "// @mantle-generated stubScript()\n---\n// @mantle-generated stubScript()";

	const result = await fillGeneratedCode(source, stubSources);

	expect(result.match(/a\.b = 1;/g)).toHaveLength(2);
	expect(result).not.toContain("@mantle-generated");
});

test("returns the source unchanged when it has no marker", async () => {
	const source = "<script>\n\t// a plain comment\n</script>";

	await expect(fillGeneratedCode(source, stubSources)).resolves.toBe(source);
});

test("leaves a comment that only mentions the tag alone", async () => {
	const source =
		"// the @mantle-generated tag needs a bare call to match\n// @mantle-generated stubScript";

	await expect(fillGeneratedCode(source, stubSources)).resolves.toBe(source);
});

test("throws when a marker names a generator the map does not have", async () => {
	const source = "// @mantle-generated missingScript()";

	await expect(fillGeneratedCode(source, stubSources)).rejects.toThrow(
		/Unknown @mantle-generated source "missingScript\(\)"\. Known sources: stubScript/,
	);
});

test("throws when a marker names an inherited object member", async () => {
	const source = "// @mantle-generated toString()";

	await expect(fillGeneratedCode(source, stubSources)).rejects.toThrow(
		/Unknown @mantle-generated source "toString\(\)"/,
	);
});

test("fills the theme scripts from @ngrok/mantle/theme by default", async () => {
	const source = [
		"// @mantle-generated preventWrongThemeFlashScriptContent()",
		"// @mantle-generated fixMediaScriptContent()",
	].join("\n");

	const result = await fillGeneratedCode(source);

	expect(result).toContain('storageKey: "mantle-ui-theme"');
	expect(result).toContain('darkLinkId: "mantle-dark-styles"');
	expect(result).not.toContain("@mantle-generated");
});
