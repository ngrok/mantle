// @vitest-environment happy-dom
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { Nodes } from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { MemoryRouter } from "react-router";
import { unified } from "unified";
import { describe, expect, it } from "vitest";
import { hydrationErrorsOf } from "~/test-utils/hydration";
import { exampleExportName, isComponentType, parsePageExampleKey } from "./page-examples";

/**
 * Every docs page example renders in its own preview document, so the page
 * hydration sweep no longer reaches it. These tests read each page's
 * `<Example name="…">` keys,
 * check that each names a component in the page's examples module, and hydrate
 * that component the way the preview route renders it.
 */
// Why fs, not a `?raw` glob: the MDX plugin compiles `.mdx` imports even with `?raw`.
const docsDirectory = path.resolve(import.meta.dirname, "../docs");
const readDocs = (file: string) => readFileSync(path.join(docsDirectory, file), "utf8");
const modules = import.meta.glob<Record<string, unknown>>("../docs/**/*.examples.tsx", {
	eager: true,
});
/** Every `.mdx` page under `app/docs`, relative to it. */
function docsPages(): ReadonlyArray<string> {
	return readdirSync(docsDirectory, { recursive: true, encoding: "utf8" })
		.filter((file) => file.endsWith(".mdx"))
		.toSorted();
}

const parser = unified().use(remarkParse).use(remarkFrontmatter).use(remarkGfm).use(remarkMdx);

/** Each `<Example>` in the docs with no `name` or `title`. */
function malformedFrames(): ReadonlyArray<string> {
	const out: Array<string> = [];
	for (const page of docsPages()) {
		const visit = (node: Nodes) => {
			if (node.type === "mdxJsxFlowElement" && node.name === "Example") {
				const has = (name: string) =>
					node.attributes.some(
						(attr) =>
							attr.type === "mdxJsxAttribute" &&
							attr.name === name &&
							typeof attr.value === "string",
					);
				if (!has("name") || !has("title")) {
					out.push(`${page}:${node.position?.start.line ?? 0}`);
				}
			}
			if ("children" in node) {
				node.children.forEach(visit);
			}
		};
		visit(parser.parse(readDocs(page)));
	}
	return out;
}

/** Each page example key a docs page renders, with the page it is on. */
function pageExampleKeys(): ReadonlyArray<{ page: string; key: string }> {
	const keys: Array<{ page: string; key: string }> = [];
	for (const page of docsPages()) {
		const visit = (node: Nodes) => {
			if (node.type === "mdxJsxFlowElement" && node.name === "Example") {
				const attribute = node.attributes.find(
					(attr) => attr.type === "mdxJsxAttribute" && attr.name === "name",
				);
				const key = typeof attribute?.value === "string" ? attribute.value : null;
				if (key?.includes("/")) {
					keys.push({ page, key });
				}
			}
			if ("children" in node) {
				node.children.forEach(visit);
			}
		};
		visit(parser.parse(readDocs(page)));
	}
	return keys;
}

const keys = pageExampleKeys();

describe("docs page examples", () => {
	it.for(keys)("$key is on its own page and names a component", ({ page, key }) => {
		expect(`${key.slice(0, key.lastIndexOf("/"))}.mdx`).toBe(page);
		const ref = parsePageExampleKey(key);
		expect(ref).not.toBeNull();
		expect(isComponentType(ref && modules[ref.modulePath]?.[ref.exportName])).toBe(true);
	});

	it.for(keys)("$key hydrates without a mismatch", ({ key }) => {
		const ref = parsePageExampleKey(key);
		const Example = ref == null ? null : modules[ref.modulePath]?.[ref.exportName];
		if (!isComponentType(Example)) {
			throw new Error(`${key} names no component.`);
		}
		expect(
			hydrationErrorsOf(
				<MemoryRouter initialEntries={[`/preview/${key}`]}>
					<Example />
				</MemoryRouter>,
			),
		).toEqual([]);
	});

	it("every example export is on its page or used by another example", () => {
		const used = new Set(
			keys.map(({ key }) => {
				const ref = parsePageExampleKey(key);
				return ref == null ? key : `${ref.modulePath}#${ref.exportName}`;
			}),
		);
		const orphans: Array<string> = [];
		for (const [modulePath, module] of Object.entries(modules)) {
			const source = readDocs(modulePath.replace(/^\.\.\/docs\//, ""));
			for (const exportName of Object.keys(module).filter((name) => name.endsWith("Example"))) {
				const usedInModule = source.split(exportName).length > 2;
				if (!used.has(`${modulePath}#${exportName}`) && !usedInModule) {
					orphans.push(`${modulePath}#${exportName}`);
				}
			}
		}
		expect(orphans).toEqual([]);
	});

	it("gives every <Example> a name and a title", () => {
		expect(malformedFrames()).toEqual([]);
	});

	it("names an example export from its key", () => {
		expect(exampleExportName("with-icon")).toBe("WithIconExample");
	});
});
