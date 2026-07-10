import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test, vi } from "vitest";
import { mantleCodeVitePlugin } from "./mantle-code-vite-plugin.js";

type TransformContext = {
	warn: ReturnType<typeof vi.fn>;
};

async function runTransform(source: string, id = "/virtual/test.tsx") {
	const plugin = mantleCodeVitePlugin();
	const context: TransformContext = {
		warn: vi.fn<(message: string) => void>(),
	};
	const transform = plugin.transform;
	if (transform == null) {
		throw new Error("vite plugin is missing transform()");
	}
	const transformHandler = typeof transform === "function" ? transform : transform.handler;
	const result = await transformHandler.call(context as never, source, id);
	return {
		code: typeof result === "object" && result != null ? result.code : result,
		warn: context.warn,
	};
}

const mantleImport = 'import { mantleCode } from "@ngrok/mantle/code-block";\n';

describe("mantleCodeVitePlugin", () => {
	test("transforms mantleCode tagged templates outside JSX", async () => {
		const result = await runTransform(
			mantleImport + 'const snippet = mantleCode("typescript")`const value = ${count};`;',
		);

		expect(result.warn).not.toHaveBeenCalled();
		expect(result.code).toContain('"~preHtml"');
		expect(result.code).toContain('"~preValToken":"__MANTLE_PRE_VAL_');
		expect(result.code).toContain('"~preVals":[count]');
		expect(result.code).not.toContain('mantleCode("typescript")');
	});

	test("wraps replacement in parentheses for expression context safety", async () => {
		const result = await runTransform(
			mantleImport + 'const f = () => mantleCode("typescript")`const x = 1`;',
		);

		expect(result.warn).not.toHaveBeenCalled();
		expect(result.code).toContain("const f = () => ({language:");
	});

	test("skips mantleCode not imported from @ngrok/mantle/code-block", async () => {
		const result = await runTransform(
			'import { mantleCode } from "./my-local-helper";\nconst snippet = mantleCode("typescript")`const value = 1;`;',
		);

		expect(result.code).toBeUndefined();
	});

	test("skips mantleCode with no import at all", async () => {
		const result = await runTransform(
			'const snippet = mantleCode("typescript")`const value = 1;`;',
		);

		expect(result.code).toBeUndefined();
	});

	test("handles aliased imports", async () => {
		const result = await runTransform(
			'import { mantleCode as mc } from "@ngrok/mantle/code-block";\nconst snippet = mc("typescript")`const value = 1;`;',
		);

		expect(result.warn).not.toHaveBeenCalled();
		expect(result.code).toContain('"~preHtml"');
	});

	test("folds static CodeBlock.Code props into the transformed value and removes them from JSX", async () => {
		const source = [
			mantleImport + "<CodeBlock.Code",
			"\tshowLineNumbers",
			"\tlineNumberStart={7}",
			'\thighlightLines={[1, "3-4"]}',
			'\tindentation="spaces"',
			'\tvalue={mantleCode("typescript", { showLineNumbers: false, lineNumberStart: 2, highlightLines: [2] })`const value = ${count};`}',
			"/>;",
		].join("\n");
		const result = await runTransform(source);

		expect(result.warn).not.toHaveBeenCalled();
		expect(result.code).toContain('"~showLineNumbers":true');
		expect(result.code).toContain('"~lineNumberStart":7');
		expect(result.code).toContain('"~highlightLines":[1,"3-4"]');
		expect(result.code).toContain("<CodeBlock.Code");
		expect(result.code).not.toContain(" showLineNumbers");
		expect(result.code).not.toContain("lineNumberStart={7}");
		expect(result.code).not.toContain('highlightLines={[1, "3-4"]}');
		expect(result.code).not.toContain('indentation="spaces"');
	});

	test("defaults showLineNumbers to true for non-shell languages and emits line-number HTML", async () => {
		const result = await runTransform(
			mantleImport + 'const snippet = mantleCode("typescript")`const value = 1;`;',
		);

		expect(result.warn).not.toHaveBeenCalled();
		expect(result.code).toContain('"~showLineNumbers":true');
		expect(result.code).toContain("mantle-code-line-number");
	});

	test("preserves showLineNumbers false when explicitly set and omits line-number HTML", async () => {
		const result = await runTransform(
			mantleImport +
				'const snippet = mantleCode("typescript", { showLineNumbers: false })`const value = 1;`;',
		);

		expect(result.warn).not.toHaveBeenCalled();
		expect(result.code).toContain('"~showLineNumbers":false');
		expect(result.code).not.toContain("mantle-code-line-number");
	});

	test("defaults showLineNumbers to false for single-line bash and omits line-number HTML", async () => {
		const result = await runTransform(
			mantleImport + 'const snippet = mantleCode("bash")`npm install @ngrok/mantle`;',
		);

		expect(result.warn).not.toHaveBeenCalled();
		expect(result.code).toContain('"~showLineNumbers":false');
		expect(result.code).not.toContain("mantle-code-line-number");
	});

	test("defaults showLineNumbers to false for single-line sh", async () => {
		const result = await runTransform(
			mantleImport + 'const snippet = mantleCode("sh")`curl -s https://example.com`;',
		);

		expect(result.warn).not.toHaveBeenCalled();
		expect(result.code).toContain('"~showLineNumbers":false');
		expect(result.code).not.toContain("mantle-code-line-number");
	});

	test("defaults showLineNumbers to false for single-line shell", async () => {
		const result = await runTransform(
			mantleImport + 'const snippet = mantleCode("shell")`echo hello`;',
		);

		expect(result.warn).not.toHaveBeenCalled();
		expect(result.code).toContain('"~showLineNumbers":false');
		expect(result.code).not.toContain("mantle-code-line-number");
	});

	test("defaults showLineNumbers to true for multi-line shell code and emits line-number HTML", async () => {
		const result = await runTransform(
			mantleImport + 'const snippet = mantleCode("bash")`echo hello\necho world`;',
		);

		expect(result.warn).not.toHaveBeenCalled();
		expect(result.code).toContain('"~showLineNumbers":true');
		expect(result.code).toContain("mantle-code-line-number");
	});

	test("single-line shell code respects explicit showLineNumbers true and emits line-number HTML", async () => {
		const result = await runTransform(
			mantleImport +
				'const snippet = mantleCode("bash", { showLineNumbers: true })`npm install @ngrok/mantle`;',
		);

		expect(result.warn).not.toHaveBeenCalled();
		expect(result.code).toContain('"~showLineNumbers":true');
		expect(result.code).toContain("mantle-code-line-number");
	});

	test("highlightLines with lineNumberStart produces highlighted lines at correct offsets", async () => {
		const result = await runTransform(
			mantleImport +
				'const snippet = mantleCode("typescript", { lineNumberStart: 10, highlightLines: [11] })`const a = 1;\nconst b = 2;`;',
		);

		expect(result.warn).not.toHaveBeenCalled();
		expect(result.code).toContain('"~lineNumberStart":10');
		expect(result.code).toContain('"~highlightLines":[11]');
		expect(result.code).toContain("mantle-code-line-highlighted");
	});

	test("indented single-line shell template defaults showLineNumbers to false", async () => {
		const source = [
			mantleImport + 'const snippet = mantleCode("bash")`',
			"\t\tnpm install @ngrok/mantle",
			"\t`;",
		].join("\n");
		const result = await runTransform(source);

		expect(result.warn).not.toHaveBeenCalled();
		expect(result.code).toContain('"~showLineNumbers":false');
		expect(result.code).not.toContain("mantle-code-line-number");
	});

	test("JSX showLineNumbers prop overrides mantleCode option", async () => {
		const source = [
			mantleImport + "<CodeBlock.Code",
			"\tshowLineNumbers={false}",
			'\tvalue={mantleCode("typescript", { showLineNumbers: true })`const x = 1;`}',
			"/>;",
		].join("\n");
		const result = await runTransform(source);

		expect(result.warn).not.toHaveBeenCalled();
		expect(result.code).toContain('"~showLineNumbers":false');
		expect(result.code).not.toContain("mantle-code-line-number");
	});

	test("JSX showLineNumbers prop overrides shell single-line default", async () => {
		const source = [
			mantleImport + "<CodeBlock.Code",
			"\tshowLineNumbers",
			'\tvalue={mantleCode("bash")`npm install @ngrok/mantle`}',
			"/>;",
		].join("\n");
		const result = await runTransform(source);

		expect(result.warn).not.toHaveBeenCalled();
		expect(result.code).toContain('"~showLineNumbers":true');
		expect(result.code).toContain("mantle-code-line-number");
	});

	test("normalizes numeric highlightLines entries to integers", async () => {
		const result = await runTransform(
			mantleImport +
				'<CodeBlock.Code highlightLines={[2.9]} value={mantleCode("typescript")`const value = 1;`} />;',
		);

		expect(result.warn).not.toHaveBeenCalled();
		expect(result.code).toContain('"~highlightLines":[2]');
	});
});

