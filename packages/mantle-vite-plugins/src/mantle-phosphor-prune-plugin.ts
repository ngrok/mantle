import MagicString from "magic-string";
import {
	parseSync,
	Visitor,
	type Argument,
	type ArrayExpression,
	type BindingPattern,
	type Expression,
	type IdentifierName,
	type JSXAttributeItem,
	type JSXElementName,
	type ParamPattern,
	type PrivateIdentifier,
	type ObjectPropertyKind,
} from "oxc-parser";
import type { Plugin } from "vite";

/** The weights of a Phosphor icon, in the order of its weight module. */
const WEIGHTS = new Set(["bold", "duotone", "fill", "light", "regular", "thin"]);

/** Phosphor's `IconContext` default weight, which an icon without a `weight` prop renders. */
const DEFAULT_CONTEXT_WEIGHT = "regular";

/**
 * Tags each weight entry of a weight module, so `renderChunk` finds the entry in the bundle. A
 * `Map` entry reads only its first two items, so the tag changes nothing at runtime.
 */
const MARKER = "@ngrok/mantle-vite-plugins:phosphor-weight:";

/** A weight module of `@phosphor-icons/react` 2.x, which holds the paths of all six weights. */
const WEIGHT_MODULE_RE = /[\\/]@phosphor-icons[\\/]react[\\/]dist[\\/]defs[\\/](\w+)\.es\.js$/;
const PHOSPHOR_FILE_RE = /[\\/]@phosphor-icons[\\/]react[\\/]/;
const CONTEXT_MODULE_RE = /[\\/]@phosphor-icons[\\/]react[\\/]dist[\\/]lib[\\/]context\.es\.js$/;
const PHOSPHOR_IMPORT_RE = /^@phosphor-icons\/react(?:\/(.+))?$/;
/** An icon subpath, such as `Check`, `dist/csr/Check`, or `dist/ssr/Check`. */
const ICON_SUBPATH_RE = /^(?:dist\/(?:csr|ssr|defs)\/)?([A-Z]\w*?)(?:\.es\.js)?$/;
const BARREL_SUBPATHS = new Set([undefined, "ssr", "dist/ssr", "dist/index.es.js"]);
const LIB_SUBPATH_RE = /^(?:lib|dist\/lib(?:\/\w+)?)$/;
/** The React calls the analysis reads, by what each one does with an icon or `IconContext`. */
const REACT_CALLS = new Map<string, "render" | "clone" | "read">([
	["jsx", "render"],
	["jsxs", "render"],
	["jsxDEV", "render"],
	["createElement", "render"],
	["cloneElement", "clone"],
	["useContext", "read"],
	["use", "read"],
]);
const REACT_MODULES = new Set(["react", "react/jsx-runtime", "react/jsx-dev-runtime"]);

/** The weights one render of an icon can select. */
type WeightSet = { kind: "implicit" } | { kind: "some"; weights: string[] } | { kind: "all" };

type IconUsage = {
	weights: Set<string>;
	/** An element renders without a `weight` prop, so it shows the `IconContext` weight. */
	implicit: boolean;
	/** A reference the analysis cannot follow, so the icon keeps every weight. */
	all: boolean;
};

type ModuleUsage = {
	icons: Map<string, IconUsage>;
	contextWeights: Set<string>;
	contextAll: boolean;
	/** The weights a `cloneElement()` call sets, which can reach any icon element. */
	cloneWeights: Set<string>;
	/** The module uses Phosphor in a way the analysis cannot follow, such as a namespace import. */
	all: boolean;
	/** The import sources that do not name Phosphor, which can still resolve to it, such as an alias. */
	sources: string[];
};

const emptyUsage = (): ModuleUsage => ({
	icons: new Map(),
	contextWeights: new Set(),
	contextAll: false,
	cloneWeights: new Set(),
	all: false,
	sources: [],
});

const unwrap = (node: Expression): Expression =>
	node.type === "ParenthesizedExpression" ||
	node.type === "TSAsExpression" ||
	node.type === "TSSatisfiesExpression" ||
	node.type === "TSNonNullExpression"
		? unwrap(node.expression)
		: node;

/** The strings an expression can evaluate to, or null when it is not a static string. */
function staticStrings(expression: Expression | PrivateIdentifier): string[] | null {
	if (expression.type === "PrivateIdentifier") {
		return null;
	}
	const node = unwrap(expression);
	if (node.type === "Literal") {
		return typeof node.value === "string" ? [node.value] : null;
	}
	if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
		return node.quasis.map((quasi) => quasi.value.cooked ?? "");
	}
	if (node.type === "ConditionalExpression") {
		const consequent = staticStrings(node.consequent);
		const alternate = staticStrings(node.alternate);
		return consequent != null && alternate != null ? [...consequent, ...alternate] : null;
	}
	return null;
}

const weightsOf = (expression: Expression): WeightSet => {
	const strings = staticStrings(expression);
	return strings == null ? { kind: "all" } : { kind: "some", weights: strings };
};

