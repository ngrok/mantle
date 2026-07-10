import mantlePackageJson from "@ngrok/mantle/package.json" with { type: "json" };
import {
	componentCategories,
	componentImportPathOverrides,
	componentsByCategory,
	previewComponentCategoryLookup,
	previewComponents,
	previewComponentsRouteLookup,
	prodReadyComponentRouteLookup,
	type ComponentCategory,
} from "~/components/navigation-data";
import { canonicalHref, canonicalOrigin } from "~/utilities/canonical-origin";
import { loadFrontmatter, urlToFileMap } from "~/utilities/docs";
import {
	extractExamplesForName,
	extractFirstSentenceForName,
} from "~/utilities/hooks-manifest.server";
import { componentsSrcDir, sourceBasePath } from "~/utilities/mantle-source.server";

/**
 * One entry in the public component manifest. Designed for ingestion by
 * LLMs, code-generation agents, and external tooling — fields are stable
 * and self-describing.
 */
export type ManifestComponent = {
	/** Display name as used in the docs sidebar (e.g. "Data Table"). */
	name: string;
	/** URL slug under the docs site (e.g. "components/data-display/data-table"). */
	slug: string;
	/**
	 * What the export *is*. `component` owns an interaction or widget and is
	 * documented under `/components/<category>/`; `layout` owns page/viewport
	 * structure and is documented under `/layouts/`.
	 */
	kind: "component" | "layout";
	/**
	 * Docs sidebar category (e.g. "Data Display"). Present on every
	 * `kind: "component"` entry; layouts are a flat family and carry none.
	 */
	category?: ComponentCategory;
	/** Lifecycle status. `preview` components have unstable APIs. */
	status: "stable" | "preview";
	/** ESM import path for the component (e.g. "@ngrok/mantle/data-table"). */
	importPath: string;
	/** Absolute docs URL (HTML rendering). */
	docsUrl: string;
	/** Absolute docs URL serving plain markdown — agent-friendly. */
	markdownUrl: string;
	/** One-line summary pulled from the docs page frontmatter, if available. */
	summary?: string;
	/**
	 * First sentence of the JSDoc block on the component's primary
	 * exported identifier (read from the package source). Surfaces the
	 * in-IDE/in-source guidance — useful when an agent wants the exact
	 * text that hovering the import would show.
	 */
	jsdoc?: string;
	/**
	 * Body of each `@example` block on the component's primary exported
	 * identifier (read from the package source), in declaration order.
	 * Gives agents copy-pasteable canonical usage — the same templates
	 * hovering the import would show — without a network lookup. Omitted
	 * when the source has no `@example` blocks.
	 */
	examples?: string[];
};

/** Top-level shape returned by `/api/components.json`. */
export type Manifest = {
	/** Currently published `@ngrok/mantle` version. */
	version: string;
	/** Canonical docs origin. */
	origin: string;
	/** Stable + preview components, sorted by display name. */
	components: ManifestComponent[];
};

/**
 * Map a docs slug like `components/actions/button` or
 * `components/preview/calendar` to the package import path consumers should
 * use, or `null` if the page doesn't correspond to an importable module
 * (e.g. `base/colors`).
 *
 * Docs URLs carry a category segment (`components/<category>/<name>`) or the
 * `layouts/` prefix, but the import namespace stays flat — every module is
 * `@ngrok/mantle/<name>` regardless of where it is documented.
 *
 * Consults `componentImportPathOverrides` first so components whose docs
 * URL slug differs from their `@ngrok/mantle/*` import subpath (e.g. Icon
 * Button → `@ngrok/mantle/button`) emit the correct `importPath`.
 */
function importPathForSlug(slug: string): string | null {
	const overrides: Record<string, string> = componentImportPathOverrides;
	const override = overrides[`/${slug}`];
	if (override) {
		return override;
	}
	if (slug.startsWith("components/preview/")) {
		const name = slug.slice("components/preview/".length);
		return `@ngrok/mantle/${name}`;
	}
	if (slug.startsWith("components/")) {
		const parts = slug.split("/");
		const leaf = parts[2];
		if (parts.length !== 3 || leaf == null) {
			return null;
		}
		return `@ngrok/mantle/${leaf}`;
	}
	if (slug.startsWith("layouts/")) {
		const name = slug.slice("layouts/".length);
		return `@ngrok/mantle/${name}`;
	}
	return null;
}

/**
 * Convert a kebab-case docs slug leaf (e.g. `data-table`) into the
 * PascalCase identifier the component is most commonly exported as
 * (e.g. `DataTable`). Used as a candidate name when looking up the
 * component's JSDoc by declaration. Falls back to other casings at the
 * call site if the canonical form doesn't match.
 */
function leafToPascal(leaf: string): string {
	return leaf
		.split("-")
		.map((part) => {
			const first = part.charAt(0);
			if (first === "") {
				return part;
			}
			return first.toUpperCase() + part.slice(1);
		})
		.join("");
}

/**
 * Locate source files that may describe a component's primary export. For
 * most slugs the dir matches the leaf (`components/button` →
 * `button/button.tsx`). The override map handles components that live
 * alongside a sibling (`icon-button` lives in the `button/` dir,
 * `password-input` in `input/`, etc.). The index fallback covers
 * barrel-style pages like `Theme`, `Icons`, and `Pagination`.
 *
 * Returns package-source-relative paths *without* extensions so callers
 * can hand it to {@link extractFirstSentenceForName}.
 */
