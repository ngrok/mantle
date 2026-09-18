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

// Why literals: a row read from `ROUTE_MODULE_EXPORTS` cannot see a dropped entry.
test.each([
	"action",
	"clientAction",
	"clientLoader",
	"clientMiddleware",
	"handle",
	"headers",
	"links",
	"loader",
	"meta",
	"middleware",
	"shouldRevalidate",
])("keeps React Router's route-module export %s", (name) => {
	const types = transformedStatementTypes(`export const ${name} = null;`);
	expect(types).toEqual(["ExportNamedDeclaration"]);
});

test("keeps re-exports and leaves imports untouched", () => {
	const types = transformedStatementTypes(
		['import { thing } from "./thing";', "", 'export { widget } from "./widget";'].join("\n"),
	);
	expect(types).toEqual(["ImportDeclaration", "ExportNamedDeclaration"]);
});