/** The weights the JSX attributes of an icon select; a later attribute wins over an earlier spread. */
function jsxPropWeights(attributes: JSXAttributeItem[]): WeightSet {
	let result: WeightSet = { kind: "implicit" };
	for (const attribute of attributes) {
		if (attribute.type === "JSXSpreadAttribute") {
			result = { kind: "all" };
		} else if (attribute.name.type === "JSXIdentifier" && attribute.name.name === "weight") {
			const value = attribute.value;
			if (value == null) {
				// Why: `<Icon weight />` passes `true`, which selects no weight.
				result = { kind: "some", weights: [] };
			} else if (value.type === "Literal") {
				result = { kind: "some", weights: [value.value] };
			} else if (
				value.type === "JSXExpressionContainer" &&
				value.expression.type !== "JSXEmptyExpression"
			) {
				result = weightsOf(value.expression);
			} else {
				result = { kind: "all" };
			}
		}
	}
	return result;
}

/** The weights the props object of an icon selects, such as the second argument of `jsx()`. */
function objectPropWeights(properties: ObjectPropertyKind[]): WeightSet {
	let result: WeightSet = { kind: "implicit" };
	for (const property of properties) {
		if (property.type === "SpreadElement") {
			result = { kind: "all" };
		} else if (property.computed) {
			result = { kind: "all" };
		} else if (
			(property.key.type === "Identifier" && property.key.name === "weight") ||
			(property.key.type === "Literal" && property.key.value === "weight")
		) {
			result = weightsOf(property.value);
		}
	}
	return result;
}

/** The weights a props argument of `jsx()` or `createElement()` selects. */
function argumentPropWeights(argument: Argument | undefined): WeightSet {
	if (argument == null) {
		return { kind: "implicit" };
	}
	if (argument.type === "SpreadElement") {
		return { kind: "all" };
	}
	const node = unwrap(argument);
	if (node.type === "ObjectExpression") {
		return objectPropWeights(node.properties);
	}
	return node.type === "Literal" && node.value == null ? { kind: "implicit" } : { kind: "all" };
}

/** The weights an `IconContext` value selects: the `weight` of an object literal, else every weight. */
function contextValueWeights(value: Expression): WeightSet {
	const node = unwrap(value);
	return node.type === "ObjectExpression" ? objectPropWeights(node.properties) : { kind: "all" };
}

/** The weights the JSX attributes of an `IconContext` provider select through `value`. */
function jsxContextWeights(attributes: JSXAttributeItem[]): WeightSet {
	let result: WeightSet = { kind: "implicit" };
	for (const attribute of attributes) {
		if (attribute.type === "JSXSpreadAttribute") {
			result = { kind: "all" };
		} else if (attribute.name.type === "JSXIdentifier" && attribute.name.name === "value") {
			result =
				attribute.value?.type === "JSXExpressionContainer" &&
				attribute.value.expression.type !== "JSXEmptyExpression"
					? contextValueWeights(attribute.value.expression)
					: { kind: "all" };
		}
	}
	return result;
}

/** The weights the props argument of an `IconContext` provider selects through `value`. */
function argumentContextWeights(argument: Argument | undefined): WeightSet {
	const props = argument == null || argument.type === "SpreadElement" ? null : unwrap(argument);
	if (props?.type !== "ObjectExpression") {
		return { kind: "all" };
	}
	let result: WeightSet = { kind: "implicit" };
	for (const property of props.properties) {
		if (property.type === "SpreadElement" || property.computed) {
			result = { kind: "all" };
		} else if (
			(property.key.type === "Identifier" && property.key.name === "value") ||
			(property.key.type === "Literal" && property.key.value === "value")
		) {
			result = contextValueWeights(property.value);
		}
	}
	return result;
}

/** The names a binding pattern declares, such as `a` and `b` in `{ a, b: [c = 1] }` with `c`. */
function patternNames(pattern: BindingPattern | ParamPattern | null | undefined): string[] {
	switch (pattern?.type) {
		case "Identifier":
			return [pattern.name];
		case "ObjectPattern":
			return pattern.properties.flatMap((property) =>
				patternNames(property.type === "RestElement" ? property.argument : property.value),
			);
		case "ArrayPattern":
			return pattern.elements.flatMap((element) =>
				patternNames(element?.type === "RestElement" ? element.argument : element),
			);
		case "AssignmentPattern":
			return patternNames(pattern.left);
		case "RestElement":
			return patternNames(pattern.argument);
		case "TSParameterProperty":
			return patternNames(pattern.parameter);
		default:
			return [];
	}
}

/**
 * The names a property or member key can be: its name, its string, or the strings a computed key
 * evaluates to. Null when a computed key is not static.
 */
function keyNames({
	key,
	computed,
}: {
	key: Expression | IdentifierName | PrivateIdentifier;
	computed: boolean;
}): string[] | null {
	if (computed && key.type !== "Identifier") {
		return staticStrings(key);
	}
	if (key.type === "Identifier") {
		return computed ? null : [key.name];
	}
	return key.type === "Literal" ? [String(key.value)] : null;
}

/** The parser language of a module path; any other source parses as JavaScript with JSX. */
function langOf(path: string): "ts" | "tsx" | "jsx" {
	if (path.endsWith(".tsx")) {
		return "tsx";
	}
	return /\.[cm]?ts$/.test(path) ? "ts" : "jsx";
}

