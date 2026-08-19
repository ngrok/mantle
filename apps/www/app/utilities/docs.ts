import rawMdxDocs from "virtual:raw-mdx-docs";
import type { DocHandle, TocEntry } from "../../vite-plugins/rehype-mdx-doc-handle";

// The slice of a compiled doc module this file reads. The full module shape
// (default component plus `handle`) lives in `app/mdx-modules.d.ts`.
type MdxModule = {
	/** The route `handle` the `rehypeMdxDocHandle` plugin injects: frontmatter and toc. */
	handle?: DocHandle;
};

export type { TocEntry };

/**
 * Eager glob imports for production builds. Every MDX module resolves at
 * build time, so a loader reads frontmatter synchronously. Only loaders and
 * server modules import this file, so the modules stay out of the client
 * bundle (each docs page ships as its own route module chunk).
 */
const eagerDocModules: Record<string, MdxModule> = import.meta.env.PROD
	? import.meta.glob<MdxModule>("../docs/**/*.mdx", { eager: true })
	: {};

/**
 * Lazy glob importers for dev. A lazy import keeps dev-server startup fast
 * and re-reads an edited module after Vite invalidates it.
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
 * Load an MDX doc module by glob file path: the eager map in prod, a fresh
 * lazy import in dev. Returns null when the path is not a known doc module.
 */
async function loadDocModule(filePath: string): Promise<MdxModule | null> {
	if (import.meta.env.PROD) {
		return eagerDocModules[filePath] ?? null;
	}
	const importer = lazyDocImporters[filePath];
	if (!importer) {
		return null;
	}
	return await importer();
}

/**
 * Load the frontmatter for a given doc file path.
 *
 * Frontmatter ships in the module's `handle` export (injected by the
 * `rehypeMdxDocHandle` plugin). The MDX content itself renders as the
 * matched route module, not through this helper.
 */
export async function loadFrontmatter(
	filePath: string,
): Promise<Record<string, unknown> | undefined> {
	const mod = await loadDocModule(filePath);
	return mod?.handle?.frontmatter;
}

/**
 * Raw MDX source content, keyed by the same file paths as the doc importers.
 * Bundled at build time via the `rawMdxDocs` Vite plugin so it's available
 * in serverless environments without filesystem access.
 */
export const rawDocContent: Record<string, string> = rawMdxDocs;
