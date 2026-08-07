import type { JsxChild, JsxExpression, ReportTarget } from "./types.ts";

/**
 * What a JSX child can put in the DOM. Every field can be true at once, because one conditional
 * reaches several outcomes.
 *
 * The rules in this package all turn on the difference between a text node and an element node,
 * since a browser translation engine reparents only text nodes. See
 * `decisions/2026-08-04-translation-safe-label-wrappers.md` in the mantle repo.
 */
export type RenderKinds = {
	/** Renders a text node. */
	text: boolean;
	/** Renders an element node. */
	element: boolean;
	/** Renders no node, so the child mounts and unmounts as the condition flips. */
	nothing: boolean;
	/** Renders something this package cannot read statically. */
	unknown: boolean;
};

const NOTHING: RenderKinds = { text: false, element: false, nothing: true, unknown: false };
const TEXT: RenderKinds = { text: true, element: false, nothing: false, unknown: false };
const ELEMENT: RenderKinds = { text: false, element: true, nothing: false, unknown: false };
const UNKNOWN: RenderKinds = { text: false, element: false, nothing: false, unknown: true };

function union(...kinds: RenderKinds[]): RenderKinds {
	return {
		text: kinds.some((kind) => kind.text),
		element: kinds.some((kind) => kind.element),
		nothing: kinds.some((kind) => kind.nothing),
		unknown: kinds.some((kind) => kind.unknown),
	};
}

/**
 * Reads everything an expression can put in the DOM.
 *
 * A conditional recurses, so `cond && (wide ? <Full /> : <Compact />)` reports an element and
 * nothing — never text. An expression this function cannot read statically reports `unknown`,
 * never a guess, and each rule decides for itself what to do with that.
 *
 * @example
 * // `<Icon />` → { element: true }
 * // `"Show more"` → { text: true }
 * // `icon && <Icon />` → { element: true, nothing: true }
 * // `open ? "Less" : "More"` → { text: true }
 * // `children` → { unknown: true }
 * const kinds = renderKinds(container.expression);
 */
export function renderKinds(expression: JsxExpression): RenderKinds {
	switch (expression.type) {
		case "JSXElement":
		case "JSXFragment":
			return ELEMENT;
		case "TemplateLiteral":
			return TEXT;
		case "Literal": {
			const { value } = expression;
			if (value == null || typeof value === "boolean") {
				return NOTHING;
			}
			if (typeof value === "string" || typeof value === "number") {
				return TEXT;
			}
			return UNKNOWN;
		}
		case "Identifier":
			return expression.name === "undefined" ? NOTHING : UNKNOWN;
		case "ConditionalExpression":
			return union(renderKinds(expression.consequent), renderKinds(expression.alternate));
		case "LogicalExpression":
			// Why `NOTHING` for `&&`: a falsy test renders no node. `||` and `??` fall through to
			// their left value instead, so both sides can reach the DOM.
			return expression.operator === "&&"
				? union(renderKinds(expression.right), NOTHING)
				: union(renderKinds(expression.left), renderKinds(expression.right));
		default:
			return UNKNOWN;
	}
}

/** Whether an expression branches at its top level, which is what makes a child mount or unmount. */
export function isConditional(expression: JsxExpression): boolean {
	return expression.type === "ConditionalExpression" || expression.type === "LogicalExpression";
}

/**
 * Whether React puts this child in the DOM at all.
 *
 * Whitespace-only JSX text between two lines renders nothing, and so does a JSX comment
 * container. Neither one separates the siblings around it.
 */
export function isRendered(child: JsxChild): boolean {
	if (child.type === "JSXText") {
		return child.value.trim() !== "";
	}
	if (child.type === "JSXExpressionContainer") {
		return child.expression.type !== "JSXEmptyExpression";
	}
	return true;
}

/**
 * The children React renders, in source order, with the whitespace and comments dropped.
 *
 * @example
 * // <button>⏎⇥{icon && <Icon />}⏎⇥{children}⏎</button>
 * // → [{icon && <Icon />}, {children}]
 * const rendered = renderedChildren(node.children);
 */
export function renderedChildren(children: readonly JsxChild[]): JsxChild[] {
	return children.filter((child) => isRendered(child));
}

/**
 * Whether this child mounts, unmounts, or swaps an element as a condition flips.
 *
 * Any of the three inserts before whatever sibling follows. When that sibling is a text node the
 * translation engine reparented, the insert names a node the parent no longer owns and the DOM
 * raises `NotFoundError`.
 *
 * @example
 * // `{icon && <Icon />}` → true
 * // `{open ? "Less" : "More"}` → false, because neither branch is an element
 * const mountsElement = isConditionalElement(child);
 */
export function isConditionalElement(child: JsxChild): boolean {
	if (child.type !== "JSXExpressionContainer") {
		return false;
	}
	const { expression } = child;
	return isConditional(expression) && renderKinds(expression).element;
}

/**
 * Whether React can render this child as a bare text node.
 *
 * An expression this package cannot read statically counts as text, because the crash costs a
 * blank page and the fix costs a `<span>`. A child that only ever holds an element or no node does
 * not count — an element is never reparented, and no node is not a text node.
 *
 * @example
 * // `Submit` → true
 * // `{children}` → true, because the type is unknown here
 * // `{icon && <Icon />}` → false
 * // `{footer == null ? null : <div />}` → false
 * const rendersText = isTextChild(child);
 */
export function isTextChild(child: JsxChild): boolean {
	if (child.type === "JSXText") {
		return child.value.trim() !== "";
	}
	if (child.type !== "JSXExpressionContainer") {
		return false;
	}
	const kinds = renderKinds(child.expression);
	return kinds.text || kinds.unknown;
}

/**
 * The range to underline for a text child, with the JSX whitespace around it trimmed off.
 *
 * A `JSXText` span runs from the end of the previous child to the start of the next one, so it
 * swallows the newline and the indent. Reporting it whole starts the underline on the line above
 * the text. Every other child already has a tight span.
 *
 * @example
 * // <button>⏎⇥{icon && <Icon />}⏎⇥Submit⏎</button>
 * // → the range of `Submit`, not the range that starts after `/>}`
 * context.report({ node: textRange(child), messageId: "conditionalBeforeText" });
 */
export function textRange(child: JsxChild): ReportTarget {
	if (child.type !== "JSXText") {
		return child;
	}
	// Why `raw`: an entity such as `&amp;` is one character in `value` and five in the source, so
	// only the raw text measures the same units as the span.
	const text = child.raw ?? child.value;
	const start = child.range[0] + (text.length - text.trimStart().length);
	const end = child.range[1] - (text.length - text.trimEnd().length);
	return end > start ? { range: [start, end] } : child;
}