/**
 * The function a call runs: its callee, or the last item of a compiled `(0, r.jsx)` callee.
 */
function calleeOf(callee: Expression): Expression {
	const node = unwrap(callee);
	const last = node.type === "SequenceExpression" ? node.expressions.at(-1) : undefined;
	return last == null ? node : calleeOf(last);
}

const iconName = (subpath: string | undefined, importedName: string): string | null => {
	if (subpath != null) {
		return ICON_SUBPATH_RE.exec(subpath)?.[1] ?? null;
	}
	return importedName.endsWith("Icon") ? importedName.slice(0, -4) : importedName;
};

/**
 * Reads which Phosphor icons a module renders and with which weights.
 *
 * It follows icons in JSX and in `jsx()` and `createElement()` calls, `IconContext` values, and the
 * `weight` of `cloneElement()` calls. Any other reference keeps every weight of that icon, and a
 * namespace import keeps every weight of every icon.
 *
 * @returns null when the module neither imports `@phosphor-icons/react` nor sets a weight with
 * `cloneElement()`.
 */
function collectUsage(code: string, id: string): ModuleUsage | null {
	const path = id.split("?")[0] ?? id;
	const { program, errors } = parseSync(path, code, { lang: langOf(path), sourceType: "module" });
	const usage = emptyUsage();
	if (errors.length > 0) {
		// Why: only a module that imports Phosphor can hide a render the analysis must see.
		usage.all = true;
		return code.includes("@phosphor-icons/react") ? usage : null;
	}
	/** The icons each local binding names: an import, or a `const` alias such as `open ? A : B`. */
	const icons = new Map<string, string[]>();
	const contexts = new Set<string>();
	const reactBindings = new Map<string, "render" | "clone" | "read">();
	const reactNamespaces = new Set<string>();
	let imports = false;

	const icon = (name: string) => {
		const existing = usage.icons.get(name);
		if (existing != null) {
			return existing;
		}
		const created: IconUsage = { weights: new Set(), implicit: false, all: false };
		usage.icons.set(name, created);
		return created;
	};
	const addIconWeights = (name: string, weights: WeightSet) => {
		const entry = icon(name);
		if (weights.kind === "all") {
			entry.all = true;
		} else if (weights.kind === "implicit") {
			entry.implicit = true;
		} else {
			for (const weight of weights.weights) {
				entry.weights.add(weight);
			}
		}
	};
	const addContextWeights = (weights: WeightSet) => {
		if (weights.kind === "all") {
			usage.contextAll = true;
		} else if (weights.kind === "some") {
			for (const weight of weights.weights) {
				usage.contextWeights.add(weight);
			}
		}
	};

	for (const statement of program.body) {
		if (
			statement.type === "ImportDeclaration" &&
			statement.importKind !== "type" &&
			REACT_MODULES.has(statement.source.value)
		) {
			for (const specifier of statement.specifiers) {
				const kind =
					specifier.type === "ImportSpecifier" && specifier.imported.type === "Identifier"
						? REACT_CALLS.get(specifier.imported.name)
						: undefined;
				if (kind != null) {
					reactBindings.set(specifier.local.name, kind);
				} else if (specifier.type !== "ImportSpecifier") {
					reactNamespaces.add(specifier.local.name);
				}
			}
		}
		if (
			statement.type !== "ImportDeclaration" &&
			statement.type !== "ExportNamedDeclaration" &&
			statement.type !== "ExportAllDeclaration"
		) {
			continue;
		}
		if (
			statement.source == null ||
			(statement.type === "ImportDeclaration" ? statement.importKind : statement.exportKind) ===
				"type"
		) {
			continue;
		}
		const source = PHOSPHOR_IMPORT_RE.exec(statement.source.value);
		if (source == null) {
			usage.sources.push(statement.source.value);
			continue;
		}
		imports = true;
		const subpath = source[1];
		const known =
			BARREL_SUBPATHS.has(subpath) ||
			LIB_SUBPATH_RE.test(subpath ?? "") ||
			ICON_SUBPATH_RE.test(subpath ?? "");
		if (!known || statement.type === "ExportAllDeclaration") {
			usage.all = true;
			continue;
		}
		const named: Array<{ imported: string; local: string | null; type: boolean } | null> = [];
		if (statement.type === "ImportDeclaration") {
			for (const specifier of statement.specifiers) {
				named.push(
					specifier.type === "ImportSpecifier"
						? {
								imported:
									specifier.imported.type === "Literal"
										? specifier.imported.value
										: specifier.imported.name,
								local: specifier.local.name,
								type: specifier.importKind === "type",
							}
						: null,
				);
			}
		} else {
			for (const specifier of statement.specifiers) {
				named.push({
					imported:
						specifier.local.type === "Literal" ? specifier.local.value : specifier.local.name,
					local: null,
					type: specifier.exportKind === "type",
				});
			}
		}
		for (const specifier of named) {
			if (specifier == null) {
				// Why: a runtime module renders no icon, but its namespace can reach `IconContext`. A
				// default or namespace import of the barrel or an icon reaches every icon.
				if (LIB_SUBPATH_RE.test(subpath ?? "")) {
					usage.contextAll ||=
						statement.type === "ImportDeclaration" &&
						statement.specifiers.some((item) => item.type === "ImportNamespaceSpecifier");
				} else {
					usage.all = true;
				}
				continue;
			}
			if (specifier.type || specifier.imported === "IconBase" || specifier.imported === "SSRBase") {
				continue;
			}
			if (specifier.imported === "SSR") {
				// Why: the `SSR` export of the barrel is a namespace of every icon.
				usage.all = true;
				continue;
			}
			if (specifier.imported === "IconContext") {
				if (specifier.local == null) {
					usage.contextAll = true;
				} else {
					contexts.add(specifier.local);
				}
				continue;
			}
			const name = iconName(BARREL_SUBPATHS.has(subpath) ? undefined : subpath, specifier.imported);
			if (name == null) {
				continue;
			}
			if (specifier.local == null) {
				// A re-export lets another module render the icon.
				addIconWeights(name, { kind: "all" });
			} else {
				icons.set(specifier.local, [name]);
			}
		}
	}

	/**
	 * The source ranges of the scopes that declare an import name again, such as a parameter that
	 * reuses the short name of a minified React import. A reference in such a range is not the import.
	 */
	const importNames = new Set([
		...icons.keys(),
		...contexts,
		...reactBindings.keys(),
		...reactNamespaces,
	]);
	const shadows = new Map<string, Array<[number, number]>>();
	const shadow = (
		patterns: Array<BindingPattern | ParamPattern | null | undefined>,
		start: number,
		end: number,
	) => {
		for (const name of patterns.flatMap(patternNames)) {
			if (importNames.has(name)) {
				shadows.set(name, [...(shadows.get(name) ?? []), [start, end]]);
			}
		}
	};
	const scopes: Array<{ start: number; end: number; function: boolean }> = [];
	const declarations: Array<{ patterns: BindingPattern[]; at: number; var: boolean }> = [];
	const scope = (node: { start: number; end: number }) => {
		scopes.push({ start: node.start, end: node.end, function: false });
	};
	new Visitor({
		FunctionDeclaration(node) {
			scopes.push({ start: node.start, end: node.end, function: true });
			shadow(node.params, node.start, node.end);
			declarations.push({ patterns: node.id == null ? [] : [node.id], at: node.start, var: false });
		},
		FunctionExpression(node) {
			scopes.push({ start: node.start, end: node.end, function: true });
			shadow([node.id, ...node.params], node.start, node.end);
		},
		ArrowFunctionExpression(node) {
			scopes.push({ start: node.start, end: node.end, function: true });
			shadow(node.params, node.start, node.end);
		},
		BlockStatement: scope,
		StaticBlock: scope,
		SwitchStatement: scope,
		ForStatement: scope,
		ForInStatement: scope,
		ForOfStatement: scope,
		CatchClause: (node) => shadow([node.param], node.start, node.end),
		ClassDeclaration: (node) =>
			declarations.push({ patterns: node.id == null ? [] : [node.id], at: node.start, var: false }),
		ClassExpression: (node) => shadow([node.id], node.start, node.end),
		VariableDeclaration: (node) =>
			declarations.push({
				patterns: node.declarations.map((declaration) => declaration.id),
				at: node.start,
				var: node.kind === "var",
			}),
	}).visit(program);
	for (const declaration of declarations) {
		// The nearest scope that holds the declaration: a function for `var`, else any block. A
		// declaration at the top level names the import itself, which is a syntax error.
		let nearest: { start: number; end: number } | null = null;
		for (const candidate of scopes) {
			if (
				candidate.start < declaration.at &&
				declaration.at < candidate.end &&
				(candidate.function || !declaration.var) &&
				(nearest == null || candidate.end - candidate.start < nearest.end - nearest.start)
			) {
				nearest = candidate;
			}
		}
		if (nearest != null) {
			shadow(declaration.patterns, nearest.start, nearest.end);
		}
	}
	/** Whether a reference reads the import of its name, not a binding of an inner scope. */
	const isImport = (node: { name: string; start: number }) =>
		!(shadows.get(node.name) ?? []).some(([start, end]) => start <= node.start && node.start < end);
	/** The local names that a destructuring of a React namespace binds to `cloneElement`. */
	const clones = new Set<string>();

	/**
	 * What a function does when it is a React function: an imported `jsx`, `createElement`,
	 * `cloneElement`, `use`, or `useContext`, or a member of a React namespace import, such as
	 * `React.createElement` or the compiled `r.jsx`. A member the analysis cannot name is unknown.
	 */
	const reactFunction = (node: Expression): "render" | "clone" | "read" | "unknown" | null => {
		if (node.type === "Identifier") {
			if (clones.has(node.name)) {
				return "clone";
			}
			return isImport(node) ? (reactBindings.get(node.name) ?? null) : null;
		}
		if (
			node.type !== "MemberExpression" ||
			node.object.type !== "Identifier" ||
			!reactNamespaces.has(node.object.name) ||
			!isImport(node.object)
		) {
			return null;
		}
		const key = keyNames({ key: node.property, computed: node.computed });
		return key?.length === 1 ? (REACT_CALLS.get(key[0] ?? "") ?? null) : "unknown";
	};
	new Visitor({
		VariableDeclarator(node) {
			const init = node.init == null ? null : unwrap(node.init);
			if (init?.type !== "Identifier" || !reactNamespaces.has(init.name) || !isImport(init)) {
				return;
			}
			// Why: `const { cloneElement: copy } = React` makes `copy` a clone function. Another
			// pattern can hold any React function, so the analysis cannot follow it.
			for (const property of node.id.type === "ObjectPattern" ? node.id.properties : [null]) {
				const key = property?.type === "Property" ? keyNames(property) : null;
				if (key?.length !== 1) {
					usage.all = true;
				} else if (REACT_CALLS.get(key[0] ?? "") === "clone" && property?.type === "Property") {
					for (const name of patternNames(property.value)) {
						clones.add(name);
					}
				}
			}
		},
	}).visit(program);

	const handled = new Set<unknown>();
	// Why imports only: aliases merge by name, so an alias of an alias can read a binding of
	// another scope. Such a read stays a plain reference, which keeps every weight.
	const imported = new Set(icons.keys());
	/** The icons a reference names: an imported icon, or an alias by its name. */
	const iconsOf = (node: { name: string; start: number }) =>
		!imported.has(node.name) || isImport(node) ? icons.get(node.name) : undefined;
	/** The imported icons an alias initializer reads, or null when it reads anything else. */
	const aliasedIcons = (init: Expression): Expression[] | null => {
		const node = unwrap(init);
		if (node.type === "Identifier") {
			return imported.has(node.name) && isImport(node) ? [node] : null;
		}
		if (node.type === "ConditionalExpression") {
			const consequent = aliasedIcons(node.consequent);
			const alternate = aliasedIcons(node.alternate);
			return consequent != null && alternate != null ? [...consequent, ...alternate] : null;
		}
		return null;
	};
	// Why: an exported alias lets another module render the icon, so it stays a plain reference.
	const exported = new Set(
		program.body.flatMap((statement) =>
			statement.type === "ExportNamedDeclaration" && statement.declaration != null
				? [statement.declaration]
				: [],
		),
	);
	new Visitor({
		VariableDeclaration(node) {
			const declarations = node.kind === "const" && !exported.has(node) ? node.declarations : [];
			for (const declaration of declarations) {
				const reads = declaration.init == null ? null : aliasedIcons(declaration.init);
				// Why not an import name: aliases merge by name, so the alias would read as the import
				// in every scope. Such an alias stays a plain reference to the icons it reads.
				if (
					reads != null &&
					declaration.id.type === "Identifier" &&
					!importNames.has(declaration.id.name)
				) {
					// Why the merge: aliases have no scopes, so two aliases with one name keep both icons.
					icons.set(declaration.id.name, [
						...(icons.get(declaration.id.name) ?? []),
						...reads.flatMap((read) =>
							read.type === "Identifier" ? (icons.get(read.name) ?? []) : [],
						),
					]);
					handled.add(declaration.id);
					for (const read of reads) {
						handled.add(read);
					}
				}
			}
		},
	}).visit(program);
	/** Reads a rendered element type: an icon, or `IconContext` and `IconContext.Provider`. */
	const renderedType = (
		name: JSXElementName | Expression,
	): { kind: "icon"; names: string[] } | { kind: "context" } | null => {
		const names =
			name.type === "JSXIdentifier" || name.type === "Identifier" ? iconsOf(name) : undefined;
		if (names != null) {
			handled.add(name);
			return { kind: "icon", names };
		}
		if (
			(name.type === "JSXIdentifier" || name.type === "Identifier") &&
			contexts.has(name.name) &&
			isImport(name)
		) {
			handled.add(name);
			return { kind: "context" };
		}
		const member =
			(name.type === "JSXMemberExpression" ||
				(name.type === "MemberExpression" && !name.computed)) &&
			name.property.type !== "PrivateIdentifier" &&
			name.property.name === "Provider"
				? name.object
				: null;
		if (
			member != null &&
			(member.type === "JSXIdentifier" || member.type === "Identifier") &&
			contexts.has(member.name) &&
			isImport(member)
		) {
			handled.add(member);
			return { kind: "context" };
		}
		return null;
	};

	new Visitor({
		ImportDeclaration(node) {
			for (const specifier of node.specifiers) {
				handled.add(specifier.local);
				if (specifier.type === "ImportSpecifier") {
					handled.add(specifier.imported);
				}
			}
		},
		ExportSpecifier(node) {
			// Why: the exported name is no reference to a binding.
			handled.add(node.exported);
		},
		MemberExpression(node) {
			if (!node.computed) {
				handled.add(node.property);
			}
			if (node.object.type === "Identifier" && reactNamespaces.has(node.object.name)) {
				handled.add(node.object);
			}
			// Why: a clone function in a variable can set a weight that the analysis does not see.
			if (!handled.has(node) && reactFunction(node) === "clone") {
				usage.all = true;
			}
		},
		Property(node) {
			if (!node.computed && !node.shorthand) {
				handled.add(node.key);
			}
		},
		JSXOpeningElement(node) {
			const type = renderedType(node.name);
			if (type?.kind === "icon") {
				const weights = jsxPropWeights(node.attributes);
				for (const name of type.names) {
					addIconWeights(name, weights);
				}
			} else if (type?.kind === "context") {
				addContextWeights(jsxContextWeights(node.attributes));
			}
		},
		CallExpression(node) {
			const [first, second] = node.arguments;
			if (first == null || first.type === "SpreadElement") {
				return;
			}
			const callee = calleeOf(node.callee);
			const kind = reactFunction(callee);
			if (kind != null) {
				handled.add(callee);
			}
			if (kind === "read") {
				const target = unwrap(first);
				if (target.type === "Identifier" && contexts.has(target.name) && isImport(target)) {
					handled.add(target);
				}
				return;
			}
			// Why unknown: a call such as `React[name](child, props)` can be a clone. Code such as
			// Radix reads `React[" use ".trim()]`, so a read alone does not keep every weight.
			if (kind === "clone" || kind === "unknown") {
				const props = second == null || second.type === "SpreadElement" ? null : unwrap(second);
				for (const property of props?.type === "ObjectExpression" ? props.properties : []) {
					// Why: a computed key that the analysis cannot read can be `weight`.
					const key = property.type === "Property" ? keyNames(property) : [];
					const weights =
						property.type === "Property" && (key == null || key.includes("weight"))
							? staticStrings(property.value)
							: [];
					if (weights == null) {
						usage.all = true;
					}
					for (const weight of weights ?? []) {
						usage.cloneWeights.add(weight);
					}
				}
				return;
			}
			if (kind !== "render") {
				return;
			}
			const type = renderedType(unwrap(first));
			if (type?.kind === "icon") {
				const weights = argumentPropWeights(second);
				for (const name of type.names) {
					addIconWeights(name, weights);
				}
			} else if (type?.kind === "context") {
				addContextWeights(argumentContextWeights(second));
			}
		},
		ImportExpression(node) {
			for (const value of staticStrings(node.source) ?? []) {
				const match = PHOSPHOR_IMPORT_RE.exec(value);
				const name = match?.[1] == null ? null : ICON_SUBPATH_RE.exec(match[1])?.[1];
				if (match != null) {
					imports = true;
					if (name == null) {
						usage.all = true;
					} else {
						addIconWeights(name, { kind: "all" });
					}
				}
			}
		},
		Identifier(node) {
			if (handled.has(node)) {
				return;
			}
			// Why: a clone function or a React namespace in a variable can set a weight that the
			// analysis does not see.
			if (
				clones.has(node.name) ||
				((reactBindings.get(node.name) === "clone" || reactNamespaces.has(node.name)) &&
					isImport(node))
			) {
				usage.all = true;
			}
			const names = iconsOf(node);
			if (names != null) {
				for (const name of names) {
					addIconWeights(name, { kind: "all" });
				}
			} else if (contexts.has(node.name) && isImport(node)) {
				usage.contextAll = true;
			}
		},
	}).visit(program);

	return imports || usage.cloneWeights.size > 0 || usage.all ? usage : null;
}

