import MagicString from "magic-string";
import {
	parseSync,
	Visitor,
	type Argument,
	type ArrayExpression,
	type Expression,
	type JSXAttributeItem,
	type JSXElementName,
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
const PHOSPHOR_IMPORT_RE = /^@phosphor-icons\/react(?:\/(.+))?$/;
/** An icon subpath, such as `Check`, `dist/csr/Check`, or `dist/ssr/Check`. */
const ICON_SUBPATH_RE = /^(?:dist\/(?:csr|ssr|defs)\/)?([A-Z]\w*?)(?:\.es\.js)?$/;
const BARREL_SUBPATHS = new Set([undefined, "ssr", "dist/ssr", "dist/index.es.js"]);
const LIB_SUBPATH_RE = /^(?:lib|dist\/lib(?:\/\w+)?)$/;
const JSX_FACTORIES = new Set([
	"jsx",
	"jsxs",
	"jsxDEV",
	"createElement",
	"_jsx",
	"_jsxs",
	"_jsxDEV",
]);
const JSX_RUNTIMES = new Set(["react", "react/jsx-runtime", "react/jsx-dev-runtime"]);
const CONTEXT_READERS = new Set(["useContext", "use"]);

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
	/** The module uses Phosphor in a way the analysis cannot follow, such as a namespace import. */
	all: boolean;
};

const emptyUsage = (): ModuleUsage => ({
	icons: new Map(),
	contextWeights: new Set(),
	contextAll: false,
	all: false,
});

const unwrap = (node: Expression): Expression =>
	node.type === "ParenthesizedExpression" ||
	node.type === "TSAsExpression" ||
	node.type === "TSSatisfiesExpression" ||
	node.type === "TSNonNullExpression"
		? unwrap(node.expression)
		: node;

/** The strings an expression can evaluate to, or null when it is not a static string. */
function staticStrings(expression: Expression): string[] | null {
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
		} else if (property.key.type === "Identifier" && property.key.name === "value") {
			result = contextValueWeights(property.value);
		}
	}
	return result;
}

/** The parser language of a module path; any other source parses as JavaScript with JSX. */
function langOf(path: string): "ts" | "tsx" | "jsx" {
	if (path.endsWith(".tsx")) {
		return "tsx";
	}
	return /\.[cm]?ts$/.test(path) ? "ts" : "jsx";
}

