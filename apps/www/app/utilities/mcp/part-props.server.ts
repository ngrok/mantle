import { isRecord, walk } from "~/utilities/mcp/ast-walk";
import { exportNamesOf, type Resolver } from "~/utilities/mcp/declarations.server";

/** The props that one mantle part declares. */
export type PartProps = {
	/** Each prop name in the part's own props type. */
	names: ReadonlySet<string>;
	/** Each prop that the part requires. */
	required: ReadonlySet<string>;
	/** Each prop typed `never`: the part forbids it. */
	never: ReadonlySet<string>;
	/** Each prop that the props type removes with `Omit`. */
	omitted: ReadonlySet<string>;
	/** Whether the part also takes the attributes of a DOM element. */
	dom: boolean;
	/** Whether part of the props type is out of reach, such as a type from another package. Then an unknown name can be valid. */
	open: boolean;
};

/** What one JSX name resolves to in a version's declarations. */
export type PartLookup =
	| { status: "part"; props: PartProps }
	/** The namespace has no such member. `members` lists the ones it has. */
	| { status: "no-member"; member: string; members: string[] }
	/** The declarations do not show the part's props in full. */
	| { status: "unknown" };

type Node = Record<string, unknown>;
type Shape = {
	names: Set<string>;
	required: Set<string>;
	never: Set<string>;
	omitted: Set<string>;
	dom: boolean;
	open: boolean;
};
type Context = { path: string; env: ReadonlyMap<string, { node: unknown; context: Context }> };
/**
 * A component: a value by name in a file, or a type node such as a member's
 * type. An `exported` name is what the file exports, not its local name.
 */
type ComponentRef =
	| { name: string; exported?: boolean; context: Context }
	| { type: unknown; context: Context };

/** A type name and its type arguments, such as `Omit` and `[Props, "id"]`. */
type Reference = { name: string; args: unknown[] };

/** The deepest type reference chain the resolver follows. */
const MAX_DEPTH = 24;

const shape = (init: Partial<Shape> = {}): Shape => ({
	names: new Set(),
	required: new Set(),
	never: new Set(),
	omitted: new Set(),
	dom: false,
	open: false,
	...init,
});

const OPEN = (): Shape => shape({ open: true });

function intersect(shapes: Shape[]): Shape {
	const merged = shape();
	for (const part of shapes) {
		for (const key of ["names", "required", "never", "omitted"] as const) {
			for (const name of part[key]) {
				merged[key].add(name);
			}
		}
		merged.dom ||= part.dom;
		merged.open ||= part.open;
	}
	return merged;
}

function union(shapes: Shape[]): Shape {
	const merged = intersect(shapes);
	// Why: a union requires or forbids a prop only when each member does.
	const inAll = (key: "required" | "never" | "omitted") =>
		new Set([...merged[key]].filter((name) => shapes.every((part) => part[key].has(name))));
	merged.required = shapes.some((part) => part.open) ? new Set() : inAll("required");
	merged.never = inAll("never");
	merged.omitted = inAll("omitted");
	return merged;
}

const typeArguments = (node: { typeArguments?: unknown }): unknown[] =>
	isRecord(node.typeArguments) && Array.isArray(node.typeArguments.params)
		? node.typeArguments.params
		: [];

const NO_ENV: Context["env"] = new Map();

const annotation = (node: unknown): unknown =>
	isRecord(node) && isRecord(node.typeAnnotation) ? node.typeAnnotation.typeAnnotation : undefined;

const identifierName = (node: unknown): string | undefined =>
	isRecord(node) && node.type === "Identifier" && typeof node.name === "string"
		? node.name
		: undefined;

/** The prop name of a type member key, such as `intent` or `"aria-label"`. */
function keyName(member: Node): string | undefined {
	if (member.computed === true || !isRecord(member.key)) {
		return undefined;
	}
	const { key } = member;
	if (typeof key.name === "string") {
		return key.name;
	}
	return typeof key.value === "string" ? key.value : undefined;
}

/** The string literals of a key list such as `"a" | "b"`, or `undefined` for another type. */
function literalKeys(node: unknown): string[] | undefined {
	if (!isRecord(node)) {
		return undefined;
	}
	if (node.type === "TSUnionType" && Array.isArray(node.types)) {
		const parts = node.types.map(literalKeys);
		return parts.every((part) => part != null) ? parts.flat() : undefined;
	}
	if (node.type === "TSLiteralType" && isRecord(node.literal)) {
		return typeof node.literal.value === "string" ? [node.literal.value] : undefined;
	}
	return node.type === "TSNeverKeyword" ? [] : undefined;
}