/**
 * Tags each weight entry of a Phosphor weight module with its icon and weight.
 *
 * @returns the edit that tags the module, or null when the module does not have the shape this
 * plugin knows: `const x = new Map([["bold", …], …])` with each of the six weights once.
 */
function markWeights(code: string, icon: string): MagicString | null {
	const { program, errors } = parseSync("defs.js", code, { lang: "js", sourceType: "module" });
	if (errors.length > 0) {
		return null;
	}
	const maps = program.body.flatMap((statement) =>
		statement.type === "VariableDeclaration"
			? statement.declarations.flatMap((declaration) =>
					declaration.init?.type === "NewExpression" &&
					declaration.init.callee.type === "Identifier" &&
					declaration.init.callee.name === "Map" &&
					declaration.init.arguments[0]?.type === "ArrayExpression"
						? [declaration.init.arguments[0]]
						: [],
				)
			: [],
	);
	const entries = maps.length === 1 ? maps[0]?.elements : undefined;
	if (entries == null || entries.length !== WEIGHTS.size) {
		return null;
	}
	const string = new MagicString(code);
	const seen = new Set<string>();
	for (const entry of entries) {
		const weight =
			entry?.type === "ArrayExpression" && entry.elements.length === 2 ? entry.elements[0] : null;
		const value = entry?.type === "ArrayExpression" ? entry.elements[1] : null;
		if (
			weight?.type !== "Literal" ||
			typeof weight.value !== "string" ||
			!WEIGHTS.has(weight.value) ||
			seen.has(weight.value) ||
			value == null
		) {
			return null;
		}
		seen.add(weight.value);
		string.appendLeft(value.end, `, ${JSON.stringify(`${MARKER}${icon}:${weight.value}`)}`);
	}
	return string;
}

