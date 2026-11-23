import { parseSync } from "oxc-parser";
import { hasKind, isRecord, walk } from "~/utilities/mcp/ast-walk";
import { DOM_PROP_NAMES } from "~/utilities/mcp/dom-props";
import type { PartProps } from "~/utilities/mcp/part-props.server";
import type { VersionData } from "~/utilities/mcp/version-data.server";

const MAX_DIAGNOSTICS = 40;

/**
 * The largest file that `check` reads. Why 100 KB: a dashboard page can pass
 * 20 KB, and an excerpt hides the imports and parts that check reads. The
 * `/mcp` body limit leaves room for the JSON escapes of this much code.
 */
export const MAX_CHECK_CODE_BYTES = 100 * 1024;

/** One `check` finding. Messages name identifiers only; they never quote the code. */
export type Diagnostic = {
	code:
		| "parse-error"
		| "unknown-subpath"
		| "unknown-export"
		| "foreign-ui-library"
		| "clsx-classnames"
		| "classname-construction"
		| "missing-default-export"
		| "incomplete-context"
		| "unknown-part"
		| "unknown-prop"
		| "forbidden-prop"
		| "missing-prop"
		| "missing-dialog-title";
	severity: "error" | "warning" | "info";
	message: string;
	/** One-based line and column of the start of the finding. */
	line: number;
	column: number;
	fix?: string;
	docsUrl?: string;
};

const FOREIGN_UI_LIBRARIES: readonly RegExp[] = [
	/^@radix-ui\//,
	/^radix-ui$/,
	/^@mui\//,
	/^@chakra-ui\//,
	/^antd$/,
	/^@headlessui\//,
	/^@ariakit\//,
	/^react-bootstrap$/,
	// Why: shadcn copies its parts into the app under `components/ui`.
	/(^|\/)components\/ui(\/|$)/,
];

/** The parts whose `Content` needs a `Title` or an `aria-label` for its accessible name. */
const DIALOG_SPECIFIERS: ReadonlySet<string> = new Set([
	"@ngrok/mantle/dialog",
	"@ngrok/mantle/alert-dialog",
	"@ngrok/mantle/sheet",
]);

/** What a JSX name reads from a mantle import: an export, or the whole module for `import * as`. */
type MantleBinding = { specifier: string; name: string | undefined };

/** One JSX element that renders a mantle part. */
type PartUse = {
	specifier: string;
	/** The export and member path, such as `["Dialog", "Content"]`. */
	path: string[];
	/** The name as the code writes it, such as `Dialog.Content`. */
	label: string;
};

/** The segments of a JSX element name: `["Dialog", "Content"]` for `Dialog.Content`. */
function jsxNameSegments(name: unknown): string[] | undefined {
	if (!isRecord(name)) {
		return undefined;
	}
	if (name.type === "JSXIdentifier" && typeof name.name === "string") {
		return [name.name];
	}
	if (name.type === "JSXMemberExpression" && isRecord(name.property)) {
		const object = jsxNameSegments(name.object);
		const property = name.property.name;
		return object == null || typeof property !== "string" ? undefined : [...object, property];
	}
	return undefined;
}

/** The namespace of a compound part, such as `@ngrok/mantle/dialog#Dialog` for `Dialog.Content`. */
const namespaceOf = (use: PartUse) => `${use.specifier}#${use.path.slice(0, -1).join(".")}`;

/** The edit distance between two names, for a "did you mean" hint. */
function editDistance(left: string, right: string): number {
	let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
	for (let row = 1; row <= left.length; row += 1) {
		const current = [row];
		for (let column = 1; column <= right.length; column += 1) {
			const cost = left[row - 1] === right[column - 1] ? 0 : 1;
			current[column] = Math.min(
				(previous[column] ?? 0) + 1,
				(current[column - 1] ?? 0) + 1,
				(previous[column - 1] ?? 0) + cost,
			);
		}
		previous = current;
	}
	return previous[right.length] ?? 0;
}

