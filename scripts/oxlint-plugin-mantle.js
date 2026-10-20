// Custom oxlint rules for the conventions that no built-in rule checks.
// Each rule names the doc section it enforces, so the message can point there.

/** Whether a node is the literal `null`. */
function isNullLiteral(node) {
	return node != null && node.type === "Literal" && node.raw === "null";
}

/** The name of a member property or a plain identifier, or `null` for a computed key. */
function propertyName(node) {
	if (node == null) {
		return null;
	}
	if (node.type === "Identifier") {
		return node.name;
	}
	if (node.type === "MemberExpression" && !node.computed && node.property.type === "Identifier") {
		return node.property.name;
	}
	return null;
}

/**
 * Read a matcher chain such as `expect(x).not.toHaveClass("a")`.
 * Returns the `expect` argument, whether `.not` sits in the chain, and the matcher name.
 */
function readMatcherCall(node) {
	if (node.callee.type !== "MemberExpression" || node.callee.computed) {
		return null;
	}
	const matcher = node.callee.property.name;
	let object = node.callee.object;
	let negated = false;
	if (object.type === "MemberExpression" && !object.computed && object.property.name === "not") {
		negated = true;
		object = object.object;
	}
	if (object.type !== "CallExpression" || propertyName(object.callee) !== "expect") {
		return null;
	}
	return { subject: object.arguments[0], negated, matcher };
}

/** Whether a timer callback is the promise resolver, or a function that calls it: `resolve` or `() => resolve()`. */
function isResolveCallback(callback, resolveName) {
	if (callback == null) {
		return false;
	}
	if (callback.type === "Identifier") {
		return callback.name === resolveName;
	}
	if (!callback.type.endsWith("FunctionExpression")) {
		return false;
	}
	const statements = callback.body.type === "BlockStatement" ? callback.body.body : [callback.body];
	return statements.some((statement) => {
		const expression = statement.type === "ExpressionStatement" ? statement.expression : statement;
		return expression.type === "CallExpression" && propertyName(expression.callee) === resolveName;
	});
}

const noJsxNullTernary = {
	meta: {
		type: "suggestion",
		docs: { description: "Render conditional JSX with `&&`, not a ternary with a `null` arm." },
		messages: {
			nullArm:
				"Write `{condition && <Thing />}` instead of a ternary with a `null` arm. Guard a non-boolean condition first (CONVENTIONS.md § Readability & Maintainability).",
		},
	},
	create(context) {
		return {
			ConditionalExpression(node) {
				const container = node.parent;
				const isChild =
					container?.type === "JSXExpressionContainer" && container.parent?.type !== "JSXAttribute";
				if (isChild && (isNullLiteral(node.consequent) || isNullLiteral(node.alternate))) {
					context.report({ node, messageId: "nullArm" });
				}
			},
		};
	},
};

const noSleepInTests = {
	meta: {
		type: "problem",
		docs: { description: "Never wait for a fixed time in a test." },
		messages: {
			sleep:
				"A `setTimeout` sleep is a race, not a wait. Use `waitFor`, `findBy*`, or `expect.poll` on the state you need (docs/testing.md § Determinism).",
		},
	},
	create(context) {
		return {
			NewExpression(node) {
				if (node.callee.type !== "Identifier" || node.callee.name !== "Promise") {
					return;
				}
				const executor = node.arguments[0];
				if (executor == null || !executor.type.endsWith("FunctionExpression")) {
					return;
				}
				const resolve = executor.params[0];
				const body = executor.body.type === "BlockStatement" ? executor.body.body : [executor.body];
				if (resolve?.type !== "Identifier") {
					return;
				}
				const callsSetTimeoutWithResolve = body.some((statement) => {
					const expression =
						statement.type === "ExpressionStatement" ? statement.expression : statement;
					return (
						expression.type === "CallExpression" &&
						propertyName(expression.callee) === "setTimeout" &&
						isResolveCallback(expression.arguments[0], resolve.name)
					);
				});
				if (callsSetTimeoutWithResolve) {
					context.report({ node, messageId: "sleep" });
				}
			},
		};
	},
};

