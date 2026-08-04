import { isConditional, renderedChildren, renderKinds } from "./ast.ts";
import type { JsxElement, JsxFragment, Rule } from "./types.ts";

/**
 * Reports a conditional text child that can unmount, or change into an element, while a sibling
 * stays mounted.
 *
 * This is the other half of the translation crash. A browser translation engine reparents the text
 * node, so React's `removeChild` names a node the parent no longer owns and the DOM raises
 * `NotFoundError`.
 *
 * Three shapes stay quiet on purpose. A conditional whose every branch renders text is safe, since
 * React writes the new value through `commitTextUpdate` and the translation reverts. So is a lone
 * expression child, which React updates through `setTextContent` — the failure needs a sibling. And
 * so is a branch this package cannot read statically: `{expanded && belowTheFold}` reads as
 * unknown, and that identifier holds an element far more often than a string.
 *
 * @example
 * // ❌ the text unmounts while the icon remains
 * <button>
 *   {label && "Submit"}
 *   <Icon svg={caret} />
 * </button>
 *
 * // ✅ every update is a text write
 * <button>
 *   <span data-slot="button-label">{label}</span>
 *   <Icon svg={caret} />
 * </button>
 *
 * // ✅ not reported — both branches render text, so the value changes in place
 * <button>
 *   {open ? "Show less" : "Show more"}
 *   <Icon svg={caret} />
 * </button>
 */
export const jsxNoConditionalTextWithSiblings: Rule = {
	meta: {
		type: "problem",
		docs: {
			description:
				"Disallow a conditional text child that can unmount or change type beside a sibling.",
			url: "https://github.com/ngrok/mantle/blob/main/CONVENTIONS.md#browser-translation",
		},
		messages: {
			textCanUnmount:
				"This conditional renders text in one branch and nothing in another. When the text unmounts while a sibling remains, React removes a text node that a browser translation engine reparented, the DOM raises `NotFoundError`, and the page goes blank. Wrap the text in an element that stays mounted, or render an empty string instead of nothing so every update is a text write.",
			textBecomesElement:
				"This conditional renders text in one branch and an element in another. When the text changes type, React replaces a text node that a browser translation engine reparented, the DOM raises `NotFoundError`, and the page goes blank. Render an element in both branches.",
		},
	},
	create(context) {
		function check(node: JsxElement | JsxFragment) {
			const children = renderedChildren(node.children);
			// A lone expression child is safe, and self-healing. The failure needs a sibling.
			if (children.length < 2) {
				return;
			}
			for (const child of children) {
				if (child.type !== "JSXExpressionContainer") {
					continue;
				}
				const { expression } = child;
				if (!isConditional(expression)) {
					continue;
				}
				const kinds = renderKinds(expression);
				if (!kinds.text) {
					continue;
				}
				if (kinds.nothing) {
					context.report({ node: child, messageId: "textCanUnmount" });
					continue;
				}
				// Both branches render something, so the only hazard left is a change of type.
				if (kinds.element) {
					context.report({ node: child, messageId: "textBecomesElement" });
				}
			}
		}

		return { JSXElement: check, JSXFragment: check };
	},
};