/**
 * Extracts the transformed replacement object literal assigned to `const <name> = (...)`,
 * scanning with awareness of template-literal delimiters so backticks and parens inside
 * the highlighted HTML/code don't confuse the balanced-paren match.
 */
function extractAssignedObject(transformed: unknown, name: string): string {
	if (typeof transformed !== "string") {
		throw new Error("transform returned no code");
	}
	const prefix = `const ${name} = `;
	const start = transformed.indexOf(prefix);
	if (start < 0) {
		throw new Error(`could not find assignment to ${name}`);
	}
	let index = start + prefix.length;
	if (transformed[index] !== "(") {
		throw new Error(`expected '(' after "${prefix}"`);
	}
	let depth = 0;
	let inTemplate = false;
	for (; index < transformed.length; index += 1) {
		const char = transformed[index];
		if (char === "\\") {
			index += 1; // skip escaped char
			continue;
		}
		if (char === "`") {
			inTemplate = !inTemplate;
			continue;
		}
		if (inTemplate) {
			continue;
		}
		if (char === "(") {
			depth += 1;
		} else if (char === ")") {
			depth -= 1;
			if (depth === 0) {
				return transformed.slice(start + prefix.length, index + 1);
			}
		}
	}
	throw new Error(`unterminated replacement object for ${name}`);
}

