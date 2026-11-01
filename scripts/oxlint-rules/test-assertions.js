/**
 * Test rules from docs/testing.md that a reviewer otherwise catches by hand.
 * `.oxlintrc.json` scopes them to test files.
 *
 * `no-only-to-be-defined`: a test whose only assertion is `toBeDefined()`
 * passes on a wrong value. Assert the value, DOM state, or ARIA state.
 *
 * `no-config-teardown`: each Vitest config sets `restoreMocks`, `unstubEnvs`,
 * and `unstubGlobals`, and each setup file runs `cleanup()` after each test.
 *
 * `no-process-env-write`: never assign or delete `process.env` or a key of it.
 * The unit test files share a worker, so the change reaches every later file,
 * and a replaced `process.env` object also hides every later `vi.stubEnv`. Use
 * `vi.stubEnv`, which the config undoes after each test.
 *
 * `no-happy-dom-to-be-visible`: happy-dom loads no CSS, so `toBeVisible()`
 * sees only the `hidden` attribute and inline styles. Use `toBeInTheDocument()`
 * for presence. The rule has no autofix, because an element that a `hidden`
 * attribute or an inline style shows needs a manual decision.
 * `not.toBeVisible()` stays legal. `.oxlintrc.json` turns the rule off for
 * `*.browser.test.*`.
 *
 * @example
 * // ❌ Incorrect
 * test("loads", () => { expect(result).toBeDefined(); });
 * afterEach(() => { vi.restoreAllMocks(); });
 * process.env.NODE_ENV = "test";
 * expect(screen.getByRole("heading")).toBeVisible(); // in happy-dom
 *
 * // ✅ Correct
 * vi.stubEnv("NODE_ENV", "test");
 * expect(screen.getByRole("heading")).toBeInTheDocument();
 */

const TEST_FUNCTION_NAMES = new Set(["it", "test"]);
/** Whether the call chain under a matcher call starts at `expect(…)` or `expect.element(…)`. */
function isExpectChain(node) {
	let current = node;
	while (current != null) {
		if (current.type === "CallExpression") {
			const callee = current.callee;
			if (callee.type === "Identifier" && callee.name === "expect") {
				return true;
			}
			if (
				callee.type === "MemberExpression" &&
				callee.object.type === "Identifier" &&
				callee.object.name === "expect"
			) {
				return true;
			}
			current = callee.type === "MemberExpression" ? callee.object : null;
		} else if (current.type === "MemberExpression") {
			current = current.object;
		} else {
			return false;
		}
	}
	return false;
}

/** Collects the matcher names called on `expect` chains in a subtree. */
function collectMatchers(node, matchers) {
	if (node == null || typeof node !== "object") {
		return;
	}
	if (
		node.type === "CallExpression" &&
		node.callee.type === "MemberExpression" &&
		node.callee.property.type === "Identifier" &&
		isExpectChain(node.callee.object)
	) {
		matchers.push(node.callee.property.name);
	}
	for (const [key, child] of Object.entries(node)) {
		if (key === "parent") {
			continue;
		}
		if (Array.isArray(child)) {
			for (const item of child) {
				collectMatchers(item, matchers);
			}
		} else {
			collectMatchers(child, matchers);
		}
	}
}

const noOnlyToBeDefined = {
	meta: {},
	create(context) {
		return {
			CallExpression(node) {
				if (node.callee.type !== "Identifier" || !TEST_FUNCTION_NAMES.has(node.callee.name)) {
					return;
				}
				const body = node.arguments.find(
					(argument) =>
						argument.type === "ArrowFunctionExpression" || argument.type === "FunctionExpression",
				);
				if (body == null) {
					return;
				}
				const matchers = [];
				collectMatchers(body.body, matchers);
				if (matchers.length > 0 && matchers.every((matcher) => matcher === "toBeDefined")) {
					context.report({
						message:
							"`toBeDefined()` is this test's only assertion, so a wrong value passes. Assert the value, DOM state, or ARIA state.",
						node: node.callee,
					});
				}
			},
		};
	},
};

const HOOK_NAMES = new Set(["afterEach", "beforeEach"]);
const CONFIG_TEARDOWN = new Set([
	"clearAllMocks",
	"restoreAllMocks",
	"unstubAllEnvs",
	"unstubAllGlobals",
]);

const CLEANUP_SOURCES = new Set(["@testing-library/react", "vitest-browser-react"]);

