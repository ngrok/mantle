import {
	canChange,
	holdsTextInListOrFragment,
	isFragmentElement,
	isTranslateNoSubtree,
	renderedChildren,
	textHazard,
	unwrap,
} from "./ast.ts";
import type { JsxChild, JsxElement, JsxFragment, Rule } from "./types.ts";

/**
 * Reports a conditional text child that can unmount, or change into an element, while a sibling
 * stays mounted. A `.map()` counts as conditional, because an empty list unmounts every row.
 *
 * This is the other half of the translation crash. A browser translation engine reparents the text
 * node, so React's `removeChild` names a node the parent no longer owns and the DOM raises
 * `NotFoundError`.
 *
 * Three shapes stay quiet on purpose. A conditional whose every branch renders text is safe, since
 * React writes the new value through `commitTextUpdate` and the translation reverts. So is the lone
 * child of an element, which React updates through `setTextContent`; the failure needs a sibling. And
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
 * // ✅ not reported: both branches render text, so the value changes in place
 * <button>
 *   {open ? "Show less" : "Show more"}
 *   <Icon svg={caret} />
 * </button>
 */
function isLonePrimitive(child: JsxChild | undefined): boolean {
	return (
		child?.type !== "JSXExpressionContainer" ||
		child.expression.type === "JSXEmptyExpression" ||
		!holdsTextInListOrFragment(child.expression)
	);
}

export const jsxNoConditionalTextWithSiblings: Rule = {
	meta: {
		type: "problem",
		docs: {
			description:
				"Disallow a conditional text child that can unmount or change type beside a sibling.",
			url: "https://github.com/ngrok/mantle/blob/main/docs/browser-translation.md#never-render-a-conditional-element-immediately-before-bare-text-children",
		},
		messages: {
			textCanUnmount:
				"This conditional renders text in one branch and nothing in another. When the text unmounts while a sibling remains, React removes a text node that a browser translation engine reparented, the DOM raises `NotFoundError`, and the page goes blank. Wrap the text in an element that stays mounted.",
			textBecomesElement:
				"This conditional renders text in one branch and an element in another. When the text changes type, React replaces a text node that a browser translation engine reparented, the DOM raises `NotFoundError`, and the page goes blank. Render an element in both branches.",
		},
	},
	create(context) {
		function check(node: JsxElement | JsxFragment) {
			if (isTranslateNoSubtree(node)) {
				return;
			}
			const children = renderedChildren(node.children);
			// Why only a lone primitive of a host element: React writes a lone string or number
			// through `setTextContent`, which repairs the subtree. A list and a fragment own no host
			// node, and neither does `Fragment`.
			if (
				node.type === "JSXElement" &&
				!isFragmentElement(node) &&
				children.length < 2 &&
				isLonePrimitive(children[0])
			) {
				return;
			}
			for (const child of children) {
				if (
					child.type !== "JSXExpressionContainer" ||
					child.expression.type === "JSXEmptyExpression"
				) {
					continue;
				}
				const expression = unwrap(child.expression);
				if (!canChange(expression)) {
					continue;
				}
				const hazard = textHazard(expression);
				if (hazard != null) {
					context.report({
						node: child,
						messageId: hazard === "unmount" ? "textCanUnmount" : "textBecomesElement",
					});
				}
			}
		}

		return { JSXElement: check, JSXFragment: check };
	},
};
