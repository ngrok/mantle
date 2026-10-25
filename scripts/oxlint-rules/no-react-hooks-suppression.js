/**
 * Disallows a disable directive that names a React hooks or React Compiler
 * rule, or that names no rule and so disables them all. A hooks diagnostic
 * marks code that the React Compiler cannot keep correct, so restructure the
 * code instead: move the logic into `useEffectEvent`, depend on the value the
 * code reads, or split the effect.
 *
 * @example
 * // ❌ Incorrect
 * // oxlint-disable-next-line react/exhaustive-deps
 * // eslint-disable-next-line react-hooks/rules-of-hooks
 * // oxlint-disable-next-line
 *
 * // ✅ Correct
 * const onTick = useEffectEvent(() => run(latestValue));
 * useEffect(() => onTick(), [trigger]);
 */

/**
 * The rules that the React hooks plugin and the React Compiler own, without the `react/` prefix.
 * `incompatible-library` is not in the set: it flags a library such as TanStack Virtual that no
 * restructure can fix, and the sanctioned answer is `"use no memo"` with a `// Why:`.
 */
const HOOKS_RULES = new Set([
	"component-hook-factories",
	"config",
	"error-boundaries",
	"exhaustive-deps",
	"exhaustive-effect-dependencies",
	"gating",
	"globals",
	"hooks",
	"immutability",
	"invariant",
	"memo-dependencies",
	"preserve-manual-memoization",
	"purity",
	"refs",
	"rules-of-hooks",
	"set-state-in-effect",
	"set-state-in-render",
	"static-components",
	"syntax",
	"todo",
	"unsupported-syntax",
	"use-memo",
	"void-use-memo",
]);

const DIRECTIVE = /^\s*(?:oxlint|eslint)-disable(?:-next-line|-line)?(?:\s+(.*))?$/s;

function isHooksRule(name) {
	if (name.startsWith("react-hooks/")) {
		return true;
	}
	if (name.startsWith("react/")) {
		return HOOKS_RULES.has(name.slice("react/".length));
	}
	return name === "rules-of-hooks" || name === "exhaustive-deps";
}

const noReactHooksSuppression = {
	meta: {},
	create(context) {
		return {
			Program() {
				for (const comment of context.sourceCode.getAllComments()) {
					const match = DIRECTIVE.exec(comment.value);
					if (!match) {
						continue;
					}
					const names = (match[1] ?? "")
						.split("--")[0]
						.split(",")
						.map((name) => name.trim())
						.filter(Boolean);
					if (names.length === 0) {
						context.report({
							message:
								"Name the rules to disable. A directive with no rule list also disables the React hooks rules. See CONVENTIONS.md § React Compiler.",
							loc: comment.loc,
						});
						continue;
					}
					const rule = names.find(isHooksRule);
					if (!rule) {
						continue;
					}
					context.report({
						message: `Do not disable \`${rule}\`. Restructure the code so the React Compiler can keep it correct. See CONVENTIONS.md § React Compiler.`,
						loc: comment.loc,
					});
				}
			},
		};
	},
};

const plugin = {
	meta: { name: "mantle" },
	rules: {
		"no-react-hooks-suppression": noReactHooksSuppression,
	},
};

export default plugin;
