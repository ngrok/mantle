/**
 * Holds mantle's data attribute contract (COMPONENT_SPEC.md §6) in JSX.
 *
 * - No `data-state`. ARIA or native state comes first; a boolean state is a
 *   presence-only `data-*` attribute such as `data-open`.
 * - No `"true"` or `"false"` value. `[data-x]` matches attribute presence, so
 *   `data-x="false"` still matches.
 * - No boolean expression as a value. React renders `true` and `false` as the
 *   strings `"true"` and `"false"`. Write `cond ? "" : undefined`.
 * - No `data-open` or `data-expanded` on an element that sets
 *   `aria-expanded`. A trigger carries ARIA only; style it with
 *   `aria-expanded:` or `group-aria-expanded:`.
 *
 * Scope: lowercase intrinsic elements and components alike, outside tests.
 * An internal `data-mantle-*` marker is not consumer API, so its value is free.
 * The rule reads syntax, not types, so it misses a boolean variable passed
 * as a value (`data-x={isOpen}`).
 *
 * @example
 * // ❌ Incorrect
 * <div data-state="open" />
 * <div data-disabled={!enabled} />
 * <button aria-expanded={open} data-open={open ? "" : undefined} />
 *
 * // ✅ Correct
 * <div data-open={open ? "" : undefined} />
 * <div data-side={side} />
 * <button aria-expanded={open} />
 */

const COMPARISON = new Set(["==", "!=", "===", "!==", "<", "<=", ">", ">=", "in", "instanceof"]);

/**
 * The state attributes that `aria-expanded` already carries on a trigger.
 * Why not `data-selected`: a combobox row keeps `aria-selected` for the highlight and `data-selected` for the pick.
 */
const ARIA_STATE_ATTRIBUTES = new Set(["data-open", "data-expanded"]);

/** Whether an expression always yields a boolean, judged from its syntax alone. */
function isBooleanExpression(node) {
	switch (node.type) {
		case "Literal":
			return typeof node.value === "boolean";
		case "UnaryExpression":
			return node.operator === "!";
		case "BinaryExpression":
			return COMPARISON.has(node.operator);
		case "LogicalExpression":
			// Why `||` only: `ok || undefined` renders `"true"`, while `ok && ""` can yield `""` on purpose.
			return node.operator === "||" && isBooleanExpression(node.left);
		default:
			return false;
	}
}

/** Whether an expression is the string `"true"` or `"false"`, or a ternary with one as a branch. */
function yieldsBooleanString(node) {
	if (node.type === "Literal") {
		return node.value === "true" || node.value === "false";
	}
	if (node.type === "ConditionalExpression") {
		return yieldsBooleanString(node.consequent) || yieldsBooleanString(node.alternate);
	}
	return false;
}

/** The attribute name, or `null` for a namespaced name. */
function attributeName(attribute) {
	return attribute.name.type === "JSXIdentifier" ? attribute.name.name : null;
}

const dataAttributeContract = {
	meta: {},
	create(context) {
		if (/\.(?:browser\.)?test\.[jt]sx?$/.test(context.filename)) {
			return {};
		}
		return {
			JSXOpeningElement(node) {
				const attributes = node.attributes.filter((attribute) => attribute.type === "JSXAttribute");
				const names = new Set(attributes.map(attributeName));
				const ariaTrigger = names.has("aria-expanded");
				for (const attribute of attributes) {
					const name = attributeName(attribute);
					if (name == null || !name.startsWith("data-")) {
						continue;
					}
					if (name === "data-state") {
						context.report({
							node: attribute,
							message:
								"Do not set `data-state`. Use the ARIA or native state, or a presence-only attribute such as `data-open` (COMPONENT_SPEC.md §6).",
						});
						continue;
					}
					if (ariaTrigger && ARIA_STATE_ATTRIBUTES.has(name)) {
						context.report({
							node: attribute,
							message: `This element sets \`aria-expanded\`, so drop \`${name}\` and style the state with \`aria-expanded:\` or \`group-aria-expanded:\` (COMPONENT_SPEC.md §6).`,
						});
						continue;
					}
					const value =
						attribute.value?.type === "JSXExpressionContainer"
							? attribute.value.expression
							: attribute.value;
					if (
						value == null ||
						value.type === "JSXEmptyExpression" ||
						name.startsWith("data-mantle-")
					) {
						continue;
					}
					if (yieldsBooleanString(value)) {
						context.report({
							node: attribute,
							message: `\`${name}\` uses presence semantics: write \`""\` for true and omit it for false. \`[${name}]\` also matches \`"false"\` (COMPONENT_SPEC.md §6).`,
						});
					} else if (isBooleanExpression(value)) {
						context.report({
							node: attribute,
							message: `React renders a boolean \`${name}\` as \`"true"\` or \`"false"\`, and \`[${name}]\` matches both. Write \`cond ? "" : undefined\` (COMPONENT_SPEC.md §6).`,
						});
					}
				}
			},
		};
	},
};

const plugin = {
	meta: { name: "mantle" },
	rules: {
		"data-attribute-contract": dataAttributeContract,
	},
};

export default plugin;
