/**
 * Holds the state prop names of COMPONENT_SPEC.md §1.11 on exported props
 * types: `value` / `defaultValue` / `onValueChange` and the other triples.
 *
 * In a type alias whose name ends in `Props`, it flags:
 * - a `setX` prop. Report a change with `onXChange`.
 * - a `selectedValue` or `multiple` prop. The value is `value`, and the
 *   component decides one or many.
 * - an `onChange` whose first parameter is a string, number, boolean, array,
 *   or literal. `onChange` is the DOM event; a value goes to `onValueChange`.
 *
 * @example
 * // ❌ Incorrect
 * type PickerProps = { selectedValue?: string; setOpen?: (open: boolean) => void };
 * type ToggleProps = { onChange?: (checked: boolean) => void };
 *
 * // ✅ Correct
 * type PickerProps = { value?: string; defaultValue?: string; onValueChange?: (value: string) => void };
 * type ToggleProps = { checked?: boolean; onCheckedChange?: (checked: boolean) => void };
 *
 * Why no check that `onXChange` has an `x` beside it: a base props type often
 * holds the callback while a union beside it holds `value` and `defaultValue`.
 *
 * Scope: source files; a test's own props types are fixtures. */

const VALUE_TYPES = new Set([
	"TSStringKeyword",
	"TSNumberKeyword",
	"TSBooleanKeyword",
	"TSArrayType",
	"TSLiteralType",
]);

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
function takesValue(member) {
	const type = member.type === "TSMethodSignature" ? member : member.typeAnnotation?.typeAnnotation;
	if (type?.type !== "TSFunctionType" && type?.type !== "TSMethodSignature") {
		return false;
	}
	const first = type.params[0]?.typeAnnotation?.typeAnnotation;
	if (first == null) {
		return false;
	}
	if (first.type === "TSUnionType") {
		return first.types.every((member) => VALUE_TYPES.has(member.type));
	}
	return VALUE_TYPES.has(first.type);
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
					}
				};
				collect(node.typeAnnotation);
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
						} else if (name === "onChange" && takesValue(member)) {
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
