/**
 * Flags a Tailwind numeric spacing class that is not a multiple of 0.25.
 * Tailwind generates no CSS and no build error for it: `w-21.4` does nothing,
 * `w-21.5` works.
 *
 * Scope: string literals inside a `className` attribute, and the arguments of a
 * `cx(...)` call.
 *
 * @example
 * // ❌ Incorrect
 * <div className="w-21.4" />
 *
 * // ✅ Correct
 * <div className="w-21.5" />
 * <div className="w-[5.35rem]" />
 */

/** A spacing utility with a fractional numeric value, such as `w-21.4` or `-mt-1.3`. */
const FRACTIONAL_SPACING =
	/^-?(?:p[xytrblse]?|m[xytrblse]?|w|h|size|min-w|min-h|max-w|max-h|gap(?:-[xy])?|space-[xy]|inset(?:-[xy])?|top|right|bottom|left|start|end|translate-[xy]|scroll-[mp][xytrblse]?|basis|indent)-(\d+\.\d+)$/;

/** Collects the static strings in a subtree. */
function collectStrings(node, strings) {
	if (node == null || typeof node !== "object") {
		return;
	}
	if (node.type === "Literal" && typeof node.value === "string") {
		strings.push({ node, value: node.value });
		return;
	}
	if (node.type === "TemplateElement") {
		strings.push({ node, value: node.value.raw });
		return;
	}
	for (const [key, child] of Object.entries(node)) {
		if (key === "parent") {
			continue;
		}
		if (Array.isArray(child)) {
			for (const item of child) {
				collectStrings(item, strings);
			}
		} else {
			collectStrings(child, strings);
		}
	}
}

/** Whether the node sits inside a `className` attribute, which the attribute visitor already checks. */
function isInsideClassName(node) {
	for (let current = node.parent; current != null; current = current.parent) {
		if (current.type === "JSXAttribute") {
			return current.name.name === "className";
		}
	}
	return false;
}

const tailwindQuarterStepSpacing = {
	meta: {},
	create(context) {
		function check(subtree) {
			const strings = [];
			collectStrings(subtree, strings);
			for (const { node, value } of strings) {
				for (const token of value.split(/\s+/)) {
					// Drop the variant prefix and the important marker: `md:!w-21.4` → `w-21.4`.
					const utility = token.slice(token.lastIndexOf(":") + 1).replace(/^!/, "");
					const match = FRACTIONAL_SPACING.exec(utility);
					if (match != null && !Number.isInteger(Number(match[1]) * 4)) {
						context.report({
							message: `\`${token}\` generates no CSS: Tailwind numeric spacing takes only multiples of 0.25. Use a quarter step or an arbitrary value such as \`w-[5.35rem]\`.`,
							node,
						});
					}
				}
			}
		}
		return {
			JSXAttribute(node) {
				if (node.name.name === "className") {
					check(node.value);
				}
			},
			CallExpression(node) {
				if (
					node.callee.type === "Identifier" &&
					node.callee.name === "cx" &&
					!isInsideClassName(node)
				) {
					check(node.arguments);
				}
			},
		};
	},
};

const plugin = {
	meta: { name: "mantle" },
	rules: {
		"tailwind-quarter-step-spacing": tailwindQuarterStepSpacing,
	},
};

export default plugin;
