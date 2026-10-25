/**
 * Disallows a positional `boolean` parameter next to other parameters in a
 * named function. A call such as `flagRow("Spot", true)` does not say what
 * `true` means, so pass a named options object:
 * `flagRow({ label: "Spot", enabled: true })`. The rule checks function
 * declarations and functions bound to a variable. It skips a lone `boolean`
 * parameter and a `handle*` or `on*` function, because an event handler keeps
 * the signature that its caller imposes, such as `onOpenChange(open)`.
 *
 * @example
 * // ❌ Incorrect
 * function flagRow(label: string, enabled: boolean) {}
 * const toggle = (value: string, force?: boolean) => {};
 *
 * // ✅ Correct
 * function flagRow({ label, enabled }: { label: string; enabled: boolean }) {}
 * const handleOpenChange = (open: boolean) => setOpen(open);
 */

const EMPTY_TYPES = new Set(["TSUndefinedKeyword", "TSNullKeyword"]);

/** Whether a type annotation is a flag: `boolean`, or `boolean` joined only with `undefined` or `null`. */
function isBooleanType(typeNode) {
	if (typeNode == null) {
		return false;
	}
	if (typeNode.type === "TSBooleanKeyword") {
		return true;
	}
	if (typeNode.type === "TSUnionType") {
		return (
			typeNode.types.some((member) => member.type === "TSBooleanKeyword") &&
			typeNode.types.every(
				(member) => member.type === "TSBooleanKeyword" || EMPTY_TYPES.has(member.type),
			)
		);
	}
	return false;
}

/** The type annotation of a positional parameter, past a default value. */
function paramType(param) {
	const target = param.type === "AssignmentPattern" ? param.left : param;
	if (target.type !== "Identifier") {
		return null;
	}
	return target.typeAnnotation?.typeAnnotation ?? null;
}

const HANDLER_NAME = /^(handle|on)[A-Z]/;

function isFunction(node) {
	return node?.type === "ArrowFunctionExpression" || node?.type === "FunctionExpression";
}

const noBooleanPositionalParam = {
	meta: {},
	create(context) {
		function check(fn, name) {
			if (fn.params.length < 2 || HANDLER_NAME.test(name ?? "")) {
				return;
			}
			for (const param of fn.params) {
				if (!isBooleanType(paramType(param))) {
					continue;
				}
				context.report({
					message:
						"Pass a named options object instead of a positional `boolean`: `fn({ enabled: true })`, not `fn(true)`. See CONVENTIONS.md § Readability & Maintainability.",
					node: param,
				});
			}
		}

		return {
			FunctionDeclaration(node) {
				check(node, node.id?.name);
			},
			VariableDeclarator(node) {
				if (isFunction(node.init)) {
					check(node.init, node.id.type === "Identifier" ? node.id.name : null);
				}
			},
		};
	},
};

const plugin = {
	meta: { name: "mantle" },
	rules: {
		"no-boolean-positional-param": noBooleanPositionalParam,
	},
};

export default plugin;