/** The props of a type literal or an interface body. */
function membersShape(members: unknown[]): Shape {
	const result = shape();
	for (const member of members) {
		if (!isRecord(member)) {
			continue;
		}
		if (member.type === "TSIndexSignature") {
			result.open = true;
			continue;
		}
		if (member.type !== "TSPropertySignature" && member.type !== "TSMethodSignature") {
			continue;
		}
		const name = keyName(member);
		if (name == null) {
			result.open = true;
			continue;
		}
		const type = annotation(member);
		if (isRecord(type) && type.type === "TSNeverKeyword") {
			result.never.add(name);
			continue;
		}
		result.names.add(name);
		if (member.optional !== true) {
			result.required.add(name);
		}
	}
	return result;
}

const REACT_COMPONENT_TYPES = new Set([
	"FC",
	"FunctionComponent",
	"ComponentType",
	"ExoticComponent",
	"NamedExoticComponent",
	"ForwardRefExoticComponent",
]);
const REACT_DOM_TYPES =
	/^(?:DOMAttributes|AriaAttributes|AllHTMLAttributes|DetailedHTMLProps|SVGProps|SVGAttributes|\w*HTMLAttributes)$/;
const COMPONENT_PROPS_TYPES = new Set([
	"ComponentProps",
	"ComponentPropsWithRef",
	"ComponentPropsWithoutRef",
]);

/**
 * Resolves the props of a part, such as `["Dialog", "Content"]`, from the
 * `dist` declarations that `entryPath` exports. Follows type aliases,
 * interfaces, intersections, unions, `Omit`, `Pick`, `Partial`, and React's
 * `ComponentProps`. A type it cannot follow, such as one from a package other
 * than `react`, leaves the result `open`.
 *
 * @example
 * partPropsOf(createResolver(files), "dist/button.d.ts", ["IconButton"]);
 * // { status: "part", props: { required: Set { "label", "icon", … }, dom: true, open: false, … } }
 */
