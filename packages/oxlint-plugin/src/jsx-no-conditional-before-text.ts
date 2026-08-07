import { isConditionalElement, isTextChild, renderedChildren, textRange } from "./ast.ts";
import type { JsxElement, JsxFragment, Rule } from "./types.ts";

/**
 * Reports a conditional element that renders immediately before a bare text child.
 *
 * Google Translate wraps each text node in a `<font>` and reparents the original node. When the
 * condition turns on, React calls `parent.insertBefore(element, textNode)` against a node the
 * parent no longer owns, the DOM raises `NotFoundError`, and React re-throws it — so the root
 * tears down and the page goes blank.
 *
 * Three fixes work. Wrap the text in an element that carries its own `data-slot`, move the
 * conditional element after the text so the mount becomes an `appendChild`, or mount the element
 * unconditionally and write text into it.
 *
 * @example
 * // ❌ the icon inserts before a reparented text node
 * <button>
 *   {icon && <Icon svg={icon} />}
 *   {children}
 * </button>
 *
 * // ✅ the icon inserts before an element sibling
 * <button>
 *   {icon && <Icon svg={icon} />}
 *   <span data-slot="button-label">{children}</span>
 * </button>
 */
export const jsxNoConditionalBeforeText: Rule = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow a conditional element immediately before bare text children.",
			url: "https://github.com/ngrok/mantle/blob/main/CONVENTIONS.md#browser-translation",
		},
		messages: {
			conditionalBeforeText:
				"A conditional element renders immediately before this text. Once a browser translation engine reparents the text node, the element's insert raises `NotFoundError` and the page goes blank. Wrap the text in an element with its own `data-slot`, move the conditional element after the text, or mount it unconditionally.",
		},
	},
	create(context) {
		function check(node: JsxElement | JsxFragment) {
			const children = renderedChildren(node.children);
			for (const [index, child] of children.entries()) {
				if (!isConditionalElement(child)) {
					continue;
				}
				const next = children[index + 1];
				if (next == null || !isTextChild(next)) {
					continue;
				}
				context.report({ node: textRange(next), messageId: "conditionalBeforeText" });
			}
		}

		return { JSXElement: check, JSXFragment: check };
	},
};
