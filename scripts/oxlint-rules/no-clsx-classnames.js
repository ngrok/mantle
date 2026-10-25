/**
 * Disallows imports of `clsx` and `classnames`. The codebase standardizes on
 * `cx` from `@ngrok/mantle/cx` for className composition. A second composition
 * utility fragments search, lint coverage, and review — and may diverge in
 * edge cases.
 *
 * @example
 * // ❌ Incorrect
 * import clsx from "clsx";
 * import { clsx } from "clsx";
 * import classNames from "classnames";
 *
 * // ✅ Correct
 * import { cx } from "@ngrok/mantle/cx";
 */

const FORBIDDEN_PACKAGES = new Set(["clsx", "classnames"]);

const noClsxClassnames = {
	meta: {},
	create(context) {
		return {
			ImportDeclaration(node) {
				const source = node.source?.value;
				if (typeof source !== "string" || !FORBIDDEN_PACKAGES.has(source)) {
					return;
				}
				context.report({
					message: `Use \`cx\` from \`@ngrok/mantle/cx\` instead of \`${source}\` for className composition.`,
					node: node.source,
				});
			},
		};
	},
};

const plugin = {
	meta: { name: "mantle" },
	rules: {
		"no-clsx-classnames": noClsxClassnames,
	},
};

export default plugin;
