import mantlePackageJson from "@ngrok/mantle/package.json" with { type: "json" };
import { canonicalHref, canonicalOrigin } from "~/utilities/canonical-origin";
import { extractFirstSentenceForName } from "~/utilities/hooks-manifest.server";
import { componentsSrcDir, sourceBasePath, utilsSrcDir } from "~/utilities/mantle-source.server";

/**
 * One entry in the public utilities manifest. Designed for ingestion by
 * LLMs, code-generation agents, and external tooling — fields are stable
 * and self-describing.
 */
export type ManifestUtility = {
	/** Display name (e.g. "cx", "composeRefs"). */
	name: string;
	/** ESM import path (e.g. "@ngrok/mantle/cx"). */
	importPath: string;
	/** Absolute docs URL. */
	docsUrl: string;
	/** Absolute markdown URL. */
	markdownUrl: string;
	/** One-line summary from the utility's JSDoc, if available. */
	summary?: string;
};

/** Top-level shape returned by `/api/utils.json`. */
export type UtilitiesManifest = {
	/** Currently published `@ngrok/mantle` version. */
	version: string;
	/** Canonical docs origin. */
	origin: string;
	/** Public utilities, sorted by name. */
	utilities: ManifestUtility[];
};

/**
 * Static descriptor for a utility entry. The docs slug, source file, and
 * "primary export" used for JSDoc summary extraction are all known up
 * front — there's no auto-discovery here because the utilities are a
 * small, curated set.
 */
type UtilityDescriptor = {
	/** Public name shown in the manifest (e.g. "cx"). */
	name: string;
	/** Subpath under the docs site without the leading slash. */
	docsSlug: string;
	/** ESM import path (e.g. "@ngrok/mantle/cx"). */
	importPath: string;
	/** Source file containing the JSDoc, relative to `packages/mantle/src`. */
	sourcePath: string;
	/**
	 * Identifier whose JSDoc seeds the manifest summary. Usually the
	 * utility's primary exported function (e.g. `cx`, `inView`).
	 */
	primaryExport: string;
};

/**
 * The curated set of utilities surfaced in `/api/utils.json`.
 *
 * Source-of-truth references:
 *   - `/cx`, `/color`, and `/highlight-utils` correspond to dedicated
 *     subpath exports in `packages/mantle/package.json`.
 *   - `/composeRefs`, `/inView`, and `/sorting` are exposed via the
 *     `@ngrok/mantle/utils` umbrella barrel and have their own docs pages.
 *
 * Other entries in `package.json#exports` are intentionally excluded:
 *   - `./hooks`   — covered by `/api/hooks.json`.
 *   - `./types`   — type-only, no runtime entry.
 *   - `./utils`   — umbrella barrel surfaced via the per-utility entries.
 */
const utilities: UtilityDescriptor[] = [
	{
		name: "cx",
		docsSlug: "utils/cx",
		importPath: "@ngrok/mantle/cx",
		sourcePath: sourceBasePath(utilsSrcDir, "cx", "cx"),
		primaryExport: "cx",
	},
	{
		name: "color",
		docsSlug: "utils/color",
		importPath: "@ngrok/mantle/color",
		sourcePath: sourceBasePath(utilsSrcDir, "color", "colors"),
		primaryExport: "namedColors",
	},
	{
		name: "composeRefs",
		docsSlug: "utils/compose-refs",
		importPath: "@ngrok/mantle/utils",
		sourcePath: sourceBasePath(utilsSrcDir, "compose-refs", "compose-refs"),
		primaryExport: "composeRefs",
	},
	{
		name: "inView",
		docsSlug: "utils/in-view",
		importPath: "@ngrok/mantle/utils",
		sourcePath: sourceBasePath(utilsSrcDir, "in-view"),
		primaryExport: "inView",
	},
	{
		name: "sorting",
		docsSlug: "utils/sorting",
		importPath: "@ngrok/mantle/utils",
		sourcePath: sourceBasePath(utilsSrcDir, "sorting", "compare"),
		primaryExport: "compareDatesNewestToOldest",
	},
	{
		name: "highlight-utils",
		docsSlug: "utils/highlight-utils",
		importPath: "@ngrok/mantle/highlight-utils",
		// `highlight-utils.ts` is itself a barrel, so summary extraction relies on
		// `extractFirstSentenceForName` falling back to the module-level JSDoc when
		// there is no matching `function`/`const` declaration to anchor on.
		sourcePath: sourceBasePath(componentsSrcDir, "code-block", "highlight-utils"),
		primaryExport: "decorateHighlightedHtml",
	},
];

/**
 * Build the public utilities manifest. Combines the curated descriptor
 * list above with JSDoc summary extraction from each utility's primary
 * exported identifier.
 *
 * Cached after first build because the inputs are static for the lifetime
 * of the server process.
 */
let cachedManifest: UtilitiesManifest | null = null;
export async function buildUtilitiesManifest(): Promise<UtilitiesManifest> {
	if (cachedManifest) {
		return cachedManifest;
	}

	const items: ManifestUtility[] = [];
	for (const descriptor of utilities) {
		const summary = await extractFirstSentenceForName(
			descriptor.sourcePath,
			descriptor.primaryExport,
		);

		items.push({
			name: descriptor.name,
			importPath: descriptor.importPath,
			docsUrl: canonicalHref(`/${descriptor.docsSlug}`),
			markdownUrl: canonicalHref(`/${descriptor.docsSlug}.md`),
			summary,
		});
	}

	items.sort((a, b) => a.name.localeCompare(b.name));

	cachedManifest = {
		version: mantlePackageJson.version,
		origin: canonicalOrigin,
		utilities: items,
	};
	return cachedManifest;
}
