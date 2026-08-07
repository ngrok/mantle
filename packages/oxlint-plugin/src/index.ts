import { jsxNoConditionalBeforeText } from "./jsx-no-conditional-before-text.ts";
import { jsxNoConditionalTextWithSiblings } from "./jsx-no-conditional-text-with-siblings.ts";
import { jsxRequireTranslateNo } from "./jsx-require-translate-no.ts";
import type { Rule } from "./types.ts";

/**
 * ngrok's house oxlint rules, under the `ngrok` namespace.
 *
 * The three rules here read a JSX tree for the shapes a browser translation engine turns into a
 * blank page. The mechanism, the update-by-update table of what breaks, and the rejected
 * alternatives are in `decisions/2026-08-04-translation-safe-label-wrappers.md` in the mantle
 * repo. `CONVENTIONS.md § Browser Translation` states the rules the code follows.
 *
 * @example
 * // .oxlintrc.json
 * {
 *   "jsPlugins": ["@ngrok/oxlint-plugin"],
 *   "rules": {
 *     "ngrok/jsx-no-conditional-before-text": "error",
 *     "ngrok/jsx-no-conditional-text-with-siblings": "error",
 *     "ngrok/jsx-require-translate-no": "error"
 *   }
 * }
 */
const plugin: { meta: { name: string }; rules: Record<string, Rule> } = {
	meta: { name: "ngrok" },
	rules: {
		"jsx-no-conditional-before-text": jsxNoConditionalBeforeText,
		"jsx-no-conditional-text-with-siblings": jsxNoConditionalTextWithSiblings,
		"jsx-require-translate-no": jsxRequireTranslateNo,
	},
};

export default plugin;