/** The icon and weight of a tagged weight entry, or null for any other array. */
function markOf(
	entry: ArrayExpression["elements"][number],
): { icon: string; weight: string } | null {
	const marker =
		entry?.type === "ArrayExpression" && entry.elements.length === 3 ? entry.elements[2] : null;
	const strings = marker == null || marker.type === "SpreadElement" ? null : staticStrings(marker);
	const text = strings?.length === 1 ? strings[0] : undefined;
	if (text == null || !text.startsWith(MARKER)) {
		return null;
	}
	const [icon = "", weight = ""] = text.slice(MARKER.length).split(":");
	return { icon, weight };
}

/**
 * Removes the tagged weight entries that `keep` rejects, and the tags of the rest.
 *
 * @returns the new code with a high-resolution source map, or null when the code has no tag.
 * @throws when a tag sits outside a weight list, because the bundle would ship it.
 */
function stripWeights(
	code: string,
	keep: (icon: string, weight: string) => boolean,
): { code: string; map: ReturnType<MagicString["generateMap"]> } | null {
	if (!code.includes(MARKER)) {
		return null;
	}
	const { program, errors } = parseSync("chunk.js", code, { lang: "js", sourceType: "module" });
	if (errors.length > 0) {
		throw new Error(`could not parse the chunk: ${errors[0]?.message ?? ""}`);
	}
	const string = new MagicString(code);
	let rewritten = 0;
	new Visitor({
		ArrayExpression(node) {
			const marks = node.elements.map(markOf);
			if (marks.length === 0 || marks.some((mark) => mark == null)) {
				return;
			}
			// Why removals: the kept entries stay in place, so their source map stays exact.
			const entries = node.elements.flatMap((entry) =>
				entry?.type === "ArrayExpression" ? [entry] : [],
			);
			let previous: (typeof entries)[number] | null = null;
			let dropFrom: number | null = null;
			for (const [index, entry] of entries.entries()) {
				const mark = marks[index];
				const [, value, marker] = entry.elements;
				if (mark != null && value != null && marker != null && keep(mark.icon, mark.weight)) {
					// Why from the entry start: the comma after the kept entry before the drop stays.
					if (dropFrom != null) {
						string.remove(dropFrom, entry.start);
						dropFrom = null;
					}
					string.remove(value.end, marker.end);
					previous = entry;
				} else {
					dropFrom ??= entry.start;
				}
			}
			const last = entries.at(-1);
			if (dropFrom != null && last != null) {
				// Why from the kept entry end: the trailing drop takes the comma before it.
				string.remove(previous?.end ?? dropFrom, last.end);
			}
			rewritten += marks.length;
		},
	}).visit(program);
	if (rewritten !== code.split(MARKER).length - 1) {
		throw new Error("found a Phosphor weight tag outside a weight list");
	}
	return { code: string.toString(), map: string.generateMap({ hires: true }) };
}

