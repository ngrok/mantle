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
 * Each leaf is a string literal that the build merged. With `isExact`, it returns `null` when
 * the merge removes a class from a leaf.
 *
 * Why `isExact` for a call with `className`: conflicts are not transitive. In
 * `cx("p-4 sr-only", "not-sr-only")`, `not-sr-only` removes `sr-only`, so `sr-only` no longer
 * removes `p-4`. A merged prefix would have lost `p-4` already.
 */
function emitChoices(
	values: readonly StaticValue[],
	merge: MergeClassList,
	{ isExact }: { isExact: boolean },
): string | null {
	const index = values.findIndex((value) => typeof value !== "string");
	const choice = values[index];
	if (choice == null || typeof choice === "string") {
		const classList = values
			.filter((value) => typeof value === "string")
			.join(" ")
			.trim()
			.split(/\s+/)
			.filter(Boolean)
			.join(" ");
		const merged = merge(classList);
		return isExact && merged !== classList ? null : JSON.stringify(merged);
	}
	const branch = (value: StaticValue) => values.map((item, at) => (at === index ? value : item));
	const whenTrue = emitChoices(branch(choice.whenTrue), merge, { isExact });
	const whenFalse = emitChoices(branch(choice.whenFalse), merge, { isExact });
	return whenTrue == null || whenFalse == null
		? null
		: `((${choice.condition}) ? ${whenTrue} : ${whenFalse})`;
}

/** Counts the line breaks in `text`. */
const countLines = (text: string) => text.split("\n").length - 1;

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
 *   `cxFolded("<merged>", className)` when the merge removes no static class.
 *   `cxFolded` returns the string when `className` is empty and merges only when it is set.
 *
 * A module where `cx` or `cxFolded` may name a local binding stays as written.
 *
 * Why it is safe: a condition stays in the code and runs at runtime, so only the class
 * strings move to build time. Each edit keeps the line count, so stack traces in tests
 * point to the source line.
 *
 * @example
 * foldCx('import { cx } from "../../utils/cx/cx.js";\ncx("flex  p-4", className);', "a.tsx", mergeClassList);
 * // => 'import { cxFolded } from "../../utils/cx/cx.js"; import { cx } from "../../utils/cx/cx.js";\ncxFolded("flex p-4", className);'
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
	// Identifiers that are the import or a callee. Any other `cx` may be a local binding that
	// shadows the import, so the module stays as written.
	const knownCx = new Set<number>();
	for (const specifier of cxImport.specifiers) {
		knownCx.add(specifier.local.start);
		if (specifier.type === "ImportSpecifier") {
			knownCx.add(specifier.imported.start);
		}
	}
	let isShadowed = false;
	new Visitor({
		Identifier(node) {
			// A local `cxFolded` would capture the helper that the fold calls.
			isShadowed ||= node.name === "cxFolded" || (node.name === "cx" && !knownCx.has(node.start));
		},
		CallExpression(node) {
			if (node.callee.type !== "Identifier" || node.callee.name !== "cx") {
				return;
			}
			knownCx.add(node.callee.start);
			if (edits.some((edit) => node.start >= edit.start && node.end <= edit.end)) {
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
			const merged = emitChoices(values, merge, { isExact: dynamicLast != null });
			if (merged == null) {
				return;
			}
			let text = merged;
			if (dynamicLast != null) {
				if (dynamicLast.type === "SpreadElement" || values.length === 0) {
					return;
				}
				text = `cxFolded(${text}, ${code.slice(dynamicLast.start, dynamicLast.end)})`;
			}
			// A condition or the last argument can carry newlines into `text`. Pad the rest, and
			// leave a call alone when `text` has more lines than the call it replaces.
			const padding = countLines(code.slice(node.start, node.end)) - countLines(text);
			if (padding < 0) {
				return;
			}
			edits.push({ start: node.start, end: node.end, text: text + "\n".repeat(padding) });
		},
	}).visit(program);

	if (isShadowed || edits.length === 0) {
		return null;
	}
	if (edits.some((edit) => edit.text.startsWith("cxFolded("))) {
		// Why `cx.js`: the `utils/cx` barrel does not export the helper. The import goes in front of
		// the `cx` import, on the same line, so each later line keeps its number.
		const specifier = JSON.stringify(cxImport.source.value.replace(/index\.js$/, "cx.js"));
		edits.push({
			start: cxImport.start,
			end: cxImport.start,
			text: `import { cxFolded } from ${specifier}; `,
		});
	}
	let result = code;
	for (const edit of edits.toSorted((first, second) => second.start - first.start)) {
		result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
	}
	return result;
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
