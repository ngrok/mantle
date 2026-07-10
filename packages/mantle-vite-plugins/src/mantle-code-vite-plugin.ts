import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import MagicString from "magic-string";
import {
	defaultShowLineNumbers,
	inferIndentation,
	isIndentation,
	isSupportedLanguage,
	type Indentation,
	type SupportedLanguage,
} from "@ngrok/mantle/highlight-utils";
import { parseSync } from "oxc-parser";
import type { Plugin } from "vite";
import { highlightWithMantleShiki } from "@ngrok/mantle-server-syntax-highlighter";

type ParsedMantleCodeOptions = {
	highlightLines: (number | `${number}-${number}`)[] | undefined;
	indentation: Indentation | undefined;
	lineNumberStart: number | undefined;
	showLineNumbers: boolean | undefined;
};

type Range = {
	start: number;
	end: number;
};

type ParsedJsxCodePropsResult = ParsedMantleCodeOptions & {
	attributeRemovalRanges: Range[];
};

type OxcNode = {
	type: string;
	start: number;
	end: number;
	[key: string]: unknown;
};

type OxcExpression = OxcNode;

type OxcLiteral = OxcNode & {
	type: "Literal";
	raw?: string;
	value: unknown;
};

type OxcIdentifier = OxcNode & {
	type: "Identifier";
	name: string;
};

type OxcArrayExpression = OxcNode & {
	type: "ArrayExpression";
	elements: Array<OxcExpression | null>;
};

type OxcObjectProperty = OxcNode & {
	type: "Property";
	computed: boolean;
	key: OxcExpression;
	kind: string;
	shorthand: boolean;
	value: OxcExpression;
};

type OxcObjectExpression = OxcNode & {
	type: "ObjectExpression";
	properties: OxcNode[];
};

type OxcCallExpression = OxcNode & {
	type: "CallExpression";
	arguments: OxcExpression[];
	callee: OxcExpression;
};

type OxcTemplateElement = OxcNode & {
	type: "TemplateElement";
	value: {
		cooked: string | null;
		raw: string;
	};
};

type OxcTemplateLiteral = OxcNode & {
	type: "TemplateLiteral";
	expressions: OxcExpression[];
	quasis: OxcTemplateElement[];
};

type OxcTaggedTemplateExpression = OxcNode & {
	type: "TaggedTemplateExpression";
	tag: OxcExpression;
	quasi: OxcTemplateLiteral;
};

type MantleCodeTaggedTemplateExpression = OxcTaggedTemplateExpression & {
	tag: OxcCallExpression;
};

type OxcMemberExpression = OxcNode & {
	type: "MemberExpression";
	object: OxcExpression;
	property: OxcExpression;
	computed: boolean;
	optional: boolean;
};

type OxcVariableDeclarator = OxcNode & {
	type: "VariableDeclarator";
	id: OxcNode;
	init: OxcNode | null;
};

type OxcVariableDeclaration = OxcNode & {
	type: "VariableDeclaration";
	kind: "const" | "let" | "var";
	declarations: OxcVariableDeclarator[];
};

type OxcJSXIdentifier = OxcNode & {
	type: "JSXIdentifier";
	name: string;
};

type OxcJSXMemberExpression = OxcNode & {
	type: "JSXMemberExpression";
	object: OxcJSXIdentifier | OxcJSXMemberExpression;
	property: OxcJSXIdentifier;
};

type OxcJSXExpressionContainer = OxcNode & {
	type: "JSXExpressionContainer";
	expression: OxcExpression;
};

type OxcJSXAttribute = OxcNode & {
	type: "JSXAttribute";
	name: OxcJSXIdentifier;
	value: OxcLiteral | OxcJSXExpressionContainer | null;
};

type OxcJSXOpeningElement = OxcNode & {
	type: "JSXOpeningElement";
	attributes: OxcNode[];
	name: OxcJSXIdentifier | OxcJSXMemberExpression;
};

/** Escapes backslashes, backticks, and `${` sequences for safe embedding in a template literal. */
function escapeForTemplateLiteral(input: string): string {
	let result = "";
	for (let i = 0; i < input.length; i++) {
		const char = input[i];
		if (char === "\\") {
			result += "\\\\";
		} else if (char === "`") {
			result += "\\`";
		} else if (char === "$" && input[i + 1] === "{") {
			result += "\\${";
			i += 1;
		} else {
			result += char;
		}
	}
	return result;
}

/** Produces a short base-36 hash of a string using a multiplicative hash function. */
function hashString(input: string): string {
	let hash = 0;
	for (let i = 0; i < input.length; i += 1) {
		hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
	}
	return hash.toString(36);
}

/** Creates a unique placeholder token prefix for interpolated template values in a given file and offset. */
function createPreValToken(id: string, start: number): string {
	return `__MANTLE_PRE_VAL_${hashString(`${id}:${start}`)}_`;
}