/** The declared prop closest to a name the part does not take, such as `label` for `aria-label`. */
function closestProp(name: string, names: ReadonlySet<string>): string | undefined {
	const wanted = name.toLowerCase().replace(/^aria-/, "");
	const limit = Math.max(1, Math.floor(wanted.length / 4));
	let best: { name: string; distance: number } | undefined;
	for (const candidate of names) {
		const distance = editDistance(candidate.toLowerCase(), wanted);
		if (distance <= limit && (best == null || distance < best.distance)) {
			best = { name: candidate, distance };
		}
	}
	return best?.name;
}

/** Why a part rejects a prop, or `undefined` when it takes it. */
function propProblem(name: string, props: PartProps): "unknown" | "forbidden" | undefined {
	if (props.names.has(name) || name === "key") {
		return undefined;
	}
	if (props.never.has(name)) {
		return "forbidden";
	}
	// Why: TypeScript accepts each hyphenated JSX attribute, such as `data-testid`.
	if (name.includes("-") || props.open) {
		return undefined;
	}
	if (props.omitted.has(name)) {
		return "forbidden";
	}
	return props.dom && DOM_PROP_NAMES.has(name) ? undefined : "unknown";
}

/** Whether a JSX child renders something, so it can fill a required `children` prop. */
const rendersSomething = (child: unknown) =>
	isRecord(child) &&
	(child.type !== "JSXText" || (typeof child.value === "string" && child.value.trim() !== ""));

/** The one-based line and column of `offset`, from the offset where each line starts. */
function lineAndColumn(
	lineStarts: readonly number[],
	offset: number,
): { line: number; column: number } {
	let low = 0;
	let high = lineStarts.length - 1;
	while (low < high) {
		const middle = Math.ceil((low + high) / 2);
		if ((lineStarts[middle] ?? 0) <= offset) {
			low = middle;
		} else {
			high = middle - 1;
		}
	}
	return { line: low + 1, column: offset - (lineStarts[low] ?? 0) + 1 };
}

/** The specifiers that export `name`, for a fix hint. */
function specifiersExporting(data: VersionData, name: string): string[] {
	const found: string[] = [];
	for (const [specifier, exported] of data.exportsBySpecifier) {
		if (exported.names.has(name)) {
			found.push(specifier);
		}
	}
	return found;
}

/** Whether a `className` value builds a string by hand instead of with `cx`. */
function isConstructedClassName(expression: Record<string, unknown>): boolean {
	if (expression.type === "TemplateLiteral") {
		return Array.isArray(expression.expressions) && expression.expressions.length > 0;
	}
	if (expression.type === "BinaryExpression") {
		return expression.operator === "+";
	}
	return expression.type === "ConditionalExpression";
}

/** The name an import entry reads: `default` for a default import, `undefined` for a namespace. */
function importedNameOf(importName: { kind: string; name: string | null }): string | undefined {
	if (hasKind(importName, "Default")) {
		return "default";
	}
	return importName.name ?? undefined;
}

/** Whether a module exports a default, as `export default` or `export { x as default }`. */
function hasDefaultExport(module: ReturnType<typeof parseSync>["module"]): boolean {
	return module.staticExports.some((statement) =>
		statement.entries.some(
			(entry) => hasKind(entry.exportName, "Default") || entry.exportName.name === "default",
		),
	);
}

/**
 * Runs `check` stage A on one TSX file: a parse, then mantle import, export,
 * and `className` rules for the selected version. No TypeScript type check.
 * With `requireDefaultExport`, a file with no default export is an error.
 *
 * @example
 * checkCode({ code: 'import { Buton } from "@ngrok/mantle/button";', data });
 * // [{ code: "unknown-export", message: "@ngrok/mantle/button does not export Buton.", … }]
 */
