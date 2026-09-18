import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { Plugin } from "vitest/config";
import { z } from "zod";

const manifestSchema = z.object({
	exports: z.object({ ".": z.object({ import: z.string() }) }),
});

/**
 * Hashes the contents of `files` in order, so a change in any one of them changes the digest.
 *
 * @example
 * ```ts
 * digestFiles(["packages/mantle-vite-plugins/dist/index.js"]); // "3f2a…"
 * ```
 */
function digestFiles(files: readonly string[]): string {
	const hash = createHash("sha1");
	for (const file of files) {
		hash.update(readFileSync(file));
	}
	return hash.digest("hex");
}

/**
 * Returns the absolute path of the file a bare import of `packageName` loads: the manifest's
 * `exports["."].import` entry, resolved from the module at `from`.
 *
 * @example
 * ```ts
 * resolvePackageEntry("@ngrok/mantle-vite-plugins", import.meta.url);
 * // "/…/packages/mantle-vite-plugins/dist/index.js"
 * ```
 */
function resolvePackageEntry(packageName: string, from: string): string {
	const manifestPath = createRequire(from).resolve(`${packageName}/package.json`);
	const manifest = manifestSchema.parse(JSON.parse(readFileSync(manifestPath, "utf-8")));
	return path.join(path.dirname(manifestPath), manifest.exports["."].import);
}

/**
 * Vite plugin that folds the built entry of each workspace package in `packageNames` into
 * Vitest's `fsModuleCache` key.
 *
 * Why: the cache keys a transform by the module source, the Vite config, and the files the
 * config imports by relative path. A workspace plugin package reaches the config from its `dist`
 * through `node_modules`, so a rebuild changes what every MDX page compiles to while every key
 * stays the same. With the entry files in the key, that rebuild is a cache miss.
 *
 * @example
 * ```ts
 * plugins: [workspacePluginCacheKey(["@ngrok/mantle-vite-plugins"])]
 * ```
 */
function workspacePluginCacheKey(packageNames: readonly string[]): Plugin {
	return {
		name: "workspace-plugin-cache-key",
		configureVitest(context) {
			const entries = packageNames.map((name) => resolvePackageEntry(name, import.meta.url));
			const digest = digestFiles(entries);
			context.defineCacheKeyGenerator(() => digest);
		},
	};
}

export { digestFiles, resolvePackageEntry, workspacePluginCacheKey };