/** Type predicate: checks if a value is an OXC AST node with `type`, `start`, and `end` fields. */
function isNode(value: unknown): value is OxcNode {
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

/** Type predicate: checks if a node is a `Literal`. */
function isLiteral(node: OxcNode | null | undefined): node is OxcLiteral {
	return node?.type === "Literal";
}

/** Type predicate: checks if a node is an `Identifier`. */
function isIdentifier(node: OxcNode | null | undefined): node is OxcIdentifier {
	return node?.type === "Identifier";
}

/** Type predicate: checks if a node is an `ArrayExpression`. */
function isArrayExpression(node: OxcNode | null | undefined): node is OxcArrayExpression {
	return node?.type === "ArrayExpression";
}

/** Type predicate: checks if a node is an `ObjectExpression`. */
function isObjectExpression(node: OxcNode | null | undefined): node is OxcObjectExpression {
	return node?.type === "ObjectExpression";
}

/** Type predicate: checks if a node is an object `Property`. */
function isProperty(node: OxcNode | null | undefined): node is OxcObjectProperty {
	return node?.type === "Property";
}

/** Type predicate: checks if a node is a `CallExpression`. */
function isCallExpression(node: OxcNode | null | undefined): node is OxcCallExpression {
	return node?.type === "CallExpression";
}

/** Type predicate: checks if a node is a `TaggedTemplateExpression`. */
function isTaggedTemplateExpression(
	node: OxcNode | null | undefined,
): node is OxcTaggedTemplateExpression {
	return node?.type === "TaggedTemplateExpression";
}

/** Type predicate: checks if a node is a `MemberExpression`. */
function isMemberExpression(node: OxcNode | null | undefined): node is OxcMemberExpression {
	return node?.type === "MemberExpression";
}

/** Type predicate: checks if a node is a `VariableDeclarator`. */
function isVariableDeclarator(node: OxcNode | null | undefined): node is OxcVariableDeclarator {
	return node?.type === "VariableDeclarator";
}

/** Type predicate: checks if a node is a `VariableDeclaration`. */
function isVariableDeclaration(node: OxcNode | null | undefined): node is OxcVariableDeclaration {
	return node?.type === "VariableDeclaration";
}

/** Type predicate: checks if a node is a `JSXOpeningElement`. */
function isJSXOpeningElement(node: OxcNode | null | undefined): node is OxcJSXOpeningElement {
	return node?.type === "JSXOpeningElement";
}

/** Type predicate: checks if a node is a `JSXAttribute`. */
function isJSXAttribute(node: OxcNode | null | undefined): node is OxcJSXAttribute {
	return node?.type === "JSXAttribute";
}

/** Type predicate: checks if a node is a `JSXExpressionContainer`. */
function isJSXExpressionContainer(
	node: OxcNode | null | undefined,
): node is OxcJSXExpressionContainer {
	return node?.type === "JSXExpressionContainer";
}

/** Recursively walks an OXC AST, calling `visit` on every node. */
function walk(node: unknown, visit: (node: OxcNode) => void) {
	if (Array.isArray(node)) {
		for (const item of node) {
			walk(item, visit);
		}
		return;
	}

	if (!isNode(node)) {
		return;
	}

	visit(node);
	for (const value of Object.values(node)) {
		if (Array.isArray(value)) {
			for (const item of value) {
				walk(item, visit);
			}
			continue;
		}

		if (isNode(value)) {
			walk(value, visit);
		}
	}
}

/** Type predicate: checks if a node is a `Literal` with a string value. */
function isStringLiteral(node: OxcNode | null | undefined): node is OxcLiteral {
	return isLiteral(node) && typeof node.value === "string";
}

/** Extracts a static boolean value from a literal AST node. */
function readStaticBoolean(node: OxcNode | null | undefined): boolean | undefined {
	return isLiteral(node) && typeof node.value === "boolean" ? node.value : undefined;
}

/** Extracts a static positive integer from a literal AST node, flooring non-integer values. */
function readStaticPositiveInt(node: OxcNode | null | undefined): number | undefined {
	if (!isLiteral(node) || typeof node.value !== "number") {
		return undefined;
	}
	if (!Number.isFinite(node.value) || node.value <= 0) {
		return undefined;
	}
	return Math.floor(node.value);
}

/** Extracts a static `Indentation` value (`"tabs"` or `"spaces"`) from a string literal AST node. */
function readStaticIndentation(node: OxcNode | null | undefined): Indentation | undefined {
	if (!isStringLiteral(node) || !isIndentation(node.value)) {
		return undefined;
	}
	return node.value;
}

/** Parses a static AST array expression into a list of highlight line numbers and ranges. */
function parseHighlightLinesArray(
	input: OxcNode | null | undefined,
): (number | `${number}-${number}`)[] | undefined {
	if (!isArrayExpression(input)) {
		return undefined;
	}

	const parsed = input.elements
		.map((item) => {
			if (item == null || !isLiteral(item)) {
				return undefined;
			}
			if (typeof item.value === "number") {
				return Number.isFinite(item.value) && item.value > 0 ? Math.floor(item.value) : undefined;
			}
			if (typeof item.value === "string" && /^\d+-\d+$/.test(item.value)) {
				return item.value as `${number}-${number}`;
			}
			return undefined;
		})
		.filter((item): item is number | `${number}-${number}` => item != null);

	// Return [] only for a genuinely empty array literal (`highlightLines={[]}`).
	// When the array had elements but none were valid, return undefined so we
	// don't silently override other highlight options or trigger attribute removal.
	if (parsed.length === 0) {
		return input.elements.length === 0 ? [] : undefined;
	}
	return parsed;
}

/** Returns the static key name of an object property, or `undefined` for computed keys. */
function getObjectPropertyName(property: OxcObjectProperty): string | undefined {
	if (property.computed) {
		return undefined;
	}
	if (isIdentifier(property.key)) {
		return property.key.name;
	}
	return isStringLiteral(property.key) ? (property.key.value as string) : undefined;
}

/** Extracts static `MantleCodeOptions` from the second argument of a `mantleCode()` call. */
function parseMantleCodeOptions(node: OxcNode | null | undefined): ParsedMantleCodeOptions {
	if (!isObjectExpression(node)) {
		return {
			highlightLines: undefined,
			indentation: undefined,
			lineNumberStart: undefined,
			showLineNumbers: undefined,
		};
	}

	let highlightLines: ParsedMantleCodeOptions["highlightLines"];
	let indentation: ParsedMantleCodeOptions["indentation"];
	let lineNumberStart: ParsedMantleCodeOptions["lineNumberStart"];
	let showLineNumbers: ParsedMantleCodeOptions["showLineNumbers"];

	for (const property of node.properties) {
		if (!isProperty(property) || property.kind !== "init") {
			continue;
		}
		const propertyName = getObjectPropertyName(property);
		if (propertyName == null) {
			continue;
		}

		switch (propertyName) {
			case "highlightLines":
				highlightLines = parseHighlightLinesArray(property.value);
				break;
			case "indentation":
				indentation = readStaticIndentation(property.value);
				break;
			case "lineNumberStart":
				lineNumberStart = readStaticPositiveInt(property.value);
				break;
			case "showLineNumbers":
				showLineNumbers = readStaticBoolean(property.value);
				break;
		}
	}

	return {
		highlightLines,
		indentation,
		lineNumberStart,
		showLineNumbers,
	};
}

/** Resolves the dotted name of a JSX element (e.g. `"CodeBlock.Code"`) from its AST name node. */
function getJsxElementName(name: OxcJSXIdentifier | OxcJSXMemberExpression): string | undefined {
	if (name.type === "JSXIdentifier") {
		return name.name;
	}
	const objectName = getJsxElementName(name.object);
	return objectName != null ? `${objectName}.${name.property.name}` : undefined;
}

/** Returns the name of a JSX attribute. */
function getJsxAttributeName(attribute: OxcJSXAttribute): string {
	return attribute.name.name;
}

/** Unwraps a JSX attribute's value to its inner expression node. */
function readJsxAttributeExpression(attribute: OxcJSXAttribute): OxcNode | undefined {
	if (attribute.value == null) {
		return undefined;
	}
	if (attribute.value.type === "Literal") {
		return attribute.value;
	}
	if (isJSXExpressionContainer(attribute.value)) {
		return attribute.value.expression;
	}
	return undefined;
}

/** Computes the source range to remove for a JSX attribute, including leading whitespace. */
function getAttributeRemovalRange(
	attribute: OxcJSXAttribute,
	source: string,
	openingElement: OxcJSXOpeningElement,
): Range {
	let start = attribute.start;
	while (start > openingElement.name.end && /\s/.test(source[start - 1] ?? "")) {
		start -= 1;
	}
	return { end: attribute.end, start };
}

/**
 * Parses static props from a `<CodeBlock.Code>` JSX element that should be
 * folded into the build-time transform (e.g. `showLineNumbers`, `highlightLines`).
 */
function parseJsxCodeProps(
	openingElement: OxcJSXOpeningElement,
	source: string,
	mantleCodeNames: Set<string>,
): { taggedTemplateStart: number; props: ParsedJsxCodePropsResult } | undefined {
	if (getJsxElementName(openingElement.name) !== "CodeBlock.Code") {
		return undefined;
	}

	let highlightLines: ParsedMantleCodeOptions["highlightLines"];
	let indentation: ParsedMantleCodeOptions["indentation"];
	let lineNumberStart: ParsedMantleCodeOptions["lineNumberStart"];
	let showLineNumbers: ParsedMantleCodeOptions["showLineNumbers"];
	let taggedTemplateStart: number | undefined;
	const attributeRemovalRanges: Range[] = [];

	for (const attributeNode of openingElement.attributes) {
		if (!isJSXAttribute(attributeNode)) {
			continue;
		}
		const attributeName = getJsxAttributeName(attributeNode);
		const expression = readJsxAttributeExpression(attributeNode);

		if (
			attributeName === "value" &&
			isTaggedTemplateExpression(expression) &&
			isCallExpression(expression.tag) &&
			isIdentifier(expression.tag.callee) &&
			mantleCodeNames.has(expression.tag.callee.name)
		) {
			taggedTemplateStart = expression.start;
			continue;
		}

		switch (attributeName) {
			case "highlightLines": {
				const parsed = parseHighlightLinesArray(expression);
				if (parsed == null) {
					break;
				}
				// Preserve [] as an explicit "no highlights" override,
				// distinct from undefined (not provided).
				highlightLines = parsed;
				attributeRemovalRanges.push(
					getAttributeRemovalRange(attributeNode, source, openingElement),
				);
				break;
			}
			case "indentation": {
				const parsed = readStaticIndentation(expression);
				if (parsed == null) {
					break;
				}
				indentation = parsed;
				attributeRemovalRanges.push(
					getAttributeRemovalRange(attributeNode, source, openingElement),
				);
				break;
			}
			case "lineNumberStart": {
				const parsed = readStaticPositiveInt(expression);
				if (parsed == null) {
					break;
				}
				lineNumberStart = parsed;
				attributeRemovalRanges.push(
					getAttributeRemovalRange(attributeNode, source, openingElement),
				);
				break;
			}
			case "showLineNumbers": {
				const parsed = attributeNode.value == null ? true : readStaticBoolean(expression);
				if (parsed == null) {
					break;
				}
				showLineNumbers = parsed;
				attributeRemovalRanges.push(
					getAttributeRemovalRange(attributeNode, source, openingElement),
				);
				break;
			}
		}
	}

	if (taggedTemplateStart == null) {
		return undefined;
	}

	return {
		taggedTemplateStart,
		props: {
			attributeRemovalRanges,
			highlightLines,
			indentation,
			lineNumberStart,
			showLineNumbers,
		},
	};
}

/** Merges JSX component props with `mantleCode()` options, preferring component-level overrides. */
function mergeMantleCodeOptions({
	componentProps,
	mantleCodeOptions,
}: {
	componentProps: ParsedMantleCodeOptions;
	mantleCodeOptions: ParsedMantleCodeOptions;
}): ParsedMantleCodeOptions {
	return {
		highlightLines: componentProps.highlightLines ?? mantleCodeOptions.highlightLines,
		indentation: componentProps.indentation ?? mantleCodeOptions.indentation,
		lineNumberStart: componentProps.lineNumberStart ?? mantleCodeOptions.lineNumberStart,
		showLineNumbers: componentProps.showLineNumbers ?? mantleCodeOptions.showLineNumbers,
	};
}

/**
 * Checks whether an import source looks like it comes from the `@ngrok/mantle` package
 * (e.g. `@ngrok/mantle/code-block`). This prevents the plugin from rewriting a local
 * helper or third-party function that happens to share the `mantleCode` name.
 */
function isMantleImportSource(source: string): boolean {
	return source === "@ngrok/mantle/code-block" || source.startsWith("@ngrok/mantle/code-block/");
}

type OxcImportDeclaration = OxcNode & {
	type: "ImportDeclaration";
	source: OxcLiteral;
	specifiers: OxcImportSpecifier[];
	importKind?: string;
};

type OxcImportSpecifier = OxcNode & {
	type: "ImportSpecifier" | "ImportDefaultSpecifier" | "ImportNamespaceSpecifier";
	imported?: OxcIdentifier;
	local: OxcIdentifier;
	importKind?: string;
};

type OxcExportSpecifier = OxcNode & {
	type: "ExportSpecifier";
	local: OxcIdentifier;
	exported: OxcIdentifier;
	exportKind?: string;
};

type OxcExportNamedDeclaration = OxcNode & {
	type: "ExportNamedDeclaration";
	declaration: OxcNode | null;
	specifiers: OxcExportSpecifier[];
	source: OxcLiteral | null;
};

type OxcProgram = OxcNode & {
	type: "Program";
	body: unknown[];
};

/** Type predicate: checks if a node is an `ImportDeclaration`. */
function isImportDeclaration(node: OxcNode | null | undefined): node is OxcImportDeclaration {
	return node?.type === "ImportDeclaration";
}

/** Type predicate: checks if a node is an `ExportNamedDeclaration`. */
function isExportNamedDeclaration(
	node: OxcNode | null | undefined,
): node is OxcExportNamedDeclaration {
	return node?.type === "ExportNamedDeclaration";
}

/** Type predicate: checks if a node is a parsed program with top-level statements. */
function isProgram(node: unknown): node is OxcProgram {
	return isNode(node) && node.type === "Program" && Array.isArray(node.body);
}

/**
 * The static `mantleCode` symbol tables extracted from a single module. Used to resolve
 * `<fragment>.code` interpolations within the module and — for imported fragments — across
 * module boundaries.
 */
type ModuleFragmentContext = {
	/** Absolute id (Vite resolved id) of the module these symbols came from. */
	resolvedId: string;
	/** Local names bound to the imported `mantleCode` tag (e.g. `mantleCode`, or an alias). */
	mantleCodeNames: Set<string>;
	/** Top-level `mantleCode` fragment bindings, keyed by their in-module binding name. */
	fragmentsByName: Map<string, OxcTaggedTemplateExpression>;
	/** Top-level `mantleCode` fragments exposed to other modules, keyed by their exported name. */
	exportedFragments: Map<string, OxcTaggedTemplateExpression>;
	/** Named value imports, keyed by local binding name. */
	importsByLocal: Map<string, { importedName: string; source: string }>;
};

/** Resolves + parses an imported module into its fragment context, or `null` if unavailable. */
type LoadModuleContext = (
	source: string,
	importer: string,
) => Promise<ModuleFragmentContext | null>;

/**
 * Extracts the `mantleCode` fragment symbol tables from top-level module statements: which
 * local bindings are `mantleCode` fragments, which of those are exported, and which names are
 * value imports. Shared by the current-module transform and cross-module fragment resolution so
 * both surfaces recognize fragments identically.
 */
function collectModuleSymbols(program: unknown): Omit<ModuleFragmentContext, "resolvedId"> {
	const mantleCodeNames = new Set<string>();
	const importsByLocal = new Map<string, { importedName: string; source: string }>();
	const fragmentCandidates: { name: string; node: OxcTaggedTemplateExpression }[] = [];
	const exportedConstNames = new Set<string>();
	const exportSpecifierLocalByExported = new Map<string, string>();

	function collectConstDeclarationFragments(declaration: OxcVariableDeclaration) {
		for (const declarator of declaration.declarations) {
			if (
				isVariableDeclarator(declarator) &&
				isIdentifier(declarator.id) &&
				isTaggedTemplateExpression(declarator.init) &&
				isCallExpression(declarator.init.tag) &&
				isIdentifier(declarator.init.tag.callee)
			) {
				fragmentCandidates.push({ name: declarator.id.name, node: declarator.init });
			}
		}
	}

	function collectExportedConstNames(declaration: OxcVariableDeclaration) {
		for (const declarator of declaration.declarations) {
			if (isVariableDeclarator(declarator) && isIdentifier(declarator.id)) {
				exportedConstNames.add(declarator.id.name);
			}
		}
	}

	if (isProgram(program)) {
		for (const statement of program.body) {
			if (!isNode(statement)) {
				continue;
			}

			if (isImportDeclaration(statement)) {
				if (statement.importKind === "type" || typeof statement.source.value !== "string") {
					continue;
				}
				const source = statement.source.value;
				for (const specifier of statement.specifiers) {
					if (
						specifier.type === "ImportSpecifier" &&
						specifier.importKind !== "type" &&
						specifier.imported != null
					) {
						importsByLocal.set(specifier.local.name, {
							importedName: specifier.imported.name,
							source,
						});
						if (isMantleImportSource(source) && specifier.imported.name === "mantleCode") {
							mantleCodeNames.add(specifier.local.name);
						}
					}
				}
				continue;
			}

			if (isExportNamedDeclaration(statement)) {
				// `export … from "…"` is a re-export — out of scope for v1; skip.
				if (statement.source != null) {
					continue;
				}
				if (
					isVariableDeclaration(statement.declaration) &&
					statement.declaration.kind === "const"
				) {
					collectExportedConstNames(statement.declaration);
					collectConstDeclarationFragments(statement.declaration);
				}
				for (const specifier of statement.specifiers) {
					if (specifier.type === "ExportSpecifier" && specifier.exportKind !== "type") {
						exportSpecifierLocalByExported.set(specifier.exported.name, specifier.local.name);
					}
				}
				continue;
			}

			if (isVariableDeclaration(statement) && statement.kind === "const") {
				collectConstDeclarationFragments(statement);
			}
		}
	}

	const fragmentsByName = new Map<string, OxcTaggedTemplateExpression>();
	for (const { name, node } of fragmentCandidates) {
		if (
			isCallExpression(node.tag) &&
			isIdentifier(node.tag.callee) &&
			mantleCodeNames.has(node.tag.callee.name)
		) {
			fragmentsByName.set(name, node);
		}
	}

	const exportedFragments = new Map<string, OxcTaggedTemplateExpression>();
	for (const name of exportedConstNames) {
		const fragment = fragmentsByName.get(name);
		if (fragment != null) {
			exportedFragments.set(name, fragment);
		}
	}
	for (const [exported, local] of exportSpecifierLocalByExported) {
		const fragment = fragmentsByName.get(local);
		if (fragment != null) {
			exportedFragments.set(exported, fragment);
		}
	}

	return { mantleCodeNames, fragmentsByName, exportedFragments, importsByLocal };
}

/**
 * Joins a fragment template's quasis with its (recursively resolved) interpolations into the
 * exact string that `fragment.code` produces at runtime, or `null` if any interpolation is not
 * itself a statically resolvable fragment reference.
 */
async function resolveFragmentTemplate(
	fragmentNode: OxcTaggedTemplateExpression,
	context: ModuleFragmentContext,
	loadModuleContext: LoadModuleContext,
	seen: Set<string>,
): Promise<string | null> {
	const { quasis, expressions } = fragmentNode.quasi;
	let result = quasis[0]?.value.cooked ?? quasis[0]?.value.raw ?? "";
	for (let index = 0; index < expressions.length; index += 1) {
		const expression = expressions[index];
		const inlined =
			expression == null
				? null
				: await resolveFragmentReference(expression, context, loadModuleContext, seen);
		if (inlined == null) {
			return null;
		}
		result += inlined;
		const nextQuasi = quasis[index + 1];
		result += nextQuasi?.value.cooked ?? nextQuasi?.value.raw ?? "";
	}
	return result;
}

/**
 * Resolves an interpolation of the form `someFragment.code` to its static code text.
 * `someFragment` may be a top-level `mantleCode` `const` declared in the same module, or a named
 * import of a directly-exported top-level `mantleCode` `const` from another module. Nested
 * references are resolved recursively across module boundaries.
 *
 * Returns `null` — signalling the caller to keep the runtime placeholder path — when the
 * expression is not a non-computed `.code` member access, the binding is not a resolvable
 * fragment, the reference is cyclic, a same-module fragment is declared after this reference
 * (mirroring runtime evaluation order so plugin output matches the no-plugin fallback), or the
 * imported module/export cannot be statically resolved.
 *
 * @example
 * // import { oauthPolicy } from "./policies";
 * // …inside mantleCode("java")`String tp = """${oauthPolicy.code}""";`
 * // resolveFragmentReference(<oauthPolicy.code>, …) === "on_http_request:"
 */
async function resolveFragmentReference(
	expression: OxcExpression,
	context: ModuleFragmentContext,
	loadModuleContext: LoadModuleContext,
	seen: Set<string>,
): Promise<string | null> {
	if (!isMemberExpression(expression) || expression.computed || expression.optional) {
		return null;
	}
	if (!isIdentifier(expression.object) || !isIdentifier(expression.property)) {
		return null;
	}
	if (expression.property.name !== "code") {
		return null;
	}

	const name = expression.object.name;

	const localFragment = context.fragmentsByName.get(name);
	if (localFragment != null) {
		// Same-module: require declaration before use, mirroring runtime evaluation order.
		if (localFragment.end > expression.start) {
			return null;
		}
		const key = `${context.resolvedId}\0${name}`;
		if (seen.has(key)) {
			return null;
		}
		return resolveFragmentTemplate(
			localFragment,
			context,
			loadModuleContext,
			new Set(seen).add(key),
		);
	}

	const imported = context.importsByLocal.get(name);
	if (imported != null) {
		const target = await loadModuleContext(imported.source, context.resolvedId);
		if (target == null) {
			return null;
		}
		const exportedFragment = target.exportedFragments.get(imported.importedName);
		if (exportedFragment == null) {
			return null;
		}
		// Imports are hoisted and the imported module is fully evaluated before the importer
		// runs, so no declaration-order guard is needed across module boundaries.
		const key = `${target.resolvedId}\0${imported.importedName}`;
		if (seen.has(key)) {
			return null;
		}
		return resolveFragmentTemplate(
			exportedFragment,
			target,
			loadModuleContext,
			new Set(seen).add(key),
		);
	}

	return null;
}

/**
 * If `expression` is `<importedBinding>.code`, returns the local binding name and import source;
 * otherwise `null`. Used to warn when an intended cross-module inline could not be resolved.
 */
function getImportedFragmentReference(
	expression: OxcExpression,
	context: ModuleFragmentContext,
): { localName: string; source: string } | null {
	if (!isMemberExpression(expression) || expression.computed || expression.optional) {
		return null;
	}
	if (!isIdentifier(expression.object) || !isIdentifier(expression.property)) {
		return null;
	}
	if (expression.property.name !== "code") {
		return null;
	}
	const localName = expression.object.name;
	const imported = context.importsByLocal.get(localName);
	return imported == null ? null : { localName, source: imported.source };
}

/**
 * Builds the Shiki input for an outer `mantleCode` template: statically resolvable fragment
 * references are inlined as real source (highlighted in context, no runtime cost); every other
 * interpolation keeps a placeholder token and is captured as a runtime `~preVals` entry. Token
 * indices count only the surviving dynamic expressions so they stay aligned with `~preVals`.
 */
async function buildPlaceholderCode({
	node,
	preValToken,
	context,
	loadModuleContext,
	warn,
}: {
	node: OxcTaggedTemplateExpression;
	preValToken: string;
	context: ModuleFragmentContext;
	loadModuleContext: LoadModuleContext;
	warn: (message: string) => void;
}): Promise<{ placeholderCode: string; dynamicExpressions: OxcExpression[] }> {
	const { quasis, expressions } = node.quasi;
	let placeholderCode = quasis[0]?.value.cooked ?? quasis[0]?.value.raw ?? "";
	const dynamicExpressions: OxcExpression[] = [];
	for (let index = 0; index < expressions.length; index += 1) {
		const expression = expressions[index];
		const inlined =
			expression == null
				? null
				: await resolveFragmentReference(expression, context, loadModuleContext, new Set());
		if (inlined != null) {
			placeholderCode += inlined;
		} else if (expression != null) {
			const importedReference = getImportedFragmentReference(expression, context);
			if (importedReference != null) {
				warn(
					`mantleCodeVitePlugin: could not statically inline imported fragment "${importedReference.localName}.code" from "${importedReference.source}" in ${context.resolvedId}; falling back to runtime substitution`,
				);
			}
			placeholderCode += `${preValToken}${dynamicExpressions.length}__`;
			dynamicExpressions.push(expression);
		}
		const nextQuasi = quasis[index + 1];
		placeholderCode += nextQuasi?.value.cooked ?? nextQuasi?.value.raw ?? "";
	}
	return { placeholderCode, dynamicExpressions };
}

/**
 * Vite plugin that transforms `mantleCode("lang")\`...\`` tagged template
 * literals at build time, replacing them with pre-rendered Shiki HTML objects.
 */
function mantleCodeVitePlugin(): Plugin {
	// Parsed fragment contexts of imported modules, keyed by Vite-resolved id. Persists across
	// transforms so a shared fragment module is parsed once, and is invalidated by content hash
	// (the importer re-transforms via `addWatchFile` whenever the fragment module changes).
	const moduleContextCache = new Map<string, { hash: string; context: ModuleFragmentContext }>();

	return {
		name: "vite-plugin-mantle-code-block",

		async transform(code, id) {
			if (!/\.[jt]sx?$/.test(id)) {
				return;
			}
			if (!code.includes("mantleCode")) {
				return;
			}

			const parseResult = parseSync(id, code);
			if (parseResult.errors.length > 0) {
				this.warn(
					`mantleCodeVitePlugin: failed to parse ${id}; skipping transform (${parseResult.errors.length} parser error${parseResult.errors.length === 1 ? "" : "s"})`,
				);
				return;
			}

			// Extract the module's `mantleCode` symbol tables (imports, local fragments, exported
			// fragments). The same extractor runs against imported modules during cross-module
			// fragment resolution so both surfaces recognize fragments identically.
			const { mantleCodeNames, fragmentsByName, exportedFragments, importsByLocal } =
				collectModuleSymbols(parseResult.program);

			if (mantleCodeNames.size === 0) {
				return;
			}

			// Collect the nodes to transform: `mantleCode` tagged templates and the
			// `<CodeBlock.Code>` JSX elements whose static props fold into them.
			const candidateTaggedTemplates: MantleCodeTaggedTemplateExpression[] = [];
			const candidateJsxOpeningElements: OxcJSXOpeningElement[] = [];
			walk(parseResult.program, (node) => {
				if (isJSXOpeningElement(node)) {
					candidateJsxOpeningElements.push(node);
					return;
				}
				if (
					isTaggedTemplateExpression(node) &&
					isCallExpression(node.tag) &&
					isIdentifier(node.tag.callee)
				) {
					candidateTaggedTemplates.push(node as MantleCodeTaggedTemplateExpression);
				}
			});

			const taggedTemplates = candidateTaggedTemplates.filter((node) =>
				mantleCodeNames.has((node.tag.callee as OxcIdentifier).name),
			);
			const jsxPropsByTaggedTemplateStart = new Map<number, ParsedJsxCodePropsResult>();
			for (const element of candidateJsxOpeningElements) {
				const parsed = parseJsxCodeProps(element, code, mantleCodeNames);
				if (parsed != null) {
					jsxPropsByTaggedTemplateStart.set(parsed.taggedTemplateStart, parsed.props);
				}
			}

			const currentContext: ModuleFragmentContext = {
				resolvedId: id,
				mantleCodeNames,
				fragmentsByName,
				exportedFragments,
				importsByLocal,
			};

			// Resolves an imported fragment module: resolve the specifier, register it as a watch
			// dependency (so edits re-transform this importer), then read + parse it once per
			// content hash. Returns `null` for anything we can't statically read (externals,
			// non-JS/TS modules, parse errors).
			const loadModuleContext: LoadModuleContext = async (source, importer) => {
				const resolved = await this.resolve(source, importer, { skipSelf: true }).catch(() => null);
				if (resolved == null || resolved.external) {
					return null;
				}
				const filePath = resolved.id.split("?")[0] ?? resolved.id;
				if (!/\.[jt]sx?$/.test(filePath)) {
					return null;
				}
				this.addWatchFile(filePath);
				let content: string;
				try {
					content = await readFile(filePath, "utf8");
				} catch {
					return null;
				}
				const hash = createHash("sha1").update(content).digest("hex");
				const cached = moduleContextCache.get(resolved.id);
				if (cached != null && cached.hash === hash) {
					return cached.context;
				}
				const parsed = parseSync(filePath, content);
				if (parsed.errors.length > 0) {
					return null;
				}
				const context: ModuleFragmentContext = {
					resolvedId: resolved.id,
					...collectModuleSymbols(parsed.program),
				};
				moduleContextCache.set(resolved.id, { hash, context });
				return context;
			};

			// Prepare highlight inputs for all valid tagged templates, then run in parallel.
			type HighlightJob = {
				componentProps: ParsedJsxCodePropsResult;
				dynamicExpressions: OxcExpression[];
				effectiveOptions: ParsedMantleCodeOptions;
				language: SupportedLanguage;
				node: MantleCodeTaggedTemplateExpression;
				placeholderCode: string;
				preValToken: string;
			};

			const jobInputs = await Promise.all(
				taggedTemplates.map(async (node): Promise<HighlightJob | null> => {
					const languageArg = node.tag.arguments[0];
					if (!isStringLiteral(languageArg)) {
						this.warn(
							`mantleCodeVitePlugin: mantleCode language must be a static string literal in ${id} at offset ${node.start} - skipping`,
						);
						return null;
					}

					const language = languageArg.value;
					if (!isSupportedLanguage(language)) {
						this.warn(
							`mantleCodeVitePlugin: unsupported language "${language}" in ${id} - skipping`,
						);
						return null;
					}

					const parsedOptions = parseMantleCodeOptions(node.tag.arguments[1]);
					const componentProps = jsxPropsByTaggedTemplateStart.get(node.start) ?? {
						attributeRemovalRanges: [],
						highlightLines: undefined,
						indentation: undefined,
						lineNumberStart: undefined,
						showLineNumbers: undefined,
					};
					const effectiveOptions = mergeMantleCodeOptions({
						componentProps,
						mantleCodeOptions: parsedOptions,
					});
					const preValToken = createPreValToken(id, node.start);

					const { placeholderCode, dynamicExpressions } = await buildPlaceholderCode({
						node,
						preValToken,
						context: currentContext,
						loadModuleContext,
						warn: (message) => this.warn(message),
					});

					return {
						componentProps,
						dynamicExpressions,
						effectiveOptions,
						language,
						node,
						placeholderCode,
						preValToken,
					};
				}),
			);

			const jobs = jobInputs.filter((job): job is HighlightJob => job != null);

			if (jobs.length === 0) {
				return;
			}

			// Highlight all code blocks in parallel
			const results = await Promise.all(
				jobs.map(async (job) => {
					const resolvedShowLineNumbers =
						job.effectiveOptions.showLineNumbers ??
						defaultShowLineNumbers(job.language, job.placeholderCode);
					try {
						const highlighted = await highlightWithMantleShiki({
							code: job.placeholderCode,
							highlightLines: job.effectiveOptions.highlightLines,
							indentation: inferIndentation(job.language, job.effectiveOptions.indentation),
							language: job.language,
							lineNumberStart: job.effectiveOptions.lineNumberStart,
							showLineNumbers: resolvedShowLineNumbers,
						});
						return { ...job, highlighted, resolvedShowLineNumbers } as const;
					} catch (error) {
						return { ...job, error } as const;
					}
				}),
			);

			const ms = new MagicString(code);
			let didTransform = false;

			for (const result of results) {
				if ("error" in result) {
					this.warn(
						`mantleCodeVitePlugin: Shiki failed for language "${result.language}" in ${id}: ${result.error}`,
					);
					continue;
				}

				const {
					componentProps,
					dynamicExpressions,
					effectiveOptions,
					highlighted,
					language,
					node,
					preValToken,
					resolvedShowLineNumbers,
				} = result;

				for (const range of [...componentProps.attributeRemovalRanges].toSorted(
					(a, b) => b.start - a.start,
				)) {
					ms.remove(range.start, range.end);
				}

				const escapedHtml = escapeForTemplateLiteral(highlighted.html);
				const escapedCode = escapeForTemplateLiteral(highlighted.code);
				// Only the dynamic interpolations remain as runtime `~preVals`; statically
				// inlined fragments are already baked into the highlighted HTML and code.
				const preValsArray =
					dynamicExpressions.length === 0
						? "undefined"
						: `[${dynamicExpressions.map((expression) => code.slice(expression.start, expression.end)).join(",")}]`;
				const replacementEntries = [
					`language:${JSON.stringify(language)}`,
					`code:\`${escapedCode}\``,
					`"~preHtml":\`${escapedHtml}\``,
					`"~preValToken":${JSON.stringify(dynamicExpressions.length === 0 ? undefined : preValToken)}`,
					`"~preVals":${preValsArray}`,
					`"~showLineNumbers":${JSON.stringify(resolvedShowLineNumbers)}`,
					`"~highlightLines":${JSON.stringify(effectiveOptions.highlightLines)}`,
					`"~lineNumberStart":${JSON.stringify(effectiveOptions.lineNumberStart)}`,
				];
				const replacement = `({${replacementEntries.join(",")}})`;

				ms.overwrite(node.start, node.end, replacement);
				didTransform = true;
			}

			if (!didTransform) {
				return;
			}

			return {
				code: ms.toString(),
				map: ms.generateMap({ hires: true }),
			};
		},
	};
}

export { mantleCodeVitePlugin };
