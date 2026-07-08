import { prodReadyComponentRouteLookup } from "~/components/navigation-data";

/**
 * Redirect targets for pre-IA-reorg docs URLs, keyed by legacy slug (no
 * leading slash, no `.md`/`.mdx` suffix).
 *
 * The 2026-07 information-architecture reorg moved component docs from
 * `/components/<component>` to `/components/<category>/<component>` and
 * renamed the blocks section to recipes. Old URLs live on in bookmarks,
 * search indexes, published JSDoc, and agent caches, so the catch-all route
 * permanently redirects them to their new homes. See
 * `decisions/2026-07-08-docs-information-architecture.md`.
 *
 * Component entries are derived from {@link prodReadyComponentRouteLookup},
 * so a component moving categories automatically keeps its legacy redirect
 * pointed at the right place.
 */
function buildLegacySlugMap(): Map<string, string> {
	const map = new Map<string, string>();

	for (const route of Object.values(prodReadyComponentRouteLookup)) {
		// "/components/<category>/<leaf>" → "components/<leaf>" redirects there.
		const [, components, , leaf] = route.split("/");
		map.set(`${components}/${leaf}`, route.slice(1));
	}

	// Doc sub-pages and renamed sections/pages, which the derivation above
	// can't see. The sheet-async recipe was generalized to overlay-async
	// (Sheet, Dialog, and Alert Dialog) in the same reorg.
	map.set(
		"components/code-block/folding-by-language",
		"components/data-display/code-block/folding-by-language",
	);
	map.set("blocks", "recipes");
	map.set("blocks/sheet-async", "recipes/overlay-async");
	map.set("recipes/sheet-async", "recipes/overlay-async");

	return map;
}

const legacySlugMap = buildLegacySlugMap();

/**
 * Resolve a request pathname to its post-reorg redirect target, or `null`
 * when the path isn't a known legacy docs URL. Preserves a `.md` suffix
 * (raw-markdown URLs redirect to the new raw-markdown URL) and drops a
 * `.mdx` suffix (matching the sitewide `.mdx` → canonical page redirect).
 *
 * @example
 * legacyRedirectFor("/components/button"); // "/components/actions/button"
 * legacyRedirectFor("/components/button.md"); // "/components/actions/button.md"
 * legacyRedirectFor("/blocks/sheet-async.mdx"); // "/recipes/overlay-async"
 * legacyRedirectFor("/components/actions/button"); // null (already canonical)
 */
export function legacyRedirectFor(pathname: string): string | null {
	const slug = pathname.replace(/^\/+/, "");

	let base = slug;
	let suffix = "";
	if (slug.endsWith(".md")) {
		base = slug.slice(0, -".md".length);
		suffix = ".md";
	} else if (slug.endsWith(".mdx")) {
		base = slug.slice(0, -".mdx".length);
	}

	const target = legacySlugMap.get(base);
	if (target == null) {
		return null;
	}
	return `/${target}${suffix}`;
}
