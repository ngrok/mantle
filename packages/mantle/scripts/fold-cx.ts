import path from "node:path";
import { pathToFileURL } from "node:url";
import { type Argument, type ImportDeclaration, parseSync, Visitor } from "oxc-parser";

/** Merges a class list the way `cx` does in the browser. */
export type MergeClassList = (classList: string) => string;

/** A static class value: a string, or a condition that picks between two static values. */
type StaticValue = string | Choice;

/** A condition, as source text, and the class values it picks between. */
type Choice = { condition: string; whenTrue: StaticValue; whenFalse: StaticValue };

/** Most class lists that one folded call can pick from; more conditions stay a runtime call. */
const MAX_CHOICES = 8;

/** Matches the import specifier of mantle's `cx` module. */
const CX_MODULE_RE = /(?:^|\/)utils\/cx\/(?:cx|index)\.js$/;

/** Counts the class lists that a static value can produce. */
const countChoices = (value: StaticValue): number =>
	typeof value === "string" ? 1 : countChoices(value.whenTrue) + countChoices(value.whenFalse);

/**
 * Reads a class value whose classes the build knows, or returns `null`. A condition stays
 * source text, so the fold can evaluate it at runtime.
 */
function readStatic(node: Argument, code: string): StaticValue | null {
	switch (node.type) {
		case "ParenthesizedExpression":
			return readStatic(node.expression, code);
		case "Literal":
			if (typeof node.value === "string") {
				return node.value;
			}
			return node.value == null || node.value === false ? "" : null;
		case "TemplateLiteral":
			return node.expressions.length === 0 ? (node.quasis[0]?.value.cooked ?? null) : null;
		case "Identifier":
			return node.name === "undefined" ? "" : null;
		case "ConditionalExpression": {
			const whenTrue = readStatic(node.consequent, code);
			const whenFalse = readStatic(node.alternate, code);
			const condition = code.slice(node.test.start, node.test.end);
			return whenTrue == null || whenFalse == null ? null : { condition, whenTrue, whenFalse };
		}
		case "LogicalExpression": {
			// clsx drops the falsy left operand, so `a && "x"` is `a ? "x" : ""`.
			const whenTrue = node.operator === "&&" ? readStatic(node.right, code) : null;
			const condition = code.slice(node.left.start, node.left.end);
			return whenTrue == null ? null : { condition, whenTrue, whenFalse: "" };
		}
		default:
			return null;
	}
}

/**
 * Writes an expression that evaluates each condition and returns the merged class list.
 * Each leaf is a string literal that the build merged.
 */
function emitChoices(values: readonly StaticValue[], merge: MergeClassList): string {
	const index = values.findIndex((value) => typeof value !== "string");
	const choice = values[index];
	if (choice == null || typeof choice === "string") {
		return JSON.stringify(merge(values.filter((value) => typeof value === "string").join(" ")));
	}
	const branch = (value: StaticValue) => values.map((item, at) => (at === index ? value : item));
	return `((${choice.condition}) ? ${emitChoices(branch(choice.whenTrue), merge)} : ${emitChoices(
		branch(choice.whenFalse),
		merge,
	)})`;
}

/** One source edit: replace `[start, end)` with `text`. */
type Edit = { start: number; end: number; text: string };

/**
 * Folds the static `cx` calls of a mantle module at build time, so the browser merges only
 * the class names it cannot know, such as `className`. Returns the new source, or `null`
 * when no call changes.
 *
 * - All static arguments become one merged string literal.
 * - Static arguments with conditions become a conditional expression that picks a merged
 *   string literal, when the call has at most {@link MAX_CHOICES} results.
 * - Static arguments and one last dynamic argument, such as `className`, become
 *   `cxFolded("<merged>", className)`, which returns the merged string when `className`
 *   is empty and merges only when it is set.
 *
 * Why it is safe: a condition stays in the code and runs at runtime, so only the class
 * strings move to build time. Each edit keeps the line count, so stack traces in tests
 * point to the source line.
 *
 * @example
 * foldCx('import { cx } from "../../utils/cx/cx.js";\ncx("p-2 p-4", className);', "a.tsx", mergeClassList);
 * // => 'import { cx } from "../../utils/cx/cx.js"; import { cxFolded } from "../../utils/cx/cx.js";\ncxFolded("p-4", className);'
 */
