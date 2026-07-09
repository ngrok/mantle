import { describe, expect, test } from "vitest";
import { mantleCodeRehypePlugin } from "./mantle-code-rehype-plugin.js";

/**
 * Creates a minimal HAST tree representing a fenced code block:
 * ```<language> <meta>
 * <code>
 * ```
 */
function createCodeFenceTree(language: string, code: string, meta?: string) {
	return {
		type: "root" as const,
		children: [
			{
				type: "element" as const,
				tagName: "pre",
				properties: {} as Record<string, unknown>,
				children: [
					{
						type: "element" as const,
						tagName: "code",
						properties: {
							className: [`language-${language}`],
						},
						data: meta ? { meta } : undefined,
						children: [{ type: "text" as const, value: code }],
					},
				],
			},
		],
	};
}

function getPreNode(tree: ReturnType<typeof createCodeFenceTree>) {
	const node = tree.children[0];
	if (node == null) {
		throw new Error("expected a <pre> node in the tree");
	}
	return node;
}

describe("mantleCodeRehypePlugin", () => {
	test("defaults showLineNumbers to true for non-shell multi-line code", async () => {
		const tree = createCodeFenceTree("typescript", "const a = 1;\nconst b = 2;");
		await mantleCodeRehypePlugin()(tree);

		const pre = getPreNode(tree);
		expect(pre.properties.mantleShowLineNumbers).toBe("true");
		expect(pre.properties.mantlePreHtml).toContain("mantle-code-line-number");
	});

	test("defaults showLineNumbers to false for single-line bash", async () => {
		const tree = createCodeFenceTree("bash", "npm install @ngrok/mantle");
		await mantleCodeRehypePlugin()(tree);

		const pre = getPreNode(tree);
		expect(pre.properties.mantleShowLineNumbers).toBe("false");
		expect(pre.properties.mantlePreHtml).not.toContain("mantle-code-line-number");
	});

	test("defaults showLineNumbers to false for single-line sh", async () => {
		const tree = createCodeFenceTree("sh", "curl -s https://example.com");
		await mantleCodeRehypePlugin()(tree);

		const pre = getPreNode(tree);
		expect(pre.properties.mantleShowLineNumbers).toBe("false");
	});

	test("defaults showLineNumbers to false for single-line shell", async () => {
		const tree = createCodeFenceTree("shell", "echo hello");
		await mantleCodeRehypePlugin()(tree);

		const pre = getPreNode(tree);
		expect(pre.properties.mantleShowLineNumbers).toBe("false");
	});

	test("defaults showLineNumbers to true for multi-line bash", async () => {
		const tree = createCodeFenceTree("bash", "echo hello\necho world");
		await mantleCodeRehypePlugin()(tree);

		const pre = getPreNode(tree);
		expect(pre.properties.mantleShowLineNumbers).toBe("true");
		expect(pre.properties.mantlePreHtml).toContain("mantle-code-line-number");
	});

	test("meta showLineNumbers=true overrides single-line shell default", async () => {
		const tree = createCodeFenceTree("bash", "npm install @ngrok/mantle", "showLineNumbers=true");
		await mantleCodeRehypePlugin()(tree);

		const pre = getPreNode(tree);
		expect(pre.properties.mantleShowLineNumbers).toBe("true");
		expect(pre.properties.mantlePreHtml).toContain("mantle-code-line-number");
	});

	test("meta showLineNumbers=false overrides multi-line default", async () => {
		const tree = createCodeFenceTree(
			"typescript",
			"const a = 1;\nconst b = 2;",
			"showLineNumbers=false",
		);
		await mantleCodeRehypePlugin()(tree);

		const pre = getPreNode(tree);
		expect(pre.properties.mantleShowLineNumbers).toBe("false");
		expect(pre.properties.mantlePreHtml).not.toContain("mantle-code-line-number");
	});

	test("property showLineNumbers overrides single-line shell default", async () => {
		const tree = createCodeFenceTree("bash", "npm install @ngrok/mantle");
		getPreNode(tree).properties.showLineNumbers = "true";
		await mantleCodeRehypePlugin()(tree);

		const pre = getPreNode(tree);
		expect(pre.properties.mantleShowLineNumbers).toBe("true");
	});

	test("meta collapsible (bare flag) enables collapsible", async () => {
		const tree = createCodeFenceTree("typescript", "const a = 1;", "collapsible");
		await mantleCodeRehypePlugin()(tree);

		const pre = getPreNode(tree);
		expect(pre.properties.mantleCollapsible).toBe("true");
	});

	test("meta collapsible=true (key=value) enables collapsible", async () => {
		const tree = createCodeFenceTree("typescript", "const a = 1;", "collapsible=true");
		await mantleCodeRehypePlugin()(tree);

		const pre = getPreNode(tree);
		expect(pre.properties.mantleCollapsible).toBe("true");
	});

	test("meta collapsible=false (key=value) explicitly disables collapsible", async () => {
		const tree = createCodeFenceTree("typescript", "const a = 1;", "collapsible=false");
		await mantleCodeRehypePlugin()(tree);

		const pre = getPreNode(tree);
		expect(pre.properties.mantleCollapsible).toBe("false");
	});

	test(`meta collapsible="true" (quoted) enables collapsible`, async () => {
		const tree = createCodeFenceTree("typescript", "const a = 1;", 'collapsible="true"');
		await mantleCodeRehypePlugin()(tree);

		const pre = getPreNode(tree);
		expect(pre.properties.mantleCollapsible).toBe("true");
	});

	test("meta disableCopy (bare flag) disables copy", async () => {
		const tree = createCodeFenceTree("typescript", "const a = 1;", "disableCopy");
		await mantleCodeRehypePlugin()(tree);

		const pre = getPreNode(tree);
		expect(pre.properties.mantleDisableCopy).toBe("true");
	});

	test("meta disableCopy=false explicitly enables copy", async () => {
		const tree = createCodeFenceTree("typescript", "const a = 1;", "disableCopy=false");
		await mantleCodeRehypePlugin()(tree);

		const pre = getPreNode(tree);
		expect(pre.properties.mantleDisableCopy).toBe("false");
	});

	test("meta with duplicate title keys uses the last value (matches parseMetastring)", async () => {
		const tree = createCodeFenceTree("typescript", "const a = 1;", 'title="first" title="second"');
		await mantleCodeRehypePlugin()(tree);

		const pre = getPreNode(tree);
		expect(pre.properties.mantleTitle).toBe("second");
	});

	test("meta with duplicate showLineNumbers keys uses the last value", async () => {
		const tree = createCodeFenceTree(
			"typescript",
			"const a = 1;\nconst b = 2;",
			"showLineNumbers=true showLineNumbers=false",
		);
		await mantleCodeRehypePlugin()(tree);

		const pre = getPreNode(tree);
		expect(pre.properties.mantleShowLineNumbers).toBe("false");
	});

	test("meta tokens separated by tabs are parsed as distinct tokens", async () => {
		const tree = createCodeFenceTree("typescript", "const a = 1;", 'title="Tabby"\tcollapsible');
		await mantleCodeRehypePlugin()(tree);

		const pre = getPreNode(tree);
		expect(pre.properties.mantleTitle).toBe("Tabby");
		expect(pre.properties.mantleCollapsible).toBe("true");
	});
});
