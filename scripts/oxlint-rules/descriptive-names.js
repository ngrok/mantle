/**
 * Disallows the abbreviated binding names `e`, `evt`, and `el`. Write
 * `error` or `event`, and `element`. The rule checks only names that code
 * declares, such as parameters, variables, and catch bindings, so an object
 * key such as `{ e: … }` stays allowed.
 *
 * @example
 * // ❌ Incorrect
 * onClick={(e) => e.preventDefault()}
 * try { run(); } catch (e) { report(e); }
 *
 * // ✅ Correct
 * onClick={(event) => event.preventDefault()}
 * try { run(); } catch (error) { report(error); }
 */

const REPLACEMENTS = new Map([
	["e", "`error` or `event`"],
	["evt", "`event`"],
	["el", "`element`"],
]);

/** The identifiers that a binding pattern declares. */
function* boundIdentifiers(pattern) {
	if (pattern == null) {
		return;
	}
	switch (pattern.type) {
		case "Identifier": {
			yield pattern;
			return;
		}
		case "AssignmentPattern": {
			yield* boundIdentifiers(pattern.left);
			return;
		}
		case "RestElement": {
			yield* boundIdentifiers(pattern.argument);
			return;
		}
		case "ArrayPattern": {
			for (const element of pattern.elements) {
				yield* boundIdentifiers(element);
			}
			return;
		}
		case "ObjectPattern": {
			for (const property of pattern.properties) {
				yield* boundIdentifiers(property.type === "RestElement" ? property : property.value);
			}
			return;
		}
		case "TSParameterProperty": {
			yield* boundIdentifiers(pattern.parameter);
			return;
		}
		default:
	}
}

const descriptiveNames = {
	meta: {},
	create(context) {
		function check(pattern) {
			for (const identifier of boundIdentifiers(pattern)) {
				const replacement = REPLACEMENTS.get(identifier.name);
				if (replacement) {
					context.report({
						message: `Name this binding ${replacement}, not \`${identifier.name}\`. See CONVENTIONS.md § Readability & Maintainability.`,
						node: identifier,
					});
				}
			}
		}

		function checkParams(node) {
			for (const param of node.params) {
				check(param);
			}
		}

		return {
			ArrowFunctionExpression: checkParams,
			CatchClause(node) {
				check(node.param);
			},
			FunctionDeclaration: checkParams,
			FunctionExpression: checkParams,
			VariableDeclarator(node) {
				check(node.id);
			},
		};
	},
};

const plugin = {
	meta: { name: "mantle" },
	rules: {
		"descriptive-names": descriptiveNames,
	},
};

export default plugin;
