import MagicString from "magic-string";
import { parseSync, Visitor } from "oxc-parser";
import type { ArrowFunctionExpression, Function as FunctionNode, Program } from "oxc-parser";

/** Matches a hook name: `use`, or `use` followed by a capital letter. */
const HOOK_NAME_RE = /^use(?:[A-Z]\w*)?$/;

/** Matches a component name. */
const COMPONENT_NAME_RE = /^[A-Z]/;

type ComponentFunction = FunctionNode | ArrowFunctionExpression;

/** A text range, as start and end offsets into the source. */
type Span = { start: number; end: number };

/** Lists the top-level component functions of a module: `function Name` and `const Name = () => …`. */
function topLevelComponents(program: Program): ComponentFunction[] {
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

/** Lists the local names of hooks imported from `react`, such as `read` in `import { use as read }`. */
function reactHookAliases(program: Program): Set<string> {
	const aliases = new Set<string>();
	for (const statement of program.body) {
		if (statement.type !== "ImportDeclaration" || statement.source.value !== "react") {
			continue;
		}
		for (const specifier of statement.specifiers) {
			if (
				specifier.type === "ImportSpecifier" &&
				HOOK_NAME_RE.test(
					specifier.imported.type === "Identifier"
						? specifier.imported.name
						: specifier.imported.value,
				)
			) {
				aliases.add(specifier.local.name);
			}
		}
	}
	return aliases;
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
 * Compiler leaves it as written. Such a component calls no hook and creates no function in render,
 * its parameter defaults included: it holds no state, runs no effect, and passes no callback that a
 * child compares. Its compiled output adds a cache that saves little. A component that starts with
 * `"use memo"` stays compiled. The edits add no line.
 *
 * @example
 * markMemoFreeComponents("a.tsx", "const A = (props) => <div {...props} />;").toString();
 * // => 'const A = (props) => { "use no memo"; return (<div {...props} />); };'
 */
function markMemoFreeComponents(filename: string, code: string): MagicString {
	const marked = new MagicString(code);
	const { program } = parseSync(filename, code);
	const components = topLevelComponents(program);
	if (components.length === 0) {
		return marked;
	}
	const hookAliases = reactHookAliases(program);
	const hookCalls: Span[] = [];
	const functions: Span[] = [];
	new Visitor({
		CallExpression: (node) => {
			// Why the property too: `React.use()` and `React["use"]()` are hook calls.
			const callee = node.callee.type === "MemberExpression" ? node.callee.property : node.callee;
			const literal = callee.type === "Literal" ? String(callee.value) : "";
			const name = callee.type === "Identifier" ? callee.name : literal;
			if (HOOK_NAME_RE.test(name) || (callee === node.callee && hookAliases.has(name))) {
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

	for (const component of components) {
		const body = component.body;
		if (
			body == null ||
			hasDirective(component, "use memo") ||
			hasDirective(component, "use no memo")
		) {
			continue;
		}
		const createsWork =
			hookCalls.some((call) => isInside(call, component)) ||
			functions.some((fn) => fn !== component && isInside(fn, component));
		if (createsWork) {
			continue;
		}
		if (body.type === "BlockStatement") {
			marked.appendLeft(body.start + 1, ' "use no memo";');
		} else {
			marked.appendLeft(body.start, '{ "use no memo"; return (');
			marked.appendRight(body.end, "); }");
		}
	}
	return marked;
}

export {
	//,
	markMemoFreeComponents,
};
