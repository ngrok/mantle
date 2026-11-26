#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { dataAttributesFromMdx } from "../packages/mantle/scripts/agent-manifest.ts";

const srcDir = "packages/mantle/src";
const componentsDir = `${srcDir}/components`;
const docsDir = "apps/www/app/docs";

/** The docs page a component's `@see` link names, without its anchor. */
const seeLink = /@see https:\/\/mantle\.ngrok\.com\/((?:components|layouts)\/[a-z0-9/-]+)/g;

/** A source file that renders markup, not a test, a story, or a fixture. */
const sourceFile = /\.tsx?$/;
const nonSourceFile = /\.(?:test|stories|bench|fixtures)\.tsx?$|\/__[a-z]+__\//;

/**
 * The `data-*` attributes a module stamps on an element: a JSX attribute, an
 * object key that a part spreads, an HTML string, or a DOM write. A selector
 * that reads an attribute (`[data-x]`, a `data-x:` class) is not a stamp.
 * Comments are blanked first, so a JSDoc table or an `@example` does not count.
 *
 * @example
 * stampedDataAttributes('<div data-open={open ? "" : undefined} className="data-[side=top]:mt-1" />');
 * // => ["data-open"]
 */
export function stampedDataAttributes(code: string): string[] {
	const stripped = code.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");
	const patterns = [
		/(?<![[\w-])(data-[a-z][a-z0-9-]*)\s*=\s*[{"'`$]/g,
		// A JSX attribute with no value, such as `<div data-input-otp>`, also before a
		// spread or another prop.
		/(?<![[\w:.-])(data-[a-z][a-z0-9-]*)(?=\s*\/?>|\s+(?:[a-zA-Z][\w:-]*\s*(?:=|\/?>)|data-|\{\.\.\.)|\s*\n\s*(?:[a-zA-Z{]|\/?>))/g,
		/["'`](data-[a-z][a-z0-9-]*)["'`]\s*:/g,
		/(?:set|toggle|remove)Attribute\(\s*["'`](data-[a-z][a-z0-9-]*)/g,
		// A constant that a DOM write names, such as `const DRAGGING = "data-dragging"`.
		/\b(?:const|let)\s+\w+\s*=\s*["'`](data-[a-z][a-z0-9-]*)["'`]/g,
	];
	const names = new Set<string>();
	for (const pattern of patterns) {
		for (const match of stripped.matchAll(pattern)) {
			names.add(match[1] ?? "");
		}
	}
	for (const match of stripped.matchAll(/\.dataset\.([a-zA-Z]+)\s*=(?!=)/g)) {
		names.add(`data-${(match[1] ?? "").replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`);
	}
	return [...names].toSorted();
}

/**
 * The attribute names in the first column of every `| Data Attribute |` table
 * in a JSDoc comment.
 *
 * @example
 * jsDocDataAttributes("/**\n * | Data Attribute | Value | Description |\n * | - | - | - |\n * | `data-open` | present | Open. |\n *\/");
 * // => ["data-open"]
 */
export function jsDocDataAttributes(code: string): string[] {
	const names = new Set<string>();
	let inTable = false;
	for (const line of code.split("\n")) {
		const cell = /^\s*\*\s*\|\s*([^|]*?)\s*\|/.exec(line)?.[1];
		if (cell == null) {
			inTable = false;
		} else if (cell === "Data Attribute") {
			inTable = true;
		} else if (inTable && cell.startsWith("`")) {
			names.add(cell.replaceAll("`", ""));
		}
	}
	return [...names].toSorted();
}

/** Every source file under `dir`, recursively. */
function sourceFiles(dir: string): string[] {
	return fs
		.readdirSync(dir, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => path.join(entry.parentPath, entry.name))
		.filter((file) => sourceFile.test(file) && !nonSourceFile.test(file));
}

/** The file a relative import names, or `undefined` when it is not mantle source. */
function resolveImport(from: string, specifier: string): string | undefined {
	// Why the strip: mantle source imports `./x.js` for the file `./x.ts` or `./x.tsx`.
	const base = path.resolve(path.dirname(from), specifier.replace(/\.js$/, ""));
	const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`];
	const found = candidates.find((file) => sourceFile.test(file) && fs.existsSync(file));
	return found == null ? undefined : path.relative(process.cwd(), found);
}

/**
 * Stamps that a source file holds but a component never renders, keyed by
 * component folder, then by the file's path under `components/`. The check
 * follows every private import, so a branch that only another family takes
 * shows up. An entry drops the attribute from that one file only, so a new
 * write elsewhere still needs a row. Each entry says why.
 */
const notRendered: Record<string, Record<string, Record<string, string>>> = {
	"area-chart": { "chart/legend.tsx": { "data-texture": "The swatch of a bar series only." } },
	"line-chart": { "chart/legend.tsx": { "data-texture": "The swatch of a bar series only." } },
	"scatter-plot": { "chart/legend.tsx": { "data-texture": "The swatch of a bar series only." } },
	"world-map": { "chart/legend.tsx": { "data-texture": "The swatch of a bar series only." } },
	"bar-chart": {
		"chart/legend.tsx": { "data-shape": "The swatch of a non-bar series only." },
		"chart/engine.ts": { "data-shape": "The hover dot, which a bar chart never shows." },
	},
	command: {
		"../behaviors/use-listbox.ts": {
			"data-text-value": "`useOption`'s props, which `Command.Item` does not spread.",
		},
	},
	"multi-select": {
		"../behaviors/use-listbox.ts": {
			"data-text-value": "`useOption` with no `textValue`, so React omits the attribute.",
		},
	},
	input: {
		"input/password-manager-ignore.ts": {
			"data-bwignore": "`passwordManagerIgnoreProps`, which a consumer spreads.",
			"data-form-type": "`passwordManagerIgnoreProps`, which a consumer spreads.",
			"data-lpignore": "`passwordManagerIgnoreProps`, which a consumer spreads.",
			"data-protonpass-ignore": "`passwordManagerIgnoreProps`, which a consumer spreads.",
		},
	},
	"otp-input": {
		"input/password-manager-ignore.ts": {
			"data-bwignore": "`OtpInput` spreads only `data-lpignore` from it.",
			"data-form-type": "`OtpInput` spreads only `data-lpignore` from it.",
			"data-protonpass-ignore": "`OtpInput` spreads only `data-lpignore` from it.",
		},
	},
	"selectable-list": {
		"list/primitive.tsx": {
			"data-disabled": "A list row only. `SelectableList` renders grid rows.",
			"data-selected": "A list row only. `SelectableList` renders grid rows.",
		},
	},
	list: {
		"list/primitive.tsx": {
			"data-highlighted":
				"A grid row only. `List` renders list rows; `SelectableList` documents it.",
		},
	},
};

type Gap = { component: string; attribute: string; missing: ("JSDoc" | "docs page")[] };

/**
 * The modules a component's `index.ts` exports from, through its `-parts.ts`
 * re-exports: the public parts, which document their own attributes. Any other
 * module is private, even one with an `@see` link, such as
 * `list/primitive.tsx`, which backs `SelectableList` too.
 */
function publicModules(): Set<string> {
	const queue = fs
		.readdirSync(componentsDir)
		.map((folder) => `${componentsDir}/${folder}/index.ts`)
		.filter((index) => fs.existsSync(index));
	const modules = new Set(queue);
	while (queue.length > 0) {
		const file = queue.pop() ?? "";
		for (const match of fs.readFileSync(file, "utf8").matchAll(/from\s+"(\.{1,2}\/[^"]+)"/g)) {
			const target = resolveImport(file, match[1] ?? "");
			if (target != null && !modules.has(target)) {
				modules.add(target);
				if (target.endsWith("-parts.ts")) {
					queue.push(target);
				}
			}
		}
	}
	return modules;
}

/**
 * Compare the `data-*` attributes each public component stamps with the ones
 * its JSDoc and its docs page's API reference document.
 *
 * A component is a folder under `components/` whose source has an `@see` link
 * to a docs page. Its stamps include each private module it imports: one with
 * no `@see` link, such as a behavior hook, the `chart` folder, or Dialog's
 * `native-primitive`, which Sheet and AlertDialog render too. A module with an
 * `@see` link is another component's public part, which documents its own.
 * `data-slot` is out of scope, since every part carries it (COMPONENT_SPEC.md
 * §3.2).
 */
export function dataAttributeGaps(): Gap[] {
	const folders = fs.readdirSync(componentsDir).toSorted();
	const pagesOf = new Map<string, string[]>();
	for (const folder of folders) {
		const text = sourceFiles(`${componentsDir}/${folder}`)
			.map((file) => fs.readFileSync(file, "utf8"))
			.join("\n");
		const slugs = new Set([...text.matchAll(seeLink)].map((match) => match[1] ?? ""));
		if (slugs.size > 0) {
			pagesOf.set(folder, [...slugs]);
		}
	}
	const publicModule = publicModules();
	const gaps: Gap[] = [];
	for (const [folder, slugs] of pagesOf) {
		const own = sourceFiles(`${componentsDir}/${folder}`);
		const stamped = new Set<string>();
		const exempt = notRendered[folder] ?? {};
		const seen = new Set<string>();
		const queue = [...own];
		while (queue.length > 0) {
			const file = queue.pop() ?? "";
			if (seen.has(file)) {
				continue;
			}
			seen.add(file);
			const code = fs.readFileSync(file, "utf8");
			const skip = exempt[path.relative(componentsDir, file)] ?? {};
			for (const name of stampedDataAttributes(code)) {
				if (!(name in skip)) {
					stamped.add(name);
				}
			}
			// Why not `import type`: a type import renders nothing.
			for (const match of code.matchAll(
				/^\s*(?:import|export)\s+(?!type\s)[^;]*?from\s+"(\.{1,2}\/[^"]+)"/gm,
			)) {
				const target = resolveImport(file, match[1] ?? "");
				if (target != null && !seen.has(target) && !publicModule.has(target)) {
					queue.push(target);
				}
			}
		}
		stamped.delete("data-slot");

		const jsdoc = new Set(
			own.flatMap((file) => jsDocDataAttributes(fs.readFileSync(file, "utf8"))),
		);
		const page = new Set(
			slugs.flatMap((slug) => {
				const file = `${docsDir}/${slug}.mdx`;
				return fs.existsSync(file)
					? dataAttributesFromMdx(fs.readFileSync(file, "utf8")).map((row) => row.name)
					: [];
			}),
		);
		for (const attribute of [...stamped].toSorted()) {
			const missing = [
				...(jsdoc.has(attribute) ? [] : (["JSDoc"] as const)),
				...(page.has(attribute) ? [] : (["docs page"] as const)),
			];
			if (missing.length > 0) {
				gaps.push({ component: folder, attribute, missing });
			}
		}
	}
	return gaps;
}

function cli(): void {
	const gaps = dataAttributeGaps();
	if (gaps.length > 0) {
		console.log(
			gaps
				.map(
					({ component, attribute, missing }) =>
						`${componentsDir}/${component}: \`${attribute}\` is not in the ${missing.join(" or the ")} data-attribute table.`,
				)
				.join("\n"),
		);
		console.log(
			`check:data-attributes: ${gaps.length} undocumented. Add a row to the part's JSDoc table and to its "Data attributes" table in the docs page's API reference (COMPONENT_SPEC.md §6).`,
		);
		process.exitCode = 1;
		return;
	}
	console.log("check:data-attributes: every stamped data attribute is documented.");
}

if (import.meta.main) {
	cli();
}
