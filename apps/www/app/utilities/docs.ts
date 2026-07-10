import type { ComponentType } from "react";
import rawMdxDocs from "virtual:raw-mdx-docs";
import type { TocEntry } from "../../vite-plugins/rehype-mdx-toc";

type MdxComponent = ComponentType & {
	frontmatter?: Record<string, unknown>;
};

type MdxModule = {
	default: MdxComponent;
	toc?: Array<TocEntry>;
};

export type { TocEntry };

/**
 * Eager glob imports for production builds. All MDX modules are resolved at
 * build time so they can be rendered synchronously during prerendering.
 */
const eagerDocModules: Record<string, MdxModule> = import.meta.env.PROD
	? import.meta.glob<MdxModule>("../docs/**/*.mdx", { eager: true })
	: {};

/**
 * Lazy glob importers for dev builds. Using lazy imports (no `eager`) allows
 * Vite HMR to hot-update individual MDX modules without a full page reload.
 */
const lazyDocImporters: Record<string, () => Promise<MdxModule>> = import.meta.env.DEV
	? import.meta.glob<MdxModule>("../docs/**/*.mdx")
	: {};

const allDocPaths = Object.keys(import.meta.env.PROD ? eagerDocModules : lazyDocImporters);

function docPathToUrlPath(filePath: string): string {
	return filePath.replace("../docs/", "").replace(/\.mdx$/, "");
}

export const urlToFileMap = new Map<string, string>();
for (const filePath of allDocPaths) {
	urlToFileMap.set(docPathToUrlPath(filePath), filePath);
}

/**
 * Load and validate an MDX module by file path (lazy, for dev).
 */
async function getDocMdxModule(filePath: string): Promise<MdxModule | null> {
	const importer = lazyDocImporters[filePath];
	if (!importer) {
		return null;
	}
	const mod = await importer();
	return mod;
}

/** A resolved MDX doc — its React component and the table-of-contents entries. */
export type ResolvedDoc = {
	Component: ComponentType;
	toc: Array<TocEntry>;
};

// Cache promises by filePath so use() sees the same promise across renders.
// In dev, we clear the cache each time this module re-executes (which Vite
// triggers when an MDX file changes) so the next render re-imports the
// updated module.
const resolvedDocCache = new Map<string, Promise<ResolvedDoc>>();

/**
 * Resolve a doc MDX module asynchronously, returning its component and toc.
 * Used in dev with `use()` + Suspense for granular HMR.
 *
 * Caches promises so `use()` sees the same promise reference across renders,
 * preventing Suspense from re-suspending.
 *
 * @param filePath - A key from the MDX glob (e.g. "../docs/button.mdx").
 */
export function resolveDoc(filePath: string): Promise<ResolvedDoc> {
	const existing = resolvedDocCache.get(filePath);
	if (existing) {
		return existing;
	}
	const promise = (async () => {
		const mod = await getDocMdxModule(filePath);
		if (!mod) {
			throw Response.json({ message: "Not Found" }, { status: 404 });
		}
		return { Component: mod.default, toc: mod.toc ?? [] };
	})();
	resolvedDocCache.set(filePath, promise);
	return promise;
}

/**
 * Get a doc MDX module synchronously, returning its component and toc.
 * Used in production builds where all modules are eagerly imported
 * at build time for prerendering.
 *
 * @param filePath - A key from the MDX glob (e.g. "../docs/button.mdx").
 * @returns The resolved doc, or null if not found.
 */
export function getDoc(filePath: string): ResolvedDoc | null {
	const mod = eagerDocModules[filePath];
	if (!mod) {
		return null;
	}
	return { Component: mod.default, toc: mod.toc ?? [] };
}

/**
 * Loader-side helper: resolves a doc using the eager (prod) or lazy (dev)
 * path, throwing 404 if the file isn't a known doc module.
 */
export async function loadDoc(filePath: string): Promise<ResolvedDoc> {
	const doc = import.meta.env.PROD ? getDoc(filePath) : await resolveDoc(filePath);
	if (!doc) {
		throw Response.json({ message: "Not Found" }, { status: 404 });
	}
	return doc;
}

/**
 * Load the frontmatter for a given doc file path.
 *
 * Frontmatter is attached to the default export component as a property
 * (via `remark-mdx-frontmatter` with `export: "namespace"`).
 */
export async function loadFrontmatter(
	filePath: string,
): Promise<Record<string, unknown> | undefined> {
	if (import.meta.env.PROD) {
		const mod = eagerDocModules[filePath];
		return mod?.default.frontmatter;
	}
	const mod = await getDocMdxModule(filePath);
	return mod?.default.frontmatter;
}

/**
 * Raw MDX source content, keyed by the same file paths as the doc importers.
 * Bundled at build time via the `rawMdxDocs` Vite plugin so it's available
 * in serverless environments without filesystem access.
 */
export const rawDocContent: Record<string, string> = rawMdxDocs;
