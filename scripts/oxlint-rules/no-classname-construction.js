/**
 * Disallows building className strings via template-literal interpolation,
 * `+` concatenation, ternaries, or logical operators (`&&` / `||` / `??`).
 * Use `cx` from `@ngrok/mantle/cx` to compose class names so the codebase has
 * a single, searchable composition mechanism.
 *
 * Scope: only the direct value of the `className` JSX attribute is inspected.
 * Ternaries / template literals / logical expressions nested inside a `cx(...)`
 * call are allowed because they're already going through the approved utility.
 * A ternary that resolves a render-prop className, such as
 * `typeof className === "function" ? className(state) : className`, composes
 * no classes, so the rule allows it.
 *
 * @example
 * // ❌ Incorrect
 * <div className={`foo ${active ? "on" : ""}`} />
 * <div className={"foo " + extra} />
 * <div className={active ? "foo" : "bar"} />
 * <div className={active && "on"} />
 * <div className={maybeClass ?? "fallback"} />
 *
 * // ✅ Correct
 * <div className={cx("foo", active && "on")} />
 * <div className={cx("foo", { on: active })} />
 * <div className={cx("foo", active ? "on" : "off")} />
 * <div className={cx(maybeClass ?? "fallback")} />
 */

/** Whether the node is `typeof <name> === "function"`, the test that resolves a render-prop className. */
function isFunctionTypeCheck(node) {
	return (
		node.type === "BinaryExpression" &&
		node.operator === "===" &&
		node.left.type === "UnaryExpression" &&
		node.left.operator === "typeof" &&
		node.right.type === "Literal" &&
		node.right.value === "function"
	);
}

const noClassnameConstruction = {
	meta: {},
	create(context) {
		return {
			JSXAttribute(node) {
				if (node.name.name !== "className") {
					return;
				}
				if (node.value?.type !== "JSXExpressionContainer") {
					return;
				}
				const expression = node.value.expression;

				if (expression.type === "TemplateLiteral" && expression.expressions.length > 0) {
					context.report({
						message:
							"Compose className with `cx` instead of template-literal interpolation (CONVENTIONS.md § className Composition).",
						node: expression,
					});
				} else if (expression.type === "BinaryExpression" && expression.operator === "+") {
					context.report({
						message:
							"Compose className with `cx` instead of `+` concatenation (CONVENTIONS.md § className Composition).",
						node: expression,
					});
				} else if (
					expression.type === "ConditionalExpression" &&
					!isFunctionTypeCheck(expression.test)
				) {
					context.report({
						message:
							"Compose className with `cx` instead of a ternary (CONVENTIONS.md § className Composition).",
						node: expression,
					});
				} else if (expression.type === "LogicalExpression") {
					context.report({
						message: `Compose className with \`cx\` instead of \`${expression.operator}\` (CONVENTIONS.md § className Composition).`,
						node: expression,
					});
				}
			},
		};
	},
};

const plugin = {
	meta: { name: "mantle" },
	rules: {
		"no-classname-construction": noClassnameConstruction,
	},
};

export default plugin;