/** Counts rendered code lines in a transformed value by counting per-line content slots. */
function countRenderedLines(objectLiteral: string): number {
	return (objectLiteral.match(/data-slot="line-content"/g) ?? []).length;
}

describe("mantleCodeVitePlugin static fragment inlining", () => {
	test("inlines a same-file fragment referenced as `.code` with no runtime placeholder", async () => {
		const source = [
			mantleImport + 'const oauthPolicy = mantleCode("yaml")`on_http_request:',
			"  - actions:",
			"    - type: oauth`;",
			'const javaSnippet = mantleCode("java")`String tp = """',
			"${oauthPolicy.code}",
			'""";`;',
		].join("\n");

		const result = await runTransform(source);
		const javaObject = extractAssignedObject(result.code, "javaSnippet");

		expect(result.warn).not.toHaveBeenCalled();
		// Fully static → no runtime substitution work at all.
		expect(javaObject).toContain('"~preVals":undefined');
		expect(javaObject).toContain('"~preValToken":undefined');
		// The interpolation became real source, not a runtime expression.
		expect(javaObject).not.toContain("oauthPolicy");
		// The YAML body is highlighted as real lines inside the Java snippet:
		// `String tp = """`, three policy lines, and `""";`.
		expect(countRenderedLines(javaObject)).toBe(5);
	});

	test("inlining produces byte-identical output to typing the fragment inline", async () => {
		const withFragment = [
			mantleImport + 'const oauthPolicy = mantleCode("yaml")`on_http_request:',
			"  - actions:",
			"    - type: oauth`;",
			'const javaSnippet = mantleCode("java")`String tp = """',
			"${oauthPolicy.code}",
			'""";`;',
		].join("\n");
		const manualInline = [
			mantleImport + 'const javaSnippet = mantleCode("java")`String tp = """',
			"on_http_request:",
			"  - actions:",
			"    - type: oauth",
			'""";`;',
		].join("\n");

		const fragmentResult = await runTransform(withFragment);
		const inlineResult = await runTransform(manualInline);

		expect(fragmentResult.warn).not.toHaveBeenCalled();
		expect(inlineResult.warn).not.toHaveBeenCalled();
		expect(extractAssignedObject(fragmentResult.code, "javaSnippet")).toBe(
			extractAssignedObject(inlineResult.code, "javaSnippet"),
		);
	});

	test("keeps dynamic interpolations as placeholders alongside an inlined fragment", async () => {
		const source = [
			mantleImport + 'const policy = mantleCode("yaml")`on_http_request:`;',
			'const javaSnippet = mantleCode("java")`policy: ${policy.code} count: ${count}`;',
		].join("\n");

		const result = await runTransform(source);
		const javaObject = extractAssignedObject(result.code, "javaSnippet");

		expect(result.warn).not.toHaveBeenCalled();
		// Only the dynamic `count` survives as a runtime value; the fragment is inlined.
		expect(javaObject).toContain('"~preVals":[count]');
		expect(javaObject).not.toContain("policy.code");
		expect(javaObject).toContain('"~preValToken":"__MANTLE_PRE_VAL_');
	});

	test("renumbers placeholder indices to skip inlined fragments", async () => {
		const source = [
			mantleImport + 'const policy = mantleCode("yaml")`on_http_request:`;',
			'const javaSnippet = mantleCode("java")`${policy.code} ${first} ${second}`;',
		].join("\n");

		const result = await runTransform(source);
		const javaObject = extractAssignedObject(result.code, "javaSnippet");

		expect(result.warn).not.toHaveBeenCalled();
		// `first`/`second` are the only dynamic values, so tokens must be _0/_1, not _1/_2.
		expect(javaObject).toContain('"~preVals":[first,second]');
		const tokenMatch = javaObject.match(/__MANTLE_PRE_VAL_[a-z0-9]+_/);
		expect(tokenMatch).not.toBeNull();
		const token = tokenMatch?.[0] ?? "";
		expect(javaObject).toContain(`${token}0__`);
		expect(javaObject).toContain(`${token}1__`);
		expect(javaObject).not.toContain(`${token}2__`);
	});

	test("recursively inlines nested fragments", async () => {
		const source = [
			mantleImport + 'const inner = mantleCode("yaml")`type: oauth`;',
			'const outer = mantleCode("yaml")`actions:',
			"  - ${inner.code}`;",
			'const javaSnippet = mantleCode("java")`String tp = """',
			"${outer.code}",
			'""";`;',
		].join("\n");

		const result = await runTransform(source);
		const javaObject = extractAssignedObject(result.code, "javaSnippet");

		expect(result.warn).not.toHaveBeenCalled();
		expect(javaObject).toContain('"~preVals":undefined');
		expect(javaObject).not.toContain("outer.code");
		expect(javaObject).not.toContain("inner.code");
		// `String tp = """`, `actions:`, `  - type: oauth`, `""";` → 4 lines.
		expect(countRenderedLines(javaObject)).toBe(4);
	});

	test("does not inline a fragment declared after the reference (matches runtime order)", async () => {
		const source = [
			mantleImport + 'const javaSnippet = mantleCode("java")`x = ${policy.code};`;',
			'const policy = mantleCode("yaml")`on_http_request:`;',
		].join("\n");

		const result = await runTransform(source);
		const javaObject = extractAssignedObject(result.code, "javaSnippet");

		expect(result.warn).not.toHaveBeenCalled();
		// Forward reference → keep the runtime placeholder path so the no-plugin
		// fallback (a TDZ error) is not silently "fixed" only when the plugin runs.
		expect(javaObject).toContain('"~preVals":[policy.code]');
		expect(javaObject).toContain('"~preValToken":"__MANTLE_PRE_VAL_');
	});

	test("does not inline fragment declarations from nested scopes", async () => {
		const source = [
			mantleImport + 'const policy = { code: "runtime policy" };',
			"function getPolicy() {",
			'\tconst policy = mantleCode("yaml")`inner: true`;',
			"\treturn policy;",
			"}",
			'const snippet = mantleCode("java")`x = ${policy.code};`;',
		].join("\n");

		const result = await runTransform(source);
		const object = extractAssignedObject(result.code, "snippet");

		expect(result.warn).not.toHaveBeenCalled();
		expect(object).toContain('"~preVals":[policy.code]');
		expect(object).toContain('"~preValToken":"__MANTLE_PRE_VAL_');
		expect(object).not.toContain("inner: true");
	});

	test("does not inline an unknown identifier's `.code`", async () => {
		const result = await runTransform(
			mantleImport + 'const snippet = mantleCode("java")`x = ${external.code};`;',
		);
		const object = extractAssignedObject(result.code, "snippet");

		expect(result.warn).not.toHaveBeenCalled();
		expect(object).toContain('"~preVals":[external.code]');
	});

	test("does not inline a bare fragment identifier without `.code`", async () => {
		const source = [
			mantleImport + 'const policy = mantleCode("yaml")`on_http_request:`;',
			'const snippet = mantleCode("java")`x = ${policy};`;',
		].join("\n");

		const result = await runTransform(source);
		const object = extractAssignedObject(result.code, "snippet");

		expect(result.warn).not.toHaveBeenCalled();
		// `.code` is required; a bare value reference stays a runtime expression.
		expect(object).toContain('"~preVals":[policy]');
	});
});

