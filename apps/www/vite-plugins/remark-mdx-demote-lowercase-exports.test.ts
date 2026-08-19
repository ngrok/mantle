import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { expect, test } from "vitest";
import { remarkMdxDemoteLowercaseExports } from "./remark-mdx-demote-lowercase-exports";

/**
 * Parse MDX source and run the demotion transform, returning the statement
 * types of every top-level ESM statement in document order.
 */
function transformedStatementTypes(source: string): string[] {
	const tree = unified().use(remarkParse).use(remarkMdx).parse(source);
	remarkMdxDemoteLowercaseExports()(tree);
	const types: string[] = [];
	for (const child of tree.children) {
		if (child.type !== "mdxjsEsm") {
			continue;
		}
		const estree = child.data?.estree;
		if (!estree) {
			continue;
		}
		for (const statement of estree.body) {
			types.push(statement.type);
		}
	}
	return types;
}

test("demotes a lowercase const export to a plain declaration", () => {
	const types = transformedStatementTypes("export const invoices = [1, 2, 3];");
	expect(types).toEqual(["VariableDeclaration"]);
});

test("demotes a lowercase function export to a plain declaration", () => {
	const types = transformedStatementTypes(
		"export function seededRequests(count) { return count; }",
	);
	expect(types).toEqual(["FunctionDeclaration"]);
});

test("keeps a PascalCase component export", () => {
	const types = transformedStatementTypes("export function ExampleTable() { return null; }");
	expect(types).toEqual(["ExportNamedDeclaration"]);
});

test("demotes an underscore-prefixed export", () => {
	const types = transformedStatementTypes("export const _seededRows = [1, 2, 3];");
	expect(types).toEqual(["VariableDeclaration"]);
});

test("keeps an all-caps constant export, which reads as a component by name", () => {
	const types = transformedStatementTypes("export const CHART_DATA = [1, 2, 3];");
	expect(types).toEqual(["ExportNamedDeclaration"]);
});

test("keeps a PascalCase arrow component export", () => {
	const types = transformedStatementTypes("export const DynamicColorsExample = () => null;");
	expect(types).toEqual(["ExportNamedDeclaration"]);
});

test("handles each statement independently within one block", () => {
	const types = transformedStatementTypes(
		[
			"export const formSchema = {};",
			"",
			"export function TanStackFormExample() { return null; }",
		].join("\n"),
	);
	expect(types).toEqual(["VariableDeclaration", "ExportNamedDeclaration"]);
});

test("keeps a mixed-case multi-declarator export intact", () => {
	const types = transformedStatementTypes("export const rows = [], Table = () => null;");
	expect(types).toEqual(["ExportNamedDeclaration"]);
});

test("keeps a destructuring export intact", () => {
	const types = transformedStatementTypes("export const { rows } = { rows: [] };");
	expect(types).toEqual(["ExportNamedDeclaration"]);
});

test("keeps React Router's lowercase route-module exports", () => {
	const types = transformedStatementTypes(
		[
			"export const meta = () => [];",
			"",
			"export function loader() { return null; }",
			"",
			"export const shouldRevalidate = () => false;",
		].join("\n"),
	);
	expect(types).toEqual([
		"ExportNamedDeclaration",
		"ExportNamedDeclaration",
		"ExportNamedDeclaration",
	]);
});

test("keeps re-exports and leaves imports untouched", () => {
	const types = transformedStatementTypes(
		['import { thing } from "./thing";', "", 'export { widget } from "./widget";'].join("\n"),
	);
	expect(types).toEqual(["ImportDeclaration", "ExportNamedDeclaration"]);
});

test("ignores export-shaped text inside code fences", () => {
	const source = ["```ts", "export const invoices = [];", "```"].join("\n");
	const tree = unified().use(remarkParse).use(remarkMdx).parse(source);

	remarkMdxDemoteLowercaseExports()(tree);

	// The fence parses as a `code` node, never as ESM, so the plugin has no
	// statement to rewrite. The fenced text survives verbatim.
	const codeNode = tree.children.find((child) => child.type === "code");
	if (codeNode?.type !== "code") {
		throw new Error("Expected the fence to parse as a code node");
	}
	expect(codeNode.value).toBe("export const invoices = [];");
	expect(tree.children.some((child) => child.type === "mdxjsEsm")).toBe(false);
});
