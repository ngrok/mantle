import {
	firstNodeKinds,
	isTranslateNoSubtree,
	mountsElement,
	renderedChildren,
	textRange,
} from "./ast.ts";
import type { JsxChild, JsxElement, JsxFragment, Rule } from "./types.ts";

/**
 * The first later sibling whose first node can be a reparented text node, or `null`. React inserts
 * before the next node that exists, so the walk goes on past a child that can render nothing.
 */
function textAnchor(siblings: readonly JsxChild[]): JsxChild | null {
	for (const sibling of siblings) {
		const kinds = firstNodeKinds(sibling);
		if (kinds.text || kinds.unknown) {
			return sibling;
		}
		if (!kinds.nothing) {
			return null;
		}
	}
	return null;
}

/**
 * Reports a conditional element that renders immediately before a bare text child. A `.map()`
 * counts as conditional, because a new row mounts the same way.
 *
 * Google Translate wraps each text node in a `<font>` and reparents the original node. When the
 * condition turns on, React calls `parent.insertBefore(element, textNode)` against a node the
 * parent no longer owns, and the DOM raises `NotFoundError`. React re-throws it, so the root
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
			url: "https://github.com/ngrok/mantle/blob/main/docs/browser-translation.md#never-render-a-conditional-element-immediately-before-bare-text-children",
		},
		messages: {
			conditionalBeforeText:
				"A conditional element renders immediately before this text. Once a browser translation engine reparents the text node, the element's insert raises `NotFoundError` and the page goes blank. Wrap the text in an element with its own `data-slot`, move the conditional element after the text, or mount it unconditionally.",
		},
	},
	create(context) {
		function check(node: JsxElement | JsxFragment) {
			if (isTranslateNoSubtree(node)) {
				return;
			}
			const children = renderedChildren(node.children);
			const reported = new Set<JsxChild>();
			for (const [index, child] of children.entries()) {
				if (!mountsElement(child)) {
					continue;
				}
				const anchor = textAnchor(children.slice(index + 1));
				if (anchor == null || reported.has(anchor)) {
					continue;
				}
				reported.add(anchor);
				context.report({ node: textRange(anchor), messageId: "conditionalBeforeText" });
			}
		}

		return { JSXElement: check, JSXFragment: check };
	},
};
