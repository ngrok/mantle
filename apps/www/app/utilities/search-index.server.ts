import mantlePackageJson from "@ngrok/mantle/package.json" with { type: "json" };
import { canonicalOrigin } from "~/utilities/canonical-origin";
import { buildHooksManifest } from "~/utilities/hooks-manifest.server";
import type { HooksManifest } from "~/utilities/hooks-manifest.server";
import { buildManifest } from "~/utilities/manifest.server";
import type { Manifest } from "~/utilities/manifest.server";
import { buildUtilitiesManifest } from "~/utilities/utils-manifest.server";
import type { UtilitiesManifest } from "~/utilities/utils-manifest.server";

/**
 * One entry in the public search index. Sized so the whole index fits
 * comfortably into an agent's context window or a tiny client-side
 * search bundle.
 */
export type SearchEntry = {
	name: string;
	kind: "component" | "layout" | "hook" | "utility";
	importPath: string;
	docsUrl: string;
	markdownUrl: string;
	summary?: string;
	/** Set on components only — hooks/utilities don't carry a lifecycle. */
	status?: "stable" | "preview";
	/** Docs sidebar category (e.g. "Data Display"). Components only. */
	category?: string;
	/** Lower-cased tokens derived from name, slug, summary, and aliases, deduplicated. */
	keywords: string[];
};

export type SearchIndex = {
	version: string;
	origin: string;
	/** Sorted by name so output is stable across builds. */
	entries: SearchEntry[];
};

/**
 * Lowercase, alpha-numeric tokens of length ≥ 3 from any number of
 * source strings, deduplicated and sorted. Stable output keeps the
 * cached index byte-identical across rebuilds when nothing changed.
 */
export function keywordsFrom(...sources: (string | undefined)[]): string[] {
	const seen = new Set<string>();
	for (const source of sources) {
		if (source == null) {
			continue;
		}
		for (const token of source.toLowerCase().split(/[^a-z0-9]+/)) {
			if (token.length >= 3) {
				seen.add(token);
			}
		}
	}
	return Array.from(seen).toSorted();
}

type SearchIndexManifests = {
	components: Pick<Manifest, "components">;
	hooks: Pick<HooksManifest, "hooks">;
	utilities: Pick<UtilitiesManifest, "utilities">;
};

export function buildSearchEntries({
	components,
	hooks,
	utilities,
}: SearchIndexManifests): SearchEntry[] {
	const entries: SearchEntry[] = [];

	for (const component of components.components) {
		entries.push({
			name: component.name,
			kind: component.kind,
			importPath: component.importPath,
			docsUrl: component.docsUrl,
			markdownUrl: component.markdownUrl,
			summary: component.summary ?? component.jsdoc,
			status: component.status,
			category: component.category,
			keywords: keywordsFrom(
				component.name,
				component.slug,
				component.category,
				component.summary,
				component.jsdoc,
				...(component.aliases ?? []),
			),
		});
	}

	for (const hook of hooks.hooks) {
		entries.push({
			name: hook.name,
			kind: "hook",
			importPath: hook.importPath,
			docsUrl: hook.docsUrl,
			markdownUrl: hook.markdownUrl,
			summary: hook.summary,
			keywords: keywordsFrom(hook.name, hook.summary),
		});
	}

	for (const utility of utilities.utilities) {
		entries.push({
			name: utility.name,
			kind: "utility",
			importPath: utility.importPath,
			docsUrl: utility.docsUrl,
			markdownUrl: utility.markdownUrl,
			summary: utility.summary,
			keywords: keywordsFrom(utility.name, utility.summary),
		});
	}

	return entries.toSorted((a, b) => a.name.localeCompare(b.name));
}

async function build(): Promise<SearchIndex> {
	const [components, hooks, utilities] = await Promise.all([
		buildManifest(),
		buildHooksManifest(),
		buildUtilitiesManifest(),
	]);

	return {
		version: mantlePackageJson.version,
		origin: canonicalOrigin,
		entries: buildSearchEntries({ components, hooks, utilities }),
	};
}

let cached: Promise<SearchIndex> | null = null;

/**
 * Flatten the components, hooks, and utilities manifests into a single
 * sorted array, with keyword tokens derived for each entry.
 *
 * In prod the inputs are fixed at build time, so one build serves the process.
 * In dev every call rebuilds, so an alias or summary edit shows on the next
 * request, as the agent manifest it reads does.
 */
export function buildSearchIndex(): Promise<SearchIndex> {
	if (!import.meta.env.PROD) {
		return build();
	}
	if (cached == null) {
		cached = build();
	}
	return cached;
}
