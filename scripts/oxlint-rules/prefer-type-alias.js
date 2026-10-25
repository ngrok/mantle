/**
 * Disallows `interface` declarations outside `declare global` and
 * `declare module` blocks. Write a `type` alias: it cannot merge by
 * accident, and it handles unions and mapped types the same way. Inside an
 * ambient block, declaration merging is the point, so an `interface` that
 * augments `Window` or `ProcessEnv` stays allowed.
 *
 * @example
 * // ❌ Incorrect
 * interface ButtonProps { label: string }
 *
 * // ✅ Correct
 * type ButtonProps = { label: string };
 * declare global {
 *   interface Window { dataLayer?: unknown[] }
 * }
 */

/** Whether a `TSModuleDeclaration` is `declare global`, `declare module "x"`, or `declare namespace X`. A plain `namespace X` is not ambient. */
function isAmbient(module) {
	return module.declare || module.kind === "global" || module.id.type === "Literal";
}

function isInAmbientModule(node) {
	for (let ancestor = node.parent; ancestor != null; ancestor = ancestor.parent) {
		if (ancestor.type === "TSModuleDeclaration" && isAmbient(ancestor)) {
			return true;
		}
	}
	return false;
}

const preferTypeAlias = {
	meta: {},
	create(context) {
		return {
			TSInterfaceDeclaration(node) {
				if (isInAmbientModule(node)) {
					return;
				}
				context.report({
					message: `Use \`type ${node.id.name} = …\` instead of an \`interface\`. Keep \`interface\` for declaration merging in \`declare global\` or \`declare module\`. See CONVENTIONS.md § TypeScript.`,
					node: node.id,
				});
			},
		};
	},
};

const plugin = {
	meta: { name: "mantle" },
	rules: {
		"prefer-type-alias": preferTypeAlias,
	},
};

export default plugin;
