import postcss, { AtRule, Rule, type ChildNode, type Container, type Node } from "postcss";
import type { Plugin } from "vite";

/**
 * A palette stop of a Tailwind or mantle color ramp, such as `--color-pink-300`. The theme
 * rules of `mantle.css` restate these for the dark theme and for `invert-theme` islands.
 */
const RAMP_STOP =
	/^--color-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|accent|info|danger|warning|success|important)-\d+$/;

/**
 * Every theme rule in `mantle.css` names `data-applied-theme` in its selector. A rule of the app
 * does not, so the pass never touches it.
 */
const isThemeRule = (node: Node | undefined): node is Rule =>
	node instanceof Rule && node.selector.includes("data-applied-theme");

/**
 * The rule inside a `@supports` fallback block that Tailwind's color-mix polyfill writes for one
 * rule, or null when the node is not such a block.
 */
const fallbackRuleOf = (node: Node | undefined): Rule | null =>
	node instanceof AtRule &&
	node.name === "supports" &&
	node.nodes?.length === 1 &&
	node.first instanceof Rule
		? node.first
		: null;

/**
 * Removes the palette stops that this build does not use from mantle's theme rules.
 *
 * Tailwind writes a stop into `@layer theme` only when a utility, a `var()`, or a raw
 * `--color-x-n` string in the scanned files reads it. So a stop missing from that layer has no
 * light value in this build. Its dark and island values are dead too.
 */
function pruneUnusedStops(root: postcss.Root) {
	const used = new Set<string>();
	root.walkAtRules("layer", (layer) => {
		if (layer.params === "theme") {
			layer.walkDecls((declaration) => {
				used.add(declaration.prop);
			});
		}
	});
	root.walkDecls(RAMP_STOP, (declaration) => {
		if (isThemeRule(declaration.parent) && !used.has(declaration.prop)) {
			declaration.remove();
		}
	});
	root.walkRules((rule) => {
		if (isThemeRule(rule) && rule.nodes.length === 0) {
			rule.remove();
		}
	});
}

/**
 * Joins the fragments of each theme rule.
 *
 * lightningcss splits a rule around each `@supports` fallback, and each fallback repeats the
 * long theme selector: `S{a} @supports(…){S{b}} S{c} @supports(…){S{d}}`. This gives
 * `S{a c} @supports(…){S{b d}}`. Why that keeps the cascade: a fallback only overrides a property
 * that an earlier fragment sets. The join is skipped when a later fragment sets a property
 * that an earlier fallback also sets.
 */
function joinThemeRuleFragments(container: Container) {
	const nodes = [...(container.nodes ?? [])];
	for (let start = 0; start < nodes.length; start++) {
		const head = nodes[start];
		if (!isThemeRule(head)) {
			continue;
		}
		// A piece of the same rule, or the fallback block written for it.
		const belongs = (node: ChildNode | undefined) =>
			(isThemeRule(node) ? node : fallbackRuleOf(node))?.selector === head.selector;
		let end = start + 1;
		while (end < nodes.length && belongs(nodes[end])) {
			end++;
		}
		const run = nodes.slice(start + 1, end);
		start = end - 1;
		const firstFallback = run.find((node) => fallbackRuleOf(node) != null);
		const target = fallbackRuleOf(firstFallback);
		if (firstFallback == null || target == null || !canJoin([head, ...run])) {
			continue;
		}
		for (const node of run) {
			if (node === firstFallback) {
				continue;
			}
			const fallback = fallbackRuleOf(node);
			if (fallback == null && isThemeRule(node)) {
				head.append(node.nodes);
			} else if (fallback != null) {
				target.append(fallback.nodes);
			}
			node.remove();
		}
		head.after(firstFallback);
	}
}

/** Whether no piece sets a property that an earlier fallback in the run sets. */
function canJoin(run: ChildNode[]) {
	const setByFallback = new Set<string>();
	for (const node of run) {
		const fallback = fallbackRuleOf(node);
		if (fallback != null) {
			fallback.walkDecls((declaration) => {
				setByFallback.add(declaration.prop);
			});
		} else if (
			node instanceof Rule &&
			node.some((child) => child.type === "decl" && setByFallback.has(child.prop))
		) {
			return false;
		}
	}
	return true;
}

/**
 * Removes the parts of mantle's theme CSS that one compiled stylesheet does not need. See
 * {@link mantleThemePrunePlugin}.
 *
 * @example
 * ```ts
 * pruneThemeCss(compiledCss); // the same stylesheet, with fewer theme declarations
 * ```
 */
function pruneThemeCss(css: string): string {
	const root = postcss.parse(css);
	pruneUnusedStops(root);
	joinThemeRuleFragments(root);
	return root.toString();
}

/**
 * Vite plugin that removes mantle theme CSS a build does not use. It runs on each stylesheet
 * after `@tailwindcss/vite` compiles it, and it changes no resolved color.
 *
 * - `mantle.css` restates every palette stop for the dark theme and for `invert-theme` islands.
 *   The plugin keeps only the stops that Tailwind kept in `@layer theme` for this build.
 * - Tailwind's color-mix fallbacks split each theme rule into many fragments that repeat the
 *   theme selector. The plugin joins them.
 *
 * A stop that only script reads, such as `style={{ color: "var(--color-pink-300)" }}` with no
 * class or `var()` for it in a scanned file, gets no dark value. It already gets no light value,
 * because Tailwind drops it from `@layer theme`.
 *
 * Its position in the `plugins` array does not matter.
 *
 * @see https://mantle.ngrok.com/vite-plugins#mantlethemepruneplugin
 * @example
 * ```ts
 * // vite.config.ts
 * import { mantleThemePrunePlugin } from "@ngrok/mantle-vite-plugins";
 * import tailwindcss from "@tailwindcss/vite";
 * import { defineConfig } from "vite";
 *
 * export default defineConfig({
 *   plugins: [tailwindcss(), mantleThemePrunePlugin()],
 * });
 * ```
 */
function mantleThemePrunePlugin(): Plugin {
	return {
		name: "@ngrok/mantle-vite-plugins:theme-prune",
		transform: {
			filter: { id: { include: /\.css(?:\?|$)/, exclude: /[?&](?:raw|inline|url)\b/ } },
			handler(code) {
				// Why both checks: only a compiled stylesheet that holds mantle's theme has both.
				if (!code.includes("@layer theme") || !code.includes("data-applied-theme")) {
					return null;
				}
				return { code: pruneThemeCss(code), map: null };
			},
		},
	};
}

export {
	//,
	mantleThemePrunePlugin,
	pruneThemeCss,
};
