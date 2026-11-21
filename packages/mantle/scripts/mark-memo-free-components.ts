import { parseSync, Visitor } from "oxc-parser";
import type { Function as FunctionNode, ArrowFunctionExpression } from "oxc-parser";

/** Matches a hook name: `use`, or `use` followed by a capital letter. */
const HOOK_NAME_RE = /^use(?:[A-Z]\w*)?$/;

/** Matches a component name. */
const COMPONENT_NAME_RE = /^[A-Z]/;

type ComponentFunction = FunctionNode | ArrowFunctionExpression;

/** A text range, as start and end offsets into the source. */
type Span = { start: number; end: number };

/** Lists the top-level component functions of a module: `function Name` and `const Name = () => …`. */
function topLevelComponents(program: ReturnType<typeof parseSync>["program"]): ComponentFunction[] {
	const components: ComponentFunction[] = [];
	for (const statement of program.body) {
		const declaration =
			statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
		if (
			declaration?.type === "FunctionDeclaration" &&
			COMPONENT_NAME_RE.test(declaration.id?.name ?? "")
		) {
			components.push(declaration);
		}
		if (declaration?.type === "VariableDeclaration") {
			for (const declarator of declaration.declarations) {
				const init = declarator.init;
				if (
					declarator.id.type === "Identifier" &&
					COMPONENT_NAME_RE.test(declarator.id.name) &&
					(init?.type === "ArrowFunctionExpression" || init?.type === "FunctionExpression")
				) {
					components.push(init);
				}
			}
		}
	}
	return components;
}

/** Reports whether a function body starts with the directive. */
const hasDirective = (component: ComponentFunction, directive: string) =>
	component.body?.type === "BlockStatement" &&
	component.body.body.some(
		(statement) => statement.type === "ExpressionStatement" && statement.directive === directive,
	);

const isInside = (span: Span, outer: Span) => span.start >= outer.start && span.end <= outer.end;

/**
 * Adds `"use no memo"` to each top-level component that memoization cannot help, so the React
 * Compiler leaves it as written. Such a component calls no hook and creates no function in
 * render: it holds no state, runs no effect, and passes no callback that a child compares. Its
 * compiled output adds a cache and saves no work. A component that starts with `"use memo"` stays
 * compiled. The edit adds no line, so source maps keep their line numbers.
 *
 * @example
 * markMemoFreeComponents("a.tsx", "const A = (props) => <div {...props} />;");
 * // => 'const A = (props) => { "use no memo"; return (<div {...props} />); };'
 */
function markMemoFreeComponents(filename: string, code: string): string {
	const { program } = parseSync(filename, code);
	const components = topLevelComponents(program);
	if (components.length === 0) {
		return code;
	}
	const hookCalls: Span[] = [];
	const functions: Span[] = [];
	new Visitor({
		CallExpression: (node) => {
			// Why the property too: `React.useState()` is a hook call.
			const callee = node.callee.type === "MemberExpression" ? node.callee.property : node.callee;
			if (callee.type === "Identifier" && HOOK_NAME_RE.test(callee.name)) {
				hookCalls.push(node);
			}
		},
		ArrowFunctionExpression: (node) => {
			functions.push(node);
		},
		FunctionExpression: (node) => {
			functions.push(node);
		},
		FunctionDeclaration: (node) => {
			functions.push(node);
		},
	}).visit(program);

	let marked = code;
	// Why last to first: each edit shifts the offsets after it.
	for (const component of components.toReversed()) {
		const body = component.body;
		if (
			body == null ||
			hasDirective(component, "use memo") ||
			hasDirective(component, "use no memo")
		) {
			continue;
		}
		const createsWork =
			hookCalls.some((call) => isInside(call, body)) ||
			functions.some((fn) => fn !== component && isInside(fn, body));
		if (createsWork) {
			continue;
		}
		if (body.type === "BlockStatement") {
			marked = `${marked.slice(0, body.start + 1)} "use no memo";${marked.slice(body.start + 1)}`;
		} else {
			marked = `${marked.slice(0, body.start)}{ "use no memo"; return (${marked.slice(body.start, body.end)}); }${marked.slice(body.end)}`;
		}
	}
	return marked;
}

export {
	//,
	markMemoFreeComponents,
};
