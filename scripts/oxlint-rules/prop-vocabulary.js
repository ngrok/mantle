/**
 * Holds the state prop names of COMPONENT_SPEC.md §1.11 on props types:
 * `value` / `defaultValue` / `onValueChange` and the other triples.
 *
 * In a type alias whose name ends in `Props`, it flags:
 * - a `setX` prop. Report a change with `onXChange`.
 * - a `selectedValue` or `multiple` prop. The value is `value`, and the
 *   component decides one or many.
 * - an `onChange` whose first parameter is a value: a string, number,
 *   boolean, array, tuple, literal, or the alias's own type parameter, also
 *   with `null` or `undefined`. `onChange` is the DOM event; a value goes to
 *   `onValueChange`.
 *
 * Why no check that `onXChange` has an `x` beside it: a base props type often
 * holds the callback while a union beside it holds `value` and `defaultValue`.
 *
 * Scope: source files; a test's own props types are fixtures. The rule reads
 * object types written in the alias and inside `PropsWithChildren<…>`,
 * `Readonly<…>`, or `Required<…>`, not `Omit<…>` or `Pick<…>` arguments.
 *
 * @example
 * // ❌ Incorrect
 * type PickerProps = { selectedValue?: string; setOpen?: (open: boolean) => void };
 * type ToggleProps = { onChange?: (checked: boolean) => void };
 *
 * // ✅ Correct
 * type PickerProps = { value?: string; defaultValue?: string; onValueChange?: (value: string) => void };
 * type ToggleProps = { checked?: boolean; onCheckedChange?: (checked: boolean) => void };
 */

const VALUE_TYPES = new Set([
	"TSStringKeyword",
	"TSNumberKeyword",
	"TSBigIntKeyword",
	"TSBooleanKeyword",
	"TSArrayType",
	"TSTupleType",
	"TSLiteralType",
	"TSTemplateLiteralType",
]);

const ARRAY_REFERENCES = new Set(["Array", "ReadonlyArray"]);

/** Generic types that keep every key of the object type they wrap. */
const WRAPPERS = new Set(["PropsWithChildren", "Readonly", "Required"]);

/** Whether a type is a value, not an event. `null` and `undefined` in a union do not count. */
function isValueType(type, typeParameters) {
	switch (type.type) {
		case "TSUnionType": {
			const rest = type.types.filter(
				(member) => member.type !== "TSNullKeyword" && member.type !== "TSUndefinedKeyword",
			);
			return rest.length > 0 && rest.every((member) => isValueType(member, typeParameters));
		}
		case "TSTypeOperator":
			return type.operator === "readonly" && isValueType(type.typeAnnotation, typeParameters);
		case "TSTypeReference": {
			const name = type.typeName.type === "Identifier" ? type.typeName.name : null;
			return name != null && (ARRAY_REFERENCES.has(name) || typeParameters.has(name));
		}
		default:
			return VALUE_TYPES.has(type.type);
	}
}

/** The key of a property or method signature, or `null` for a computed key. */
function keyName(member) {
	if (
		(member.type !== "TSPropertySignature" && member.type !== "TSMethodSignature") ||
		member.computed
	) {
		return null;
	}
	if (member.key.type === "Identifier") {
		return member.key.name;
	}
	return member.key.type === "Literal" && typeof member.key.value === "string"
		? member.key.value
		: null;
}

/** Whether a callback's first parameter is a value, not an event. */
function takesValue(member, typeParameters) {
	let type = member.type === "TSMethodSignature" ? member : member.typeAnnotation?.typeAnnotation;
	if (type?.type === "TSUnionType") {
		type = type.types.find((part) => part.type === "TSFunctionType");
	}
	if (type?.type !== "TSFunctionType" && type?.type !== "TSMethodSignature") {
		return false;
	}
	const first = type.params[0]?.typeAnnotation?.typeAnnotation;
	return first != null && isValueType(first, typeParameters);
}

const propVocabulary = {
	meta: {},
	create(context) {
		if (/\.(?:browser\.)?test\.[jt]sx?$/.test(context.filename)) {
			return {};
		}
		const report = (node, message) =>
			context.report({ node, message: `${message} (COMPONENT_SPEC.md §1.11).` });
		return {
			TSTypeAliasDeclaration(node) {
				if (!node.id.name.endsWith("Props")) {
					return;
				}
				const literals = [];
				const collect = (type) => {
					if (type == null) {
						return;
					}
					if (type.type === "TSTypeLiteral") {
						literals.push(type);
					} else if (type.type === "TSIntersectionType" || type.type === "TSUnionType") {
						type.types.forEach(collect);
					} else if (type.type === "TSParenthesizedType") {
						collect(type.typeAnnotation);
					} else if (
						type.type === "TSTypeReference" &&
						type.typeName.type === "Identifier" &&
						WRAPPERS.has(type.typeName.name)
					) {
						(type.typeArguments ?? type.typeParameters)?.params.forEach(collect);
					}
				};
				collect(node.typeAnnotation);
				const typeParameters = new Set(
					(node.typeParameters?.params ?? []).map((param) => param.name.name ?? param.name),
				);
				for (const literal of literals) {
					for (const member of literal.members) {
						const name = keyName(member);
						if (name == null) {
							continue;
						}
						if (/^set[A-Z]/.test(name)) {
							report(member, `Rename \`${name}\` to an \`on…Change\` callback`);
						} else if (name === "selectedValue" || name === "multiple") {
							report(
								member,
								`Drop \`${name}\`: the chosen value is \`value\`, and the component decides one or many`,
							);
						} else if (name === "onChange" && takesValue(member, typeParameters)) {
							report(
								member,
								"`onChange` is the DOM event. Report a value with `onValueChange` or `onCheckedChange`",
							);
						}
					}
				}
			},
		};
	},
};

const plugin = {
	meta: { name: "mantle" },
	rules: {
		"prop-vocabulary": propVocabulary,
	},
};

export default plugin;
