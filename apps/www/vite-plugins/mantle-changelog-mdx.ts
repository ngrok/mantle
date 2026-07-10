import { readFileSync } from "node:fs";
import type { Plugin } from "vite";

/**
 * Vite plugin that exposes the published `@ngrok/mantle` CHANGELOG as a
 * virtual MDX module. Two reasons we can't just import the package
 * `CHANGELOG.md` directly:
 *
 *   1. `@mdx-js/rollup`'s `include: /\.mdx$/` filter doesn't catch `.md`
 *      files (and widening it to `/\.mdx?$/` clobbers `?raw` imports —
 *      the plugin strips the query before testing the path).
 *   2. MDX-compiled output emits `import { useMDXComponents } from
 *      "@mdx-js/react"`, which Rolldown resolves from the source file's
 *      directory. `packages/mantle/` has no `@mdx-js/react` in scope, so
 *      direct compilation fails at build time.
 *
 * The virtual id ends in `.mdx` so the MDX plugin's filter matches, and
 * the module is logically owned by `apps/www`, so its bare imports
 * resolve from the docs site's `node_modules`.
 */
export function mantleChangelogMdx(absoluteChangelogPath: string): Plugin {
	// `@mdx-js/rollup` uses `@rollup/pluginutils` createFilter, which excludes
	// any id that starts with `\0` (the Rollup convention for virtual modules).
	// We need MDX to actually transform this module, so the resolved id has to
	// look like a normal markdown path. Use `.md` (not `.mdx`) so MDX runs in
	// CommonMark-only mode — the published CHANGELOG contains stray HTML-like
	// tokens in prose (e.g. `<Button appearance="link">`) that MDX-mode would
	// (incorrectly) parse as JSX.
	const virtualId = "virtual:@ngrok/mantle/changelog.md";
	const resolvedId = "__virtual__/@ngrok/mantle/changelog.md";

	return {
		name: "mantle-changelog-mdx",
		resolveId(id) {
			if (id === virtualId) {
				return resolvedId;
			}
		},
		load(id) {
			if (id !== resolvedId) {
				return;
			}
			this.addWatchFile(absoluteChangelogPath);
			return readFileSync(absoluteChangelogPath, "utf-8");
		},
		handleHotUpdate({ file, server }) {
			if (file === absoluteChangelogPath) {
				const mod = server.moduleGraph.getModuleById(resolvedId);
				if (mod) {
					server.moduleGraph.invalidateModule(mod);
					return [mod];
				}
			}
		},
	};
}
