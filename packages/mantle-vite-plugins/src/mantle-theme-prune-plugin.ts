import postcss, { AtRule, Rule, type ChildNode, type Declaration, type Node } from "postcss";
import type { Plugin } from "vite";

/**
 * A palette stop of a Tailwind or mantle color ramp, such as `--color-pink-300`. The theme
 * rules of `mantle.css` restate these for the dark theme and for `invert-theme` islands.
 */
const RAMP =
	"(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|accent|info|danger|warning|success|important)";
const RAMP_STOP = new RegExp(`^--color-${RAMP}-\\d+$`);
const RAMP_STOP_MENTION = new RegExp(`--color-${RAMP}-\\d+(?![\\w-])`, "g");

/**
 * Whitespace-insensitive form of a selector list, so a minified and a source selector compare
 * equal.
 */
const normalizeSelector = (selector: string) =>
	selector
		.replaceAll('"', "")
		.replace(/\s+/g, " ")
		.replace(/\s*,\s*/g, ",")
		.replace(/\(\s+/g, "(")
		.replace(/\s+\)/g, ")")
		.trim();

/**
 * The selectors of mantle's theme rules: the dark theme, the light theme, and the light palette
 * restore on `invert-theme` islands. The pass changes only rules with one of these exact
 * selectors, so a rule of the app is never touched. A test pins this list against `mantle.css`.
 */
const MANTLE_THEME_SELECTORS = new Set(
	[
		':root.dark, :root[data-theme="dark"]:not([data-applied-theme]), :root[data-applied-theme="dark"], :root:not(.dark, [data-theme="dark"]:not([data-applied-theme]), [data-applied-theme="dark"]) .invert-theme',
		':root, :root.light, :root[data-theme="light"]:not([data-applied-theme]), :root[data-applied-theme="light"], :root:is(.dark, [data-theme="dark"]:not([data-applied-theme]), [data-applied-theme="dark"]) .invert-theme',
		':root:is(.dark, [data-theme="dark"]:not([data-applied-theme]), [data-applied-theme="dark"]) .invert-theme',
	].map(normalizeSelector),
);

/** Prefixes each stylesheet the plugin will prune. Change it when the pass changes its output. */
const PRUNE_MARKER = "/*! mantle-theme-prune 1 */";
const PRUNE_MARKER_WITH_SPACE = /\/\*! mantle-theme-prune \d+ \*\/\s*/g;

const isThemeRule = (node: Node | undefined): node is Rule =>
	node instanceof Rule && MANTLE_THEME_SELECTORS.has(normalizeSelector(node.selector));

/**
 * The theme rule inside a color-mix fallback block, such as
 * `@supports (color: color-mix(in lab, red, red)) { <theme rule> }`, or null.
 */