/**
 * Runs the transform on an entry module while resolving the given import specifiers to real
 * temp files, so the plugin's cross-module path (`this.resolve` → `addWatchFile` → `readFile` →
 * parse) is exercised end-to-end. `modules` maps an import specifier to that module's source.
 */
async function runCrossModuleTransform({
	entry,
	modules,
}: {
	entry: string;
	modules: Record<string, string>;
}) {
	const dir = await mkdtemp(join(tmpdir(), "mantle-code-xmod-"));
	try {
		const resolveMap = new Map<string, string>();
		let index = 0;
		for (const [specifier, code] of Object.entries(modules)) {
			const filePath = join(dir, `module-${index}.tsx`);
			index += 1;
			await writeFile(filePath, code, "utf8");
			resolveMap.set(specifier, filePath);
		}

		const warn = vi.fn<(message: string) => void>();
		const addWatchFile = vi.fn<(id: string) => void>();
		const resolve = vi.fn<(source: string) => Promise<{ id: string; external: boolean } | null>>(
			async (source) => {
				const id = resolveMap.get(source);
				return id == null ? null : { id, external: false };
			},
		);

		const plugin = mantleCodeVitePlugin();
		const transform = plugin.transform;
		if (transform == null) {
			throw new Error("vite plugin is missing transform()");
		}
		const transformHandler = typeof transform === "function" ? transform : transform.handler;
		const context = { warn, addWatchFile, resolve };
		const result = await transformHandler.call(context as never, entry, join(dir, "entry.tsx"));

		return {
			code: typeof result === "object" && result != null ? result.code : result,
			warn,
			addWatchFile,
			resolve,
		};
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

const policiesModule = [
	mantleImport + 'export const oauthPolicy = mantleCode("yaml")`on_http_request:',
	"  - actions:",
	"    - type: oauth`;",
].join("\n");

describe("mantleCodeVitePlugin cross-module fragment inlining", () => {
	test("inlines a directly-exported fragment imported by name", async () => {
		const result = await runCrossModuleTransform({
			entry: [
				mantleImport + 'import { oauthPolicy } from "@virtual/policies";',
				'const javaSnippet = mantleCode("java")`String tp = """',
				"${oauthPolicy.code}",
				'""";`;',
			].join("\n"),
			modules: { "@virtual/policies": policiesModule },
		});
		const javaObject = extractAssignedObject(result.code, "javaSnippet");

		expect(result.warn).not.toHaveBeenCalled();
		expect(javaObject).toContain('"~preVals":undefined');
		expect(javaObject).toContain('"~preValToken":undefined');
		expect(javaObject).not.toContain("oauthPolicy");
		expect(countRenderedLines(javaObject)).toBe(5);
		// The fragment module is registered as a watch dependency for HMR/rebuilds.
		expect(result.addWatchFile).toHaveBeenCalled();
	});

	test("resolves aliased imports", async () => {
		const result = await runCrossModuleTransform({
			entry: [
				mantleImport + 'import { oauthPolicy as policy } from "@virtual/policies";',
				'const javaSnippet = mantleCode("java")`x = ${policy.code};`;',
			].join("\n"),
			modules: { "@virtual/policies": policiesModule },
		});
		const javaObject = extractAssignedObject(result.code, "javaSnippet");

		expect(result.warn).not.toHaveBeenCalled();
		expect(javaObject).toContain('"~preVals":undefined');
		expect(javaObject).not.toContain("policy.code");
	});

	test("resolves a fragment exported via an export specifier", async () => {
		const result = await runCrossModuleTransform({
			entry: [
				mantleImport + 'import { policy } from "@virtual/policies";',
				'const snippet = mantleCode("java")`x = ${policy.code};`;',
			].join("\n"),
			modules: {
				"@virtual/policies": [
					mantleImport + 'const policy = mantleCode("yaml")`on_http_request:`;',
					"export { policy };",
				].join("\n"),
			},
		});
		const object = extractAssignedObject(result.code, "snippet");

		expect(result.warn).not.toHaveBeenCalled();
		expect(object).toContain('"~preVals":undefined');
	});

	test("recursively resolves a fragment that nests another fragment in its module", async () => {
		const result = await runCrossModuleTransform({
			entry: [
				mantleImport + 'import { outer } from "@virtual/policies";',
				'const javaSnippet = mantleCode("java")`String tp = """',
				"${outer.code}",
				'""";`;',
			].join("\n"),
			modules: {
				"@virtual/policies": [
					mantleImport + 'const inner = mantleCode("yaml")`type: oauth`;',
					'export const outer = mantleCode("yaml")`actions:',
					"  - ${inner.code}`;",
				].join("\n"),
			},
		});
		const javaObject = extractAssignedObject(result.code, "javaSnippet");

		expect(result.warn).not.toHaveBeenCalled();
		expect(javaObject).toContain('"~preVals":undefined');
		// `String tp = """`, `actions:`, `  - type: oauth`, `""";` → 4 lines.
		expect(countRenderedLines(javaObject)).toBe(4);
	});

	test("warns and falls back when an imported binding is not a static fragment", async () => {
		const result = await runCrossModuleTransform({
			entry: [
				mantleImport + 'import { notAFragment } from "@virtual/values";',
				'const snippet = mantleCode("java")`x = ${notAFragment.code};`;',
			].join("\n"),
			modules: { "@virtual/values": 'export const notAFragment = "hello";' },
		});
		const object = extractAssignedObject(result.code, "snippet");

		expect(result.warn).toHaveBeenCalledWith(
			expect.stringContaining("could not statically inline imported fragment"),
		);
		expect(object).toContain('"~preVals":[notAFragment.code]');
	});

	test("warns and falls back when the imported module cannot be resolved", async () => {
		const result = await runCrossModuleTransform({
			entry: [
				mantleImport + 'import { missing } from "@virtual/missing";',
				'const snippet = mantleCode("java")`x = ${missing.code};`;',
			].join("\n"),
			modules: {},
		});
		const object = extractAssignedObject(result.code, "snippet");

		expect(result.warn).toHaveBeenCalledWith(
			expect.stringContaining("could not statically inline imported fragment"),
		);
		expect(object).toContain('"~preVals":[missing.code]');
	});
});
