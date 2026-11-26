import type {
	JsxChild,
	JsxElement,
	JsxElementName,
	JsxExpression,
	JsxFragment,
	ReportTarget,
} from "./types.ts";

/**
 * What a JSX child can put in the DOM. Every field can be true at once, because one conditional
 * reaches several outcomes.
 *
 * The rules in this package all turn on the difference between a text node and an element node,
 * since a browser translation engine reparents only text nodes. See
 * `decisions/2026-08-04-translation-safe-label-wrappers.md` in the mantle repo.
 */
export type RenderKinds = {
	/** Renders a text node that an engine can reparent. */
	text: boolean;
	/** Renders a node that no engine reparents: an element, or blank text. */
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

type LogicalExpression = Extract<JsxExpression, { type: "LogicalExpression" }>;

/** How a fragment's children add up: every node they render, or only the first one. */
type FragmentReader = (children: readonly JsxChild[]) => RenderKinds;

/**
 * Strips the syntax that changes nothing at runtime: a type assertion, `satisfies`, a non-null
 * assertion, and an optional chain.
 */
export function unwrap(expression: JsxExpression): JsxExpression {
	switch (expression.type) {
		case "TSAsExpression":
		case "TSSatisfiesExpression":
		case "TSNonNullExpression":
		case "TSTypeAssertion":
		case "ChainExpression":
			return unwrap(expression.expression);
		default:
			return expression;
	}
}

/** The returned expression of a `.map()` arrow callback, or `null` for any other expression. */
function mapCallbackBody(expression: JsxExpression): JsxExpression | null {
	if (expression.type !== "CallExpression") {
		return null;
	}
	const { callee, arguments: args } = expression;
	const [callback] = args;
	// Why only an expression body: a block body can return from any branch.
	if (
		callee.type === "MemberExpression" &&
		!callee.computed &&
		callee.property.type === "Identifier" &&
		callee.property.name === "map" &&
		callback?.type === "ArrowFunctionExpression" &&
		callback.body.type !== "BlockStatement"
	) {
		return callback.body;
	}
	return null;
}

/** Whether an expression reads a count, such as `items.length`, which renders `0` when falsy. */
function readsCount(expression: JsxExpression): boolean {
	const node = unwrap(expression);
	return (
		node.type === "MemberExpression" &&
		!node.computed &&
		node.property.type === "Identifier" &&
		(node.property.name === "length" || node.property.name === "size")
	);
}

function literalKinds(value: unknown): RenderKinds {
	// Why `""` is nothing: React creates no text node for an empty string.
	if (value == null || typeof value === "boolean" || value === "") {
		return NOTHING;
	}
	if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
		return TEXT;
	}
	return UNKNOWN;
}

function logicalKinds(node: LogicalExpression, readFragment: FragmentReader): RenderKinds {
	const right = kindsOf(node.right, readFragment);
	if (node.operator === "&&") {
		// Why text for a count: `items.length && <Row />` renders `0` while the list is empty.
		return union(right, readsCount(node.left) ? TEXT : NOTHING);
	}
	// Why drop the left side's nothing: `??` and `||` replace a nullish or falsy left value.
	return union({ ...kindsOf(node.left, readFragment), nothing: false }, right);
}

function kindsOf(expression: JsxExpression, readFragment: FragmentReader): RenderKinds {
	const node = unwrap(expression);
	const body = mapCallbackBody(node);
	if (body != null) {
		return union(kindsOf(body, readFragment), NOTHING);
	}
	switch (node.type) {
		case "JSXElement":
			return ELEMENT;
		case "JSXFragment":
			return readFragment(node.children);
		case "TemplateLiteral":
			return node.expressions.length === 0 ? literalKinds(node.quasis[0]?.value.cooked) : TEXT;
		case "Literal":
			return literalKinds(node.value);
		case "UnaryExpression":
			return node.operator === "!" || node.operator === "void" || node.operator === "delete"
				? NOTHING
				: TEXT;
		case "Identifier":
			return node.name === "undefined" ? NOTHING : UNKNOWN;
		case "ConditionalExpression":
			return union(kindsOf(node.consequent, readFragment), kindsOf(node.alternate, readFragment));
		case "LogicalExpression":
			return logicalKinds(node, readFragment);
		default:
			return UNKNOWN;
	}
}

function childKinds(child: JsxChild, readFragment: FragmentReader): RenderKinds {
	switch (child.type) {
		case "JSXText":
			// Why blank text counts as an element: no engine reparents it.
			return child.value.trim() === "" ? ELEMENT : TEXT;
		case "JSXExpressionContainer":
			return child.expression.type === "JSXEmptyExpression"
				? NOTHING
				: kindsOf(child.expression, readFragment);
		case "JSXElement":
			return ELEMENT;
		case "JSXFragment":
			return readFragment(child.children);
		default:
			return UNKNOWN;
	}
}