const fallbackRuleOf = (node: Node | undefined): Rule | null =>
	node instanceof AtRule &&
	node.name === "supports" &&
	/^\(color:\s*color-mix\(/.test(node.params) &&
	node.nodes?.length === 1 &&
	isThemeRule(node.first)
		? node.first
		: null;

/**
 * Removes the palette stops from mantle's theme rules that this stylesheet does not read.
 *
 * A stop is read when its name appears in the stylesheet outside its own theme declarations: in
 * a utility, a `var()`, an at-rule condition, or `@layer theme`, where Tailwind writes each stop
 * that a scanned file names. A theme declaration that stays reads the stops in its value.
 *
 * Why only this stylesheet: Vite fixes the hashed file name from the stylesheet's content before
 * this pass runs. So the result must depend on that content alone.
 *
 * @returns the pruned stylesheet, the names of the stops it removed, and whether the stylesheet
 * holds any mantle theme rule.
 */
function pruneThemeCss(css: string): { css: string; removed: Set<string>; themed: boolean } {
	const root = postcss.parse(css);
	const candidates: Declaration[] = [];
	const read = new Set<string>();
	const addMentions = (text: string) => {
		for (const name of text.match(RAMP_STOP_MENTION) ?? []) {
			read.add(name);
		}
	};
	let themed = false;
	root.walk((node) => {
		if (isThemeRule(node)) {
			themed = true;
		} else if (node.type === "atrule") {
			addMentions(node.params);
		} else if (node.type === "decl") {
			if (isThemeRule(node.parent) && RAMP_STOP.test(node.prop)) {
				candidates.push(node);
			} else {
				addMentions(`${node.prop}:${node.value}`);
			}
		}
	});
	// A kept stop can read another stop, such as `--color-gray-50: var(--color-neutral-50)`.
	for (let size = -1; size !== read.size;) {
		size = read.size;
		for (const declaration of candidates) {
			if (read.has(declaration.prop)) {
				addMentions(declaration.value);
			}
		}
	}
	const removed = new Set<string>();
	for (const declaration of candidates) {
		if (!read.has(declaration.prop)) {
			removed.add(declaration.prop);
			declaration.remove();
		}
	}
	root.walkRules((rule) => {
		if (isThemeRule(rule) && rule.nodes.length === 0) {
			const parent = rule.parent;
			rule.remove();
			if (parent instanceof AtRule && parent.nodes?.length === 0) {
				parent.remove();
			}
		}
	});
	joinThemeRuleFragments(root);
	return { css: root.toString(), removed, themed };
}

/**
 * Joins the fragments of each theme rule.
 *
 * lightningcss splits a rule around each color-mix fallback, and each fallback repeats the long
 * theme selector: `S{a} @supports(…){S{b}} S{c} @supports(…){S{d}}`. This gives
 * `S{a c} @supports(…){S{b d}}`. Why that keeps the cascade: every fallback has the same
 * condition, and a fallback only overrides a property that an earlier fragment sets. The join is
 * skipped when a later fragment sets a property that an earlier fallback sets, or when a fragment
 * sets a standard property other than `color-scheme`, which a shorthand could overlap.
 */
function joinThemeRuleFragments(root: postcss.Root) {
	const nodes = [...root.nodes];
	for (let start = 0; start < nodes.length; start++) {
		const head = nodes[start];
		if (!isThemeRule(head)) {
			continue;
		}
		let condition: string | undefined;
		// A piece of the same rule, or a fallback block for it with the run's one condition.
		const belongs = (node: ChildNode | undefined) => {
			const fallback = fallbackRuleOf(node);
			if (fallback != null && node instanceof AtRule) {
				condition ??= node.params;
				return node.params === condition && fallback.selector === head.selector;
			}
			return isThemeRule(node) && node.selector === head.selector;
		};
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
			if (fallback != null) {
				target.append(fallback.nodes);
			} else if (node instanceof Rule) {
				head.append(node.nodes);
			}
			node.remove();
		}
		head.after(firstFallback);
	}
}

/**
 * Whether a run sets only custom properties and `color-scheme`, and no piece sets a property
 * that an earlier fallback in the run sets.
 */
function canJoin(run: ChildNode[]) {
	const setByFallback = new Set<string>();
	for (const node of run) {
		const rule = fallbackRuleOf(node) ?? node;
		if (!(rule instanceof Rule)) {
			return false;
		}
		for (const child of rule.nodes) {
			if (
				child.type !== "decl" ||
				!(child.prop.startsWith("--") || child.prop === "color-scheme") ||
				(rule === node && setByFallback.has(child.prop))
			) {
				return false;
			}
		}
		if (rule !== node) {
			rule.walkDecls((declaration) => {
				setByFallback.add(declaration.prop);
			});
		}
	}
	return true;
}

/**
 * Vite plugin that removes mantle theme CSS a production build does not read.
 *
 * - `mantle.css` restates every palette stop for the dark theme and for `invert-theme` islands.
 *   The plugin keeps a stop in those rules only when the same stylesheet reads it: a utility, a
 *   `var()`, a CSS module merged into it, or `@layer theme`, where Tailwind writes each stop
 *   that a scanned file names.
 * - Tailwind's color-mix fallbacks split each theme rule into many fragments that repeat the
 *   theme selector. The plugin joins them.
 *
 * It runs once on the finished bundle of `vite build` and changes only mantle's own theme rules.
 * When another file of the build reads a stop that the stylesheet does not, it warns. `vite dev`
 * serves the full CSS.
 *
 * `mantleSourcesPlugin` runs this plugin by default. Add it on its own only in a build without
 * `mantleSourcesPlugin`.
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
		apply: "build",
		// Why: Vite hashes a stylesheet's name from its content before generateBundle. The marker
		// makes that hash differ with the plugin on, and with each version of this pass, so a
		// cached stylesheet at an old URL never gets other content.
		transform: {
			filter: { id: { include: /\.css(?:\?|$)/, exclude: /[?&](?:raw|inline|url)\b/ } },
			handler(code) {
				return code.includes("data-applied-theme") ? `${PRUNE_MARKER}\n${code}` : null;
			},
		},
		generateBundle: {
			order: "post",
			handler(_options, bundle) {
				const files = Object.values(bundle);
				const removed = new Set<string>();
				const themeSheets = new Set<string>();
				for (const file of files) {
					if (
						file.type === "asset" &&
						file.fileName.endsWith(".css") &&
						// Why: a pass on a file with a source map would leave the map stale.
						!(`${file.fileName}.map` in bundle) &&
						String(file.source).includes(PRUNE_MARKER)
					) {
						const result = pruneThemeCss(String(file.source).replace(PRUNE_MARKER_WITH_SPACE, ""));
						file.source = result.css;
						if (result.themed) {
							themeSheets.add(file.fileName);
						}
						for (const name of result.removed) {
							removed.add(name);
						}
					}
				}
				// A read from another file cannot keep a stop: the pruned stylesheet would change
				// under the same hashed name. Warn about every read of a stop that any mantle
				// stylesheet removed, because a page may load the reader without another stylesheet
				// that keeps it.
				for (const file of files.filter(({ fileName }) => !themeSheets.has(fileName))) {
					const text = file.type === "chunk" ? file.code : String(file.source);
					const lost = [...new Set(text.match(RAMP_STOP_MENTION))].filter((name) =>
						removed.has(name),
					);
					if (lost.length > 0) {
						this.warn(
							`${file.fileName} reads ${lost.join(", ")}, which a mantle stylesheet of this build does not read, so they can lose their dark and island values. Name each one in a file that stylesheet scans, such as with @source inline("bg-pink-300") for --color-pink-300.`,
						);
					}
				}
			},
		},
	};
}

export {
	//,
	mantleThemePrunePlugin,
	pruneThemeCss,
};
