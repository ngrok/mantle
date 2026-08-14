import type { Root } from "hast";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { expect, test } from "vitest";
import { rehypeMdxDocHandle } from "./rehype-mdx-doc-handle";

/** Parse MDX source and return its first ESM node (shared by mdast and hast). */
function mdxEsmNode(source: string) {
	const tree = unified().use(remarkParse).use(remarkMdx).parse(source);
	const node = tree.children.find((child) => child.type === "mdxjsEsm");
	if (!node) {
		throw new Error(`No mdxjsEsm node in: ${source}`);
	}
	return node;
}

function headingNode(id: string, text: string): Root["children"][number] {
	return {
		type: "element",
		tagName: "h2",
		properties: { id },
		children: [{ type: "text", value: text }],
	};
}

/** Dig to the injected `handle` declarator, asserting each step of the shape. */
function injectedHandleDeclarator(tree: Root) {
	const first = tree.children[0];
	if (first?.type !== "mdxjsEsm") {
		throw new Error("Expected an injected mdxjsEsm node at the tree root");
	}
	const statement = first.data?.estree?.body[0];
	if (statement?.type !== "ExportNamedDeclaration") {
		throw new Error("Expected an export declaration");
	}
	const declaration = statement.declaration;
	if (declaration?.type !== "VariableDeclaration") {
		throw new Error("Expected a const declaration");
	}
	const declarator = declaration.declarations[0];
	if (declarator == null) {
		throw new Error("Expected a declarator");
	}
	const { id, init } = declarator;
	if (id.type !== "Identifier") {
		throw new Error("Expected an identifier binding");
	}
	return { id, init };
}

test("injects an `export const handle` with frontmatter and toc", () => {
	const tree: Root = { type: "root", children: [headingNode("usage", "Usage")] };
	const file = { data: { frontmatter: { title: "Button" } } };

	rehypeMdxDocHandle()(tree, file);

	const injected = injectedHandleDeclarator(tree);
	expect(injected.id.name).toBe("handle");

	// The literal carries both halves: the parsed frontmatter and the
	// heading's id/text collected into the toc.
	const serialized = JSON.stringify(injected.init);
	expect(serialized).toContain('"frontmatter"');
	expect(serialized).toContain('"Button"');
	expect(serialized).toContain('"toc"');
	expect(serialized).toContain('"usage"');
	expect(serialized).toContain('"Usage"');
});

test("falls back to an empty frontmatter object when the file has none", () => {
	const tree: Root = { type: "root", children: [] };

	rehypeMdxDocHandle()(tree, { data: {} });

	const injected = injectedHandleDeclarator(tree);
	if (injected.init?.type !== "ObjectExpression") {
		throw new Error("Expected an object literal init");
	}
	const frontmatterProperty = injected.init.properties.find(
		(property) =>
			property.type === "Property" &&
			((property.key.type === "Literal" && property.key.value === "frontmatter") ||
				(property.key.type === "Identifier" && property.key.name === "frontmatter")),
	);
	if (frontmatterProperty?.type !== "Property") {
		throw new Error("Expected a frontmatter property");
	}
	// Without the plugin's `?? {}`, absent frontmatter serializes as
	// `undefined`, and every doc-page loader 500s on the schema check.
	expect(frontmatterProperty.value).toMatchObject({ type: "ObjectExpression", properties: [] });
});

test("throws when the doc already declares a `handle` binding", () => {
	const tree: Root = {
		type: "root",
		children: [mdxEsmNode("export const handle = { breadcrumb: 'Endpoints' };")],
	};

	expect(() => rehypeMdxDocHandle()(tree, { data: {}, path: "docs/example.mdx" })).toThrow(
		/handle.*docs\/example\.mdx/,
	);
});

test("throws when the doc imports a `handle` binding", () => {
	const tree: Root = {
		type: "root",
		children: [mdxEsmNode('import { handle } from "./shared";')],
	};

	expect(() => rehypeMdxDocHandle()(tree, { data: {} })).toThrow(/handle/);
});

test("throws when the doc re-exports another binding as `handle`", () => {
	const tree: Root = {
		type: "root",
		children: [mdxEsmNode('export { docHandle as handle } from "./shared";')],
	};

	expect(() => rehypeMdxDocHandle()(tree, { data: {} })).toThrow(/handle/);
});

test("throws when the doc binds `handle` through a destructuring pattern", () => {
	const tree: Root = {
		type: "root",
		children: [mdxEsmNode("export const { handle } = pageConfig;")],
	};

	expect(() => rehypeMdxDocHandle()(tree, { data: {} })).toThrow(/handle/);
});

test("throws when the doc exports a route-module export like `meta`", () => {
	const tree: Root = {
		type: "root",
		children: [mdxEsmNode("export const meta = { title: 'Endpoints' };")],
	};

	expect(() => rehypeMdxDocHandle()(tree, { data: {}, path: "docs/example.mdx" })).toThrow(
		/meta.*docs\/example\.mdx/,
	);
});