/** Every node a fragment's children can render. A fragment owns no host node of its own. */
function everyNode(children: readonly JsxChild[]): RenderKinds {
	const kinds = renderedChildren(children).map((child) => childKinds(child, everyNode));
	return {
		...union(...kinds),
		// A fragment renders nothing only when each of its children can render nothing.
		nothing: kinds.every((kind) => kind.nothing),
	};
}

/** What the first node that a fragment's children render can be. */
function firstNode(children: readonly JsxChild[]): RenderKinds {
	let first = NOTHING;
	for (const child of renderedChildren(children)) {
		const kinds = childKinds(child, firstNode);
		first = { ...union(first, kinds), nothing: kinds.nothing };
		if (!kinds.nothing) {
			return first;
		}
	}
	return first;
}

/**
 * Reads everything an expression can put in the DOM.
 *
 * A conditional recurses, so `cond && (wide ? <Full /> : <Compact />)` reports an element and
 * nothing, never text. A fragment reports what its children render. A `.map()` reports what its
 * callback returns, plus nothing for an empty array. An expression this function cannot read
 * statically reports `unknown`, never a guess, and each rule decides what to do with that.
 *
 * @example
 * // `<Icon />` → { element: true }
 * // `"Show more"` → { text: true }
 * // `icon && <Icon />` → { element: true, nothing: true }
 * // `open ? "Less" : ""` → { text: true, nothing: true }
 * // `items.map((item) => <Row key={item.id} />)` → { element: true, nothing: true }
 * // `children` → { unknown: true }
 * const kinds = renderKinds(container.expression);
 */
export function renderKinds(expression: JsxExpression): RenderKinds {
	return kindsOf(expression, everyNode);
}

/**
 * Reads what the first DOM node of a child can be. React inserts a new node before the first node
 * of the next sibling, so this is the node an insert names.
 *
 * @example
 * // `Save` → { text: true }
 * // `{rows.map((row) => <Row key={row.id} />)}` → { element: true, nothing: true }
 * // `<><b />Save</>` → { element: true }
 * const kinds = firstNodeKinds(child);
 */
export function firstNodeKinds(child: JsxChild): RenderKinds {
	return childKinds(child, firstNode);
}

/**
 * Whether an expression can change what it renders: a conditional, or a `.map()` whose list can
 * grow, shrink, or empty.
 */
export function canChange(expression: JsxExpression): boolean {
	const node = unwrap(expression);
	return (
		node.type === "ConditionalExpression" ||
		node.type === "LogicalExpression" ||
		mapCallbackBody(node) != null
	);
}

/**
 * Whether React puts this child in the DOM at all.
 *
 * JSX drops whitespace-only text that holds a line break, and a JSX comment container renders
 * nothing. A space between two children on one line stays, as a blank text node.
 */
export function isRendered(child: JsxChild): boolean {
	if (child.type === "JSXText") {
		return child.value.trim() !== "" || !child.value.includes("\n");
	}
	if (child.type === "JSXExpressionContainer") {
		return child.expression.type !== "JSXEmptyExpression";
	}
	return true;
}

/**
 * The children React renders, in source order, with the dropped whitespace and comments removed.
 *
 * @example
 * // <button>⏎⇥{icon && <Icon />}⏎⇥{children}⏎</button>
 * // → [{icon && <Icon />}, {children}]
 * const rendered = renderedChildren(node.children);
 */
export function renderedChildren(children: readonly JsxChild[]): JsxChild[] {
	return children.filter((child) => isRendered(child));
}

/** Spells a JSX tag name the way the config names it: `kbd`, `Kbd`, or `CodeBlock.Code`. */
export function elementName(name: JsxElementName): string {
	switch (name.type) {
		case "JSXIdentifier":
			return name.name;
		case "JSXNamespacedName":
			return `${name.namespace.name}:${name.name.name}`;
		case "JSXMemberExpression":
			return `${elementName(name.object)}.${name.property.name}`;
	}
}

/** An element's static `key`: `""` when it has none, and `null` when the key is dynamic. */
function staticKey(node: JsxElement): string | null {
	for (const attribute of node.openingElement.attributes) {
		if (
			attribute.type === "JSXAttribute" &&
			attribute.name.type === "JSXIdentifier" &&
			attribute.name.name === "key"
		) {
			const { value } = attribute;
			return value?.type === "Literal" && typeof value.value === "string"
				? `=${value.value}`
				: null;
		}
	}
	return "";
}

/**
 * Whether a conditional picks between two elements that React reuses. With the same type and the
 * same key, React updates the element in place and inserts nothing.
 */
function swapsSameElement(expression: JsxExpression): boolean {
	if (expression.type !== "ConditionalExpression") {
		return false;
	}
	const consequent = unwrap(expression.consequent);
	const alternate = unwrap(expression.alternate);
	if (consequent.type !== "JSXElement" || alternate.type !== "JSXElement") {
		return false;
	}
	const key = staticKey(consequent);
	return (
		key != null &&
		key === staticKey(alternate) &&
		elementName(consequent.openingElement.name) === elementName(alternate.openingElement.name)
	);
}