/** Whether the call is `vi.<teardown>()` or a `cleanup()` imported from a testing library. */
function isConfigTeardown(call, cleanupNames) {
	const { callee } = call;
	if (callee.type === "Identifier") {
		return cleanupNames.has(callee.name);
	}
	return (
		callee.type === "MemberExpression" &&
		callee.object.type === "Identifier" &&
		callee.object.name === "vi" &&
		callee.property.type === "Identifier" &&
		CONFIG_TEARDOWN.has(callee.property.name)
	);
}

const noConfigTeardown = {
	meta: {},
	create(context) {
		const cleanupNames = new Set();
		return {
			ImportDeclaration(node) {
				if (!CLEANUP_SOURCES.has(node.source.value)) {
					return;
				}
				for (const specifier of node.specifiers) {
					if (
						specifier.type === "ImportSpecifier" &&
						specifier.imported.type === "Identifier" &&
						specifier.imported.name === "cleanup"
					) {
						cleanupNames.add(specifier.local.name);
					}
				}
			},
			CallExpression(node) {
				const callback = node.arguments[0];
				if (node.callee.type !== "Identifier" || !HOOK_NAMES.has(node.callee.name)) {
					return;
				}
				// `afterEach(cleanup)` passes the teardown itself.
				if (callback?.type === "Identifier" && cleanupNames.has(callback.name)) {
					context.report({
						message: "The Vitest config and setup file already run this teardown; delete it.",
						node: callback,
					});
					return;
				}
				if (
					callback?.type !== "ArrowFunctionExpression" &&
					callback?.type !== "FunctionExpression"
				) {
					return;
				}
				// A concise arrow body is one expression, not a statement list.
				const expressions =
					callback.body.type === "BlockStatement"
						? callback.body.body
								.filter((statement) => statement.type === "ExpressionStatement")
								.map((statement) => statement.expression)
						: [callback.body];
				for (const expression of expressions) {
					if (expression.type === "CallExpression" && isConfigTeardown(expression, cleanupNames)) {
						context.report({
							message: "The Vitest config and setup file already run this teardown; delete it.",
							node: expression,
						});
					}
				}
			},
		};
	},
};

const noHappyDomToBeVisible = {
	meta: {},
	create(context) {
		return {
			MemberExpression(node) {
				if (node.property.type !== "Identifier" || node.property.name !== "toBeVisible") {
					return;
				}
				// happy-dom does apply the `hidden` attribute and inline styles, so `not.toBeVisible()` can observe them. Only the positive form is a presence check.
				const negated =
					node.object.type === "MemberExpression" &&
					node.object.property.type === "Identifier" &&
					node.object.property.name === "not";
				if (!negated) {
					context.report({
						message:
							"happy-dom loads no CSS, so `toBeVisible()` sees only the `hidden` attribute and inline styles. Use `toBeInTheDocument()` for presence, or move the test to browser mode if visibility is the behavior.",
						node: node.property,
					});
				}
			},
		};
	},
};

/** Whether the node is `process.env`, or a key read from it at any depth. */
function isProcessEnv(node) {
	if (node?.type !== "MemberExpression") {
		return false;
	}
	const { computed, property } = node;
	const isEnvKey = computed
		? property.type === "Literal" && property.value === "env"
		: property.type === "Identifier" && property.name === "env";
	const isEnv = node.object.type === "Identifier" && node.object.name === "process" && isEnvKey;
	return isEnv || isProcessEnv(node.object);
}

const noProcessEnvWrite = {
	meta: {},
	create(context) {
		const message =
			"Never write process.env in a test; use vi.stubEnv, which the config undoes after each test.";
		return {
			AssignmentExpression(node) {
				if (isProcessEnv(node.left)) {
					context.report({ message, node });
				}
			},
			UpdateExpression(node) {
				if (isProcessEnv(node.argument)) {
					context.report({ message, node });
				}
			},
			UnaryExpression(node) {
				if (node.operator === "delete" && isProcessEnv(node.argument)) {
					context.report({ message, node });
				}
			},
			CallExpression(node) {
				const { callee } = node;
				if (
					callee.type === "MemberExpression" &&
					callee.object.type === "Identifier" &&
					callee.object.name === "Reflect" &&
					callee.property.type === "Identifier" &&
					callee.property.name === "deleteProperty" &&
					isProcessEnv(node.arguments[0])
				) {
					context.report({ message, node });
				}
			},
		};
	},
};

const plugin = {
	meta: { name: "mantle" },
	rules: {
		"no-config-teardown": noConfigTeardown,
		"no-happy-dom-to-be-visible": noHappyDomToBeVisible,
		"no-only-to-be-defined": noOnlyToBeDefined,
		"no-process-env-write": noProcessEnvWrite,
	},
};

export default plugin;
