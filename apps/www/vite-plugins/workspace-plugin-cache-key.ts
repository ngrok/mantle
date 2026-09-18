import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { Plugin } from "vitest/config";
import { z } from "zod";

const manifestSchema = z.object({ exports: z.record(z.string(), z.unknown()) });
const importEntrySchema = z.object({ import: z.string() });

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
 * Splits a bare specifier into its package name and the `exports` key it selects: `"."` for
 * `@ngrok/mantle`, `"./theme"` for `@ngrok/mantle/theme`.
 */
function splitSpecifier(specifier: string): { packageName: string; exportKey: string } {
	const segments = specifier.split("/");
	const nameLength = specifier.startsWith("@") ? 2 : 1;
	const packageName = segments.slice(0, nameLength).join("/");
	const subpath = segments.slice(nameLength);
	return { packageName, exportKey: subpath.length === 0 ? "." : `./${subpath.join("/")}` };
}

/**
 * Returns the absolute path of the file a bare import of `specifier` loads: the `import` entry
 * the package manifest's `exports` map names for it, resolved from the module at `from`.
 * Throws when the manifest exports no `import` file for the specifier.
 *
 * @example
 * ```ts
 * resolvePackageEntry("@ngrok/mantle/theme", import.meta.url);
 * // "/…/packages/mantle/dist/theme.js"
 * ```
 */
function resolvePackageEntry(specifier: string, from: string): string {
	const { packageName, exportKey } = splitSpecifier(specifier);
	const manifestPath = createRequire(from).resolve(`${packageName}/package.json`);
	const manifest = manifestSchema.parse(JSON.parse(readFileSync(manifestPath, "utf-8")));
	const entry = importEntrySchema.safeParse(manifest.exports[exportKey]);
	if (!entry.success) {
		throw new Error(`${manifestPath} exports no import file for "${specifier}".`);
	}
	return path.join(path.dirname(manifestPath), entry.data.import);
}

/**
 * Vite plugin that folds the built file behind each bare specifier in `specifiers`, a workspace
 * package or one of its subpaths, into Vitest's `fsModuleCache` key.
 *
 * Why: the cache keys a transform by the module source, the Vite config, and the files the
 * config imports by relative path. A workspace plugin reaches the config from its `dist` through
 * `node_modules`, and it leaves its own `@ngrok/mantle/*` imports external. A rebuild of any of
 * them changes what every MDX page compiles to while every key stays the same. With the built
 * files in the key, that rebuild is a cache miss.
 *
 * @example
 * ```ts
 * plugins: [workspacePluginCacheKey(["@ngrok/mantle-vite-plugins", "@ngrok/mantle/theme"])]
 * ```
 */
function workspacePluginCacheKey(specifiers: readonly string[]): Plugin {
	return {
		name: "workspace-plugin-cache-key",
		configureVitest(context) {
			const entries = specifiers.map((specifier) =>
				resolvePackageEntry(specifier, import.meta.url),
			);
			const digest = digestFiles(entries);
			context.defineCacheKeyGenerator(() => digest);
		},
	};
}

export { digestFiles, resolvePackageEntry, workspacePluginCacheKey };