/**
 * Whether this child can mount an element as it changes: a conditional, or a `.map()` that gains a
 * row.
 *
 * The mount inserts before the first node of whatever sibling follows. When that node is a text
 * node the translation engine reparented, the insert names a node the parent no longer owns and the
 * DOM raises `NotFoundError`.
 *
 * @example
 * // `{icon && <Icon />}` → true
 * // `{rows.map((row) => <Row key={row.id} />)}` → true
 * // `{open ? <i title="on" /> : <i title="off" />}` → false, because React reuses the `<i>`
 * // `{open ? "Less" : "More"}` → false, because neither branch is an element
 * const mounts = mountsElement(child);
 */
export function mountsElement(child: JsxChild): boolean {
	if (child.type !== "JSXExpressionContainer" || child.expression.type === "JSXEmptyExpression") {
		return false;
	}
	const expression = unwrap(child.expression);
	return canChange(expression) && renderKinds(expression).element && !swapsSameElement(expression);
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

/**
 * An element's own `translate` mode, read in JSX order, so the last assignment wins:
 *
 * - `"no"` or `"yes"`: a static value. `translate=""` means yes, as in HTML.
 * - `"dynamic"`: a bare attribute or an expression this package cannot read.
 * - `"spread"`: a spread after a static value, which can override it.
 * - `null`: no value, so the element inherits the mode of its parent.
 */
export type TranslateMode = "no" | "yes" | "dynamic" | "spread" | null;

type JsxAttributeValue = Extract<
	JsxElement["openingElement"]["attributes"][number],
	{ type: "JSXAttribute" }
>["value"];

function staticMode(text: string | null | undefined): TranslateMode {
	const value = text?.toLowerCase();
	if (value === "no") {
		return "no";
	}
	// Why `null` for any other string: HTML reads an invalid value as inherit.
	return value === "yes" || value === "" ? "yes" : null;
}

function expressionMode(expression: JsxExpression): TranslateMode {
	const node = unwrap(expression);
	if (node.type === "Literal" && typeof node.value === "string") {
		return staticMode(node.value);
	}
	if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
		return staticMode(node.quasis[0]?.value.cooked);
	}
	return "dynamic";
}

function attributeMode(value: JsxAttributeValue): TranslateMode {
	if (value?.type === "Literal" && typeof value.value === "string") {
		return staticMode(value.value);
	}
	if (value?.type === "JSXExpressionContainer") {
		return expressionMode(value.expression);
	}
	return "dynamic";
}

/** Reads one `{...spread}`. An object literal shows its keys, and any other spread can hide one. */
function spreadMode(argument: JsxExpression, mode: TranslateMode): TranslateMode {
	const opaque = mode == null ? null : "spread";
	if (argument.type !== "ObjectExpression") {
		return opaque;
	}
	let result = mode;
	for (const property of argument.properties) {
		if (property.type === "SpreadElement") {
			result = result == null ? null : "spread";
			continue;
		}
		const { key } = property;
		const isTranslate =
			(key.type === "Identifier" && key.name === "translate") ||
			(key.type === "Literal" && key.value === "translate");
		if (!property.computed && isTranslate) {
			result = expressionMode(property.value);
		}
	}
	return result;
}

/** Reads an element's own `translate` mode. See [TranslateMode]. */
export function translateMode(node: JsxElement): TranslateMode {
	let mode: TranslateMode = null;
	for (const attribute of node.openingElement.attributes) {
		if (attribute.type === "JSXSpreadAttribute") {
			mode = spreadMode(attribute.argument, mode);
		} else if (attribute.name.type === "JSXIdentifier" && attribute.name.name === "translate") {
			mode = attributeMode(attribute.value);
		}
	}
	return mode;
}

/**
 * The `translate` mode a node inherits: the mode of the nearest enclosing element that sets one.
 *
 * The walk stops at a JSX attribute and at a `createPortal` call. Each one renders the element
 * where a component or the portal puts it, outside this subtree, so the subtree's mode does not
 * reach it.
 */
export function inheritedTranslateMode(node: JsxElement | JsxFragment): TranslateMode {
	let current: JsxElement["parent"] | null = node.parent;
	while (current != null) {
		if (current.type === "JSXAttribute") {
			return null;
		}
		if (current.type === "CallExpression") {
			const { callee } = current;
			const isPortal =
				(callee.type === "Identifier" && callee.name === "createPortal") ||
				(callee.type === "MemberExpression" &&
					callee.property.type === "Identifier" &&
					callee.property.name === "createPortal");
			if (isPortal) {
				return null;
			}
		}
		if (current.type === "JSXElement") {
			const mode = translateMode(current);
			if (mode != null) {
				return mode;
			}
		}
		current = "parent" in current ? current.parent : null;
	}
	return null;
}

/**
 * Whether a translation engine skips this node's children. It skips a subtree whose nearest
 * `translate` is `no`, so it reparents no text node there and no insert or removal can throw.
 */
export function isTranslateNoSubtree(node: JsxElement | JsxFragment): boolean {
	const own = node.type === "JSXElement" ? translateMode(node) : null;
	return (own ?? inheritedTranslateMode(node)) === "no";
}