/**
 * Joins the usage of every module of a build into one test for each icon and weight.
 *
 * An icon that no analyzed module imports keeps every weight.
 */
function keeper(usages: Iterable<ModuleUsage>): (icon: string, weight: string) => boolean {
	const icons = new Map<string, IconUsage>();
	const contextWeights = new Set([DEFAULT_CONTEXT_WEIGHT]);
	const cloneWeights = new Set<string>();
	let contextAll = false;
	for (const usage of usages) {
		if (usage.all) {
			return () => true;
		}
		contextAll ||= usage.contextAll;
		for (const weight of usage.contextWeights) {
			contextWeights.add(weight);
		}
		for (const weight of usage.cloneWeights) {
			cloneWeights.add(weight);
		}
		for (const [name, entry] of usage.icons) {
			const joined = icons.get(name) ?? { weights: new Set<string>(), implicit: false, all: false };
			joined.all ||= entry.all;
			joined.implicit ||= entry.implicit;
			for (const weight of entry.weights) {
				joined.weights.add(weight);
			}
			icons.set(name, joined);
		}
	}
	return (icon, weight) => {
		const entry = icons.get(icon);
		return (
			entry == null ||
			entry.all ||
			entry.weights.has(weight) ||
			cloneWeights.has(weight) ||
			(entry.implicit && (contextAll || contextWeights.has(weight)))
		);
	};
}

