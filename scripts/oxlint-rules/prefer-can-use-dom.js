/**
 * Disallows `typeof window`, `typeof document`, and `typeof navigator`
 * compared with `"undefined"`. Use `canUseDOM()` from
 * `@ngrok/mantle/browser-only`. Node has a `navigator` global, so a check on
 * `navigator` alone passes on the server.
 *
 * @example
 * // ❌ Incorrect
 * if (typeof window === "undefined") return;
 * const isBrowser = typeof document !== "undefined";
 *
 * // ✅ Correct
 * import { canUseDOM } from "@ngrok/mantle/browser-only";
 * if (!canUseDOM()) return;
 */

const BROWSER_GLOBALS = new Set(["window", "document", "navigator"]);
const EQUALITY_OPERATORS = new Set(["==", "===", "!=", "!=="]);

/** The global name when `node` is `typeof <browser global>`, else `null`. */
function typeofBrowserGlobal(node) {
	if (
		node.type !== "UnaryExpression" ||
		node.operator !== "typeof" ||
		node.argument.type !== "Identifier"
	) {
		return null;
	}
	return BROWSER_GLOBALS.has(node.argument.name) ? node.argument.name : null;
}

function isUndefinedString(node) {
	return node.type === "Literal" && node.value === "undefined";
}

const preferCanUseDom = {
	meta: {},
	create(context) {
		return {
			BinaryExpression(node) {
				if (!EQUALITY_OPERATORS.has(node.operator)) {
					return;
				}
				const name =
					(isUndefinedString(node.right) && typeofBrowserGlobal(node.left)) ||
					(isUndefinedString(node.left) && typeofBrowserGlobal(node.right));
				if (!name) {
					return;
				}
				context.report({
					message: `Use \`canUseDOM()\` from \`@ngrok/mantle/browser-only\` (\`components/browser-only\` inside the package) instead of \`typeof ${name}\`.`,
					node,
				});
			},
		};
	},
};

const plugin = {
	meta: { name: "mantle" },
	rules: {
		"prefer-can-use-dom": preferCanUseDom,
	},
};

export default plugin;
