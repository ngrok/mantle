import { finalizeFoldRanges, type FoldableRange } from "@ngrok/mantle/highlight-utils";
import { createRequire } from "node:module";
import type * as OxcParserModule from "oxc-parser";
import type { ParserOptions } from "oxc-parser";
import { buildLineOffsets, offsetToLine } from "./line-offsets.js";

/**
 * Loads `oxc-parser` lazily on first use. Eager `import` of oxc-parser runs
 * its napi-rs bootstrap (`bindings.js`), which `throw`s synchronously when the
 * platform-specific native binding (`@oxc-parser/binding-*`) isn't resolvable
 * — common on serverless hosts that ship the bundled JS without the binding
 * package alongside it. A throw at module-eval time would propagate through
 * the entire server bundle's import graph and 500 every route, not just
 * JSX/TSX folding. Deferring the load until folding runs lets this strategy
 * convert the failure into a cached "no folds" fallback while keeping every
 * other strategy working.
 */
type OxcParser = typeof OxcParserModule;
const requireOxc = createRequire(import.meta.url);

/** Creates a memoized parser loader that caches both success and load failure. */
function createOxcParserLoader(load: () => OxcParser): () => OxcParser | undefined {
	let cachedOxcParser: OxcParser | undefined;
	let didFailToLoadOxcParser = false;

	return () => {
		if (cachedOxcParser != null) {
			return cachedOxcParser;
		}
		if (didFailToLoadOxcParser) {
			return undefined;
		}
		let oxcParser: OxcParser;
		try {
			oxcParser = load();
		} catch {
			didFailToLoadOxcParser = true;
			return undefined;
		}
		cachedOxcParser = oxcParser;
		return oxcParser;
	};
}

/** Returns the lazily-resolved `oxc-parser` module, or undefined after a cached load failure. */
const loadOxcParser = createOxcParserLoader(() => requireOxc("oxc-parser") as OxcParser);

/**
 * AST-based fold computer for the JS/TS/JSX/TSX language family.
 *
 * Mirrors VS Code's TypeScript language service folder by walking the parsed
 * AST instead of pairing brackets in the token stream. This lets us fold
 * constructs that bracket-pairing can't see:
 *
 * - JSX elements (`<Foo>…</Foo>`, fragments, members like `<obj.Foo>`).
 * - Template literals that span multiple lines (including tagged templates).
 *
 * It also keeps every fold the bracket strategy used to give us — block
 * statements, object literals, array literals, class/interface bodies, switch
 * statements — without the per-character scope-walk cost.
 *
 * @see https://github.com/microsoft/vscode/blob/main/extensions/typescript-language-features/src/languageFeatures/folding.ts
 */

/** Subset of supported languages handled by this computer. */
type JsxFoldLanguage = "javascript" | "js" | "typescript" | "ts" | "jsx" | "tsx";

/**
 * Maps a Mantle language to the oxc-parser `lang` option. JavaScript keeps
 * JSX enabled so JSX-in-JS examples still fold, but TypeScript must stay in
 * plain `ts` mode: TSX parses generic arrow functions (`<T>(x: T) => ...`) as
 * JSX and drops the AST folds for otherwise-valid TypeScript snippets.
 */
function oxcLangFor(language: JsxFoldLanguage): "jsx" | "ts" | "tsx" {
	switch (language) {
		case "tsx":
			return "tsx";
		case "typescript":
		case "ts":
			return "ts";
		case "jsx":
		case "javascript":
		case "js":
			return "jsx";
	}
}

/** Minimal AST node shape — every oxc node carries `type`, `start`, `end`. */
type AstNode = {
	type: string;
	start: number;
	end: number;
	[key: string]: unknown;
};

/** Type guard for an arbitrary value being an AST node. */
function isAstNode(value: unknown): value is AstNode {
	return (
		typeof value === "object" &&
		value != null &&
		"type" in value &&
		typeof (value as { type?: unknown }).type === "string" &&
		"start" in value &&
		typeof (value as { start?: unknown }).start === "number" &&
		"end" in value &&
		typeof (value as { end?: unknown }).end === "number"
	);
}

/**
 * AST node types whose `start`/`end` positions delimit a foldable region
 * when they span multiple lines.
 *
 * Curated to match VS Code's TypeScript folder:
 * - Block-like statement bodies — covers function/method bodies, class bodies,
 *   `if`/`for`/`while` blocks, modules, namespaces.
 * - Object & array literals — covers JSON-shaped data and JSX style props.
 * - JSX elements & fragments — open/close tags fold like HTML.
 * - Template literals — fold multi-line backtick strings (including tagged).
 * - Switch statements — VS Code folds the whole `switch (…) { … }`, not each case.
 */
const FOLDABLE_NODE_TYPES = new Set<string>([
	"BlockStatement",
	"ClassBody",
	"ObjectExpression",
	"ObjectPattern",
	"ArrayExpression",
	"ArrayPattern",
	"JSXElement",
	"JSXFragment",
	"TemplateLiteral",
	"SwitchStatement",
	// TypeScript-only:
	"TSInterfaceBody",
	"TSTypeLiteral",
	"TSEnumBody",
	"TSEnumDeclaration",
	"TSModuleBlock",
	"TSMappedType",
]);