const presenceMatchers = new Set(["toBeDefined", "toBeTruthy"]);

const noPresenceMatcherOnGetBy = {
	meta: {
		type: "problem",
		docs: { description: "Never wrap a `getBy*` query in a presence matcher." },
		messages: {
			presence:
				"`getBy*` already throws when it finds nothing, so this matcher adds no coverage. Use `toBeInTheDocument()` or assert a value (docs/testing.md § The bar).",
		},
	},
	create(context) {
		return {
			CallExpression(node) {
				const call = readMatcherCall(node);
				if (call == null || call.subject?.type !== "CallExpression") {
					return;
				}
				const isGetBy = propertyName(call.subject.callee)?.startsWith("getBy") === true;
				const isPresence =
					(!call.negated && presenceMatchers.has(call.matcher)) ||
					(call.negated && call.matcher === "toBeNull");
				if (isGetBy && isPresence) {
					context.report({ node, messageId: "presence" });
				}
			},
		};
	},
};

const noBareToHaveBeenCalled = {
	meta: {
		type: "problem",
		docs: { description: "Assert a spy's call count and arguments, not only that it ran." },
		messages: {
			bare: "A bare `toHaveBeenCalled()` cannot see a call count. Use `toHaveBeenCalledTimes(n)` with `toHaveBeenLastCalledWith(…)` (docs/testing.md § The bar).",
		},
	},
	create(context) {
		return {
			CallExpression(node) {
				const call = readMatcherCall(node);
				if (call != null && !call.negated && call.matcher === "toHaveBeenCalled") {
					context.report({ node, messageId: "bare" });
				}
			},
		};
	},
};

const noAbsentClassAssertion = {
	meta: {
		type: "problem",
		docs: { description: "Never assert that a class is absent." },
		messages: {
			absent:
				"`not.toHaveClass` passes when the regression comes back under another class or an inline style. Assert the data attribute or the behavior the class implements (docs/testing.md § Assert behavior, not styling internals).",
		},
	},
	create(context) {
		return {
			CallExpression(node) {
				const call = readMatcherCall(node);
				if (call != null && call.negated && call.matcher === "toHaveClass") {
					context.report({ node, messageId: "absent" });
				}
			},
		};
	},
};

const noDisplayName = {
	meta: {
		type: "problem",
		docs: { description: "Never set `displayName`; React DevTools reads the function name." },
		messages: { displayName: "Remove the `displayName` assignment (COMPONENT_SPEC.md §1.7)." },
	},
	create(context) {
		return {
			AssignmentExpression(node) {
				if (propertyName(node.left) === "displayName" && node.left.type === "MemberExpression") {
					context.report({ node, messageId: "displayName" });
				}
			},
		};
	},
};

const noDefaultExport = {
	meta: {
		type: "problem",
		docs: { description: "Use named exports in packages." },
		messages: { defaultExport: "Use a named export (CONVENTIONS.md § Files & Modules)." },
	},
	create(context) {
		return {
			ExportDefaultDeclaration(node) {
				// Why: an ambient `declare module "*.css"` block must use a default export to model the import.
				if (node.parent?.type === "TSModuleBlock") {
					return;
				}
				context.report({ node, messageId: "defaultExport" });
			},
		};
	},
};

export default {
	meta: { name: "mantle" },
	rules: {
		"no-absent-class-assertion": noAbsentClassAssertion,
		"no-bare-to-have-been-called": noBareToHaveBeenCalled,
		"no-default-export": noDefaultExport,
		"no-display-name": noDisplayName,
		"no-jsx-null-ternary": noJsxNullTernary,
		"no-presence-matcher-on-get-by": noPresenceMatcherOnGetBy,
		"no-sleep-in-tests": noSleepInTests,
	},
};