export function checkCode({
	code,
	data,
	requireDefaultExport = false,
	docsWordsOf,
}: {
	code: string;
	data: VersionData;
	requireDefaultExport?: boolean;
	/** The words of the docs build's declarations for a specifier, when it has changes the version lacks. */
	docsWordsOf?: (specifier: string) => ReadonlySet<string> | undefined;
}): Diagnostic[] {
	const diagnostics: Diagnostic[] = [];
	const lineStarts = [0];
	for (let index = code.indexOf("\n"); index !== -1; index = code.indexOf("\n", index + 1)) {
		lineStarts.push(index + 1);
	}
	const add = (offset: number, diagnostic: Omit<Diagnostic, "line" | "column">) => {
		diagnostics.push({ ...diagnostic, ...lineAndColumn(lineStarts, offset) });
	};

	const parsed = parseSync("input.tsx", code);
	for (const error of parsed.errors) {
		add(error.labels[0]?.start ?? 0, {
			code: "parse-error",
			severity: "error",
			message: error.message,
		});
	}
	if (parsed.errors.length > 0) {
		return diagnostics.slice(0, MAX_DIAGNOSTICS);
	}

	const cxUrl = "https://mantle.ngrok.com/utils/cx";

	if (requireDefaultExport && !hasDefaultExport(parsed.module)) {
		add(0, {
			code: "missing-default-export",
			severity: "error",
			message: "The file has no default export, so the preview has no component to render.",
			fix: "export default function App() { … }",
		});
	}

	const bindings = new Map<string, MantleBinding>();
	for (const statement of parsed.module.staticImports) {
		const specifier = statement.moduleRequest.value;
		const start = statement.moduleRequest.start;

		if (specifier === "clsx" || specifier === "classnames") {
			add(start, {
				code: "clsx-classnames",
				severity: "error",
				message: `Compose class names with cx, not ${specifier}.`,
				fix: 'import { cx } from "@ngrok/mantle/cx";',
				docsUrl: cxUrl,
			});
			continue;
		}
		if (FOREIGN_UI_LIBRARIES.some((pattern) => pattern.test(specifier))) {
			add(start, {
				code: "foreign-ui-library",
				severity: "error",
				message: `${specifier} is a UI library other than mantle. Use the mantle part for the same job.`,
				fix: "Call `find` with the job this import does, such as `dialog` or `select`.",
			});
			continue;
		}
		if (specifier.startsWith(".") || specifier.startsWith("~/") || specifier.startsWith("@/")) {
			add(start, {
				code: "incomplete-context",
				severity: "info",
				message: `${specifier} is a local module. check cannot see it, and preview cannot load it.`,
			});
			continue;
		}
		if (specifier !== "@ngrok/mantle" && !specifier.startsWith("@ngrok/mantle/")) {
			continue;
		}
		// Why drop the query: a bundler reads `mantle.css?url` from the `mantle.css` export.
		const assetPath = specifier.replace(/[?#].*$/, "");
		if (/\.(css|json|txt)$/.test(assetPath)) {
			if (!data.specifiers.has(assetPath)) {
				add(start, {
					code: "unknown-subpath",
					severity: "error",
					message: `@ngrok/mantle@${data.version} has no import path ${assetPath}.`,
				});
			}
			continue;
		}

		const exported = data.exportsBySpecifier.get(specifier);
		const importedNames = statement.entries.flatMap((entry) => {
			const name = importedNameOf(entry.importName);
			return name == null ? [] : [name];
		});
		if (exported == null) {
			const hints = importedNames.map((name) => {
				const homes = specifiersExporting(data, name);
				return homes.length > 0
					? `${name} from ${homes.join(" or ")}`
					: `${name}: no subpath exports it`;
			});
			add(start, {
				code: "unknown-subpath",
				severity: "error",
				message: `@ngrok/mantle@${data.version} has no import path ${specifier}. Each part imports from its own subpath.`,
				fix: hints.length > 0 ? `Import ${hints.join("; ")}.` : undefined,
			});
			continue;
		}
		for (const entry of statement.entries) {
			const name = importedNameOf(entry.importName);
			if (!entry.isType && (name == null || (name !== "default" && exported.names.has(name)))) {
				bindings.set(entry.localName.value, { specifier, name });
			}
			if (name == null || exported.names.has(name)) {
				continue;
			}
			// Why not `default`: `export *` never re-exports a default.
			if (exported.externalStars.length > 0 && name !== "default") {
				add(entry.importName.start ?? start, {
					code: "incomplete-context",
					severity: "info",
					message: `${specifier} re-exports ${exported.externalStars.join(", ")}. check cannot see whether ${name} comes from there.`,
				});
				continue;
			}
			const homes = specifiersExporting(data, name);
			add(entry.importName.start ?? start, {
				code: "unknown-export",
				severity: "error",
				message: `${specifier} does not export ${name} in @ngrok/mantle@${data.version}.`,
				fix:
					homes.length > 0
						? `Import ${name} from ${homes.join(" or ")}.`
						: "Call `get` with the component name to see what it exports.",
			});
		}
	}

	// Why: a local declaration can shadow an import, and its JSX is not the mantle part.
	const shadowed = new Set<string>();
	walk(parsed.program, (node) => {
		const declares =
			node.type === "VariableDeclarator" ||
			node.type === "FunctionDeclaration" ||
			node.type === "ClassDeclaration";
		const declared = [declares ? node.id : undefined, node.params];
		walk(declared, (binding) => {
			if (
				binding.type === "Identifier" &&
				typeof binding.name === "string" &&
				bindings.has(binding.name)
			) {
				shadowed.add(binding.name);
			}
		});
	});

	const partUseOf = (opening: unknown): PartUse | undefined => {
		const segments = isRecord(opening) ? jsxNameSegments(opening.name) : undefined;
		const [first = ""] = segments ?? [];
		// Why: a lone lowercase name such as `<button>` is a DOM element, whatever the file imports.
		const intrinsic = segments?.length === 1 && /^[a-z]/.test(first);
		const binding = intrinsic || shadowed.has(first) ? undefined : bindings.get(first);
		if (segments == null || binding == null) {
			return undefined;
		}
		const members = segments.slice(1);
		const path = binding.name == null ? members : [binding.name, ...members];
		return path.length === 0
			? undefined
			: { specifier: binding.specifier, path, label: segments.join(".") };
	};

	const checkProps = (element: Record<string, unknown>, use: PartUse, props: PartProps) => {
		const opening = isRecord(element.openingElement) ? element.openingElement : {};
		const attributes = Array.isArray(opening.attributes) ? opening.attributes : [];
		const given = new Set<string>();
		let spread = false;
		for (const attribute of attributes) {
			if (!isRecord(attribute) || attribute.type !== "JSXAttribute") {
				spread = true;
				continue;
			}
			const attributeName = isRecord(attribute.name) ? attribute.name : {};
			const name = attributeName.name;
			if (typeof name !== "string" || attributeName.type !== "JSXIdentifier") {
				continue;
			}
			given.add(name);
			const problem = propProblem(name, props);
			if (problem == null) {
				continue;
			}
			const offset = typeof attribute.start === "number" ? attribute.start : 0;
			const suggestion = closestProp(name, props.names);
			const hint = suggestion == null ? "" : `Did you mean ${suggestion}? `;
			if (problem === "forbidden") {
				add(offset, {
					code: "forbidden-prop",
					severity: "error",
					message: `${use.label} does not take ${name}.`,
					fix: `${hint}Call \`get\` with ${use.path[0]} for its props.`,
				});
				continue;
			}
			add(offset, {
				code: "unknown-prop",
				severity: "error",
				message: `${use.label} has no prop ${name} in @ngrok/mantle@${data.version}.`,
				fix: docsWordsOf?.(use.specifier)?.has(name)
					? `The docs show ${name}, but no release has it yet. Remove it.`
					: `${hint}Call \`get\` with ${use.path[0]} for its props.`,
			});
		}
		if (spread) {
			return;
		}
		const children = Array.isArray(element.children) ? element.children : [];
		const missing = [...props.required].filter(
			(name) => !given.has(name) && !(name === "children" && children.some(rendersSomething)),
		);
		if (missing.length > 0) {
			add(typeof opening.start === "number" ? opening.start : 0, {
				code: "missing-prop",
				severity: "error",
				message: `${use.label} requires ${missing.join(", ")}.`,
				fix: `Call \`get\` with ${use.path[0]} for the type of each.`,
			});
		}
	};

	/** Whether a dialog `Content` element names its dialog, or can name it in code that check cannot see. */
	const namesDialog = (element: Record<string, unknown>, use: PartUse): boolean => {
		const opening = isRecord(element.openingElement) ? element.openingElement : {};
		const attributes = Array.isArray(opening.attributes) ? opening.attributes : [];
		const namingProps = new Set(["aria-label", "aria-labelledby", "children"]);
		if (
			attributes.some(
				(attribute) =>
					!isRecord(attribute) ||
					attribute.type !== "JSXAttribute" ||
					(isRecord(attribute.name) && namingProps.has(String(attribute.name.name))),
			)
		) {
			return true;
		}
		const namespace = namespaceOf(use);
		const names = (node: unknown): boolean => {
			if (Array.isArray(node)) {
				return node.some(names);
			}
			if (!isRecord(node)) {
				return false;
			}
			if (node.type === "JSXElement") {
				const child = partUseOf(node.openingElement);
				const opening = isRecord(node.openingElement) ? node.openingElement : {};
				const [first = ""] = jsxNameSegments(opening.name) ?? [];
				if (child != null && namespaceOf(child) === namespace) {
					// Why stop at a nested Content: it names its own dialog, and one pass keeps check linear.
					return (
						child.path.at(-1) === "Title" ||
						(child.path.at(-1) !== "Content" && names(node.children))
					);
				}
				// Why a local component counts: it can render the title where check cannot see.
				return (child == null && /^[A-Z]/.test(first)) || names(node.children);
			}
			if (node.type === "JSXExpressionContainer" && isRecord(node.expression)) {
				// Why: an identifier, a call, or `{/* … */}` can hold a title that check cannot see.
				const { type } = node.expression;
				return (
					(type !== "Literal" && type !== "JSXElement" && type !== "JSXFragment") ||
					names(node.expression)
				);
			}
			return Object.entries(node).some(
				([key, value]) => key !== "parent" && typeof value === "object" && names(value),
			);
		};
		return names(element.children);
	};

	const checkElement = (element: Record<string, unknown>, use: PartUse) => {
		const offset = typeof element.start === "number" ? element.start : 0;
		const owner = use.label.slice(0, use.label.lastIndexOf("."));
		const lookup = data.partPropsOf(use.specifier, use.path);
		if (lookup.status === "no-member") {
			add(offset, {
				code: "unknown-part",
				severity: "error",
				message: `${owner} has no part ${lookup.member} in @ngrok/mantle@${data.version}.`,
				fix: `Use one of: ${lookup.members.join(", ")}.`,
			});
			return;
		}
		if (lookup.status === "part") {
			checkProps(element, use, lookup.props);
		}
		if (
			DIALOG_SPECIFIERS.has(use.specifier) &&
			use.path.length === 2 &&
			use.path[1] === "Content" &&
			data.partPropsOf(use.specifier, [use.path[0] ?? "", "Title"]).status === "part" &&
			!namesDialog(element, use)
		) {
			add(offset, {
				code: "missing-dialog-title",
				severity: "error",
				message: `${use.label} has no ${owner}.Title, so the dialog has no accessible name.`,
				fix: `Add <${owner}.Title> inside it, or set aria-label on ${use.label}.`,
			});
		}
	};

	if (bindings.size > 0) {
		walk(parsed.program, (node) => {
			const use = node.type === "JSXElement" ? partUseOf(node.openingElement) : undefined;
			if (use != null) {
				checkElement(node, use);
			}
		});
	}

	walk(parsed.program, (node) => {
		if (node.type !== "JSXAttribute" || !isRecord(node.name) || node.name.name !== "className") {
			return;
		}
		const value = isRecord(node.value) ? node.value : undefined;
		const expression =
			value?.type === "JSXExpressionContainer" && isRecord(value.expression)
				? value.expression
				: undefined;
		if (expression != null && isConstructedClassName(expression)) {
			add(typeof node.start === "number" ? node.start : 0, {
				code: "classname-construction",
				severity: "error",
				message: "Build className with cx, not a template string, `+`, or a ternary.",
				fix: 'className={cx("base", condition && "extra")}',
				docsUrl: cxUrl,
			});
		}
	});

	return diagnostics
		.toSorted((left, right) => left.line - right.line || left.column - right.column)
		.slice(0, MAX_DIAGNOSTICS);
}