/** Returns the `openingElement` of a `JSXElement` if present (the `<Foo …>` span). */
function jsxOpeningElement(node: AstNode): AstNode | undefined {
	if (node.type !== "JSXElement") {
		return undefined;
	}
	const opening = (node as { openingElement?: unknown }).openingElement;
	return isAstNode(opening) ? opening : undefined;
}

/** Returns true when a `JSXOpeningElement` is self-closing (`<Foo/>`). */
function isSelfClosingOpening(opening: AstNode): boolean {
	const selfClosing = (opening as { selfClosing?: unknown }).selfClosing;
	return selfClosing === true;
}

/**
 * Recursively walks every AST node reachable from `root`, calling `visit`
 * with each one. Mirrors the helper used in the Vite plugin but stays local
 * so this module has no extra cross-package dependency.
 */
function walk(root: unknown, visit: (node: AstNode) => void): void {
	if (Array.isArray(root)) {
		for (const item of root) {
			walk(item, visit);
		}
		return;
	}
	if (!isAstNode(root)) {
		return;
	}
	visit(root);
	for (const value of Object.values(root)) {
		if (Array.isArray(value)) {
			for (const item of value) {
				walk(item, visit);
			}
			continue;
		}
		if (isAstNode(value)) {
			walk(value, visit);
		}
	}
}

/**
 * Filename passed to `oxc-parser` purely for diagnostic strings; the actual
 * grammar comes from the `lang` option on the parser options object.
 */
const SYNTHETIC_FILENAME = "__mantle_fold__";

/**
 * Pushes a {@link FoldableRange} for the source span `[startOffset, endOffset]`
 * (inclusive) when it crosses a line boundary. Single-line spans contribute
 * nothing — there's nothing to fold.
 */
function pushRange(
	ranges: FoldableRange[],
	lineOffsets: readonly number[],
	startOffset: number,
	endOffset: number,
): void {
	const startLine = offsetToLine(lineOffsets, startOffset);
	const endLine = offsetToLine(lineOffsets, endOffset);
	if (endLine > startLine) {
		ranges.push({ id: String(startLine), startLine, endLine });
	}
}

/**
 * Computes foldable ranges for a JS/TS/JSX/TSX source string by parsing it
 * with `oxc-parser` and walking the AST. Errors are tolerated — a partial AST
 * still produces useful folds.
 *
 * @example
 * computeJsxFoldRanges({ code: "<Foo>\n  <Bar/>\n</Foo>", language: "tsx" });
 * // => [{ id: "1", startLine: 1, endLine: 3 }]
 */
function computeJsxFoldRanges({
	code,
	language,
}: {
	/** Raw source code to parse and fold. */
	code: string;
	/** Resolved Mantle language; controls grammar selection (TS vs JS, JSX vs plain). */
	language: JsxFoldLanguage;
}): FoldableRange[] {
	if (code.length === 0) {
		return [];
	}

	const options: ParserOptions = {
		// `unambiguous` lets the parser accept both `script` and `module` code,
		// matching how a code block is rendered without `import`/`export` context.
		sourceType: "unambiguous",
		lang: oxcLangFor(language),
	};
	const oxcParser = loadOxcParser();
	if (oxcParser == null) {
		return [];
	}
	const { parseSync } = oxcParser;
	const parsed = parseSync(SYNTHETIC_FILENAME, code, options);
	const lineOffsets = buildLineOffsets(code);
	const ranges: FoldableRange[] = [];

	walk(parsed.program, (node) => {
		// JSX elements get split treatment so multi-line attribute lists fold
		// even on self-closing tags (which have no separate body to fold).
		if (node.type === "JSXElement") {
			const opening = jsxOpeningElement(node);
			const isSelfClosing = opening != null && isSelfClosingOpening(opening);
			if (isSelfClosing) {
				// Self-closing tags fold the open-tag span only — there's no
				// body. Diverges from VS Code's stock TS folder, which doesn't
				// fold these at all, but matches what JSX authors actually want
				// for long attribute lists across multiple lines.
				if (opening != null) {
					pushRange(ranges, lineOffsets, opening.start, opening.end - 1);
				}
				return;
			}
			// Non-self-closing: fold the whole element AND any multi-line
			// opening tag's attribute list. After dedup, when both share an
			// opener line, the larger element fold wins — but the open-tag
			// fold survives when it has its own opener line offset.
			pushRange(ranges, lineOffsets, node.start, node.end - 1);
			if (opening != null) {
				pushRange(ranges, lineOffsets, opening.start, opening.end - 1);
			}
			return;
		}
		if (!FOLDABLE_NODE_TYPES.has(node.type)) {
			return;
		}
		pushRange(ranges, lineOffsets, node.start, node.end - 1);
	});

	return finalizeFoldRanges(ranges);
}

export { computeJsxFoldRanges, createOxcParserLoader };
export type { JsxFoldLanguage };
