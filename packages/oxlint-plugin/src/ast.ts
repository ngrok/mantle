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
	/** Renders an element node, which no engine reparents. */
	element: boolean;
	/** Renders blank text, which no engine reparents. A swap with other text is a text write. */
	blank: boolean;
	/** Renders no node, so the child mounts and unmounts as the condition flips. */
	nothing: boolean;
	/** Renders something this package cannot read statically. */
	unknown: boolean;
};

const NONE: RenderKinds = {
	text: false,
	element: false,
	blank: false,
	nothing: false,
	unknown: false,
};
const NOTHING: RenderKinds = { ...NONE, nothing: true };
const TEXT: RenderKinds = { ...NONE, text: true };
const ELEMENT: RenderKinds = { ...NONE, element: true };
const BLANK: RenderKinds = { ...NONE, blank: true };
const UNKNOWN: RenderKinds = { ...NONE, unknown: true };

function union(...kinds: RenderKinds[]): RenderKinds {
	return {
		text: kinds.some((kind) => kind.text),
		element: kinds.some((kind) => kind.element),
		blank: kinds.some((kind) => kind.blank),
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

/** Whether an expression reads only a callback parameter, such as `n` or `item.id`. */
function readsParameter(expression: JsxExpression, parameters: ReadonlySet<string>): boolean {
	const node = unwrap(expression);
	if (node.type === "Identifier") {
		return parameters.has(node.name);
	}
	return (
		node.type === "MemberExpression" && !node.computed && readsParameter(node.object, parameters)
	);
}

/**
 * Whether a `.map()` renders rows that never change: it runs over an array literal, and its
 * callback returns one element with no condition and a key that reads only the callback parameter.
 */
function mapsFixedList(expression: JsxExpression): boolean {
	if (expression.type !== "CallExpression" || expression.callee.type !== "MemberExpression") {
		return false;
	}
	const list = unwrap(expression.callee.object);
	const [callback] = expression.arguments;
	if (
		list.type !== "ArrayExpression" ||
		list.elements.length === 0 ||
		!list.elements.every((element) => element != null && element.type !== "SpreadElement") ||
		callback?.type !== "ArrowFunctionExpression" ||
		callback.body.type === "BlockStatement"
	) {
		return false;
	}
	const row = unwrap(callback.body);
	if (row.type !== "JSXElement" || isFragmentElement(row)) {
		return false;
	}
	const value = keyAttribute(row)?.value;
	if (value == null || value.type === "Literal") {
		return true;
	}
	const parameters = new Set(
		callback.params.flatMap((parameter) =>
			parameter.type === "Identifier" ? [parameter.name] : [],
		),
	);
	return (
		value.type === "JSXExpressionContainer" &&
		value.expression.type !== "JSXEmptyExpression" &&
		readsParameter(value.expression, parameters)
	);
}

/** Whether an element is `Fragment` or `React.Fragment`, which owns no host node. */
export function isFragmentElement(node: JsxElement): boolean {
	const name = elementName(node.openingElement.name);
	return name === "Fragment" || name === "React.Fragment";
}

/** Whether an expression reads `.length`, which renders `0` when falsy. */
function readsCount(expression: JsxExpression): boolean {
	const node = unwrap(expression);
	return (
		node.type === "MemberExpression" &&
		!node.computed &&
		node.property.type === "Identifier" &&
		node.property.name === "length"
	);
}

/** Whether an expression holds an optional chain, which yields `undefined` when it stops. */
function isOptionalChain(expression: JsxExpression): boolean {
	let node = expression;
	while (
		node.type === "TSAsExpression" ||
		node.type === "TSSatisfiesExpression" ||
		node.type === "TSNonNullExpression" ||
		node.type === "TSTypeAssertion"
	) {
		node = node.expression;
	}
	return node.type === "ChainExpression";
}

function literalKinds(value: unknown): RenderKinds {
	// Why `""` is nothing: React creates no text node for an empty string.
	if (value == null || typeof value === "boolean" || value === "") {
		return NOTHING;
	}
	if (typeof value === "string" && value.trim() === "") {
		return BLANK;
	}
	if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
		return TEXT;
	}
	return UNKNOWN;
}

/** What the falsy left side of `&&` renders: `0` for a count, and nothing otherwise. */
function falsyKinds(left: JsxExpression): RenderKinds {
	if (!readsCount(left)) {
		return NOTHING;
	}
	// Why nothing too: an optional chain such as `items?.length` can stop at `undefined`.
	return isOptionalChain(left) ? union(TEXT, NOTHING) : TEXT;
}

/**
 * What the left side of `??` or `||` renders once the operator replaces its value. `??` replaces
 * only `null` and `undefined`, so it keeps `false`. `||` replaces every falsy value.
 */
function keptKinds(
	expression: JsxExpression,
	operator: "??" | "||",
	readFragment: FragmentReader,
): RenderKinds {
	const node = unwrap(expression);
	switch (node.type) {
		case "ConditionalExpression":
			return union(
				keptKinds(node.consequent, operator, readFragment),
				keptKinds(node.alternate, operator, readFragment),
			);
		case "LogicalExpression":
			if (node.operator !== "&&") {
				// A value that the inner operator keeps reaches the outer one. Only `??` inside `??`
				// keeps a falsy value, so every other pair keeps the truthy values alone.
				const inner = node.operator === "??" && operator === "??" ? "??" : "||";
				return union(
					keptKinds(node.left, inner, readFragment),
					keptKinds(node.right, operator, readFragment),
				);
			}
			// Why: `??` keeps `false` and `0`, and replaces `undefined`.
			if (operator === "||") {
				return keptKinds(node.right, operator, readFragment);
			}
			return union(
				keptKinds(node.right, operator, readFragment),
				readsCount(node.left) ? TEXT : NOTHING,
			);
		case "Literal":
			if (operator === "??" ? node.value == null : !node.value) {
				return NONE;
			}
			break;
		case "Identifier":
			if (node.name === "undefined") {
				return NONE;
			}
			break;
		default:
			break;
	}
	return kindsOf(node, readFragment);
}

function logicalKinds(node: LogicalExpression, readFragment: FragmentReader): RenderKinds {
	const right = kindsOf(node.right, readFragment);
	if (node.operator === "&&") {
		// Why text for a count: `items.length && <Row />` renders `0` while the list is empty.
		return union(right, falsyKinds(node.left));
	}
	return union(keptKinds(node.left, node.operator, readFragment), right);
}

/** Whether a call is `createPortal(…)`, which renders its content in another container. */
function isPortalCall(node: JsxExpression): boolean {
	if (node.type !== "CallExpression") {
		return false;
	}
	const { callee } = node;
	return (
		(callee.type === "Identifier" && callee.name === "createPortal") ||
		(callee.type === "MemberExpression" &&
			callee.property.type === "Identifier" &&
			callee.property.name === "createPortal")
	);
}

const COMPARISONS = new Set(["===", "!==", "==", "!=", "<", ">", "<=", ">=", "in", "instanceof"]);

function kindsOf(expression: JsxExpression, readFragment: FragmentReader): RenderKinds {
	const node = unwrap(expression);
	const body = mapCallbackBody(node);
	if (body != null) {
		return union(kindsOf(body, readFragment), mapsFixedList(node) ? NONE : NOTHING);
	}
	// Why nothing: a portal renders in another container, and a comparison renders a boolean.
	if (isPortalCall(node) || (node.type === "BinaryExpression" && COMPARISONS.has(node.operator))) {
		return NOTHING;
	}
	switch (node.type) {
		case "JSXElement":
			return isFragmentElement(node) ? readFragment(node.children) : ELEMENT;
		case "JSXFragment":
			return readFragment(node.children);
		case "TemplateLiteral":
			if (node.expressions.length === 0) {
				return literalKinds(node.quasis[0]?.value.cooked);
			}
			// Why nothing too: with no fixed text, `${label}` renders `""` when `label` is empty.
			return node.quasis.every((quasi) => quasi.value.cooked === "") ? union(TEXT, NOTHING) : TEXT;
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

/** Whether JSX text is blank. The parser keeps an entity such as `&nbsp;` as written. */
function isBlankText(value: string): boolean {
	return value.replace(/&(?:nbsp|#160|#x0*a0);/gi, " ").trim() === "";
}

function childKinds(child: JsxChild, readFragment: FragmentReader): RenderKinds {
	switch (child.type) {
		case "JSXText":
			return isBlankText(child.value) ? BLANK : TEXT;
		case "JSXExpressionContainer":
			return child.expression.type === "JSXEmptyExpression"
				? NOTHING
				: kindsOf(child.expression, readFragment);
		case "JSXElement":
			return isFragmentElement(child) ? readFragment(child.children) : ELEMENT;
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
		(mapCallbackBody(node) != null && !mapsFixedList(node))
	);
}

/**
 * Whether an expression can hold text inside a list or a fragment. React writes only a lone string
 * or number through `setTextContent`, so text in a list or a fragment is not on that repair path.
 * A list of elements is safe beside a string branch, because the switch resets the text content.
 */
export function holdsTextInListOrFragment(expression: JsxExpression): boolean {
	const node = unwrap(expression);
	const body = mapCallbackBody(node);
	if (body != null) {
		return renderKinds(body).text;
	}
	switch (node.type) {
		case "ConditionalExpression":
			return (
				holdsTextInListOrFragment(node.consequent) || holdsTextInListOrFragment(node.alternate)
			);
		case "LogicalExpression":
			return holdsTextInListOrFragment(node.left) || holdsTextInListOrFragment(node.right);
		case "ArrayExpression":
			return true;
		case "JSXFragment":
			return everyNode(node.children).text;
		case "JSXElement":
			return isFragmentElement(node) && everyNode(node.children).text;
		default:
			return false;
	}
}

/** How a conditional text child can fail: its text unmounts, or it changes into an element. */
export type TextHazard = "unmount" | "becomesElement";

function hazardOf(kinds: RenderKinds): TextHazard | null {
	if (!kinds.text) {
		return null;
	}
	if (kinds.nothing) {
		return "unmount";
	}
	return kinds.element ? "becomesElement" : null;
}

type ConditionalExpression = Extract<JsxExpression, { type: "ConditionalExpression" }>;

/** A fragment's key and rendered children, or `null` when the expression is not a fragment. */
function fragmentParts(
	expression: JsxExpression,
): { key: string | null; children: JsxChild[] } | null {
	const node = unwrap(expression);
	if (node.type === "JSXFragment") {
		return { key: "", children: renderedChildren(node.children) };
	}
	if (node.type === "JSXElement" && isFragmentElement(node)) {
		return { key: staticKey(node), children: renderedChildren(node.children) };
	}
	return null;
}

/**
 * The children of two fragment branches that React matches one by one, or `null`. React matches
 * two fragments with the same readable key, however each one is spelled.
 */
function matchedFragments(node: ConditionalExpression): [JsxChild[], JsxChild[]] | null {
	const consequent = fragmentParts(node.consequent);
	const alternate = fragmentParts(node.alternate);
	if (consequent?.key == null || consequent.key !== alternate?.key) {
		return null;
	}
	return [consequent.children, alternate.children];
}

function kindsAt(
	children: readonly JsxChild[],
	index: number,
	readFragment: FragmentReader,
): RenderKinds {
	const child = children[index];
	return child == null ? NOTHING : childKinds(child, readFragment);
}

/** Whether two matched children are one element that React reuses. */
function isSameChild(left: JsxChild | undefined, right: JsxChild | undefined): boolean {
	return left?.type === "JSXElement" && right?.type === "JSXElement" && isSameElement(left, right);
}

/**
 * Where a ternary between two matched fragments inserts an element: before text inside the
 * fragment (`inner`), or past the fragment's end (`outer`). `null` when the branches do not match.
 *
 * @example
 * // `busy ? <><i />Loading</> : <><b />Save</>` → { inner: true, outer: false }
 * // `on ? <><b />On</> : <><b />Off</>` → { inner: false, outer: false }
 */
export function fragmentSwap(expression: JsxExpression): { inner: boolean; outer: boolean } | null {
	const node = unwrap(expression);
	const pair = node.type === "ConditionalExpression" ? matchedFragments(node) : null;
	if (pair == null) {
		return null;
	}
	const [left, right] = pair;
	const length = Math.max(left.length, right.length);
	let inner = false;
	let outer = false;
	for (let index = 0; index < length; index++) {
		const kinds = union(kindsAt(left, index, everyNode), kindsAt(right, index, everyNode));
		if (!kinds.element || isSameChild(left[index], right[index])) {
			continue;
		}
		let anchored = false;
		for (let next = index + 1; next < length && !anchored; next++) {
			const anchor = union(kindsAt(left, next, firstNode), kindsAt(right, next, firstNode));
			if (anchor.text || anchor.unknown) {
				inner = true;
			}
			anchored = !anchor.nothing;
		}
		outer ||= !anchored;
	}
	return { inner, outer };
}

/**
 * How a conditional child can remove a text node that an engine reparented, or `null` when it
 * cannot.
 *
 * React matches the children of two fragments with the same key one by one, so such a ternary is
 * read position by position. Fragments with different keys remount, and so does a fragment against
 * any other branch, so their text counts as removed.
 *
 * @example
 * // `on && "Save"` → "unmount"
 * // `on ? <><b />On</> : <><b />Off</>}` → null, because React writes the new text in place
 * // `on ? <>On</> : "Off"` → "becomesElement"
 * const hazard = textHazard(expression);
 */
export function textHazard(expression: JsxExpression): TextHazard | null {
	const node = unwrap(expression);
	if (node.type === "ConditionalExpression") {
		const pair = matchedFragments(node);
		if (pair != null) {
			const [left, right] = pair;
			const length = Math.max(left.length, right.length);
			for (let index = 0; index < length; index++) {
				const hazard = hazardOf(
					union(kindsAt(left, index, everyNode), kindsAt(right, index, everyNode)),
				);
				if (hazard != null) {
					return hazard;
				}
			}
			return null;
		}
		const consequent = fragmentParts(node.consequent);
		const alternate = fragmentParts(node.alternate);
		// Why unmount: two fragments with different keys remount, so React removes every text node.
		if (consequent != null && alternate != null) {
			return renderKinds(node).text ? "unmount" : null;
		}
		if ((consequent == null) !== (alternate == null)) {
			return hazardOf({ ...renderKinds(node), element: true });
		}
	}
	return hazardOf(renderKinds(node));
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

type JsxAttribute = Extract<
	JsxElement["openingElement"]["attributes"][number],
	{ type: "JSXAttribute" }
>;

function keyAttribute(node: JsxElement): JsxAttribute | null {
	for (const attribute of node.openingElement.attributes) {
		if (
			attribute.type === "JSXAttribute" &&
			attribute.name.type === "JSXIdentifier" &&
			attribute.name.name === "key"
		) {
			return attribute;
		}
	}
	return null;
}

function keyValue(attribute: JsxAttribute): string | null {
	const { value } = attribute;
	if (value == null) {
		return null;
	}
	const literal = value.type === "JSXExpressionContainer" ? value.expression : value;
	if (literal.type === "JSXEmptyExpression") {
		return null;
	}
	const expression = unwrap(literal);
	if (
		expression.type === "Literal" &&
		(typeof expression.value === "string" || typeof expression.value === "number")
	) {
		return `=${String(expression.value)}`;
	}
	return null;
}

/**
 * An element's static key, as React compares it: `""` when it has none, and `null` when this
 * package cannot read it. React turns a key into a string, so `key={1}` equals `key="1"`. The
 * attributes apply in order: a spread can carry a key, so it adds the name of the spread value,
 * and a later `key` replaces whatever came before.
 */
function staticKey(node: JsxElement): string | null {
	let key: string | null = "";
	for (const attribute of node.openingElement.attributes) {
		if (attribute.type === "JSXSpreadAttribute") {
			const argument = unwrap(attribute.argument);
			key = argument.type === "Identifier" && key != null ? `${key}...${argument.name}` : null;
		} else if (attribute.name.type === "JSXIdentifier" && attribute.name.name === "key") {
			key = keyValue(attribute);
		}
	}
	return key;
}

/** Whether an element's key is a conditional, which remounts the element when it flips. */
export function hasConditionalKey(node: JsxElement): boolean {
	const value = keyAttribute(node)?.value;
	return (
		value?.type === "JSXExpressionContainer" &&
		value.expression.type !== "JSXEmptyExpression" &&
		canChange(value.expression)
	);
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
	return (
		consequent.type === "JSXElement" &&
		alternate.type === "JSXElement" &&
		isSameElement(consequent, alternate)
	);
}

/** Whether React reuses one element for the other: the same type and the same readable key. */
function isSameElement(left: JsxElement, right: JsxElement): boolean {
	const key = staticKey(left);
	return (
		!isFragmentElement(left) &&
		key != null &&
		key === staticKey(right) &&
		elementName(left.openingElement.name) === elementName(right.openingElement.name)
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
 * // `<Row key={open ? "a" : "b"} />` → true, because a new key remounts the element
 * // `{open ? <i title="on" /> : <i title="off" />}` → false, because React reuses the `<i>`
 * // `{open ? "Less" : "More"}` → false, because neither branch is an element
 * const mounts = mountsElement(child);
 */
export function mountsElement(child: JsxChild): boolean {
	if (child.type === "JSXElement") {
		return (
			hasConditionalKey(child) && (!isFragmentElement(child) || everyNode(child.children).element)
		);
	}
	if (child.type !== "JSXExpressionContainer" || child.expression.type === "JSXEmptyExpression") {
		return false;
	}
	const expression = unwrap(child.expression);
	const swap = fragmentSwap(expression);
	if (swap != null) {
		return swap.outer;
	}
	const kinds = renderKinds(expression);
	// Why blank text with nothing: a blank text node that mounts is an insert too.
	return (
		canChange(expression) &&
		(kinds.element || (kinds.blank && kinds.nothing)) &&
		!swapsSameElement(expression)
	);
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
	// Why `null`: React renders no attribute for `undefined`, `null`, or a boolean.
	if (
		(node.type === "Identifier" && node.name === "undefined") ||
		(node.type === "Literal" && (node.value == null || typeof node.value === "boolean"))
	) {
		return null;
	}
	return "dynamic";
}

function attributeMode(value: JsxAttributeValue): TranslateMode {
	if (value?.type === "Literal" && typeof value.value === "string") {
		return staticMode(value.value);
	}
	if (value?.type === "JSXExpressionContainer" && value.expression.type !== "JSXEmptyExpression") {
		return expressionMode(value.expression);
	}
	// Why `null` for a bare attribute: its value is `true`, and React renders no attribute for it.
	return value == null ? null : "dynamic";
}

/** Reads one `{...spread}`. An object literal shows its keys, and any other spread can hide one. */
function spreadMode(spread: JsxExpression, mode: TranslateMode): TranslateMode {
	const opaque = mode == null ? null : "spread";
	const argument = unwrap(spread);
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
		// Why: a computed key such as `[prop]` can name `translate`.
		if (property.computed && key.type !== "Literal") {
			result = result == null ? null : "spread";
			continue;
		}
		const isTranslate =
			(key.type === "Identifier" && key.name === "translate") ||
			(key.type === "Literal" && key.value === "translate");
		// Why a computed key passes: `["translate"]` is a string literal.
		if (isTranslate && (!property.computed || key.type === "Literal")) {
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
 * The walk stops at a JSX attribute, a props spread, and a `createPortal` call. Each one renders
 * the element where a component or the portal puts it, outside this subtree, so the subtree's mode
 * does not reach it. The `children` prop of a host element is the exception: it renders inside
 * that element.
 */
export function inheritedTranslateMode(node: JsxElement | JsxFragment): TranslateMode {
	let current: JsxElement["parent"] | null = node.parent;
	let property: unknown = null;
	while (current != null) {
		if (current.type === "Property") {
			property = current;
		}
		if (current.type === "JSXSpreadAttribute" && !spreadsHostChildren(current, property)) {
			return null;
		}
		if (current.type === "CallExpression" && isPortalCall(current)) {
			return null;
		}
		if (current.type === "JSXAttribute" && !isHostChildrenProp(current)) {
			return null;
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

type JsxSpreadAttribute = Extract<
	JsxElement["openingElement"]["attributes"][number],
	{ type: "JSXSpreadAttribute" }
>;

function isHostOpening(owner: JsxAttribute["parent"]): boolean {
	return (
		owner.type === "JSXOpeningElement" &&
		owner.name.type === "JSXIdentifier" &&
		/^[a-z]/.test(owner.name.name)
	);
}

/** Whether an attribute is the `children` prop of a host element such as `div`. */
function isHostChildrenProp(attribute: JsxAttribute): boolean {
	return (
		attribute.name.type === "JSXIdentifier" &&
		attribute.name.name === "children" &&
		isHostOpening(attribute.parent)
	);
}

/**
 * Whether the walk reached a host element's spread through its `children` key, as in
 * `<div {...{ children: <kbd>K</kbd> }} />`. That element renders inside the `div`.
 */
function spreadsHostChildren(spread: JsxSpreadAttribute, property: unknown): boolean {
	const argument = unwrap(spread.argument);
	if (argument.type !== "ObjectExpression" || !isHostOpening(spread.parent)) {
		return false;
	}
	return argument.properties.some(
		(entry) =>
			entry === property &&
			entry.type === "Property" &&
			!entry.computed &&
			((entry.key.type === "Identifier" && entry.key.name === "children") ||
				(entry.key.type === "Literal" && entry.key.value === "children")),
	);
}

/**
 * Whether a translation engine skips this node's children. It skips a subtree whose nearest
 * `translate` is `no`, so it reparents no text node there and no insert or removal can throw.
 */
export function isTranslateNoSubtree(node: JsxElement | JsxFragment): boolean {
	const own = node.type === "JSXElement" ? translateMode(node) : null;
	return (own ?? inheritedTranslateMode(node)) === "no";
}