function sourceBasesForSlug(slug: string): { basePaths: string[]; leaf: string } | null {
	let leaf: string;
	let dir: string;

	if (slug.startsWith("components/preview/")) {
		leaf = slug.slice("components/preview/".length);
		dir = leaf;
	} else if (slug.startsWith("components/")) {
		// "components/<category>/<name>" — the category is a URL grouping
		// only; source dirs stay flat under packages/mantle/src/components.
		const parts = slug.split("/");
		const last = parts[2];
		if (parts.length !== 3 || last == null) {
			return null;
		}
		leaf = last;
		const overrides: Record<string, string> = componentImportPathOverrides;
		const override = overrides[`/${slug}`];
		dir = override ? override.replace(/^@ngrok\/mantle\//, "") : leaf;
	} else if (slug.startsWith("layouts/")) {
		leaf = slug.slice("layouts/".length);
		dir = leaf;
	} else {
		return null;
	}

	return {
		leaf,
		basePaths: [
			sourceBasePath(componentsSrcDir, dir, leaf),
			sourceBasePath(componentsSrcDir, dir, "index"),
		],
	};
}

/**
 * Best-effort JSDoc lookup for a component. Tries the canonical
 * PascalCase derived from the kebab-case file name first
 * (`data-table` → `DataTable`), then the display-name with whitespace
 * stripped (`OTP Input` → `OTPInput`). Returns `undefined` when nothing
 * matches — callers fall back to the docs frontmatter summary.
 */
async function jsdocForComponent(slug: string, displayName: string): Promise<string | undefined> {
	const source = sourceBasesForSlug(slug);
	if (!source) {
		return undefined;
	}
	const candidates = new Set<string>([leafToPascal(source.leaf), displayName.replace(/\s+/g, "")]);
	for (const basePath of source.basePaths) {
		for (const name of candidates) {
			const sentence = await extractFirstSentenceForName(basePath, name);
			if (sentence) {
				return sentence;
			}
		}
	}
	return undefined;
}

/**
 * Best-effort `@example` lookup for a component, using the same
 * candidate-name and source-path resolution as {@link jsdocForComponent}.
 * Returns the example blocks from the first declaration that has any, or
 * an empty array when none match.
 */
async function examplesForComponent(slug: string, displayName: string): Promise<string[]> {
	const source = sourceBasesForSlug(slug);
	if (!source) {
		return [];
	}
	const candidates = new Set<string>([leafToPascal(source.leaf), displayName.replace(/\s+/g, "")]);
	for (const basePath of source.basePaths) {
		for (const name of candidates) {
			const examples = await extractExamplesForName(basePath, name);
			if (examples.length > 0) {
				return examples;
			}
		}
	}
	return [];
}

/**
 * Build the public component manifest. Combines the docs navigation as the
 * source of truth for which components exist with each page's frontmatter
 * description for the summary field.
 *
 * Cached after first build because the underlying inputs (navigation data
 * and frontmatter) are static for the lifetime of the server process.
 */
let cachedManifest: Manifest | null = null;
export async function buildManifest(): Promise<Manifest> {
	if (cachedManifest) {
		return cachedManifest;
	}

	const stableEntries = componentCategories.flatMap((category) =>
		componentsByCategory[category].map((name) => ({
			name,
			route: prodReadyComponentRouteLookup[name],
			status: "stable" as const,
			category,
		})),
	);
	const previewEntries = previewComponents.map((name) => ({
		name,
		route: previewComponentsRouteLookup[name],
		status: "preview" as const,
		category: previewComponentCategoryLookup[name],
	}));

	// When the first layout primitive ships, its nav data (`layoutRoutes`)
	// feeds a third entry list here with `kind: "layout"` and no category.
	const all = [...stableEntries, ...previewEntries];
	const components = (
		await Promise.all(
			all.map(async ({ name, route, status, category }): Promise<ManifestComponent | null> => {
				const slug = route.startsWith("/") ? route.slice(1) : route;
				const importPath = importPathForSlug(slug);
				if (!importPath) {
					return null;
				}
				const filePath = urlToFileMap.get(slug);
				const [frontmatter, jsdoc, examples] = await Promise.all([
					filePath ? loadFrontmatter(filePath) : Promise.resolve(undefined),
					jsdocForComponent(slug, name),
					examplesForComponent(slug, name),
				]);
				const description =
					typeof frontmatter?.description === "string" ? frontmatter.description : undefined;
				return {
					name,
					slug,
					kind: "component",
					category,
					status,
					importPath,
					docsUrl: canonicalHref(`/${slug}`),
					markdownUrl: canonicalHref(`/${slug}.md`),
					summary: description,
					jsdoc,
					examples: examples.length > 0 ? examples : undefined,
				};
			}),
		)
	).filter((entry): entry is ManifestComponent => entry != null);

	components.sort((a, b) => a.name.localeCompare(b.name));

	cachedManifest = {
		version: mantlePackageJson.version,
		origin: canonicalOrigin,
		components,
	};
	return cachedManifest;
}