export function foldCx(code: string, id: string, merge: MergeClassList): string | null {
	if (!code.includes("cx(")) {
		return null;
	}
	const { program, errors } = parseSync(id, code, { lang: "tsx" });
	if (errors.length > 0) {
		return null;
	}
	const cxImport = program.body.find(
		(statement): statement is ImportDeclaration =>
			statement.type === "ImportDeclaration" &&
			CX_MODULE_RE.test(statement.source.value) &&
			statement.specifiers.some(
				(specifier) =>
					specifier.type === "ImportSpecifier" &&
					specifier.local.name === "cx" &&
					(specifier.imported.type === "Identifier" ? specifier.imported.name : "") === "cx",
			),
	);
	if (cxImport == null) {
		return null;
	}
	const edits: Edit[] = [];
	let usesFolded = false;
	new Visitor({
		CallExpression(node) {
			const isInsideEdit = edits.some((edit) => node.start >= edit.start && node.end <= edit.end);
			if (isInsideEdit || node.callee.type !== "Identifier" || node.callee.name !== "cx") {
				return;
			}
			const last = node.arguments.at(-1);
			const dynamicLast = last != null && readStatic(last, code) == null ? last : null;
			const staticArgs = dynamicLast == null ? node.arguments : node.arguments.slice(0, -1);
			const values: StaticValue[] = [];
			let choices = 1;
			for (const arg of staticArgs) {
				const value = readStatic(arg, code);
				if (value == null) {
					return;
				}
				values.push(value);
				choices *= countChoices(value);
			}
			if (choices > MAX_CHOICES) {
				return;
			}
			let text = emitChoices(values, merge);
			if (dynamicLast != null) {
				if (dynamicLast.type === "SpreadElement" || values.length === 0) {
					return;
				}
				text = `cxFolded(${text}, ${code.slice(dynamicLast.start, dynamicLast.end)})`;
				usesFolded = true;
			}
			const lines = code.slice(node.start, node.end).split("\n").length - 1;
			edits.push({ start: node.start, end: node.end, text: text + "\n".repeat(lines) });
		},
	}).visit(program);

	if (edits.length === 0) {
		return null;
	}
	let result = code;
	// The visitor reaches calls in source order.
	for (const edit of edits.toReversed()) {
		result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
	}
	if (!usesFolded) {
		return result;
	}
	// The fold edits only code after the imports, so the import's offset still holds.
	const specifier = JSON.stringify(cxImport.source.value);
	return `${result.slice(0, cxImport.end)} import { cxFolded } from ${specifier};${result.slice(cxImport.end)}`;
}

/** Matches the mantle source modules the fold transforms. */
const FOLD_SOURCE_RE = /[\\/]src[\\/].+\.tsx?$/;

/** Matches the modules the fold skips: tests, stories, declarations, and `cx` itself. */
const FOLD_EXCLUDE_RE = /\.(?:test|bench|stories)\.tsx?$|\.d\.[cm]?ts$|[\\/]utils[\\/]cx[\\/]/;

/** Loads mantle's merge from source. */
export const loadMergeClassList = async (): Promise<MergeClassList> => {
	// Why a runtime import: the node tsconfig must not include `src` modules. The main tsconfig
	// references it, so an overlap makes the main project read the node project's stale output.
	const module: { mergeClassList: MergeClassList } = await import(
		pathToFileURL(path.join(import.meta.dirname, "../src/utils/cx/merge.ts")).href
	);
	return module.mergeClassList;
};

/**
 * A rolldown and Vite plugin that runs {@link foldCx} over mantle source. Put it before the
 * React Compiler pass, which must see the folded code.
 */
export const foldCxPlugin = () => {
	let merge: Promise<MergeClassList> | undefined;
	return {
		name: "fold-cx",
		enforce: "pre" as const,
		transform: {
			filter: { id: { include: FOLD_SOURCE_RE, exclude: FOLD_EXCLUDE_RE } },
			handler: async (code: string, id: string) => {
				merge ??= loadMergeClassList();
				const folded = foldCx(code, id, await merge);
				return folded == null ? null : { code: folded, map: null };
			},
		},
	};
};