/** The name a call reads: `jsx` for `jsx()`, `React.jsx()`, and the compiled `(0, r.jsx)()`. */
function calledName(callee: Expression): string | null {
	const node = unwrap(callee);
	if (node.type === "Identifier") {
		return node.name;
	}
	if (node.type === "MemberExpression" && !node.computed && node.property.type === "Identifier") {
		return node.property.name;
	}
	const last = node.type === "SequenceExpression" ? node.expressions.at(-1) : undefined;
	return last == null ? null : calledName(last);
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
 * It follows icons in JSX and in `jsx()` and `createElement()` calls, and `IconContext` values. Any
 * other reference keeps every weight of that icon, and a namespace import keeps every weight of
 * every icon.
 *
 * @returns null when the module does not import `@phosphor-icons/react`.
 */
function collectUsage(code: string, id: string): ModuleUsage | null {
	const path = id.split("?")[0] ?? id;
	const { program, errors } = parseSync(path, code, { lang: langOf(path), sourceType: "module" });
	const usage = emptyUsage();
	if (errors.length > 0) {
		usage.all = true;
		return usage;
	}
	/** The icons each local binding names: an import, or a `const` alias such as `open ? A : B`. */
	const icons = new Map<string, string[]>();
	const contexts = new Set<string>();
	const factories = new Set<string>();
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
			JSX_RUNTIMES.has(statement.source.value)
		) {
			for (const specifier of statement.specifiers) {
				if (
					specifier.type === "ImportSpecifier" &&
					specifier.imported.type === "Identifier" &&
					JSX_FACTORIES.has(specifier.imported.name)
				) {
					factories.add(specifier.local.name);
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
		const source =
			statement.source == null ? null : PHOSPHOR_IMPORT_RE.exec(statement.source.value);
		if (
			source == null ||
			(statement.type === "ImportDeclaration" ? statement.importKind : statement.exportKind) ===
				"type"
		) {
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

	const handled = new Set<unknown>();
	/** The icon bindings an alias initializer reads, or null when it reads anything else. */
	const aliasedIcons = (init: Expression): Expression[] | null => {
		const node = unwrap(init);
		if (node.type === "Identifier") {
			return icons.has(node.name) ? [node] : null;
		}
		if (node.type === "ConditionalExpression") {
			const consequent = aliasedIcons(node.consequent);
			const alternate = aliasedIcons(node.alternate);
			return consequent != null && alternate != null ? [...consequent, ...alternate] : null;
		}
		return null;
	};
	new Visitor({
		VariableDeclaration(node) {
			for (const declaration of node.kind === "const" ? node.declarations : []) {
				const reads = declaration.init == null ? null : aliasedIcons(declaration.init);
				if (reads != null && declaration.id.type === "Identifier") {
					// Why the merge: the analysis has no scopes, so two aliases with one name keep both icons.
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
	const isFactory = (callee: Expression) => {
		const name = calledName(callee);
		return name != null && (factories.has(name) || JSX_FACTORIES.has(name));
	};
	/** Reads a rendered element type: an icon, or `IconContext` and `IconContext.Provider`. */
	const renderedType = (
		name: JSXElementName | Expression,
	): { kind: "icon"; names: string[] } | { kind: "context" } | null => {
		const names =
			name.type === "JSXIdentifier" || name.type === "Identifier"
				? icons.get(name.name)
				: undefined;
		if (names != null) {
			handled.add(name);
			return { kind: "icon", names };
		}
		if ((name.type === "JSXIdentifier" || name.type === "Identifier") && contexts.has(name.name)) {
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
			contexts.has(member.name)
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
		MemberExpression(node) {
			if (!node.computed) {
				handled.add(node.property);
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
			const calleeName = calledName(node.callee);
			if (calleeName != null && CONTEXT_READERS.has(calleeName)) {
				const target = unwrap(first);
				if (target.type === "Identifier" && contexts.has(target.name)) {
					handled.add(target);
				}
				return;
			}
			if (!isFactory(node.callee)) {
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
			const names = icons.get(node.name);
			if (names != null) {
				for (const name of names) {
					addIconWeights(name, { kind: "all" });
				}
			} else if (contexts.has(node.name)) {
				usage.contextAll = true;
			}
		},
	}).visit(program);

	return imports ? usage : null;
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
			const kept = node.elements.flatMap((entry, index) => {
				const mark = marks[index];
				const [weight, value] = entry?.type === "ArrayExpression" ? entry.elements : [];
				return mark != null && weight != null && value != null && keep(mark.icon, mark.weight)
					? [`[${code.slice(weight.start, value.end)}]`]
					: [];
			});
			string.overwrite(node.start, node.end, `[${kept.join(", ")}]`);
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
	let contextAll = false;
	for (const usage of usages) {
		if (usage.all) {
			return () => true;
		}
		contextAll ||= usage.contextAll;
		for (const weight of usage.contextWeights) {
			contextWeights.add(weight);
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
 *   `weight` keeps the `IconContext` weights of the build, which start at `regular`.
 * - A `weight` it cannot read, a spread of props, or an icon passed as a value keeps every weight
 *   of that icon. A namespace import keeps every weight of every icon.
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
	// Why per module: a watch rebuild skips the transform of an unchanged module, so its usage
	// must survive from the build before.
	const usages = new Map<string, ModuleUsage>();
	return {
		name: "@ngrok/mantle-vite-plugins:phosphor-prune",
		apply: "build",
		// Why post: Vite runs this after the transforms that turn MDX or other sources into JavaScript.
		enforce: "post",
		transform: {
			// Why the exclude: tsdown runs declaration modules through the same hooks, and their types
			// render nothing.
			filter: { id: { exclude: /\.d\.[cm]?ts(?:\?|$)/ }, code: /@phosphor-icons\/react|"duotone"/ },
			handler(code, id) {
				const weightModule = WEIGHT_MODULE_RE.exec(id);
				if (weightModule != null) {
					const icon = weightModule[1] ?? "";
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
					usages.delete(id);
				} else {
					if (usage.all) {
						this.warn(
							`${id} uses @phosphor-icons/react in a way this plugin cannot read, such as a namespace import or a parse error, so the build keeps every Phosphor weight.`,
						);
					}
					usages.set(id, usage);
				}
				return null;
			},
		},
		renderChunk(code) {
			if (!code.includes(MARKER)) {
				return null;
			}
			const live = new Set(this.getModuleIds());
			const keep = keeper([...usages].filter(([id]) => live.has(id)).map(([, usage]) => usage));
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
