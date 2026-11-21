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
 * Removes the palette stops from mantle's theme rules that no file of the build reads.
 *
 * A stop is read when its name appears anywhere in the build outside its own theme declarations:
 * in a utility, a `var()`, `@layer theme`, a CSS module, another stylesheet, or a script. A theme
 * declaration that stays reads the stops in its value. A theme declaration of an unread stop is
 * dead, because nothing resolves it.
 *
 * @param css - one compiled stylesheet of the build.
 * @param mentions - the stop names the other files of the build mention.
 */
function pruneThemeCss(css: string, mentions: ReadonlySet<string> = new Set()): string {
	const root = postcss.parse(css);
	const candidates: Declaration[] = [];
	const read = new Set(mentions);
	root.walkDecls((declaration) => {
		if (isThemeRule(declaration.parent) && RAMP_STOP.test(declaration.prop)) {
			candidates.push(declaration);
		} else {
			for (const name of `${declaration.prop}:${declaration.value}`.match(RAMP_STOP_MENTION) ??
				[]) {
				read.add(name);
			}
		}
	});
	// A kept stop can read another stop, such as `--color-gray-50: var(--color-neutral-50)`.
	let kept: Declaration[] = [];
	for (let size = -1; size !== read.size;) {
		size = read.size;
		kept = candidates.filter((declaration) => read.has(declaration.prop));
		for (const declaration of kept) {
			for (const name of declaration.value.match(RAMP_STOP_MENTION) ?? []) {
				read.add(name);
			}
		}
	}
	for (const declaration of candidates) {
		if (!read.has(declaration.prop)) {
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
	return root.toString();
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
 *   The plugin keeps a stop in those rules only when a file of the build mentions it outside
 *   them: a stylesheet, a CSS module, or a script chunk.
 * - Tailwind's color-mix fallbacks split each theme rule into many fragments that repeat the
 *   theme selector. The plugin joins them.
 *
 * It runs once on the finished bundle, so it sees every stylesheet and chunk of the build. It
 * changes only mantle's own theme rules, and `vite dev` serves the full CSS.
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
		generateBundle: {
			order: "post",
			handler(_options, bundle) {
				const files = Object.values(bundle);
				const isThemeSheet = (file: (typeof files)[number]) =>
					file.type === "asset" &&
					file.fileName.endsWith(".css") &&
					// Why: a pass on a file with a source map would leave the map stale.
					!(`${file.fileName}.map` in bundle) &&
					String(file.source).includes("data-applied-theme");
				const mentions = new Set<string>();
				for (const file of files) {
					if (!isThemeSheet(file)) {
						const text = file.type === "chunk" ? file.code : String(file.source);
						for (const name of text.match(RAMP_STOP_MENTION) ?? []) {
							mentions.add(name);
						}
					}
				}
				for (const file of files) {
					if (file.type === "asset" && isThemeSheet(file)) {
						// A stop that another theme sheet of the build mentions stays too.
						const others = new Set(mentions);
						for (const other of files) {
							if (other !== file && other.type === "asset" && isThemeSheet(other)) {
								for (const name of String(other.source).match(RAMP_STOP_MENTION) ?? []) {
									others.add(name);
								}
							}
						}
						file.source = pruneThemeCss(String(file.source), others);
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