/**
 * Vite and Rolldown plugin that removes the Phosphor icon weights a build never renders.
 *
 * - Each `@phosphor-icons/react` icon ships its paths for all six weights in one `Map`, so a
 *   bundler keeps every weight. The plugin keeps a weight of an icon only when a module of the
 *   build renders the icon with it.
 * - It reads `weight` in JSX and in `jsx()` and `createElement()` calls. An icon without a
 *   `weight` keeps the `IconContext` weights of the build, which start at `regular`. A `weight`
 *   that a `cloneElement()` call sets stays for every icon.
 * - A `weight` it cannot read, a spread of props, or an icon passed as a value keeps every weight
 *   of that icon, and so does a dynamic import or an import path the plugin does not read. A
 *   namespace import, or an icon imported by another name such as `ActivityIcon`, keeps every
 *   weight of every icon. A `cloneElement()` call can set a weight the plugin does not see in
 *   spread props or in a props object that is not written inline.
 *
 * It runs on `vite build` and on a Rolldown or tsdown build. When the installed Phosphor has a
 * weight module of another shape, it warns and keeps every weight of that icon. `vite dev` serves
 * every weight.
 *
 * @see https://mantle.ngrok.com/vite-plugins#mantlephosphorpruneplugin
 * @example
 * ```ts
 * // vite.config.ts
 * import { mantlePhosphorPrunePlugin } from "@ngrok/mantle-vite-plugins";
 * import { defineConfig } from "vite";
 *
 * export default defineConfig({
 *   plugins: [mantlePhosphorPrunePlugin()],
 * });
 * ```
 */