export function partPropsOf(
	resolver: Resolver,
	entryPath: string,
	path: readonly string[],
): PartLookup {
	const { files } = resolver;
	const seen = new Set<unknown>();

	const typeShape = (node: unknown, context: Context, depth: number): Shape => {
		if (!isRecord(node) || depth > MAX_DEPTH) {
			return OPEN();
		}
		switch (node.type) {
			case "TSParenthesizedType":
				return typeShape(node.typeAnnotation, context, depth + 1);
			case "TSTypeLiteral":
				return membersShape(Array.isArray(node.members) ? node.members : []);
			case "TSIntersectionType":
				return intersect(
					(Array.isArray(node.types) ? node.types : []).map((part) =>
						typeShape(part, context, depth + 1),
					),
				);
			case "TSUnionType": {
				const members = (Array.isArray(node.types) ? node.types : []).filter(
					(part) =>
						!isRecord(part) ||
						(part.type !== "TSUndefinedKeyword" && part.type !== "TSNullKeyword"),
				);
				return union(members.map((part) => typeShape(part, context, depth + 1)));
			}
			case "TSTypeReference": {
				const name = identifierName(node.typeName);
				if (name != null) {
					return referenceShape({ name, args: typeArguments(node) }, context, depth + 1);
				}
				// Why: `React.ComponentProps<…>` names a React type through a namespace import.
				const typeName = isRecord(node.typeName) ? node.typeName : {};
				const left = identifierName(typeName.left);
				const right = identifierName(typeName.right);
				return left != null &&
					right != null &&
					resolver.externalImport(context.path, left)?.module === "react"
					? reactShape({ name: right, args: typeArguments(node) }, context, depth + 1)
					: OPEN();
			}
			case "TSImportType": {
				const source = isRecord(node.source) ? node.source.value : undefined;
				const name = identifierName(node.qualifier);
				return source === "react" && name != null
					? reactShape({ name, args: typeArguments(node) }, context, depth + 1)
					: OPEN();
			}
			default:
				return OPEN();
		}
	};

	const referenceShape = ({ name, args }: Reference, context: Context, depth: number): Shape => {
		const bound = context.env.get(name);
		if (bound != null) {
			return typeShape(bound.node, bound.context, depth);
		}
		const [first, second] = args;
		// Why by name: mantle wraps cva's `VariantProps` in mapped types the resolver cannot follow,
		// but each variant is a key of the variants function's props.
		const variants =
			name === "VariantProps" && isRecord(first) && first.type === "TSTypeQuery"
				? identifierName(first.exprName)
				: undefined;
		if (variants != null) {
			return variantsShape(variants, context);
		}
		switch (name) {
			case "Omit": {
				const base = typeShape(first, context, depth);
				const keys = literalKeys(second);
				if (keys == null) {
					// Why no required props: the unknown keys can remove a required one.
					return { ...base, required: new Set() };
				}
				for (const key of keys) {
					base.names.delete(key);
					base.required.delete(key);
					base.omitted.add(key);
				}
				return base;
			}
			case "Pick": {
				const base = typeShape(first, context, depth);
				const keys = literalKeys(second);
				if (keys == null) {
					return OPEN();
				}
				return shape({
					names: new Set(keys),
					required: new Set(keys.filter((key) => base.required.has(key))),
					never: new Set(keys.filter((key) => base.never.has(key))),
				});
			}
			case "Partial":
				return { ...typeShape(first, context, depth), required: new Set() };
			case "Required": {
				const base = typeShape(first, context, depth);
				return { ...base, required: new Set(base.names) };
			}
			case "Readonly":
			case "NoInfer":
			case "NonNullable":
				return typeShape(first, context, depth);
		}
		const external = resolver.externalImport(context.path, name);
		if (external != null) {
			return external.module === "react" && external.name != null
				? reactShape({ name: external.name, args }, context, depth)
				: OPEN();
		}
		const located = resolver.localDeclaration(context.path, name, { kind: "type" });
		const statement = located?.statement;
		const declaration =
			statement?.type === "ExportNamedDeclaration" ? statement.declaration : statement;
		if (located == null || declaration == null || seen.has(declaration)) {
			return OPEN();
		}
		const params =
			"typeParameters" in declaration && isRecord(declaration.typeParameters)
				? declaration.typeParameters.params
				: [];
		const env = new Map(
			(Array.isArray(params) ? params : []).flatMap((param, index) => {
				const paramName = isRecord(param) ? identifierName(param.name) : undefined;
				const node = args[index] ?? (isRecord(param) ? param.default : undefined);
				return paramName == null ? [] : [[paramName, { node, context }] as const];
			}),
		);
		const inner = { path: located.path, env };
		seen.add(declaration);
		try {
			if (declaration.type === "TSTypeAliasDeclaration") {
				return typeShape(declaration.typeAnnotation, inner, depth + 1);
			}
			if (declaration.type === "TSInterfaceDeclaration") {
				const heritage = declaration.extends.map((clause) => {
					const clauseName = identifierName(clause.expression);
					return clauseName == null
						? OPEN()
						: referenceShape({ name: clauseName, args: typeArguments(clause) }, inner, depth + 1);
				});
				return intersect([...heritage, membersShape(declaration.body.body)]);
			}
			return OPEN();
		} finally {
			seen.delete(declaration);
		}
	};

	/** The optional props of a cva variants function, such as `intent` and `size`. */
	const variantsShape = (name: string, context: Context): Shape => {
		const value = valueOf({ name, context });
		if (value == null || !("type" in value)) {
			return OPEN();
		}
		const result = shape();
		walk(value.type, (node) => {
			const key = node.type === "TSPropertySignature" ? keyName(node) : undefined;
			if (key != null) {
				result.names.add(key);
			}
		});
		return result;
	};

	const reactShape = ({ name, args }: Reference, context: Context, depth: number): Shape => {
		const [first] = args;
		if (REACT_DOM_TYPES.test(name)) {
			return shape({ dom: true });
		}
		if (COMPONENT_PROPS_TYPES.has(name) && isRecord(first)) {
			if (first.type === "TSLiteralType") {
				return shape({ dom: true });
			}
			const valueName = first.type === "TSTypeQuery" ? identifierName(first.exprName) : undefined;
			return valueName == null ? OPEN() : componentShape({ name: valueName, context }, depth);
		}
		switch (name) {
			case "PropsWithChildren": {
				const children = shape({ names: new Set(["children"]) });
				return first == null ? children : intersect([typeShape(first, context, depth), children]);
			}
			case "PropsWithoutRef":
			case "PropsWithRef":
				return typeShape(first, context, depth);
			case "RefAttributes":
				return shape({ names: new Set(["ref"]) });
			default:
				return OPEN();
		}
	};

	/** The props of a function or component type, such as `(props: P) => Element` or `FC<P>`. */
	const componentTypeShape = (node: unknown, context: Context, depth: number): Shape => {
		if (!isRecord(node) || depth > MAX_DEPTH) {
			return OPEN();
		}
		switch (node.type) {
			case "TSParenthesizedType":
				return componentTypeShape(node.typeAnnotation, context, depth + 1);
			case "TSFunctionType": {
				const [props] = Array.isArray(node.params) ? node.params : [];
				return props == null ? shape() : typeShape(annotation(props), context, depth + 1);
			}
			case "TSTypeQuery": {
				const name = identifierName(node.exprName);
				return name == null ? OPEN() : componentShape({ name, context }, depth + 1);
			}
			case "TSIntersectionType": {
				// Why: a compound part can be a callable joined with its static parts.
				const callables = (Array.isArray(node.types) ? node.types : []).filter(
					(part) => isRecord(part) && part.type === "TSFunctionType",
				);
				return callables.length === 1
					? componentTypeShape(callables[0], context, depth + 1)
					: OPEN();
			}
			case "TSTypeReference":
			case "TSImportType": {
				const name = identifierName(node.typeName) ?? identifierName(node.qualifier);
				const source = isRecord(node.source) ? node.source.value : undefined;
				const imported =
					node.type === "TSImportType" || name == null
						? { module: source, name }
						: resolver.externalImport(context.path, name);
				const reactName = imported?.module === "react" ? imported.name : undefined;
				return reactName != null && REACT_COMPONENT_TYPES.has(reactName)
					? typeShape(typeArguments(node)[0], context, depth + 1)
					: OPEN();
			}
			default:
				return OPEN();
		}
	};

	/** The declared type of a value, or for a function its props. */
	const valueOf = ({
		name,
		exported = false,
		context,
	}: Extract<ComponentRef, { name: string }>):
		| { type: unknown; context: Context }
		| { props: Shape }
		| undefined => {
		if (!exported && resolver.externalImport(context.path, name) != null) {
			return undefined;
		}
		const located = exported
			? resolver.find(context.path, name, { kind: "value" })
			: resolver.localDeclaration(context.path, name, { kind: "value" });
		const statement = located?.statement;
		const declaration =
			statement?.type === "ExportNamedDeclaration" ? statement.declaration : statement;
		if (located == null || declaration == null) {
			return undefined;
		}
		const inner = { path: located.path, env: NO_ENV };
		if (declaration.type === "VariableDeclaration") {
			// Why the lone declarator: an import alias such as `Title$1` names a `Title` declaration.
			const declarator =
				declaration.declarations.find((candidate) => identifierName(candidate.id) === name) ??
				(declaration.declarations.length === 1 ? declaration.declarations[0] : undefined);
			const type = annotation(declarator?.id);
			return type == null ? undefined : { type, context: inner };
		}
		if (declaration.type === "TSDeclareFunction" || declaration.type === "FunctionDeclaration") {
			const [props] = declaration.params;
			return { props: props == null ? shape() : typeShape(annotation(props), inner, 0) };
		}
		return undefined;
	};

	const componentShape = (ref: ComponentRef, depth: number): Shape => {
		if ("type" in ref) {
			return componentTypeShape(ref.type, ref.context, depth);
		}
		const value = valueOf(ref);
		if (value == null) {
			return OPEN();
		}
		return "props" in value ? value.props : componentTypeShape(value.type, value.context, depth);
	};

	/** The members of a compound part, or `undefined` when they are out of reach. */
	const membersOf = (ref: ComponentRef, depth = 0): Map<string, ComponentRef> | undefined => {
		if (depth > MAX_DEPTH) {
			return undefined;
		}
		const value = "type" in ref ? ref : valueOf(ref);
		if (value == null || !("type" in value) || !isRecord(value.type)) {
			return undefined;
		}
		const { type, context } = value;
		if (type.type === "TSTypeQuery") {
			const name = identifierName(type.exprName);
			if (name == null) {
				return undefined;
			}
			// Why: a compound is often `typeof <Name>Parts`, a namespace import of its parts module.
			const namespacePath = resolver.namespaceImportPath(context.path, name);
			if (namespacePath == null) {
				return membersOf({ name, context }, depth + 1);
			}
			const members = new Map<string, ComponentRef>();
			for (const member of exportNamesOf(files, namespacePath).names) {
				members.set(member, {
					name: member,
					exported: true,
					context: { path: namespacePath, env: NO_ENV },
				});
			}
			return members;
		}
		const parts =
			type.type === "TSIntersectionType" && Array.isArray(type.types) ? type.types : [type];
		const literals = parts.filter(
			(part): part is Node => isRecord(part) && part.type === "TSTypeLiteral",
		);
		if (literals.length === 0) {
			return undefined;
		}
		const members = new Map<string, ComponentRef>();
		for (const literal of literals) {
			for (const member of Array.isArray(literal.members) ? literal.members : []) {
				const name =
					isRecord(member) && member.type === "TSPropertySignature" ? keyName(member) : undefined;
				if (name != null) {
					members.set(name, { type: annotation(member), context });
				}
			}
		}
		return members;
	};

	const [exportName, ...memberPath] = path;
	if (exportName == null) {
		return { status: "unknown" };
	}
	let ref: ComponentRef = {
		name: exportName,
		exported: true,
		context: { path: entryPath, env: NO_ENV },
	};
	for (const member of memberPath) {
		const members = membersOf(ref);
		if (members == null) {
			return { status: "unknown" };
		}
		const next = members.get(member);
		if (next == null) {
			return { status: "no-member", member, members: [...members.keys()].toSorted() };
		}
		ref = next;
	}
	const props = componentShape(ref, 0);
	return { status: "part", props };
}