function mantlePhosphorPrunePlugin(): Plugin {
	/** The state of each build, by Vite environment, because environments can build at once. */
	const builds = new Map<
		string,
		{ usages: Map<string, ModuleUsage>; icons: Map<string, string[]> }
	>();
	const build = (environment: { name: string } | undefined) => {
		const name = environment?.name ?? "";
		const existing = builds.get(name);
		if (existing != null) {
			return existing;
		}
		// The usage of each module, and the weight modules of each icon, one for each Phosphor copy.
		const created = { usages: new Map<string, ModuleUsage>(), icons: new Map<string, string[]>() };
		builds.set(name, created);
		return created;
	};
	return {
		name: "@ngrok/mantle-vite-plugins:phosphor-prune",
		apply: "build",
		// Why post: Vite runs this after the transforms that turn MDX or other sources into JavaScript.
		enforce: "post",
		buildStart() {
			// Why: a watch rebuild runs the transform of every module again.
			builds.delete(this.environment?.name ?? "");
		},
		transform: {
			// Why the exclude: tsdown runs declaration modules through the same hooks, and their types
			// render nothing.
			filter: {
				id: { exclude: /\.d\.[cm]?ts(?:\?|$)/ },
				code: /@phosphor-icons\/react|"duotone"|cloneElement/,
			},
			async handler(code, id) {
				const { usages, icons } = build(this.environment);
				const weightModule = WEIGHT_MODULE_RE.exec(id);
				if (weightModule != null) {
					const icon = weightModule[1] ?? "";
					icons.set(icon, [...(icons.get(icon) ?? []), id]);
					const marked = markWeights(code, icon);
					if (marked == null) {
						this.warn(
							`${icon} in @phosphor-icons/react does not have the weight module shape this plugin knows, so the build keeps all six of its weights. Update mantlePhosphorPrunePlugin for this Phosphor version.`,
						);
						return null;
					}
					return { code: marked.toString(), map: marked.generateMap({ hires: true }) };
				}
				if (PHOSPHOR_FILE_RE.test(id)) {
					return null;
				}
				const usage = collectUsage(code, id);
				if (usage == null) {
					return null;
				}
				// Why: an import that reaches Phosphor by another path, such as a `resolve.alias`, renders
				// icons that the analysis did not read.
				for (const source of usage.sources) {
					if (PHOSPHOR_FILE_RE.test((await this.resolve(source, id))?.id ?? "")) {
						usage.all = true;
					}
				}
				if (usage.all) {
					this.warn(
						`${id} uses Phosphor icons in a way this plugin cannot read, such as a namespace import, an import by another path, an aliased or computed cloneElement(), or a parse error, so the build keeps every Phosphor weight.`,
					);
				}
				usages.set(id, usage);
				return null;
			},
		},
		renderChunk(code) {
			if (!code.includes(MARKER)) {
				return null;
			}
			const { usages, icons } = build(this.environment);
			const live = new Set(this.getModuleIds());
			const liveUsages = [...usages].filter(([id]) => live.has(id)).map(([, usage]) => usage);
			/**
			 * Whether a dynamic import or an unread module reaches a Phosphor module, such as a module
			 * that imports Phosphor through a `resolve.alias`. The walk crosses Phosphor's own modules.
			 */
			const reachedUnread = (start: string) => {
				// Why a set: its loop also visits the modules the walk adds.
				const queue = new Set([start]);
				for (const id of queue) {
					const info = this.getModuleInfo(id);
					if (info == null || !live.has(id)) {
						continue;
					}
					if (info.dynamicImporters.length > 0) {
						return true;
					}
					for (const importer of info.importers) {
						if (PHOSPHOR_FILE_RE.test(importer)) {
							queue.add(importer);
						} else if (!usages.has(importer)) {
							return true;
						}
					}
				}
				return false;
			};
			const unread = new Set(
				[...icons].filter(([, ids]) => ids.some(reachedUnread)).map(([icon]) => icon),
			);
			// Why: an unread module can set any `IconContext` weight.
			if ([...live].some((id) => CONTEXT_MODULE_RE.test(id) && reachedUnread(id))) {
				liveUsages.push({ ...emptyUsage(), contextAll: true });
			}
			// Why: a name that is not an icon of the build is an export with another name, such as
			// `ActivityIcon` for `PulseIcon`, so the analysis cannot tell which icon it renders.
			const unknown = liveUsages.flatMap((usage) =>
				[...usage.icons.keys()].filter((name) => !icons.has(name)),
			);
			if (unknown.length > 0) {
				this.warn(
					`${unknown.map((name) => `${name}Icon`).join(", ")} is another name of a Phosphor icon, so the build keeps every Phosphor weight. Import the icon by its own name.`,
				);
			}
			const joined = keeper(liveUsages);
			const keep = (icon: string, weight: string) =>
				unknown.length > 0 || unread.has(icon) || joined(icon, weight);
			try {
				return stripWeights(code, keep);
			} catch (error) {
				return this.error(
					`mantlePhosphorPrunePlugin: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		},
	};
}

export {
	//,
	markWeights,
	mantlePhosphorPrunePlugin,
	stripWeights,
};
